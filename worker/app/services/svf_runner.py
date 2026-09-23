"""
SVF (Signed Video Framework) validator subprocess wrapper.

Runs the compiled validator binary from the signed-video-framework-examples
repo as a subprocess and parses its output into a structured dict.

The validator writes results to a file (validation_results.txt) in the
current working directory. This module reads that file after execution.

The validator binary is built during Docker image creation and installed
to the system PATH via meson install.
"""

import os
import shutil
import re
import stat
import tempfile
from pathlib import Path
from typing import Optional

from app.config import settings
from app.sandbox import run_sandboxed


# Possible binary names from the examples repo
VALIDATOR_BINARY_NAMES = [
    "signed-video-validator",
    "sv_validator",
    "validator",
]

SVF_TIMEOUT_SECONDS = 120

# Map ffprobe codec names to validator -c flag values
CODEC_FLAG_MAP = {
    "h264": "h264",
    "H.264": "h264",
    "hevc": "h265",
    "h265": "h265",
    "H.265": "h265",
    "av1": "av1",
    "AV1": "av1",
}

EMPTY_RESULT = {
    "success": False,
    "status": "error",
    "error": "",
    "raw_output": "",
    "gops_total": 0,
    "gops_ok": 0,
    "gops_not_ok": 0,
    "frames_total": 0,
    "frames_ok": 0,
    "frames_not_ok": 0,
    "has_signature": False,
    "signature_valid": False,
    "public_key_validation": "not_feasible",
    "gop_chain_intact": False,
    "device_serial": "",
    "device_cert_subject": "",
    "hash_algorithm": "",
}


def find_validator_binary() -> Optional[str]:
    """Find the SVF validator binary on the system PATH."""
    for name in VALIDATOR_BINARY_NAMES:
        path = shutil.which(name)
        if path:
            return path
    for prefix in ["/usr/local/bin", "/opt/svf-examples-build"]:
        for name in VALIDATOR_BINARY_NAMES:
            full = f"{prefix}/{name}"
            if os.path.isfile(full) and os.access(full, os.X_OK):
                return full
    return None


async def run_svf_validator(file_path: str, codec: str = "h264") -> dict:
    """
    Run the SVF validator binary against a video file.

    Args:
        file_path: Path to the video file to validate.
        codec: Video codec name (h264, h265/hevc, av1). Used to pass
               the correct -c flag to the validator binary.

    Returns a structured dict with verification results parsed from
    the validator's output file (validation_results.txt).
    """
    binary = find_validator_binary()
    if not binary:
        return {**EMPTY_RESULT, "error": "SVF validator binary not found. Ensure signed-video-framework-examples is built."}

    # Resolve the codec flag
    codec_flag = CODEC_FLAG_MAP.get(codec, "h264")

    # Run the validator in a temp directory so validation_results.txt
    # doesn't collide between concurrent requests
    os.makedirs(settings.temp_dir, mode=0o700, exist_ok=True)
    os.chmod(settings.temp_dir, 0o700)
    work_dir = tempfile.mkdtemp(prefix="svf_", dir=settings.temp_dir)
    os.chmod(work_dir, 0o700)

    try:
        resolved_file_path = str(Path(file_path).resolve(strict=True))
        cmd = [binary, "-c", codec_flag, resolved_file_path]

        sandbox_result = await run_sandboxed(
            cmd,
            ro_paths=[resolved_file_path],
            scratch_dir=work_dir,
            timeout=SVF_TIMEOUT_SECONDS,
        )

        if sandbox_result.timed_out:
            return _error_result(f"SVF validator timed out after {SVF_TIMEOUT_SECONDS}s")
        if sandbox_result.launch_failed:
            return _error_result("SVF validator sandbox launch failed")
        if sandbox_result.rlimit_killed or sandbox_result.returncode < 0:
            return _error_result("SVF validator was killed by sandbox resource limits")
        if sandbox_result.output_overflow or sandbox_result.sandbox_error == "output_limit_exceeded":
            return _error_result("SVF validator exceeded sandbox output limit")
        if sandbox_result.returncode != 0:
            return _error_result("SVF validator exited non-zero")

        stdout = sandbox_result.stdout.decode("utf-8", errors="replace")
        stderr = sandbox_result.stderr.decode("utf-8", errors="replace")

        # The validator writes detailed results to validation_results.txt
        file_output, file_error = _read_validation_results(work_dir)
        if file_error:
            return _error_result(file_error)

        # Combine all output sources for parsing
        combined = file_output + "\n" + stdout + "\n" + stderr

        return parse_svf_output(combined, sandbox_result.returncode)

    except Exception:
        return _error_result("SVF validator failed")
    finally:
        shutil.rmtree(work_dir, ignore_errors=True)


def _error_result(message: str) -> dict:
    return {**EMPTY_RESULT, "error": message}


