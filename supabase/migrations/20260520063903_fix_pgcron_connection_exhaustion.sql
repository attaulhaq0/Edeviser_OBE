-- L2-5 Fix: Remove pg_cron jobs that exhaust connection pool
-- Unschedule ALL existing cron jobs
DO $pgcron_fix$
DECLARE
  job_record RECORD;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    FOR job_record IN SELECT jobid FROM cron.job
    LOOP
      PERFORM cron.unschedule(job_record.jobid);
    END LOOP;
  END IF;
END $pgcron_fix$;

-- Drop the materialized view (source of lock timeouts)
DROP MATERIALIZED VIEW IF EXISTS leaderboard_weekly CASCADE;

-- Replace with lightweight regular view
CREATE OR REPLACE VIEW leaderboard_weekly AS
SELECT
  student_id,
  SUM(xp_amount) AS weekly_xp,
  RANK() OVER (ORDER BY SUM(xp_amount) DESC) AS rank
FROM xp_transactions
WHERE created_at >= date_trunc('week', now())
GROUP BY student_id;;
