-- 20260901000007_add_language_preference.sql
-- See supabase/migrations/20260901000007_add_language_preference.sql for full rationale.

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS chk_language_preference;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_language_preference_check;

ALTER TABLE public.profiles
  ALTER COLUMN language_preference SET DEFAULT 'auto';

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_language_preference_check
  CHECK (language_preference IN ('en', 'ar', 'ur', 'auto'));

COMMENT ON COLUMN public.profiles.language_preference
  IS 'User language preference: en | ar | ur | auto. ''auto'' follows browser/i18n locale. Drives the guided tour language and future per-user UI locale override.';
;
