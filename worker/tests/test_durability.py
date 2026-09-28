import hashlib
import json
import socket
from datetime import datetime, timezone

import httpx
import pytest
from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec

from app.models.verification import mock_tampered_result
from app.services import bundle as bundle_service
from app.services.bundle import build_bundle, verify_bundle_chain


def _spki_sha256(cert):
    return hashlib.sha256(cert.public_key().public_bytes(
        serialization.Encoding.DER, serialization.PublicFormat.SubjectPublicKeyInfo,
    )).hexdigest()


@pytest.fixture
def durability_case(tmp_path, synthetic_pki, monkeypatch):
    root, intermediate, leaf = synthetic_pki["trusted"]
    root_path = tmp_path / "root.pem"
    root_path.write_bytes(root.public_bytes(serialization.Encoding.PEM))
    chain = [
        cert.public_bytes(serialization.Encoding.PEM).decode()
        for cert in (leaf, intermediate)
    ]

    class VerificationTime(datetime):
        @classmethod
        def now(cls, tz=None):
            return datetime(2026, 9, 22, tzinfo=timezone.utc).astimezone(tz)

    with monkeypatch.context() as clock:
        clock.setattr(bundle_service, "datetime", VerificationTime)
        bundle = build_bundle(
            mock_tampered_result(), "ab" * 32, "", certs_dir=tmp_path, chain_pems=chain,
        )

    rotated_key = ec.generate_private_key(ec.SECP256R1())
    rotated_leaf = (
        x509.CertificateBuilder()
        .subject_name(leaf.subject)
        .issuer_name(intermediate.subject)
        .public_key(rotated_key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(datetime(2027, 1, 1, tzinfo=timezone.utc))
        .not_valid_after(datetime(2031, 1, 1, tzinfo=timezone.utc))
        .add_extension(x509.BasicConstraints(ca=False, path_length=None), critical=True)
        .sign(synthetic_pki["trusted_keys"][1], hashes.SHA256())
    )
    at = datetime(2028, 1, 1, tzinfo=timezone.utc)
    online_result = verify_bundle_chain(bundle, chain, at=at)
    return bundle, chain, rotated_leaf, at, online_result


def test_host_durability_rotation(durability_case, synthetic_pki):
    bundle, _, rotated_leaf, _, online_result = durability_case
    root, intermediate, leaf = synthetic_pki["trusted"]
    rotated_leaf.verify_directly_issued_by(intermediate)
    assert rotated_leaf.subject == leaf.subject
    assert rotated_leaf.not_valid_before_utc == datetime(2027, 1, 1, tzinfo=timezone.utc)
    assert bundle["verified_at"] == "2026-09-22T00:00:00Z"
    assert bundle["device_key"] == {
        "attestation_leaf_spki_sha256": _spki_sha256(leaf),
        "signing_key_spki_sha256": None,
        "leaf_serial": leaf.serial_number,
        "not_before": "2020-01-01T00:00:00Z",
        "not_after": "2031-01-01T00:00:00Z",
        "subject": "CN=ACCC8E000001",
    }
    assert bundle["device_key"]["attestation_leaf_spki_sha256"] != _spki_sha256(rotated_leaf)
    assert online_result == {
        "valid": True,
        "reason": "",
        "anchor_fingerprint": root.fingerprint(hashes.SHA256()).hex(),
        "leaf_subject": "CN=ACCC8E000001",
        "leaf_spki_sha256": _spki_sha256(leaf),
        "leaf_not_after": "2031-01-01T00:00:00Z",
        "evaluated_at": "2028-01-01T00:00:00Z",
    }


def test_host_durability_expiry(durability_case):
    bundle, chain, _, _, _ = durability_case
    expired = verify_bundle_chain(
        bundle, chain, at=datetime(2036, 1, 1, tzinfo=timezone.utc),
    )
    assert expired["valid"] is False
    assert expired["reason"] == "expired"
    original = verify_bundle_chain(
        bundle, chain, at=datetime.fromisoformat(bundle["verified_at"].replace("Z", "+00:00")),
    )
    assert original["valid"] is True
    # Historical validity still needs an external timestamp to prove verification time.
    assert bundle["timestamp_proof"] is None


def test_host_durability_offline(durability_case, tmp_path, monkeypatch):
    bundle, chain, _, at, online_result = durability_case
    bundle_path = tmp_path / "bundle.json"
    with bundle_path.open("w") as output:
        json.dump(bundle, output)
    with bundle_path.open() as source:
        reloaded = json.load(source)
    assert reloaded == bundle
    (tmp_path / "root.pem").unlink()

    def offline(*args, **kwargs):
        raise OSError("offline")

    monkeypatch.setattr(socket, "socket", offline)
    monkeypatch.setattr(httpx.AsyncClient, "__init__", offline)
    assert online_result["valid"] is True
    assert verify_bundle_chain(reloaded, chain, at=at) == online_result


@pytest.mark.parametrize("kwargs", [{}, {"chain_pems": None}, {"chain_pems": []}])
def test_host_build_bundle_without_device_key(tmp_path, kwargs):
    bundle = build_bundle(mock_tampered_result(), "ab" * 32, "", certs_dir=tmp_path, **kwargs)
    assert bundle["device_key"] is None
