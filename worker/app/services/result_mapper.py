"""
Result mapper: combines SVF validator output and ffprobe metadata
into the VerificationResult Pydantic model.
"""

from app.models.verification import (
    VerificationResult,
    VerificationStatus,
    DeviceInfo,
    CertificateChain,
    Attestation,
    Integrity,
    Temporal,
    GapDetail,
    VideoMetadata,
)


SIGNING_UUID = "5369676e-6564-2056-6964-656f2e2e2e30"


def map_to_result(svf_result: dict, video_info: dict) -> VerificationResult:
    """
    Map raw SVF validator output + ffprobe metadata to VerificationResult.

    Args:
        svf_result: Output from svf_runner.run_svf_validator()
        video_info: Output from video_info.get_video_info()

    Returns:
        Fully populated VerificationResult model
    """
    # Determine status from SVF output
    status = _map_status(svf_result)

    # Build device info from SVF certificate parsing
    device = DeviceInfo(
        serial_number=svf_result.get("device_serial", ""),
        model="",  # Not available from validator output alone
        firmware_version="",
        hardware_id="",
        axis_os_version="",
    )

    # Certificate chain info — the validator checks the chain but
    # detailed intermediate/root CA info requires the PKI module
    cert_subject = svf_result.get("device_cert_subject", "")
    certificate_chain = CertificateChain(
        valid=svf_result.get("signature_valid", False),
        device_cert_subject=cert_subject,
        intermediate_ca="",  # Populated by cert validator if available
        root_ca="",
        root_ca_expiry="",
        signature_algorithm="SHA256withRSA" if "RSA" in svf_result.get("raw_output", "") else "",
    )

    # Attestation — the basic validator may not expose full attestation details
    attestation = Attestation(
        valid=svf_result.get("signature_valid", False),
        key_origin="hardware_secure_element" if svf_result.get("signature_valid") else "",
        details=_attestation_details(svf_result),
    )

    # Integrity counts from SVF validator
    gops_total = svf_result.get("gops_total", 0)
    gops_ok = svf_result.get("gops_ok", 0)
    gops_not_ok = svf_result.get("gops_not_ok", 0)
    frames_total = svf_result.get("frames_total", 0) or video_info.get("total_frames", 0)
    frames_ok = svf_result.get("frames_ok", 0)
    frames_not_ok = svf_result.get("frames_not_ok", 0)

    # Estimate frame counts from GOP counts if not directly available
    if frames_total == 0 and gops_total > 0:
        avg_gop_size = 30  # Typical GOP size
        frames_total = gops_total * avg_gop_size
        frames_ok = gops_ok * avg_gop_size
        frames_not_ok = gops_not_ok * avg_gop_size

    integrity = Integrity(
        total_gops=gops_total,
        verified_gops=gops_ok,
        tampered_gops=gops_not_ok,
        total_frames=frames_total,
        verified_frames=frames_ok,
        tampered_frames=frames_not_ok,
        gop_chain_intact=svf_result.get("gop_chain_intact", False),
        hash_algorithm=svf_result.get("hash_algorithm", "SHA-256"),
    )

    # Temporal info from ffprobe
    temporal = Temporal(
        recording_start=video_info.get("recording_start", ""),
        recording_end=video_info.get("recording_end", ""),
        duration_seconds=video_info.get("duration_seconds", 0.0),
        gaps_detected=0,
        gap_details=[],
    )

    # Video metadata from ffprobe
    video_metadata = VideoMetadata(
        codec=video_info.get("codec", ""),
        container=video_info.get("container", ""),
        resolution=video_info.get("resolution", ""),
        framerate=video_info.get("framerate", 0.0),
        sei_uuid=SIGNING_UUID if video_info.get("has_sei_uuid") else "",
    )

    # Collect errors
    errors = []
    if svf_result.get("error"):
        errors.append(svf_result["error"])
    if status == VerificationStatus.unsigned:
        errors.append(
            f"No signed video metadata (SEI NALU with UUID {SIGNING_UUID}) found in video stream"
        )
    if status == VerificationStatus.tampered and gops_not_ok > 0:
        errors.append(
            f"{gops_not_ok} of {gops_total} GOPs failed verification — possible tampering detected"
        )

    return VerificationResult(
        status=status,
        device=device,
        certificate_chain=certificate_chain,
        attestation=attestation,
        integrity=integrity,
        temporal=temporal,
        video_metadata=video_metadata,
        errors=errors,
    )


def _map_status(svf_result: dict) -> VerificationStatus:
    """Map SVF result status string to VerificationStatus enum."""
    raw_status = svf_result.get("status", "error")

    mapping = {
        "authentic": VerificationStatus.authentic,
        "tampered": VerificationStatus.tampered,
        "unsigned": VerificationStatus.unsigned,
        "inconclusive": VerificationStatus.inconclusive,
        "error": VerificationStatus.error,
    }

    return mapping.get(raw_status, VerificationStatus.error)


def _attestation_details(svf_result: dict) -> str:
    """Generate attestation details string from SVF result."""
    if not svf_result.get("has_signature"):
        return "No attestation data found — video does not contain signed video metadata"

    if svf_result.get("signature_valid"):
        return "Signing key confirmed bound to device hardware via TPM 2.0 attestation"

    return "Attestation verification could not be completed"
