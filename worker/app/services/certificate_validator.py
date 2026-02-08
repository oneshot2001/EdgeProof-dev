"""
Certificate validator service.

Validates the device certificate chain against the Axis PKI:
- Device certificate (IDevID per IEEE 802.1AR)
- Intermediate CA (one of 6: RSA 1-3, ECC 1-3)
- Root CA (RSA or ECC, valid until 2060)

Certificates are embedded in the Docker image at /app/certs/.
"""

from pathlib import Path

CERTS_DIR = Path("/app/certs")


async def validate_certificate_chain(device_cert: str) -> dict:
    """Validate a device certificate against the Axis PKI chain."""
    # TODO: Implement real certificate validation using cryptography library
    # In production:
    # 1. Parse the device certificate (X.509)
    # 2. Find the matching intermediate CA
    # 3. Verify intermediate → root CA chain
    # 4. Check certificate validity dates
    # 5. Verify certificate has not been revoked
    return {
        "valid": True,
        "device_cert_subject": "CN=ACCC8EAB1234",
        "intermediate_ca": "Axis Device ID Intermediate CA RSA 1",
        "root_ca": "Axis Device ID Root CA RSA",
        "root_ca_expiry": "2060-06-01T00:00:00Z",
        "signature_algorithm": "SHA256withRSA",
    }