def _read_validation_results(work_dir: str) -> tuple[str, str | None]:
    flags = os.O_RDONLY | getattr(os, "O_DIRECTORY", 0)
    dir_fd = os.open(work_dir, flags)
    try:
        try:
            fd = os.open(
                "validation_results.txt",
                os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0),
                dir_fd=dir_fd,
            )
        except FileNotFoundError:
            return "", None
        except OSError:
            return "", "SVF validator result file rejected"

        with os.fdopen(fd, "rb") as f:
            file_stat = os.fstat(f.fileno())
            if not stat.S_ISREG(file_stat.st_mode):
                return "", "SVF validator result file rejected"
            data = f.read(settings.sandbox_rlimit_fsize_bytes + 1)
        if len(data) > settings.sandbox_rlimit_fsize_bytes:
            return "", "SVF validator result file too large"
        return data.decode("utf-8", errors="replace"), None
    finally:
        os.close(dir_fd)


def parse_svf_output(output: str, return_code: int) -> dict:
    """
    Parse the SVF validator's combined output into a structured dict.

    Threat-model flag: status is still inferred from validator text in
    successful runs. Anchoring this to one authoritative status line is
    deferred per Increment 1 amendment 21.

    Handles the validation_results.txt format produced by SVF v2.x:
    - "VIDEO IS VALID!" / "VIDEO IS INVALID!" / missing frames
    - "PUBLIC KEY IS VALID!" / "PUBLIC KEY IS NOT VALID!"
    - "Number of valid/invalid GOPs: N"
    - "VIDEO IS NOT SIGNED!" / "VIDEO IS SIGNED AND VERIFIED"
    - "PUBLIC KEY VALIDATED" / "PUBLIC KEY COULD NOT BE VALIDATED!"
    - "Number of unsigned/OK/NOT OK Bitstream Units: N"
    - Product Info section (Hardware ID, Serial Number, etc.)
    - Signed Video timestamps section
    - Also handles legacy patterns from stdout (Validation: OK, etc.)
    """
    result = {
        "success": return_code == 0,
        "status": "inconclusive",
        "error": "",
        "raw_output": output,
        "gops_total": 0,
        "gops_ok": 0,
        "gops_not_ok": 0,
        "frames_total": 0,
        "frames_ok": 0,
        "frames_not_ok": 0,
        "has_signature": False,
        "signature_valid": False,
        "public_key_validation": "not_feasible",
        "gop_chain_intact": False,
        "device_serial": "",
        "device_cert_subject": "",
        "hash_algorithm": "",
    }

    lower_output = output.lower()

    # --- SVF v2.x validation_results.txt format ---

    # Detect unsigned video (no signed video metadata found)
    if "video is not signed" in lower_output:
        result["status"] = "unsigned"
        result["has_signature"] = False
        # Parse unsigned bitstream unit count as frame count
        unsigned_count = _extract_int(output, r"Number of unsigned Bitstream Units:\s*(\d+)")
        if unsigned_count > 0:
            result["frames_total"] = unsigned_count
        return result

    # Detect signed and verified
    if "video is signed and verified" in lower_output:
        result["has_signature"] = True
        result["signature_valid"] = True
        result["status"] = "authentic"

    # Detect signed but NOT verified (tampered)
    if "video is signed" in lower_output and "not verified" in lower_output:
        result["has_signature"] = True
        result["signature_valid"] = False
        result["status"] = "tampered"

    # Public key validation
    if "public key is not valid" in lower_output:
        result["public_key_validation"] = "not_ok"
        result["signature_valid"] = False
    elif "public key could not be validated" in lower_output:
        result["public_key_validation"] = "not_feasible"
    elif "public key is valid" in lower_output or (
        "public key validated" in lower_output and "could not" not in lower_output
    ):
        result["public_key_validation"] = "ok"
        result["signature_valid"] = True

    # Parse Bitstream Unit counts (SVF v2.x format)
    ok_units = _extract_int(output, r"Number of OK Bitstream Units:\s*(\d+)")
    not_ok_units = _extract_int(output, r"Number of NOT OK Bitstream Units:\s*(\d+)")
    unsigned_units = _extract_int(output, r"Number of unsigned Bitstream Units:\s*(\d+)")

    if ok_units > 0:
        result["gops_ok"] = ok_units
    if not_ok_units > 0:
        result["gops_not_ok"] = not_ok_units

    total = ok_units + not_ok_units + unsigned_units
    if total > 0:
        result["gops_total"] = ok_units + not_ok_units
        result["frames_total"] = total

    # If we have OK units and no NOT OK, chain is intact
    if ok_units > 0 and not_ok_units == 0:
        result["gop_chain_intact"] = True
    elif not_ok_units > 0:
        result["gop_chain_intact"] = False

    # Pinned validator GOP counts are separate from Bitstream Unit counts.
    valid_gops = _extract_int(output, r"Number of valid GOPs:\s*(\d+)")
    invalid_gops = _extract_int(output, r"Number of invalid GOPs:\s*(\d+)")
    missing_gops = _extract_int(output, r"Number of valid GOPs with missing BUs:\s*(\d+)")
    if valid_gops + invalid_gops + missing_gops > 0:
        result["gops_ok"] = valid_gops
        result["gops_not_ok"] = invalid_gops
        result["gops_total"] = valid_gops + invalid_gops + missing_gops
        result["gop_chain_intact"] = invalid_gops == 0 and missing_gops == 0

    # Parse Product Info section
    serial_match = re.search(r"Serial Number:\s*(\S+)", output)
    if serial_match and serial_match.group(1).strip():
        serial = serial_match.group(1).strip()
        result["device_serial"] = serial
        result["device_cert_subject"] = f"CN={serial}"

    hw_match = re.search(r"Hardware ID:\s*(\S+)", output)
    if hw_match and hw_match.group(1).strip():
        result["hardware_id"] = hw_match.group(1).strip()

    firmware_match = re.search(r"Firmware version:\s*(\S+)", output)
    if firmware_match and firmware_match.group(1).strip():
        result["firmware_version"] = firmware_match.group(1).strip()

    # Parse timestamps
    first_frame_match = re.search(r"First frame:\s+(.+)", output)
    if first_frame_match:
        ts = first_frame_match.group(1).strip()
        if ts != "N/A":
            result["first_frame_ts"] = ts

    last_frame_match = re.search(r"Last validated frame:\s+(.+)", output)
    if last_frame_match:
        ts = last_frame_match.group(1).strip()
        if ts != "N/A":
            result["last_frame_ts"] = ts

    # Parse SVF version info
    version_match = re.search(r"Camera runs:\s+(\S+)", output)
    if version_match:
        v = version_match.group(1).strip()
        if v != "N/A":
            result["camera_svf_version"] = v

    # --- Legacy stdout patterns (fallback) ---

    if result["status"] == "inconclusive":
        if "validation: ok" in lower_output or "result: ok" in lower_output or "valid: true" in lower_output:
            result["signature_valid"] = True
            result["status"] = "authentic"
            result["has_signature"] = True
        elif "validation: not ok" in lower_output or "result: not ok" in lower_output or "valid: false" in lower_output:
            result["signature_valid"] = False
            result["status"] = "tampered"
            result["has_signature"] = True
        elif "no signed video" in lower_output or "no signature" in lower_output:
            result["status"] = "unsigned"
            result["has_signature"] = False

    # Pinned validator verdicts take precedence over legacy stdout patterns.
    if "video is invalid!" in lower_output:
        result["has_signature"] = True
        result["signature_valid"] = False
        result["status"] = "tampered"
    elif "video is valid, but has missing frames!" in lower_output:
        result["has_signature"] = True
        result["signature_valid"] = False
        result["status"] = "inconclusive"
    elif "video is valid!" in lower_output:
        result["has_signature"] = True
        result["signature_valid"] = result["public_key_validation"] == "ok"
        result["status"] = "authentic" if result["signature_valid"] else "inconclusive"

    if result["public_key_validation"] == "not_ok":
        result["signature_valid"] = False
        if result["status"] == "authentic":
            result["status"] = "inconclusive"

    # Legacy GOP/frame count patterns
    if result["gops_total"] == 0:
        gop_total = _extract_int(output, r"(?:total\s+)?gops?\s*[:=]\s*(\d+)")
        gop_ok = _extract_int(output, r"gops?\s+(?:ok|valid|verified)\s*[:=]\s*(\d+)")
        gop_not_ok = _extract_int(output, r"gops?\s+(?:not\s+ok|invalid|tampered|failed)\s*[:=]\s*(\d+)")
        if gop_total > 0:
            result["gops_total"] = gop_total
        if gop_ok > 0:
            result["gops_ok"] = gop_ok
        if gop_not_ok > 0:
            result["gops_not_ok"] = gop_not_ok
        if result["gops_total"] == 0 and (result["gops_ok"] > 0 or result["gops_not_ok"] > 0):
            result["gops_total"] = result["gops_ok"] + result["gops_not_ok"]

    # Parse certificate subject (CN=...)
    if not result["device_cert_subject"]:
        cn_match = re.search(r"CN\s*=\s*([A-Z0-9]+)", output)
        if cn_match:
            result["device_cert_subject"] = f"CN={cn_match.group(1)}"
            serial = cn_match.group(1)
            if serial.startswith("ACCC"):
                result["device_serial"] = serial

    # Parse hash algorithm
    if "sha-256" in lower_output or "sha256" in lower_output:
        result["hash_algorithm"] = "SHA-256"
    elif "sha-512" in lower_output or "sha512" in lower_output:
        result["hash_algorithm"] = "SHA-512"

    # Handle error case
    if result["status"] == "inconclusive" and return_code != 0:
        result["status"] = "error"
        result["error"] = output.strip()[:500]

    return result


def _extract_int(text: str, pattern: str) -> int:
    """Extract first integer match from text using a regex pattern."""
    match = re.search(pattern, text, re.IGNORECASE)
    if match:
        try:
            return int(match.group(1))
        except (ValueError, IndexError):
            pass
    return 0
