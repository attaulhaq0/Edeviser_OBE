-- =============================================================================
-- Fix: pg_cron connection pool exhaustion on Free plan (60 connections max)
-- =============================================================================
-- Problem: 17 pg_cron jobs were running inside the database, several every
-- 5 minutes. On the Free plan with only 60 connections, this saturates the
-- pool and makes the database unreachable for auth, PostgREST, and users.
--
-- Fix: Remove ALL pg_cron jobs from the database. Scheduled work will be
-- handled by Vercel cron jobs (api/cron/*.ts) which call Edge Functions
-- externally — they don't consume database connection pool slots.
--
-- The only job we keep is the leaderboard materialized view refresh,
-- rescheduled to once daily at noon UTC.
-- =============================================================================

-- Unschedule ALL existing cron jobs
DO $$
DECLARE
  job_record RECORD;
BEGIN
  FOR job_record IN SELECT jobid FROM cron.job
  LOOP
    PERFORM cron.unschedule(job_record.jobid);
  END LOOP;
END $$;

-- Re-add ONLY the leaderboard refresh at a safe daily schedule
SELECT cron.schedule(
  'leaderboard_daily_refresh',
  '0 12 * * *',
  'REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard_weekly'
);
