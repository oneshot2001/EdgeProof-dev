import json
import re
from datetime import datetime, timezone
from pathlib import Path

from cryptography import x509
from cryptography.hazmat.primitives import hashes

from app.models.verification import mock_tampered_result
from app.services.bundle import build_bundle


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
