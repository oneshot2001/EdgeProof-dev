-- 005_create_api_keys.sql

CREATE TABLE public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id),
  team_id UUID REFERENCES public.teams(id),
  key_hash VARCHAR(64) NOT NULL UNIQUE,  -- SHA-256 of API key (never store raw)
  key_prefix VARCHAR(8) NOT NULL,        -- First 8 chars for identification (ep_live_...)
  name VARCHAR(255) NOT NULL,
  permissions JSONB DEFAULT '["verify"]',
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  revoked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_api_keys_hash ON public.api_keys(key_hash);
CREATE INDEX idx_api_keys_user ON public.api_keys(user_id);
