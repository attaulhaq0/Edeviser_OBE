-- Task 15: prune the 8 broken/duplicate pg_cron jobs. Vercel Cron is the
-- canonical scheduler for all HTTP-triggered jobs (vercel.json + api/cron/*).
-- The 7 HTTP pg_cron jobs built their URL as `NULL || '/functions/v1/...'`
-- (app.settings.supabase_url GUC is unset on this free-tier project) so they
-- were silent no-ops; leaderboard-refresh REFRESHed a now-plain VIEW (errored).
-- Keep only the 3 pure-SQL DB-local jobs (badge-auto-archive,
-- badge-spotlight-rotate, fee-overdue-check). Reversible: full definitions are
-- recorded in .kiro/specs/migration-history-reconciliation/.cron-snapshot-pre-task15.md
-- cron.unschedule is idempotent-safe via the guarded DO block.
DO $$
DECLARE
  j text;
  doomed text[] := ARRAY[
    'ai-at-risk-prediction',
    'compute-at-risk-signals',
    'notification-digest',
    'perfect-day-prompt',
    'streak-midnight-reset',
    'streak-risk-email',
    'weekly-summary-email',
    'leaderboard-refresh'
  ];
BEGIN
  FOREACH j IN ARRAY doomed LOOP
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = j) THEN
      PERFORM cron.unschedule(j);
      RAISE NOTICE 'Task 15: unscheduled cron job %', j;
    ELSE
      RAISE NOTICE 'Task 15: cron job % not present (already removed)', j;
    END IF;
  END LOOP;
END $$;;
