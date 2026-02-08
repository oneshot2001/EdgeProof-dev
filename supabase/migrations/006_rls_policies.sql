-- 006_rls_policies.sql

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Users: can read own profile, team members can see each other
CREATE POLICY users_self ON public.users
  FOR ALL USING (auth.uid() = id);

CREATE POLICY users_team_read ON public.users
  FOR SELECT USING (
    team_id IN (SELECT team_id FROM public.users WHERE id = auth.uid())
  );

-- Teams: owner full access, members read
CREATE POLICY teams_owner ON public.teams
  FOR ALL USING (owner_id = auth.uid());

CREATE POLICY teams_member_read ON public.teams
  FOR SELECT USING (
    id IN (SELECT team_id FROM public.users WHERE id = auth.uid())
  );

-- Verifications: own verifications + team verifications
CREATE POLICY verifications_own ON public.verifications
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY verifications_team_read ON public.verifications
  FOR SELECT USING (
    team_id IN (SELECT team_id FROM public.users WHERE id = auth.uid())
  );

-- Audit log: read for own verifications
CREATE POLICY audit_own ON public.audit_log
  FOR SELECT USING (
    verification_id IN (
      SELECT id FROM public.verifications WHERE user_id = auth.uid()
    )
  );

-- API Keys: own keys only
CREATE POLICY api_keys_own ON public.api_keys
  FOR ALL USING (user_id = auth.uid());
