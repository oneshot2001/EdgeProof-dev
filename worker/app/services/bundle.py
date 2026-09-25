from datetime import datetime, timezone
from pathlib import Path

from cryptography import x509
from cryptography.hazmat.primitives import hashes

from app.models.verification import VerificationResult


def build_bundle(
    result: VerificationResult,
    file_sha256: str,
    svf_raw_output: str,
    certs_dir: str,
) -> dict:
    """Package a verification result with validator identity and local certificates."""
    trust_anchors = []
    for path in sorted(Path(certs_dir).glob("*.pem")):
        pem = path.read_text()
        cert = x509.load_pem_x509_certificate(pem.encode())
        trust_anchors.append({
            "file": path.name,
            "subject": cert.subject.rfc4514_string(),
            "sha256_fingerprint": cert.fingerprint(hashes.SHA256()).hex(),
            "not_before": cert.not_valid_before_utc.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "not_after": cert.not_valid_after_utc.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "pem": pem,
        })

    return {
        "format": "edgeproof-bundle/1",
        "file_sha256": file_sha256,
        "verified_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "result": result.model_dump(by_alias=True),
        "validator": {
            "svf_sha": "1ae9fedfe6e7a7b6db65d05cc13f6098b1f92eba",
            "svf_examples_sha": "e009c310fef10a997ffad6d21720154fbb155a38",
            "raw_output": svf_raw_output,
        },
        "revocation": {"checked": False, "source": None},
        "timestamp_proof": None,
        "trust_anchors": trust_anchors,
    }
