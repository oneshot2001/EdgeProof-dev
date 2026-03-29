// PlateProof LPR types — mirrors 009_create_plateproof.sql schema

export type LPREventType = "new" | "update" | "lost";
export type LPRSource = "http_webhook" | "vms_adapter" | "vapix_direct";
export type ListMatch = "allowlist" | "blocklist" | "watchlist" | "none";
export type PlateVerificationStatus = "pending" | "verified" | "failed" | "skipped";
export type CertificateTier = 1 | 2 | 3;

export type PlateRead = {
  id: string;
  user_id: string;
  team_id: string | null;

  // Site / camera
  site_id: string;
  camera_id: string;
  camera_serial: string | null;

  // Vehicle identity
  plate_text: string;
  plate_confidence: number;
  vehicle_type: string | null;
  vehicle_color: string | null;
  vehicle_make: string | null;
  vehicle_model: string | null;

  // Temporal
  first_seen: string;            // ISO 8601
  last_seen: string | null;
  dwell_seconds: number | null;
  direction: string | null;

  // Source
  event_type: LPREventType;
  source: LPRSource;
  raw_json: Record<string, unknown> | null;

  // Media
  plate_thumbnail_url: string | null;
  vehicle_crop_url: string | null;

  // Verification / certificate
  verification_status: PlateVerificationStatus;
  verification_id: string | null;
  certificate_id: string | null;

  // List matching
  list_match: ListMatch | null;
  list_description: string | null;

  // Public
  public_token: string | null;
  cloud_synced: boolean;

  created_at: string;
  updated_at: string;
};

export type PlateCertificate = {
  id: string;
  plate_read_id: string;
  user_id: string;
  team_id: string | null;

  cert_number: string;           // PP-YYYY-NNNNN
  public_token: string;

  tier: CertificateTier;
  pdf_storage_path: string | null;
  pdf_sha256: string | null;

  edgeproof_verification_id: string | null;

  created_at: string;
};

export type PlateList = {
  id: string;
  user_id: string;
  team_id: string | null;
  site_id: string;
  list_type: ListMatch;
  plate_text: string;
  description: string | null;
  active_schedule: Record<string, unknown> | null;
  created_at: string;
};

// ---------------------------------------------------------------------------
// API payload types
// ---------------------------------------------------------------------------

/** POST /api/v1/lpr/events — raw payload from AXIS License Plate Verifier */
export type AxisLPREventPayload = {
  plate_text: string;
  plate_confidence?: number;
  vehicle_type?: string;
  vehicle_color?: string;
  vehicle_make?: string;
  vehicle_model?: string;
  direction?: string;
  lpr_event_type?: LPREventType;
  region?: string;
  plate_thumbnail_url?: string;
  vehicle_crop_url?: string;
  list_match?: {
    type?: string;
    description?: string;
  } | null;
  first_seen?: string;
  last_seen?: string;
};

/** Response from POST /api/v1/lpr/events */
export type LPRIngestResponse = {
  plate_read_id: string;
  plate_text: string;
  list_match: ListMatch | null;
  auto_cert_queued: boolean;
};

/** Certificate data assembled for PDF generation */
export type PlateCertificateData = {
  cert_number: string;
  public_token: string;
  tier: CertificateTier;
  tier_label: string;
  plate_read: PlateRead;

  // Camera provenance
  camera_model?: string;
  camera_firmware?: string;
  site_name?: string;
  site_address?: string;

  // Crypto chain (Tier 1 only)
  signing_cert_serial?: string;
  issuing_ca?: string;
  fips_level?: string;
  attestation_status?: string;

  generated_at: string;         // ISO 8601
};
