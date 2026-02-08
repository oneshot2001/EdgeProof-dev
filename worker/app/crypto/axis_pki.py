"""
Axis PKI certificate bundle loader.

Loads the Axis Communications root and intermediate CA certificates
from the embedded PEM files in /app/certs/.

Certificate hierarchy:
  Axis Device ID Root CA RSA (valid until 2060)
  ├── Axis Device ID Intermediate CA RSA 1 (valid until 2055)
  ├── Axis Device ID Intermediate CA RSA 2
  └── Axis Device ID Intermediate CA RSA 3

  Axis Device ID Root CA ECC (valid until 2060)
  ├── Axis Device ID Intermediate CA ECC 1 (valid until 2055)
  ├── Axis Device ID Intermediate CA ECC 2
  └── Axis Device ID Intermediate CA ECC 3
"""

from pathlib import Path
from typing import Optional

CERTS_DIR = Path("/app/certs")


def load_root_certificates() -> list[str]:
    """Load all Axis root CA certificates."""
    roots = []
    for cert_file in CERTS_DIR.glob("axis-device-id-root-ca-*.pem"):
        roots.append(cert_file.read_text())
    return roots


def load_intermediate_certificates() -> list[str]:
    """Load all Axis intermediate CA certificates."""
    intermediates = []
    for cert_file in CERTS_DIR.glob("axis-device-id-intermediate-ca-*.pem"):
        intermediates.append(cert_file.read_text())
    return intermediates


def get_trust_store() -> dict:
    """
    Build a trust store from the embedded Axis PKI certificates.

    Returns a dict with root and intermediate certificates ready for
    chain validation.
    """
    return {
        "roots": load_root_certificates(),
        "intermediates": load_intermediate_certificates(),
    }
