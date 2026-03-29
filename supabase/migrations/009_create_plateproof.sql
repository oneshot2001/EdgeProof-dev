-- 009_create_plateproof.sql
-- PlateProof: Certified Vehicle Presence Records
-- Three tables: plate_reads, plate_lists, plate_certificates

-- ---------------------------------------------------------------------------
-- plate_reads: every LPR detection event (raw + normalized)
-- ---------------------------------------------------------------------------
CREATE TABLE public.plate_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id),
  team_id UUID REFERENCES public.teams(id),

  -- Site / camera provenance
  site_id TEXT NOT NULL,
  camera_id TEXT NOT NULL,
  camera_serial TEXT,

  -- Vehicle identity
  plate_text TEXT NOT NULL,
  plate_confidence NUMERIC NOT NULL,             -- 0.0–1.0
  vehicle_type TEXT,                             -- car, truck, bus, motorcycle
  vehicle_color TEXT,
  vehicle_make TEXT,
  vehicle_model TEXT,

  -- Temporal
  first_seen TIMESTAMPTZ NOT NULL,
  last_seen TIMESTAMPTZ,
  dwell_seconds INTEGER,
  direction TEXT,                                -- in, out, left, right

  -- LPR source metadata
  event_type TEXT NOT NULL,                      -- new, update, lost
  source TEXT NOT NULL DEFAULT 'http_webhook',   -- http_webhook, vms_adapter, vapix_direct
  raw_json JSONB,

  -- Media
  plate_thumbnail_url TEXT,
  vehicle_crop_url TEXT,

  -- Verification / certificate linkage
  verification_status TEXT NOT NULL DEFAULT 'pending',  -- pending, verified, failed, skipped
  verification_id UUID,
  certificate_id TEXT,

  -- List matching
  list_match TEXT,                               -- allowlist, blocklist, watchlist, none
  list_description TEXT,

  -- Public verification
  public_token TEXT UNIQUE,

  -- Sync
  cloud_synced BOOLEAN NOT NULL DEFAULT TRUE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_plate_reads_user ON public.plate_reads(user_id);
CREATE INDEX idx_plate_reads_team ON public.plate_reads(team_id);
CREATE INDEX idx_plate_reads_plate_text ON public.plate_reads(plate_text);
CREATE INDEX idx_plate_reads_site_camera ON public.plate_reads(site_id, camera_id);
CREATE INDEX idx_plate_reads_first_seen ON public.plate_reads(first_seen DESC);
CREATE INDEX idx_plate_reads_list_match ON public.plate_reads(list_match);
CREATE INDEX idx_plate_reads_public_token ON public.plate_reads(public_token);

-- ---------------------------------------------------------------------------
-- plate_lists: allow / block / watch lists per site
-- ---------------------------------------------------------------------------
CREATE TABLE public.plate_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id),
  team_id UUID REFERENCES public.teams(id),
  site_id TEXT NOT NULL,

  list_type TEXT NOT NULL,                       -- allowlist, blocklist, watchlist
  plate_text TEXT NOT NULL,
  description TEXT,
  active_schedule JSONB,                         -- future: time-based rules

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_plate_lists_site_type ON public.plate_lists(site_id, list_type);
CREATE INDEX idx_plate_lists_plate_text ON public.plate_lists(plate_text);
CREATE UNIQUE INDEX idx_plate_lists_unique ON public.plate_lists(site_id, list_type, plate_text);

-- ---------------------------------------------------------------------------
-- plate_certificates: generated Certificate of Vehicle Presence records
-- ---------------------------------------------------------------------------
CREATE TABLE public.plate_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plate_read_id UUID NOT NULL REFERENCES public.plate_reads(id),
  user_id UUID NOT NULL REFERENCES public.users(id),
  team_id UUID REFERENCES public.teams(id),

  cert_number TEXT NOT NULL UNIQUE,              -- PP-YYYY-NNNNN
  public_token TEXT NOT NULL UNIQUE,

  -- Certificate content
  tier INTEGER NOT NULL DEFAULT 2,               -- 1=full crypto, 2=LPR-only, 3=VMS-LPR
  pdf_storage_path TEXT,
  pdf_sha256 TEXT,

  -- Linked EdgeProof verification (Tier 1 only)
  edgeproof_verification_id UUID REFERENCES public.verifications(id),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_plate_certs_plate_read ON public.plate_certificates(plate_read_id);
CREATE INDEX idx_plate_certs_user ON public.plate_certificates(user_id);
CREATE INDEX idx_plate_certs_public_token ON public.plate_certificates(public_token);

-- ---------------------------------------------------------------------------
-- RLS policies
-- ---------------------------------------------------------------------------
ALTER TABLE public.plate_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plate_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plate_certificates ENABLE ROW LEVEL SECURITY;

-- plate_reads: own + team
CREATE POLICY plate_reads_own ON public.plate_reads
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY plate_reads_team_read ON public.plate_reads
  FOR SELECT USING (
    team_id IN (SELECT team_id FROM public.users WHERE id = auth.uid())
  );

-- plate_lists: own + team
CREATE POLICY plate_lists_own ON public.plate_lists
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY plate_lists_team ON public.plate_lists
  FOR SELECT USING (
    team_id IN (SELECT team_id FROM public.users WHERE id = auth.uid())
  );

-- plate_certificates: own + team
CREATE POLICY plate_certs_own ON public.plate_certificates
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY plate_certs_team_read ON public.plate_certificates
  FOR SELECT USING (
    team_id IN (SELECT team_id FROM public.users WHERE id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- Auto-update updated_at on plate_reads
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_plate_reads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER plate_reads_updated_at
  BEFORE UPDATE ON public.plate_reads
  FOR EACH ROW EXECUTE FUNCTION public.update_plate_reads_updated_at();
