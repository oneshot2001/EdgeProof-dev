"""
Cryptographic signature validators.

Provides RSA and ECDSA signature verification for signed video GOPs.

In production:
- Verifies RSA-2048/4096 signatures using SHA-256 digest
- Verifies ECDSA-P256 signatures using SHA-256 digest
- Validates signed data matches recomputed GOP hash
"""


async def verify_rsa_signature(
    public_key_pem: str,
    signature: bytes,
    data: bytes,
) -> bool:
    """Verify an RSA signature against the provided data."""
    # TODO: Implement using cryptography library
    # from cryptography.hazmat.primitives import hashes, serialization
    # from cryptography.hazmat.primitives.asymmetric import padding
    return True


async def verify_ecdsa_signature(
    public_key_pem: str,
    signature: bytes,
    data: bytes,
) -> bool:
    """Verify an ECDSA-P256 signature against the provided data."""
    # TODO: Implement using cryptography library
    return True
