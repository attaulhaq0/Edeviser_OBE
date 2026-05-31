ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_preferences jsonb DEFAULT '{}'::jsonb;;
