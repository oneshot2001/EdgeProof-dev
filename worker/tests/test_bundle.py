import json
import re
from datetime import datetime, timezone
from pathlib import Path

import pytest
from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.x509.oid import NameOID

from app.models.verification import mock_tampered_result
from app.services.bundle import build_bundle, verify_bundle_chain


def _pem(cert):
    return cert.public_bytes(serialization.Encoding.PEM).decode()


@pytest.fixture(scope="module")
def synthetic_pki():
    def make_chain(root_name):
        certs = []
        issuer_key = None
        for common_name, not_after, is_ca in [
            (root_name, datetime(2035, 10, 26, tzinfo=timezone.utc), True),
            ("Test Intermediate", datetime(2033, 1, 1, tzinfo=timezone.utc), True),
            ("ACCC8E000001", datetime(2031, 1, 1, tzinfo=timezone.utc), False),
        ]:
            key = ec.generate_private_key(ec.SECP256R1())
            subject = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, common_name)])
            cert = (
                x509.CertificateBuilder()
                .subject_name(subject)
                .issuer_name(certs[-1].subject if certs else subject)
                .public_key(key.public_key())
                .serial_number(x509.random_serial_number())
                .not_valid_before(datetime(2020, 1, 1, tzinfo=timezone.utc))
                .not_valid_after(not_after)
                .add_extension(x509.BasicConstraints(ca=is_ca, path_length=None), critical=True)
                .sign(issuer_key or key, hashes.SHA256())
            )
            certs.append(cert)
            issuer_key = key
        return tuple(certs)

    return {
        "trusted": make_chain("Test Root"),
        "unrelated": make_chain("Unrelated Root"),
    }


@pytest.fixture
def synthetic_bundle(tmp_path, synthetic_pki):
    root, _, _ = synthetic_pki["trusted"]
    (tmp_path / "root.pem").write_text(_pem(root))
    return build_bundle(mock_tampered_result(), "ab" * 32, "", certs_dir=tmp_path)


def test_host_verify_bundle_chain(synthetic_bundle, synthetic_pki):
    root, intermediate, leaf = synthetic_pki["trusted"]
    spki = leaf.public_key().public_bytes(
        serialization.Encoding.DER, serialization.PublicFormat.SubjectPublicKeyInfo,
    )
    digest = hashes.Hash(hashes.SHA256())
    digest.update(spki)

    result = verify_bundle_chain(
        synthetic_bundle, [_pem(leaf), _pem(intermediate)],
        at=datetime(2026, 9, 22, tzinfo=timezone.utc),
    )

    assert result == {
        "valid": True,
        "reason": "",
        "anchor_fingerprint": root.fingerprint(hashes.SHA256()).hex(),
        "leaf_subject": "CN=ACCC8E000001",
        "leaf_spki_sha256": digest.finalize().hex(),
        "leaf_not_after": "2031-01-01T00:00:00Z",
        "evaluated_at": "2026-09-22T00:00:00Z",
    }


@pytest.mark.parametrize("at", [
    datetime(2036, 1, 1, tzinfo=timezone.utc),
    datetime(2019, 12, 31, tzinfo=timezone.utc),
])
def test_host_verify_bundle_chain_outside_validity(synthetic_bundle, synthetic_pki, at):
    _, intermediate, leaf = synthetic_pki["trusted"]
    result = verify_bundle_chain(synthetic_bundle, [_pem(leaf), _pem(intermediate)], at=at)
    assert result["valid"] is False
    assert result["reason"] == "expired"


@pytest.mark.parametrize("include_root", [False, True])
def test_host_verify_bundle_chain_unrelated_root(synthetic_bundle, synthetic_pki, include_root):
    root, intermediate, leaf = synthetic_pki["unrelated"]
    chain = [_pem(leaf), _pem(intermediate)]
    if include_root:
        chain.append(_pem(root))
    result = verify_bundle_chain(
        synthetic_bundle, chain, at=datetime(2026, 9, 22, tzinfo=timezone.utc),
    )
    assert result["valid"] is False
    assert result["reason"] == "no_trust_anchor"


