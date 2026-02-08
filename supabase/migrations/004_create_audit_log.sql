-- 004_create_audit_log.sql

CREATE TYPE audit_action AS ENUM (
  'uploaded', 'verified', 'viewed', 'downloaded_pdf',
  'downloaded_video', 'shared', 'exported_audit'
);

CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_id UUID NOT NULL REFERENCES public.verifications(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id),
  action audit_action NOT NULL,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_verification ON public.audit_log(verification_id);
CREATE INDEX idx_audit_user ON public.audit_log(user_id);
CREATE INDEX idx_audit_created ON public.audit_log(created_at DESC);
