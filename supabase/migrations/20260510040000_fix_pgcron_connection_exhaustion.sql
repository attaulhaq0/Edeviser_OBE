-- =============================================================================
-- Fix: pg_cron connection pool exhaustion on Free plan (60 connections max)
-- =============================================================================
-- Problem: 17 pg_cron jobs were running inside the database, several every
-- 5 minutes. On the Free plan with only 60 connections, this saturates the
-- pool and makes the database unreachable for auth, PostgREST, and users.
--
-- Additionally, the leaderboard_weekly MATERIALIZED VIEW used
-- REFRESH CONCURRENTLY which locks the view and blocks all other queries,
-- causing cascading timeouts on the constrained Free plan.
--
-- Fix:
-- 1. Remove ALL pg_cron jobs from the database
-- 2. Drop the materialized view entirely
-- 3. Replace with a lightweight regular VIEW (computed on-demand)
-- 4. Scheduled work handled by Vercel cron (api/cron/*.ts) which calls
--    Edge Functions externally — no database connection pool consumption
-- =============================================================================

-- Step 1: Unschedule ALL existing cron jobs
DO $
DECLARE
  job_record RECORD;
BEGIN
  FOR job_record IN SELECT jobid FROM cron.job
  LOOP
    PERFORM cron.unschedule(job_record.jobid);
  END LOOP;
END $;

-- Step 2: Drop the materialized view (the main source of timeouts)
DROP MATERIALIZED VIEW IF EXISTS leaderboard_weekly CASCADE;

-- Step 3: Create a lightweight regular view as replacement
-- This computes on-demand without locks or refresh jobs
CREATE OR REPLACE VIEW leaderboard_weekly AS
SELECT
  student_id,
  SUM(xp_amount) AS weekly_xp,
  RANK() OVER (ORDER BY SUM(xp_amount) DESC) AS rank
FROM xp_transactions
WHERE created_at >= date_trunc('week', now())
GROUP BY student_id;
