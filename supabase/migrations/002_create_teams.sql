-- 002_create_teams.sql

CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  owner_id UUID NOT NULL REFERENCES public.users(id),
  subscription_tier subscription_tier NOT NULL DEFAULT 'professional',
  stripe_subscription_id VARCHAR(255),
  max_members INTEGER DEFAULT 5,
  white_label_config JSONB,  -- { logo_url, primary_color, company_name }
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Now add the FK on users.team_id
ALTER TABLE public.users
  ADD CONSTRAINT fk_users_team
  FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE SET NULL;
