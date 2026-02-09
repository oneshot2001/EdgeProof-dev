from pydantic import BaseModel, Field
from enum import Enum
from typing import Optional
import uuid


class VerificationStatus(str, Enum):
    authentic = "authentic"
    tampered = "tampered"
    unsigned = "unsigned"
    inconclusive = "inconclusive"
    error = "error"


class DeviceInfo(BaseModel):
    serial_number: str = ""
    model: str = ""
    firmware_version: str = ""
    hardware_id: str = ""
    axis_os_version: str = ""


class CertificateChain(BaseModel):
    valid: bool = False
    device_cert_subject: str = ""
    intermediate_ca: str = ""
    root_ca: str = ""
    root_ca_expiry: str = ""
    signature_algorithm: str = ""


class Attestation(BaseModel):
    valid: bool = False
    key_origin: str = ""
    details: str = ""


class Integrity(BaseModel):
    total_gops: int = 0
    verified_gops: int = 0
    tampered_gops: int = 0
    total_frames: int = 0
    verified_frames: int = 0
    tampered_frames: int = 0
    gop_chain_intact: bool = False
    hash_algorithm: str = ""


class GapDetail(BaseModel):
    from_time: str = Field(default="", alias="from")
    to_time: str = Field(default="", alias="to")
    gap_seconds: float = 0.0

    model_config = {"populate_by_name": True}


class Temporal(BaseModel):
    recording_start: str = ""
    recording_end: str = ""
    duration_seconds: float = 0.0
    gaps_detected: int = 0
    gap_details: list[GapDetail] = []


class VideoMetadata(BaseModel):
    codec: str = ""
    container: str = ""
    resolution: str = ""
    framerate: float = 0.0
    sei_uuid: str = ""


class VerificationResult(BaseModel):
    verification_id: str = ""
    status: VerificationStatus = VerificationStatus.error
    processing_time_ms: int = 0
    device: DeviceInfo = DeviceInfo()
    certificate_chain: CertificateChain = CertificateChain()
    attestation: Attestation = Attestation()
    integrity: Integrity = Integrity()
    temporal: Temporal = Temporal()
    video_metadata: VideoMetadata = VideoMetadata()
    errors: list[str] = []


def mock_authentic_result() -> VerificationResult:
    return VerificationResult(
        verification_id=str(uuid.uuid4()),
        status=VerificationStatus.authentic,
        processing_time_ms=12450,
        device=DeviceInfo(
            serial_number="ACCC8EAB1234",
            model="AXIS P3265-LVE",
            firmware_version="11.11.65",
            hardware_id="7A3B2C1D-E4F5-6789-ABCD-EF0123456789",
            axis_os_version="11.11.65",
        ),
        certificate_chain=CertificateChain(
            valid=True,
            device_cert_subject="CN=ACCC8EAB1234",
            intermediate_ca="Axis Device ID Intermediate CA RSA 1",
            root_ca="Axis Device ID Root CA RSA",
            root_ca_expiry="2060-06-01T00:00:00Z",
            signature_algorithm="SHA256withRSA",
        ),
        attestation=Attestation(
            valid=True,
            key_origin="hardware_secure_element",
            details="Signing key confirmed bound to device hardware via TPM 2.0 attestation",
        ),
        integrity=Integrity(
            total_gops=847,
            verified_gops=847,
            tampered_gops=0,
            total_frames=25410,
            verified_frames=25410,
            tampered_frames=0,
            gop_chain_intact=True,
            hash_algorithm="SHA-256",
        ),
        temporal=Temporal(
            recording_start="2026-01-15T14:23:07Z",
            recording_end="2026-01-15T14:37:42Z",
            duration_seconds=875,
            gaps_detected=0,
            gap_details=[],
        ),
        video_metadata=VideoMetadata(
            codec="H.264",
            container="MP4",
            resolution="1920x1080",
            framerate=29.0,
            sei_uuid="5369676e-6564-2056-6964-656f2e2e2e30",
        ),
        errors=[],
    )


def mock_tampered_result() -> VerificationResult:
    return VerificationResult(
        verification_id=str(uuid.uuid4()),
        status=VerificationStatus.tampered,
        processing_time_ms=8320,
        device=DeviceInfo(
            serial_number="ACCC8EAB5678",
            model="AXIS Q6135-LE",
            firmware_version="11.10.42",
            hardware_id="1B2C3D4E-F5A6-7890-BCDE-F01234567890",
            axis_os_version="11.10.42",
        ),
        certificate_chain=CertificateChain(
            valid=True,
            device_cert_subject="CN=ACCC8EAB5678",
            intermediate_ca="Axis Device ID Intermediate CA RSA 2",
            root_ca="Axis Device ID Root CA RSA",
            root_ca_expiry="2060-06-01T00:00:00Z",
            signature_algorithm="SHA256withRSA",
        ),
        attestation=Attestation(
            valid=True,
            key_origin="hardware_secure_element",
            details="Signing key confirmed bound to device hardware via TPM 2.0 attestation",
        ),
        integrity=Integrity(
            total_gops=523,
            verified_gops=489,
            tampered_gops=34,
            total_frames=15690,
            verified_frames=14670,
            tampered_frames=1020,
            gop_chain_intact=False,
            hash_algorithm="SHA-256",
        ),
        temporal=Temporal(
            recording_start="2026-01-10T09:15:00Z",
            recording_end="2026-01-10T09:32:18Z",
            duration_seconds=1038,
            gaps_detected=2,
            gap_details=[
                GapDetail(from_time="2026-01-10T09:20:12Z", to_time="2026-01-10T09:20:45Z", gap_seconds=33),
                GapDetail(from_time="2026-01-10T09:28:00Z", to_time="2026-01-10T09:28:14Z", gap_seconds=14),
            ],
        ),
        video_metadata=VideoMetadata(
            codec="H.264",
            container="MP4",
            resolution="2560x1440",
            framerate=15.0,
            sei_uuid="5369676e-6564-2056-6964-656f2e2e2e30",
        ),
        errors=["GOP chain broken at GOP #312 — possible frame insertion or deletion detected"],
    )


def mock_unsigned_result() -> VerificationResult:
    return VerificationResult(
        verification_id=str(uuid.uuid4()),
        status=VerificationStatus.unsigned,
        processing_time_ms=2150,
        device=DeviceInfo(),
        certificate_chain=CertificateChain(),
        attestation=Attestation(
            details="No attestation data found — video does not contain signed video metadata",
        ),
        integrity=Integrity(),
        temporal=Temporal(),
        video_metadata=VideoMetadata(
            codec="H.264",
            container="MP4",
            resolution="1280x720",
            framerate=30.0,
        ),
        errors=[
            "No signed video metadata (SEI NALU with UUID 5369676e-6564-2056-6964-656f2e2e2e30) found in video stream",
        ],
    )
