from app.services import svf_runner


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
