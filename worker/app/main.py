from fastapi import FastAPI, UploadFile, File, Form, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
import uuid
import time

from app.config import settings
from app.models.verification import VerificationResult, mock_authentic_result, mock_tampered_result, mock_unsigned_result

app = FastAPI(title="EdgeProof Verification Worker", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins.split(","),
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "healthy", "version": "1.0.0"}


@app.post("/verify")
async def verify_video(
    file: UploadFile = File(...),
    callback_url: str | None = Form(None),
    authorization: str = Header(...),
):
    """
    Verify a signed video file.

    Accepts a video file via multipart/form-data and returns a JSON
    verification result. Optionally posts the result to a callback URL.

    In production, this runs the full verification pipeline:
    1. Parse video container (MP4/MKV) to extract NALUs
    2. Identify SEI NALUs with signing UUID
    3. Extract signatures, metadata, attestation reports
    4. Recompute frame hashes and GOP hashes
    5. Validate signatures against embedded device certificate
    6. Verify certificate chain to Axis Root CA
    7. Validate attestation report
    8. Check GOP chain continuity

    For development, returns mock data based on the filename.
    """
    # Validate API key
    token = authorization.replace("Bearer ", "")
    if token != settings.worker_api_key:
        raise HTTPException(status_code=401, detail="Invalid API key")

    # Validate file type
    filename = file.filename or "unknown.mp4"
    ext = os.path.splitext(filename)[1].lower()
    if ext not in (".mp4", ".mkv"):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {ext}. Only .mp4 and .mkv are supported.",
        )

    # Save temp file
    os.makedirs(settings.temp_dir, exist_ok=True)
    temp_path = os.path.join(settings.temp_dir, f"{uuid.uuid4()}{ext}")

    start_time = time.time()

    try:
        content = await file.read()
        with open(temp_path, "wb") as f:
            f.write(content)

        # In production: run_verification_pipeline(temp_path)
        # For dev: return mock data based on filename
        result = get_mock_result(filename)
        result.processing_time_ms = int((time.time() - start_time) * 1000)

        # If callback_url provided, POST result there (async mode)
        if callback_url:
            import httpx

            async with httpx.AsyncClient() as client:
                try:
                    await client.post(
                        callback_url,
                        json=result.model_dump(),
                        headers={"Authorization": f"Bearer {settings.worker_api_key}"},
                        timeout=10.0,
                    )
                except Exception as e:
                    print(f"Callback failed: {e}")

        return result.model_dump()
    finally:
        if os.path.exists(temp_path):
            os.unlink(temp_path)


def get_mock_result(filename: str) -> VerificationResult:
    """Return mock verification result based on filename for development."""
    name = filename.lower()
    if "tamper" in name:
        return mock_tampered_result()
    elif "unsigned" in name:
        return mock_unsigned_result()
    else:
        return mock_authentic_result()
