-- Task 150.7: Badge archive cron job
-- Runs daily. Archive badges not upgraded in 90 days (set archived_at).
-- Skip pinned badges.
-- Requirements: 135.3

-- Create the archive function
CREATE OR REPLACE FUNCTION badge_auto_archive()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Archive badges that:
  -- 1. Have not been upgraded (awarded_at or updated_at) in the last 90 days
  -- 2. Are NOT pinned
  -- 3. Are not already archived
  UPDATE badges
  SET archived_at = now()
  WHERE archived_at IS NULL
    AND is_pinned = false
    AND tier IS NOT NULL
    AND (
      COALESCE(updated_at, created_at, awarded_at, now() - interval '91 days')
      < now() - interval '90 days'
    );
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
