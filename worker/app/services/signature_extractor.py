"""
Signature extractor service.

Responsible for extracting cryptographic signatures embedded in video frames
as SEI NALU "user data unregistered" (H.264/H.265) payloads.

Each signed GOP contains:
- Frame content hashes
- GOP hash (combined frame hashes)
- Digital signature (RSA/ECDSA) from device video signing key
- Device certificate
- Attestation data
- Link hash to next GOP (first I-frame hash of subsequent GOP)
"""


async def extract_signatures(file_path: str) -> dict:
    """Extract all cryptographic signatures from a video file."""
    # TODO: Implement real signature extraction
    # In production, this would:
    # 1. Parse each NALU looking for SEI type 5 with UUID 5369676e-6564-2056-6964-656f2e2e2e30
    # 2. Decode the signature payload
    # 3. Extract the embedded certificate
    # 4. Return structured signature data per GOP
    return {
        "signatures_found": 847,
        "device_certificate": "mock-cert-data",
        "attestation_report": "mock-attestation",
    }