def test_host_verify_bundle_chain_bad_signature(synthetic_bundle, synthetic_pki):
    _, intermediate, leaf = synthetic_pki["trusted"]
    der = leaf.public_bytes(serialization.Encoding.DER)
    corrupted_leaf = x509.load_der_x509_certificate(der[:-1] + bytes([der[-1] ^ 1]))
    result = verify_bundle_chain(
        synthetic_bundle, [_pem(corrupted_leaf), _pem(intermediate)],
        at=datetime(2026, 9, 22, tzinfo=timezone.utc),
    )
    assert result["valid"] is False
    assert result["reason"] == "bad_signature"


@pytest.mark.parametrize("cert_index", [0, 1, 2])
def test_host_verify_bundle_chain_inclusive_validity(synthetic_bundle, synthetic_pki, cert_index):
    certs = synthetic_pki["trusted"][:cert_index + 1]
    chain = [_pem(cert) for cert in reversed(certs)]
    for at in (certs[-1].not_valid_before_utc, certs[-1].not_valid_after_utc):
        assert verify_bundle_chain(synthetic_bundle, chain, at=at)["valid"] is True


@pytest.mark.parametrize("cert_index,at", [
    (0, datetime(2036, 1, 1, tzinfo=timezone.utc)),
    (1, datetime(2034, 1, 1, tzinfo=timezone.utc)),
])
def test_host_verify_bundle_chain_ca_expiry(synthetic_bundle, synthetic_pki, cert_index, at):
    certs = synthetic_pki["trusted"][:cert_index + 1]
    result = verify_bundle_chain(synthetic_bundle, [_pem(cert) for cert in reversed(certs)], at=at)
    assert result["valid"] is False
    assert result["reason"] == "expired"


def test_host_build_bundle():
    result = mock_tampered_result()
    file_sha256 = "0123456789abcdef" * 4
    svf_raw_output = "PUBLIC KEY IS VALID!\nVIDEO IS INVALID!\n"
    certs_dir = Path(__file__).parents[1] / "certs"
    before = datetime.now(timezone.utc).replace(microsecond=0)

    bundle = build_bundle(result, file_sha256, svf_raw_output, str(certs_dir))

    after = datetime.now(timezone.utc)
    assert bundle["format"] == "edgeproof-bundle/1"
    assert bundle["file_sha256"] == file_sha256
    assert re.fullmatch(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z", bundle["verified_at"])
    assert before <= datetime.fromisoformat(bundle["verified_at"]) <= after
    assert bundle["result"] == result.model_dump(by_alias=True)
    assert bundle["result"]["temporal"]["gap_details"][0]["from"] == "2026-01-10T09:20:12Z"
    assert bundle["validator"] == {
        "svf_sha": "1ae9fedfe6e7a7b6db65d05cc13f6098b1f92eba",
        "svf_examples_sha": "e009c310fef10a997ffad6d21720154fbb155a38",
        "raw_output": svf_raw_output,
    }
    assert bundle["revocation"] == {"checked": False, "source": None}
    assert bundle["timestamp_proof"] is None

    pem_files = list(certs_dir.glob("*.pem"))
    anchors = bundle["trust_anchors"]
    assert len(anchors) == len(pem_files) == 9
    assert {anchor["file"] for anchor in anchors} == {path.name for path in pem_files}
    for anchor in anchors:
        pem = (certs_dir / anchor["file"]).read_text()
        cert = x509.load_pem_x509_certificate(pem.encode())
        assert anchor == {
            "file": anchor["file"],
            "subject": cert.subject.rfc4514_string(),
            "sha256_fingerprint": cert.fingerprint(hashes.SHA256()).hex(),
            "not_before": cert.not_valid_before_utc.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "not_after": cert.not_valid_after_utc.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "pem": pem,
        }

    by_file = {anchor["file"]: anchor for anchor in anchors}
    edge_vault = by_file["axis-edge-vault-ca-ecc.pem"]
    assert edge_vault["not_after"] == "2035-10-26T08:43:13Z"
    assert edge_vault["sha256_fingerprint"] == (
        "c2a6772c54cea7965d882c80243c6a1dd28d8a6ebd0bee6fa8357bec814d77a6"
    )
    assert by_file["axis-device-id-root-ca-ecc.pem"]["not_after"] == "2060-06-01T12:00:00Z"
    assert json.loads(json.dumps(bundle)) == bundle
