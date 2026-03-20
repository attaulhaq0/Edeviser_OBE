-- ============================================================
-- Migration: Add pg_cron job to expire stale recovery sessions
-- Feature: AI-Powered Adaptive Quiz Generation (Task 14.9)
-- ============================================================

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- ============================================================
-- Function: expire_stale_recovery_sessions
-- Expires active mastery recovery pathways older than 14 days.
-- Returns the count of expired sessions.
-- NOTE: Teacher notification can be added later via pg_net
-- HTTP call to a notification Edge Function.
-- ============================================================
CREATE OR REPLACE FUNCTION expire_stale_recovery_sessions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE mastery_recovery_pathways
  SET
    status = 'expired',
    expired_at = now(),
    updated_at = now()
  WHERE
    status = 'active'
    AND activated_at < now() - interval '14 days';

  GET DIAGNOSTICS expired_count = ROW_COUNT;

  RETURN expired_count;
END;
$$;

-- ============================================================
-- Schedule: Run daily at midnight UTC
-- ============================================================
SELECT cron.schedule(
  'expire-stale-recovery-sessions',
  '0 0 * * *',
  $$SELECT expire_stale_recovery_sessions()$$
);;
