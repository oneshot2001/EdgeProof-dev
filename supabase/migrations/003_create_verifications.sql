-- 003_create_verifications.sql
-- THE core business object

CREATE TYPE verification_status AS ENUM (
  'pending', 'processing', 'uploading',
  'authentic', 'tampered', 'unsigned', 'inconclusive', 'error'
);

CREATE TABLE public.verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id),
  team_id UUID REFERENCES public.teams(id),
  status verification_status NOT NULL DEFAULT 'pending',

  -- File metadata
  file_name VARCHAR(500) NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  file_hash_sha256 VARCHAR(64) NOT NULL,
  file_storage_path VARCHAR(500),

  -- Device information (populated after verification)
  device_serial VARCHAR(100),
  device_model VARCHAR(200),
  device_firmware VARCHAR(100),
  device_hardware_id VARCHAR(200),

  -- Certificate chain validation
  cert_chain_valid BOOLEAN,
  cert_intermediate VARCHAR(200),
  cert_root VARCHAR(200),

  -- Integrity results
  total_gops INTEGER,
  verified_gops INTEGER,
  tampered_gops INTEGER,
  total_frames INTEGER,
  verified_frames INTEGER,
  tampered_frames INTEGER,

  -- Temporal data
  recording_start TIMESTAMPTZ,
  recording_end TIMESTAMPTZ,
  recording_duration_seconds NUMERIC,
  gaps_detected INTEGER DEFAULT 0,

  -- Attestation
  attestation_valid BOOLEAN,
  attestation_details JSONB,

  -- Full worker response (raw)
  worker_response JSONB,

  -- Certificate PDF
  certificate_url VARCHAR(500),
  certificate_hash VARCHAR(64),

  -- Public verification
  public_token VARCHAR(64) UNIQUE,  -- For QR code / public badge
  is_public BOOLEAN DEFAULT false,

  -- Timestamps
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_verifications_user ON public.verifications(user_id);
CREATE INDEX idx_verifications_team ON public.verifications(team_id);
CREATE INDEX idx_verifications_status ON public.verifications(status);
CREATE INDEX idx_verifications_public_token ON public.verifications(public_token);
CREATE INDEX idx_verifications_created ON public.verifications(created_at DESC);
CREATE INDEX idx_verifications_file_hash ON public.verifications(file_hash_sha256);
