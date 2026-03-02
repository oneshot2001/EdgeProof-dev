-- 007_add_stripe_subscription_id.sql
-- Add stripe_subscription_id to users table for tracking active subscriptions

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_users_stripe_subscription
ON public.users(stripe_subscription_id);
