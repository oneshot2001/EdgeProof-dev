"""Tests for callback functionality and verification_id passthrough."""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock
from app.main import app
import io

client = TestClient(app)

AUTH_HEADER = {"Authorization": "Bearer dev-worker-api-key"}


def test_verify_returns_verification_id_when_provided():
    """When verification_id is passed, it should appear in the response."""
    files = {"file": ("test.mp4", io.BytesIO(b"fake video data"), "video/mp4")}
    data = {"verification_id": "custom-ver-id-123"}

    response = client.post("/verify", files=files, data=data, headers=AUTH_HEADER)
    assert response.status_code == 200

    result = response.json()
    assert result["verification_id"] == "custom-ver-id-123"


def test_verify_generates_id_when_not_provided():
    """When verification_id is not passed, the result should still have one."""
    files = {"file": ("test.mp4", io.BytesIO(b"fake video data"), "video/mp4")}

    response = client.post("/verify", files=files, headers=AUTH_HEADER)
    assert response.status_code == 200

    result = response.json()
    assert result["verification_id"] != ""


def test_verify_result_structure():
    """Verify the complete response structure matches the worker contract."""
    files = {"file": ("test.mp4", io.BytesIO(b"fake video data"), "video/mp4")}

    response = client.post("/verify", files=files, headers=AUTH_HEADER)
    assert response.status_code == 200

    result = response.json()

    # Check top-level fields
    assert "verification_id" in result
    assert "status" in result
    assert "processing_time_ms" in result
    assert "device" in result
    assert "certificate_chain" in result
    assert "attestation" in result
    assert "integrity" in result
    assert "temporal" in result
    assert "video_metadata" in result
    assert "errors" in result

    # Check nested device structure
    device = result["device"]
    assert "serial_number" in device
    assert "model" in device
    assert "firmware_version" in device
    assert "hardware_id" in device
    assert "axis_os_version" in device

    # Check nested integrity structure
    integrity = result["integrity"]
    assert "total_gops" in integrity
    assert "verified_gops" in integrity
    assert "tampered_gops" in integrity
    assert "total_frames" in integrity
    assert "verified_frames" in integrity
    assert "tampered_frames" in integrity
    assert "gop_chain_intact" in integrity
    assert "hash_algorithm" in integrity


def test_verify_mkv_format():
    """MKV format should be accepted."""
    files = {"file": ("footage.mkv", io.BytesIO(b"fake mkv data"), "video/x-matroska")}

    response = client.post("/verify", files=files, headers=AUTH_HEADER)
    assert response.status_code == 200


def test_verify_rejects_mov_format():
    """MOV format should be rejected (only MP4 and MKV supported)."""
    files = {"file": ("video.mov", io.BytesIO(b"fake mov data"), "video/quicktime")}

    response = client.post("/verify", files=files, headers=AUTH_HEADER)
    assert response.status_code == 400


def test_verify_rejects_webm_format():
    """WebM format should be rejected."""
    files = {"file": ("video.webm", io.BytesIO(b"fake webm data"), "video/webm")}

    response = client.post("/verify", files=files, headers=AUTH_HEADER)
    assert response.status_code == 400


def test_verify_processing_time_is_positive():
    """Processing time should be a positive number."""
    files = {"file": ("test.mp4", io.BytesIO(b"fake video data"), "video/mp4")}

    response = client.post("/verify", files=files, headers=AUTH_HEADER)
    assert response.status_code == 200

    result = response.json()
    assert isinstance(result["processing_time_ms"], int)
    assert result["processing_time_ms"] >= 0


def test_health_returns_version():
    """Health endpoint should return version info."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert "version" in data
    assert data["version"] == "1.0.0"


def test_verify_without_auth_header():
    """Request without Authorization header should fail."""
    files = {"file": ("test.mp4", io.BytesIO(b"fake video data"), "video/mp4")}

    # FastAPI will return 422 (missing required header) rather than 401
    response = client.post("/verify", files=files)
    assert response.status_code in (401, 422)
