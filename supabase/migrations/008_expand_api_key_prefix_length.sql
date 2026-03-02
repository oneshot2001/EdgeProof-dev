-- 008_expand_api_key_prefix_length.sql
-- Keep a meaningful key prefix (includes random chars beyond "ep_live_") for indexed lookups.

ALTER TABLE public.api_keys
ALTER COLUMN key_prefix TYPE VARCHAR(16);
