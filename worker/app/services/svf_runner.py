"""
SVF (Signed Video Framework) validator subprocess wrapper.

Runs the compiled validator binary from the signed-video-framework-examples
repo as a subprocess and parses its stdout output into a structured dict.

The validator binary is built during Docker image creation and installed
to the system PATH via meson install.
"""

import asyncio
import shutil
import re
from typing import Optional


# Possible binary names from the examples repo
VALIDATOR_BINARY_NAMES = [
    "signed-video-validator",
    "sv_validator",
    "validator",
]

SVF_TIMEOUT_SECONDS = 120


def find_validator_binary() -> Optional[str]:
    """Find the SVF validator binary on the system PATH."""
    for name in VALIDATOR_BINARY_NAMES:
        path = shutil.which(name)
        if path:
            return path
    # Check common install locations
    for prefix in ["/usr/local/bin", "/opt/svf-examples-build"]:
        for name in VALIDATOR_BINARY_NAMES:
            path = f"{prefix}/{name}"
            import os
            if os.path.isfile(path) and os.access(path, os.X_OK):
                return path
    return None


async def run_svf_validator(file_path: str) -> dict:
    """
    Run the SVF validator binary against a video file.

    Returns a structured dict with verification results parsed from
    the validator's stdout output.

    If the validator binary is not found, returns an error result
    indicating the binary is unavailable.
    """
    binary = find_validator_binary()
    if not binary:
        return {
            "success": False,
            "status": "error",
            "error": "SVF validator binary not found. Ensure signed-video-framework-examples is built.",
            "raw_output": "",
            "gops_total": 0,
            "gops_ok": 0,
            "gops_not_ok": 0,
            "frames_total": 0,
            "frames_ok": 0,
            "frames_not_ok": 0,
            "has_signature": False,
            "signature_valid": False,
            "gop_chain_intact": False,
            "device_serial": "",
            "device_cert_subject": "",
            "hash_algorithm": "",
        }

    try:
        process = await asyncio.create_subprocess_exec(
            binary, file_path,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        stdout_bytes, stderr_bytes = await asyncio.wait_for(
            process.communicate(),
            timeout=SVF_TIMEOUT_SECONDS,
        )

        stdout = stdout_bytes.decode("utf-8", errors="replace")
        stderr = stderr_bytes.decode("utf-8", errors="replace")
        combined = stdout + "\n" + stderr

        return parse_svf_output(combined, process.returncode or 0)

    except asyncio.TimeoutError:
        return {
            "success": False,
            "status": "error",
            "error": f"SVF validator timed out after {SVF_TIMEOUT_SECONDS}s",
            "raw_output": "",
            "gops_total": 0,
            "gops_ok": 0,
            "gops_not_ok": 0,
            "frames_total": 0,
            "frames_ok": 0,
            "frames_not_ok": 0,
            "has_signature": False,
            "signature_valid": False,
            "gop_chain_intact": False,
            "device_serial": "",
            "device_cert_subject": "",
            "hash_algorithm": "",
        }
    except Exception as e:
        return {
            "success": False,
            "status": "error",
            "error": f"SVF validator failed: {str(e)}",
            "raw_output": "",
            "gops_total": 0,
            "gops_ok": 0,
            "gops_not_ok": 0,
            "frames_total": 0,
            "frames_ok": 0,
            "frames_not_ok": 0,
            "has_signature": False,
            "signature_valid": False,
            "gop_chain_intact": False,
            "device_serial": "",
            "device_cert_subject": "",
            "hash_algorithm": "",
        }


def parse_svf_output(output: str, return_code: int) -> dict:
    """
    Parse the SVF validator's text output into a structured dict.

    The exact output format depends on the validator binary version.
    This parser handles common patterns found in the SVF examples output:
    - "Validation: OK" / "Validation: NOT OK"
    - GOP and frame count lines
    - Certificate subject lines
    - Hash algorithm references
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
        "gop_chain_intact": False,
        "device_serial": "",
        "device_cert_subject": "",
        "hash_algorithm": "",
    }

    lower_output = output.lower()

    # Detect if no signatures found
    if "no signed video" in lower_output or "no signature" in lower_output or "unsigned" in lower_output:
        result["status"] = "unsigned"
        result["has_signature"] = False
        return result

    # Detect if signatures are present
    if "signature" in lower_output or "signed" in lower_output:
        result["has_signature"] = True

    # Parse overall validation status
    if "validation: ok" in lower_output or "result: ok" in lower_output or "valid: true" in lower_output:
        result["signature_valid"] = True
        result["status"] = "authentic"
    elif "validation: not ok" in lower_output or "result: not ok" in lower_output or "valid: false" in lower_output:
        result["signature_valid"] = False
        result["status"] = "tampered"
    elif "error" in lower_output and return_code != 0:
        result["status"] = "error"
        result["error"] = output.strip()[:500]

    # Parse GOP counts from various output formats
    gop_total = _extract_int(output, r"(?:total\s+)?gops?\s*[:=]\s*(\d+)")
    gop_ok = _extract_int(output, r"gops?\s+(?:ok|valid|verified)\s*[:=]\s*(\d+)")
    gop_not_ok = _extract_int(output, r"gops?\s+(?:not\s+ok|invalid|tampered|failed)\s*[:=]\s*(\d+)")

    if gop_total > 0:
        result["gops_total"] = gop_total
    if gop_ok > 0:
        result["gops_ok"] = gop_ok
    if gop_not_ok > 0:
        result["gops_not_ok"] = gop_not_ok

    # If we have ok but not total, infer total
    if result["gops_total"] == 0 and (result["gops_ok"] > 0 or result["gops_not_ok"] > 0):
        result["gops_total"] = result["gops_ok"] + result["gops_not_ok"]

    # Parse frame counts
    frame_total = _extract_int(output, r"(?:total\s+)?frames?\s*[:=]\s*(\d+)")
    frame_ok = _extract_int(output, r"frames?\s+(?:ok|valid|verified)\s*[:=]\s*(\d+)")
    frame_not_ok = _extract_int(output, r"frames?\s+(?:not\s+ok|invalid|tampered|failed)\s*[:=]\s*(\d+)")

    if frame_total > 0:
        result["frames_total"] = frame_total
    if frame_ok > 0:
        result["frames_ok"] = frame_ok
    if frame_not_ok > 0:
        result["frames_not_ok"] = frame_not_ok

    if result["frames_total"] == 0 and (result["frames_ok"] > 0 or result["frames_not_ok"] > 0):
        result["frames_total"] = result["frames_ok"] + result["frames_not_ok"]

    # GOP chain status
    if "chain intact" in lower_output or "linked: ok" in lower_output or "linking: ok" in lower_output:
        result["gop_chain_intact"] = True
    elif "chain broken" in lower_output or "linked: not ok" in lower_output:
        result["gop_chain_intact"] = False
    elif result["gops_not_ok"] == 0 and result["gops_ok"] > 0:
        result["gop_chain_intact"] = True

    # Parse certificate subject (CN=...)
    cn_match = re.search(r"CN\s*=\s*([A-Z0-9]+)", output)
    if cn_match:
        result["device_cert_subject"] = f"CN={cn_match.group(1)}"
        # Axis serial numbers start with ACCC8E
        serial = cn_match.group(1)
        if serial.startswith("ACCC"):
            result["device_serial"] = serial

    # Parse hash algorithm
    if "sha-256" in lower_output or "sha256" in lower_output:
        result["hash_algorithm"] = "SHA-256"
    elif "sha-512" in lower_output or "sha512" in lower_output:
        result["hash_algorithm"] = "SHA-512"

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
