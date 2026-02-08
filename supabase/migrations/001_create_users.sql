-- 001_create_users.sql
-- Extends Supabase auth.users with EdgeProof profile data

CREATE TYPE user_role AS ENUM ('viewer', 'verifier', 'admin', 'owner');
CREATE TYPE subscription_tier AS ENUM ('free', 'professional', 'enterprise');

CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(255),
  company VARCHAR(255),
  role user_role DEFAULT 'viewer',
  team_id UUID,  -- FK added after teams table exists
  subscription_tier subscription_tier DEFAULT 'free',
  stripe_customer_id VARCHAR(255),
  monthly_verifications INTEGER DEFAULT 0,
  monthly_reset_at TIMESTAMPTZ DEFAULT (date_trunc('month', NOW()) + INTERVAL '1 month'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Monthly verification counter reset
CREATE OR REPLACE FUNCTION public.reset_monthly_verifications()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.monthly_reset_at <= NOW() THEN
    NEW.monthly_verifications := 0;
    NEW.monthly_reset_at := date_trunc('month', NOW()) + INTERVAL '1 month';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER before_user_update
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.reset_monthly_verifications();

CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_team ON public.users(team_id);
CREATE INDEX idx_users_stripe ON public.users(stripe_customer_id);
