from datetime import datetime, timezone
from pathlib import Path

from cryptography import x509
from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import hashes, serialization

from app.models.verification import VerificationResult


def build_bundle(
    result: VerificationResult,
    file_sha256: str,
    svf_raw_output: str,
    certs_dir: str,
    chain_pems: list[str] | None = None,
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

    device_key = None
    if chain_pems:
        leaf = x509.load_pem_x509_certificate(chain_pems[0].encode())
        digest = hashes.Hash(hashes.SHA256())
        digest.update(leaf.public_key().public_bytes(
            serialization.Encoding.DER, serialization.PublicFormat.SubjectPublicKeyInfo,
        ))
        device_key = {
            "attestation_leaf_spki_sha256": digest.finalize().hex(),
            "signing_key_spki_sha256": None,
            "leaf_serial": leaf.serial_number,
            "not_before": leaf.not_valid_before_utc.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "not_after": leaf.not_valid_after_utc.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "subject": leaf.subject.rfc4514_string(),
        }

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
        "device_key": device_key,
        "trust_anchors": trust_anchors,
    }


def verify_bundle_chain(bundle: dict, chain_pems: list[str], at: datetime) -> dict:
    """Walk a leaf-first chain using only the bundle's embedded trust anchors."""
    if at.tzinfo is None or at.utcoffset() is None:
        raise ValueError("at must be timezone-aware")
    at = at.astimezone(timezone.utc)
    chain = [x509.load_pem_x509_certificate(pem.encode()) for pem in chain_pems]
    if not chain:
        raise ValueError("chain_pems must contain a leaf certificate")
    anchors = [
        x509.load_pem_x509_certificate(anchor["pem"].encode())
        for anchor in bundle["trust_anchors"]
    ]
    anchor_fingerprints = {cert.fingerprint(hashes.SHA256()) for cert in anchors}
    leaf = chain[0]
    digest = hashes.Hash(hashes.SHA256())
    digest.update(leaf.public_key().public_bytes(
        serialization.Encoding.DER, serialization.PublicFormat.SubjectPublicKeyInfo,
    ))
    result = {
        "valid": False,
        "reason": "no_trust_anchor",
        "anchor_fingerprint": None,
        "leaf_subject": leaf.subject.rfc4514_string(),
        "leaf_spki_sha256": digest.finalize().hex(),
        "leaf_not_after": leaf.not_valid_after_utc.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "evaluated_at": at.strftime("%Y-%m-%dT%H:%M:%SZ"),
    }
    cert = leaf
    visited = set()
    while True:
        fingerprint = cert.fingerprint(hashes.SHA256())
        if fingerprint in visited:
            return result
        visited.add(fingerprint)
        if not cert.not_valid_before_utc <= at <= cert.not_valid_after_utc:
            result["reason"] = "expired"
            return result
        if fingerprint in anchor_fingerprints:
            result.update(valid=True, reason="", anchor_fingerprint=fingerprint.hex())
            return result
        candidates = [
            candidate for candidate in chain[1:] + anchors if candidate.subject == cert.issuer
        ]
        if not candidates:
            return result
        for issuer in candidates:
            try:
                cert.verify_directly_issued_by(issuer)
            except (InvalidSignature, ValueError):
                continue
            break
        else:
            result["reason"] = "bad_signature"
            return result
        if issuer.fingerprint(hashes.SHA256()) not in anchor_fingerprints:
            try:
                is_ca = issuer.extensions.get_extension_for_class(x509.BasicConstraints).value.ca
            except x509.ExtensionNotFound:
                is_ca = False
            if not is_ca:
                result["reason"] = "not_ca"
                return result
        cert = issuer
