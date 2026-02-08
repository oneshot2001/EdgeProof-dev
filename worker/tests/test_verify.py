"""Tests for the verification endpoint."""

import pytest
from fastapi.testclient import TestClient
from app.main import app
import io

client = TestClient(app)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_verify_requires_auth():
    # Create a minimal file-like object
    files = {"file": ("test.mp4", io.BytesIO(b"fake video data"), "video/mp4")}
    response = client.post(
        "/verify",
        files=files,
        headers={"Authorization": "Bearer wrong-key"},
    )
    assert response.status_code == 401


def test_verify_rejects_unsupported_format():
    files = {"file": ("test.avi", io.BytesIO(b"fake video data"), "video/avi")}
    response = client.post(
        "/verify",
        files=files,
        headers={"Authorization": "Bearer dev-worker-api-key"},
    )
    assert response.status_code == 400


def test_verify_authentic():
    files = {"file": ("camera-footage.mp4", io.BytesIO(b"fake video data"), "video/mp4")}
    response = client.post(
        "/verify",
        files=files,
        headers={"Authorization": "Bearer dev-worker-api-key"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "authentic"
    assert data["device"]["model"] == "AXIS P3265-LVE"


def test_verify_tampered():
    files = {"file": ("tampered-video.mp4", io.BytesIO(b"fake video data"), "video/mp4")}
    response = client.post(
        "/verify",
        files=files,
        headers={"Authorization": "Bearer dev-worker-api-key"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "tampered"


def test_verify_unsigned():
    files = {"file": ("unsigned-clip.mp4", io.BytesIO(b"fake video data"), "video/mp4")}
    response = client.post(
        "/verify",
        files=files,
        headers={"Authorization": "Bearer dev-worker-api-key"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "unsigned"
