-- Tasks 4.7/8.x (edeviser-agentic-intelligence) — intervention loop cron authentication.
--
-- CONSOLIDATED PARITY MIGRATION for two production hotfixes applied via MCP on
-- 2026-08-24 (fix_intervention_cron_auth_private_schema + fix_intervention_cron_eval_typo).
-- Production carries no ledger rows for those hotfixes; THIS file reproduces their
-- net final state so Docker/Preview replays converge to identical state.
--
-- Why this exists: the pg_cron jobs fired HTTP POSTs at the intervention-jobs Edge
-- Function with a NULL bearer (GUC app.settings.service_role_key is never provisioned
-- on hosted projects), producing 27x404 then endless 401s — invisible in cron stats
-- because pg_net is asynchronous. Jobs now source an `x-cron-secret` header from
-- private.cron_secrets and SKIP FIRING entirely while the credential is absent:
-- unauthenticated fires are structurally impossible.
--
-- Operator follow-up (secret values never pass through git/review):
--   INSERT INTO private.cron_secrets(name, secret)
--     VALUES ('cron_intervention_jobs', '<strong-random >= 16 chars>');
--   npx supabase secrets set CRON_SECRET=<same value> --project-ref cdlgtbvxlxjpcddjazzx
--
-- Idempotent: safe on fresh replay AND on re-application against production where
-- the objects already exist.

-- ---------------------------------------------------------------------------
-- 1. Private schema for cron credentials (never exposed to PostgREST clients)
-- ---------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS private;
REVOKE USAGE ON SCHEMA private FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Credential table — RLS deny-all (no policies = zero client access, ever)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS private.cron_secrets (
  name       text PRIMARY KEY CHECK (length(btrim(name)) > 0),
  secret     text NOT NULL CHECK (length(btrim(secret)) > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  rotated_at timestamptz
);
ALTER TABLE private.cron_secrets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.cron_secrets FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Idempotently re-register both intervention-loop jobs with authenticated
--    firing (x-cron-secret from private.cron_secrets; skip when absent).
--    Schedules match production: evaluation */15 min, generation hourly :05.
-- ---------------------------------------------------------------------------
DO $mig$
DECLARE
  v_job bigint;
BEGIN
  FOREACH v_job IN ARRAY ARRAY(
    SELECT jobid FROM cron.job
     WHERE jobname IN ('intervention-generation-jobs', 'intervention-evaluation-jobs')
  )
  LOOP
    PERFORM cron.unschedule(v_job);
  END LOOP;

  PERFORM cron.schedule(
    'intervention-generation-jobs',
    '5 * * * *',
    $cmd$
      DO $inner$
      DECLARE v_secret text;
      BEGIN
        SELECT cs.secret INTO v_secret
          FROM private.cron_secrets cs
         WHERE cs.name = 'cron_intervention_jobs';
        IF v_secret IS NOT NULL AND length(btrim(v_secret)) > 0 THEN
          PERFORM net.http_post(
            url := 'https://cdlgtbvxlxjpcddjazzx.supabase.co/functions/v1/intervention-jobs',
            headers := jsonb_build_object('x-cron-secret', v_secret, 'Content-Type', 'application/json'),
            body := '{"action":"generate_candidates"}'::jsonb
          );
        END IF;
      END
      $inner$;
    $cmd$
  );

  PERFORM cron.schedule(
    'intervention-evaluation-jobs',
    '*/15 * * * *',
    $cmd$
      DO $inner$
      DECLARE v_secret text;
      BEGIN
        SELECT cs.secret INTO v_secret
          FROM private.cron_secrets cs
         WHERE cs.name = 'cron_intervention_jobs';
        IF v_secret IS NOT NULL AND length(btrim(v_secret)) > 0 THEN
          PERFORM net.http_post(
            url := 'https://cdlgtbvxlxjpcddjazzx.supabase.co/functions/v1/intervention-jobs',
            headers := jsonb_build_object('x-cron-secret', v_secret, 'Content-Type', 'application/json'),
            body := '{"action":"evaluate_measurements"}'::jsonb
          );
        END IF;
      END
      $inner$;
    $cmd$
  );
END
$mig$;