-- Tasks 7.4 + 8.2 (edeviser-agentic-intelligence): durable cron credentials and
-- the agent-evaluation-jobs schedule.
--
-- Parity note: parts of this migration were previously hot-fixed out-of-band
-- via the management API (ledger rows 20260824201031 / 20260824210002 hold
-- placeholder statements). This file makes a FRESH REPLAY produce the same
-- correct end state as production:
--   1) private.cron_secrets — access-revoked credential store so pg_cron jobs
--      never fire unauthenticated HTTP requests (the earlier GUC-based pattern
--      silently produced NULL Authorization headers).
--   2) Re-registration of both intervention-jobs schedules against
--      private.cron_secrets (heals the historical `cron_sevents` typo on
--      fresh replays; no-op when already correct).
--   3) agent-evaluation-jobs hourly schedule — safe because the function
--      fail-closed skips institutions without configured evaluation_thresholds.

CREATE SCHEMA IF NOT EXISTS private;

REVOKE ALL ON SCHEMA private FROM PUBLIC;
REVOKE ALL ON SCHEMA private FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS private.cron_secrets (
  name text PRIMARY KEY,
  secret text NOT NULL CHECK (length(btrim(secret)) >= 16),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

REVOKE ALL ON private.cron_secrets FROM PUBLIC;
REVOKE ALL ON private.cron_secrets FROM anon, authenticated;

ALTER TABLE private.cron_secrets ENABLE ROW LEVEL SECURITY;

DO $do$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'intervention-evaluation-jobs') THEN
    PERFORM cron.unschedule('intervention-evaluation-jobs');
  END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'intervention-generation-jobs') THEN
    PERFORM cron.unschedule('intervention-generation-jobs');
  END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'agent-evaluation-jobs') THEN
    PERFORM cron.unschedule('agent-evaluation-jobs');
  END IF;
END
$do$;

-- Intervention evaluation loop: every 15 minutes.
SELECT cron.schedule(
  'intervention-evaluation-jobs',
  '*/15 * * * *',
  $job$
  DO $inner$
  DECLARE
    v_secret text;
  BEGIN
    SELECT cs.secret INTO v_secret
      FROM private.cron_secrets cs
     WHERE cs.name = 'cron_intervention_jobs';
    IF v_secret IS NOT NULL AND length(btrim(v_secret)) > 0 THEN
      PERFORM net.http_post(
        url := 'https://cdlgtbvxlxjpcddjazzx.supabase.co/functions/v1/intervention-jobs',
        headers := jsonb_build_object(
          'x-cron-secret', v_secret,
          'Content-Type', 'application/json'
        ),
        body := '{"action":"evaluate_measurements"}'::jsonb
      );
    END IF;
  END
  $inner$;
  $job$
);

-- Intervention generation sweep: hourly at :05.
SELECT cron.schedule(
  'intervention-generation-jobs',
  '5 * * * *',
  $job$
  DO $inner$
  DECLARE
    v_secret text;
  BEGIN
    SELECT cs.secret INTO v_secret
      FROM private.cron_secrets cs
     WHERE cs.name = 'cron_intervention_jobs';
    IF v_secret IS NOT NULL AND length(btrim(v_secret)) > 0 THEN
      PERFORM net.http_post(
        url := 'https://cdlgtbvxlxjpcddjazzx.supabase.co/functions/v1/intervention-jobs',
        headers := jsonb_build_object(
          'x-cron-secret', v_secret,
          'Content-Type', 'application/json'
        ),
        body := '{"action":"generate_candidates"}'::jsonb
      );
    END IF;
  END
  $inner$;
  $job$
);

-- Agent run evaluation: hourly at :20. The target function skips institutions
-- whose institution_autonomy_settings.evaluation_thresholds are unconfigured.
SELECT cron.schedule(
  'agent-evaluation-jobs',
  '20 * * * *',
  $job$
  DO $inner$
  DECLARE
    v_secret text;
  BEGIN
    SELECT cs.secret INTO v_secret
      FROM private.cron_secrets cs
     WHERE cs.name = 'cron_intervention_jobs';
    IF v_secret IS NOT NULL AND length(btrim(v_secret)) > 0 THEN
      PERFORM net.http_post(
        url := 'https://cdlgtbvxlxjpcddjazzx.supabase.co/functions/v1/agent-evaluation-jobs',
        headers := jsonb_build_object(
          'x-cron-secret', v_secret,
          'Content-Type', 'application/json'
        ),
        body := '{}'::jsonb
      );
    END IF;
  END
  $inner$;
  $job$
);
