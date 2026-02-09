from fastapi import FastAPI, UploadFile, File, Form, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
import uuid
import time

from app.config import settings
from app.models.verification import (
    VerificationResult,
    mock_authentic_result,
    mock_tampered_result,
    mock_unsigned_result,
)
from app.services.svf_runner import run_svf_validator
from app.services.video_info import get_video_info
from app.services.result_mapper import map_to_result

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
    verification_id: str | None = Form(None),
    authorization: str = Header(...),
):
    """
    Verify a signed video file.

    Accepts a video file via multipart/form-data and returns a JSON
    verification result. Optionally posts the result to a callback URL.

    When USE_MOCK_RESULTS=true, returns mock data based on the filename.
    Otherwise, runs the full verification pipeline:
    1. Extract video metadata via ffprobe
    2. Run SVF validator binary for cryptographic verification
    3. Map results to the VerificationResult model
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

        if settings.use_mock_results:
            result = get_mock_result(filename)
        else:
            result = await run_verification_pipeline(temp_path, filename)

        result.processing_time_ms = int((time.time() - start_time) * 1000)

        # Set verification_id if provided by the caller
        if verification_id:
            result.verification_id = verification_id

        result_dict = result.model_dump(by_alias=True)

        # If callback_url provided, POST result there (async mode)
        if callback_url:
            import httpx

            async with httpx.AsyncClient() as client:
                try:
                    await client.post(
                        callback_url,
                        json=result_dict,
                        headers={"Authorization": f"Bearer {settings.worker_api_key}"},
                        timeout=10.0,
                    )
                except Exception as e:
                    print(f"Callback failed: {e}")

        return result_dict
    finally:
        if os.path.exists(temp_path):
            os.unlink(temp_path)


async def run_verification_pipeline(file_path: str, filename: str) -> VerificationResult:
    """Run the full verification pipeline: ffprobe + SVF validator + result mapping."""
    # 1. Get video metadata via ffprobe
    video_info = await get_video_info(file_path)

    # 2. Run SVF validator binary
    svf_result = await run_svf_validator(file_path)

    # 3. Map to VerificationResult
    return map_to_result(svf_result, video_info)


def get_mock_result(filename: str) -> VerificationResult:
    """Return mock verification result based on filename for development."""
    name = filename.lower()
    if "tamper" in name:
        return mock_tampered_result()
    elif "unsigned" in name:
        return mock_unsigned_result()
    else:
        return mock_authentic_result()
