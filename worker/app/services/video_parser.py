"""
Video parser service.

Responsible for parsing MP4/MKV video containers to extract NAL units
(H.264/H.265) or OBU metadata (AV1) for signature verification.

In production:
- Uses ffprobe/pymediainfo to extract container metadata
- Parses raw NAL unit stream to identify SEI NALUs
- Identifies the signing UUID: 5369676e-6564-2056-6964-656f2e2e2e30
- Extracts frame boundaries and GOP structure

For now, returns mock parsed data.
"""


async def parse_video(file_path: str) -> dict:
    """Parse a video file and extract structural metadata."""
    # TODO: Implement real video parsing using ffprobe or pymediainfo
    return {
        "codec": "H.264",
        "container": "MP4",
        "resolution": "1920x1080",
        "framerate": 29.0,
        "total_frames": 25410,
        "total_gops": 847,
        "has_sei_nalus": True,
        "signing_uuid_found": True,
    }
