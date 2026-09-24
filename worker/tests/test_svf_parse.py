import pytest

from app.services import svf_runner
from app.services.result_mapper import map_to_result


# validation_results.txt from signed-video-framework-examples e009c31,
# apps/validator/main.c:469-500.
def test_host_parse_valid_video():
    result = svf_runner.parse_svf_output(
        "PUBLIC KEY IS VALID!\nVIDEO IS VALID!\n"
        "Number of valid GOPs: 3\nNumber of invalid GOPs: 0\n",
        0,
    )

    assert result["status"] == "authentic"
    assert result["signature_valid"] is True
    assert result["gops_ok"] == 3
    assert result["gops_total"] == 3
    assert result["gop_chain_intact"] is True
    assert result["public_key_validation"] == "ok"


def test_host_parse_valid_video_with_invalid_public_key():
    result = svf_runner.parse_svf_output(
        "PUBLIC KEY IS NOT VALID!\nVIDEO IS VALID!\n"
        "Number of valid GOPs: 3\nNumber of invalid GOPs: 0\n",
        0,
    )

    assert result["status"] == "inconclusive"
    assert result["has_signature"] is True
    assert result["signature_valid"] is False
    assert result["public_key_validation"] == "not_ok"


def test_host_parse_invalid_video_with_unvalidated_public_key():
    result = svf_runner.parse_svf_output(
        "PUBLIC KEY COULD NOT BE VALIDATED!\nVIDEO IS INVALID!\n"
        "Number of valid GOPs: 2\nNumber of invalid GOPs: 1\n",
        0,
    )

    assert result["status"] == "tampered"
    assert result["gops_not_ok"] == 1
    assert result["gop_chain_intact"] is False
    assert result["public_key_validation"] == "not_feasible"


def test_host_parse_video_with_missing_frames():
    result = svf_runner.parse_svf_output(
        "PUBLIC KEY IS VALID!\nVIDEO IS VALID, BUT HAS MISSING FRAMES!\n"
        "Number of valid GOPs: 2\nNumber of valid GOPs with missing BUs: 1\n"
        "Number of invalid GOPs: 0\n",
        0,
    )

    assert result["status"] == "inconclusive"
    assert result["public_key_validation"] == "ok"


def test_host_parse_unsigned_video():
    result = svf_runner.parse_svf_output(
        "VIDEO IS NOT SIGNED!\nNumber of unsigned Bitstream Units: 40\n",
        0,
    )

    assert result["status"] == "unsigned"
    assert result["frames_total"] == 40
    assert result["public_key_validation"] == "not_feasible"


def test_host_parse_legacy_signed_and_verified_video():
    result = svf_runner.parse_svf_output(
        "VIDEO IS SIGNED AND VERIFIED\nPUBLIC KEY VALIDATED\nNumber of OK Bitstream Units: 2\n",
        0,
    )

    assert result["status"] == "authentic"
    assert result["signature_valid"] is True
    assert result["gops_ok"] == 2
    assert result["gops_total"] == 2
    assert result["gop_chain_intact"] is True
    assert result["public_key_validation"] == "ok"


def test_host_public_key_validation_defaults_to_not_feasible():
    assert svf_runner.EMPTY_RESULT["public_key_validation"] == "not_feasible"
    assert svf_runner.parse_svf_output("", 0)["public_key_validation"] == "not_feasible"


@pytest.fixture
def svf_result():
    return {
        "status": "inconclusive",
        "has_signature": True,
        "signature_valid": False,
        "public_key_validation": "not_ok",
        "gops_total": 3,
        "gops_ok": 3,
        "gops_not_ok": 0,
        "first_frame_ts": "2026-01-15 14:23:07",
        "last_frame_ts": "2026-01-15 14:37:42",
        "raw_output": "",
        "error": "",
    }


def test_host_map_invalid_public_key_and_svf_timestamps(svf_result):
    result = map_to_result(svf_result, {})

    assert result.certificate_chain.valid is False
    assert result.certificate_chain.public_key_validation == "not_ok"
    assert result.attestation.valid is False
    assert result.temporal.recording_start == "2026-01-15 14:23:07"
    assert result.temporal.recording_end == "2026-01-15 14:37:42"
    assert len(result.errors) == 1
    assert "public key" in result.errors[0]


def test_host_map_valid_public_key_and_ffprobe_timestamps(svf_result):
    svf_result.update(
        status="authentic", signature_valid=True, public_key_validation="ok"
    )
    result = map_to_result(
        svf_result, {"recording_start": "X", "recording_end": "Y"}
    )

    assert result.certificate_chain.valid is True
    assert result.certificate_chain.public_key_validation == "ok"
    assert result.attestation.valid is True
    assert result.temporal.recording_start == "X"
    assert result.temporal.recording_end == "Y"
    assert result.errors == []
