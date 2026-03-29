"""
PlateProof LPR data models.

Normalizes AXIS License Plate Verifier HTTP POST events into the
canonical PlateRead model used throughout the PlateProof pipeline.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Optional
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class LPREventType(str, Enum):
    new = "new"
    update = "update"
    lost = "lost"


class LPRSource(str, Enum):
    http_webhook = "http_webhook"
    vms_adapter = "vms_adapter"
    vapix_direct = "vapix_direct"


class ListMatch(str, Enum):
    allowlist = "allowlist"
    blocklist = "blocklist"
    watchlist = "watchlist"
    none = "none"


class VerificationStatus(str, Enum):
    pending = "pending"
    verified = "verified"
    failed = "failed"
    skipped = "skipped"


# ---------------------------------------------------------------------------
# Raw AXIS License Plate Verifier HTTP POST payload
# Ref: AXIS License Plate Verifier push event API
# ---------------------------------------------------------------------------

class AxisLPRListMatch(BaseModel):
    type: Optional[str] = None          # "allowlist", "blocklist", "watchlist"
    description: Optional[str] = None


class AxisLPREvent(BaseModel):
    """
    Raw payload from AXIS License Plate Verifier push events.
    Camera POSTs this to the configured webhook URL on every LPR event.
    """
    plate_text: str = Field(..., description="Recognized plate text")
    plate_confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    vehicle_type: Optional[str] = None
    vehicle_color: Optional[str] = None
    vehicle_make: Optional[str] = None
    vehicle_model: Optional[str] = None
    direction: Optional[str] = None     # "in", "out", "left", "right"
    lpr_event_type: str = "lost"        # "new", "update", "lost"
    region: Optional[str] = None        # e.g. "US-CA"
    plate_thumbnail_url: Optional[str] = None
    vehicle_crop_url: Optional[str] = None
    list_match: Optional[AxisLPRListMatch] = None

    # Camera identity — injected by the webhook handler from auth context
    camera_id: Optional[str] = None
    camera_serial: Optional[str] = None
    site_id: Optional[str] = None

    # Timestamps (ISO 8601) — camera provides these when available
    first_seen: Optional[str] = None
    last_seen: Optional[str] = None


# ---------------------------------------------------------------------------
# Normalized PlateRead — canonical model used throughout PlateProof
# ---------------------------------------------------------------------------

class PlateRead(BaseModel):
    """
    Normalized license plate detection record.
    Created from any source (AxisLPREvent, VMSAdapter event, VAPIX direct).
    Stored in Supabase plate_reads and local SQLite (Vigil plugin mode).
    """
    id: UUID = Field(default_factory=uuid4)

    # Site / camera provenance
    site_id: str
    camera_id: str
    camera_serial: Optional[str] = None

    # Vehicle identity
    plate_text: str
    plate_confidence: float
    vehicle_type: Optional[str] = None
    vehicle_color: Optional[str] = None
    vehicle_make: Optional[str] = None
    vehicle_model: Optional[str] = None

    # Temporal
    first_seen: datetime
    last_seen: Optional[datetime] = None
    dwell_seconds: Optional[int] = None
    direction: Optional[str] = None

    # Source metadata
    event_type: LPREventType
    source: LPRSource = LPRSource.http_webhook
    raw_json: dict[str, Any] = Field(default_factory=dict)

    # Media
    plate_thumbnail_url: Optional[str] = None
    vehicle_crop_url: Optional[str] = None

    # Verification linkage
    verification_status: VerificationStatus = VerificationStatus.pending
    verification_id: Optional[UUID] = None
    certificate_id: Optional[str] = None

    # List matching
    list_match: Optional[ListMatch] = None
    list_description: Optional[str] = None

    @classmethod
    def from_axis_lpr(
        cls,
        event: AxisLPREvent,
        *,
        site_id: str,
        camera_id: str,
        camera_serial: Optional[str] = None,
    ) -> "PlateRead":
        """
        Normalize an AxisLPREvent into a canonical PlateRead.
        site_id and camera_id are injected from the API key context
        (the camera doesn't self-identify in the payload).
        """
        now = datetime.utcnow()

        list_match = None
        list_description = None
        if event.list_match and event.list_match.type:
            try:
                list_match = ListMatch(event.list_match.type)
            except ValueError:
                list_match = ListMatch.none
            list_description = event.list_match.description

        try:
            event_type = LPREventType(event.lpr_event_type)
        except ValueError:
            event_type = LPREventType.lost

        first_seen: datetime
        if event.first_seen:
            try:
                first_seen = datetime.fromisoformat(event.first_seen.replace("Z", "+00:00"))
            except ValueError:
                first_seen = now
        else:
            first_seen = now

        last_seen: Optional[datetime] = None
        if event.last_seen:
            try:
                last_seen = datetime.fromisoformat(event.last_seen.replace("Z", "+00:00"))
            except ValueError:
                last_seen = None

        dwell_seconds: Optional[int] = None
        if first_seen and last_seen:
            delta = (last_seen - first_seen).total_seconds()
            if delta >= 0:
                dwell_seconds = int(delta)

        return cls(
            site_id=site_id,
            camera_id=camera_id,
            camera_serial=camera_serial,
            plate_text=event.plate_text.upper().strip(),
            plate_confidence=event.plate_confidence,
            vehicle_type=event.vehicle_type,
            vehicle_color=event.vehicle_color,
            vehicle_make=event.vehicle_make,
            vehicle_model=event.vehicle_model,
            first_seen=first_seen,
            last_seen=last_seen,
            dwell_seconds=dwell_seconds,
            direction=event.direction,
            event_type=event_type,
            source=LPRSource.http_webhook,
            raw_json=event.model_dump(),
            plate_thumbnail_url=event.plate_thumbnail_url,
            vehicle_crop_url=event.vehicle_crop_url,
            list_match=list_match,
            list_description=list_description,
        )


# ---------------------------------------------------------------------------
# VehiclePresenceRecord — assembled evidence package for certificate
# ---------------------------------------------------------------------------

class VehiclePresenceRecord(BaseModel):
    """
    Assembled evidence package that feeds certificate generation.
    Combines PlateRead with camera provenance and optional crypto chain.
    """
    plate_read: PlateRead

    # Camera provenance (populated from VAPIX / VMS data)
    camera_model: Optional[str] = None
    camera_firmware: Optional[str] = None
    site_name: Optional[str] = None
    site_address: Optional[str] = None
    gps_lat: Optional[float] = None
    gps_lon: Optional[float] = None

    # Crypto chain (Tier 1 only — from EdgeProof verification)
    signing_cert_serial: Optional[str] = None
    issuing_ca: Optional[str] = None
    fips_level: Optional[str] = None
    attestation_status: Optional[str] = None

    # Certificate tier
    tier: int = 2  # 1=full crypto, 2=LPR-only, 3=VMS-LPR

    @property
    def tier_label(self) -> str:
        labels = {
            1: "Cryptographically Verified",
            2: "LPR Verified — Video Not Cryptographically Signed",
            3: "Third-Party LPR — Not Cryptographically Verified",
        }
        return labels.get(self.tier, "Unverified")
