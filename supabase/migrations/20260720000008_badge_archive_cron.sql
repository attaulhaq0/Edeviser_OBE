-- Task 150.7: Badge archive cron job
-- Runs daily. Archive badges not upgraded in 90 days (set archived_at).
-- Skip pinned badges.
-- Requirements: 135.3

-- Create the archive function
-- NOTE (db-function-search-path-qualification, Task 5.5/12 replay-only fix):
-- This is the LAST definition of badge_auto_archive() in the migration chain, so
-- a fresh replay ends here. It must match the LIVE production body (Part C
-- 20260601110014 + the 20260602101558 column-correctness fix), i.e. hardened
-- with SET search_path='', public.-qualified, and using awarded_at (the badges
-- table has NO updated_at/created_at columns). Replay-only edit; never re-run on prod.
CREATE OR REPLACE FUNCTION public.badge_auto_archive()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  UPDATE public.badges
  SET archived_at = now()
  WHERE archived_at IS NULL
    AND is_pinned = false
    AND tier IS NOT NULL
    AND awarded_at < now() - interval '90 days';
END;
$$;
-- Schedule the cron job (daily at midnight UTC)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'badge-auto-archive',
      '0 0 * * *',
      'SELECT badge_auto_archive()'
    );
  END IF;
END;
$$;
