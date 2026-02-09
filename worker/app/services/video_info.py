"""
Video metadata extractor using ffprobe.

Extracts codec, container, resolution, framerate, duration, frame count,
and checks for the Axis signed video SEI NALU UUID.
"""

import asyncio
import json
import re
from typing import Optional


# Axis signed video UUID (hex representation for searching in binary/hex output)
SIGNING_UUID = "5369676e-6564-2056-6964-656f2e2e2e30"
SIGNING_UUID_HEX = "5369676e65642056696465...30"  # For matching in hex dumps

FFPROBE_TIMEOUT_SECONDS = 30


async def get_video_info(file_path: str) -> dict:
    """
    Extract video metadata using ffprobe.

    Returns a dict with codec, container, resolution, framerate, duration,
    total_frames, and whether the signing UUID was found in SEI data.
    """
    result = {
        "codec": "",
        "container": "",
        "resolution": "",
        "framerate": 0.0,
        "duration_seconds": 0.0,
        "total_frames": 0,
        "has_sei_uuid": False,
        "recording_start": "",
        "recording_end": "",
    }

    # Run ffprobe for stream and format info
    probe_data = await _run_ffprobe(file_path)
    if not probe_data:
        return result

    # Extract format/container info
    fmt = probe_data.get("format", {})
    format_name = fmt.get("format_name", "")
    result["container"] = _normalize_container(format_name)
    result["duration_seconds"] = float(fmt.get("duration", 0))

    # Extract creation time from format tags if available
    tags = fmt.get("tags", {})
    creation_time = tags.get("creation_time", "")
    if creation_time:
        result["recording_start"] = creation_time

    # Extract video stream info (first video stream)
    streams = probe_data.get("streams", [])
    video_stream = next(
        (s for s in streams if s.get("codec_type") == "video"),
        None,
    )

    if video_stream:
        result["codec"] = _normalize_codec(video_stream.get("codec_name", ""))
        width = video_stream.get("width", 0)
        height = video_stream.get("height", 0)
        if width and height:
            result["resolution"] = f"{width}x{height}"

        # Parse framerate from r_frame_rate (e.g., "30000/1001" or "30/1")
        r_frame_rate = video_stream.get("r_frame_rate", "0/1")
        result["framerate"] = _parse_framerate(r_frame_rate)

        # Estimate total frames
        nb_frames = video_stream.get("nb_frames")
        if nb_frames and nb_frames != "N/A":
            result["total_frames"] = int(nb_frames)
        elif result["duration_seconds"] > 0 and result["framerate"] > 0:
            result["total_frames"] = int(result["duration_seconds"] * result["framerate"])

        # Calculate recording end from start + duration
        if result["recording_start"] and result["duration_seconds"] > 0:
            try:
                from datetime import datetime, timedelta
                start = datetime.fromisoformat(result["recording_start"].replace("Z", "+00:00"))
                end = start + timedelta(seconds=result["duration_seconds"])
                result["recording_end"] = end.isoformat().replace("+00:00", "Z")
            except (ValueError, TypeError):
                pass

    # Check for signing UUID in the video
    result["has_sei_uuid"] = await _check_for_signing_uuid(file_path)

    return result


async def _run_ffprobe(file_path: str) -> Optional[dict]:
    """Run ffprobe and return parsed JSON output."""
    try:
        process = await asyncio.create_subprocess_exec(
            "ffprobe",
            "-v", "quiet",
            "-print_format", "json",
            "-show_format",
            "-show_streams",
            file_path,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        stdout, _ = await asyncio.wait_for(
            process.communicate(),
            timeout=FFPROBE_TIMEOUT_SECONDS,
        )

        return json.loads(stdout.decode("utf-8"))
    except (asyncio.TimeoutError, json.JSONDecodeError, FileNotFoundError) as e:
        print(f"ffprobe failed: {e}")
        return None


async def _check_for_signing_uuid(file_path: str) -> bool:
    """
    Check if the video contains the Axis signed video UUID.

    Uses ffprobe to look for SEI NALUs containing the signing UUID.
    Falls back to binary search of the file header.
    """
    try:
        # Use ffprobe to show packets and look for SEI data
        process = await asyncio.create_subprocess_exec(
            "ffprobe",
            "-v", "quiet",
            "-show_packets",
            "-select_streams", "v:0",
            "-read_intervals", "%+5",  # Only read first 5 seconds
            "-print_format", "json",
            file_path,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        stdout, _ = await asyncio.wait_for(
            process.communicate(),
            timeout=FFPROBE_TIMEOUT_SECONDS,
        )

        output = stdout.decode("utf-8", errors="replace")
        # The signing UUID bytes in the SEI data
        if "5369676e" in output or "Signed Video" in output:
            return True

    except (asyncio.TimeoutError, FileNotFoundError):
        pass

    # Fallback: search the file's first 1MB for the UUID bytes
    try:
        uuid_bytes = bytes.fromhex("5369676e6564205669646".replace("-", ""))
        with open(file_path, "rb") as f:
            data = f.read(1024 * 1024)  # First 1MB
            if uuid_bytes in data:
                return True
    except (OSError, ValueError):
        pass

    return False


def _normalize_codec(codec_name: str) -> str:
    """Normalize ffprobe codec name to display name."""
    mapping = {
        "h264": "H.264",
        "hevc": "H.265",
        "h265": "H.265",
        "av1": "AV1",
    }
    return mapping.get(codec_name.lower(), codec_name.upper())


def _normalize_container(format_name: str) -> str:
    """Normalize ffprobe format name to display name."""
    # ffprobe may return "mov,mp4,m4a,3gp,3g2,mj2" for MP4 files
    if "mp4" in format_name.lower() or "mov" in format_name.lower():
        return "MP4"
    if "matroska" in format_name.lower() or "mkv" in format_name.lower():
        return "MKV"
    return format_name.upper()


def _parse_framerate(r_frame_rate: str) -> float:
    """Parse ffprobe r_frame_rate string (e.g., '30000/1001') to float."""
    try:
        if "/" in r_frame_rate:
            num, den = r_frame_rate.split("/")
            den_val = int(den)
            if den_val == 0:
                return 0.0
            return round(int(num) / den_val, 2)
        return float(r_frame_rate)
    except (ValueError, ZeroDivisionError):
        return 0.0
