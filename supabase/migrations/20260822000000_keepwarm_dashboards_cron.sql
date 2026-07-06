-- ============================================================
-- Migration: Keep-warm cron for the dashboard working set
-- Feature: dashboard-and-ux-performance (cold-cache remediation on Nano compute)
-- ============================================================
-- WHY THIS EXISTS
--   On Nano/Micro compute (shared_buffers ~= 224 MB, shared CPU) the ~12-20 MB
--   dashboard working set (hot tables + their indexes) does not stay resident in
--   shared_buffers between visits. Every "first open" after an idle period then
--   re-reads those pages from disk = seconds of latency, even though the same
--   query is single-digit-milliseconds once warm. This job periodically reloads
--   that working set so the first open is warm, not cold.
--
-- WHY pg_prewarm AND NOT "ping the dashboard RPCs"
--   The obvious idea -- have cron call get_student_dashboard()/get_teacher_dashboard()
--   on a schedule -- does NOT work here. Those RPCs are fail-closed SECURITY DEFINER
--   functions: with no JWT (auth.uid() IS NULL, which is exactly the context a cron
--   job runs in) they null out the target id and return an EMPTY payload. An empty
--   result touches no data pages, so it would warm nothing. pg_prewarm loads the
--   relation's blocks directly at the storage layer -- below RLS and independent of
--   any auth context -- which is precisely what a background warmer needs.
--
-- CONNECTION-SAFETY (see 20260520063903_fix_pgcron_connection_exhaustion)
--   A prior */5 cron job (REFRESH MATERIALIZED VIEW CONCURRENTLY) exhausted the
--   60-connection pool because it was long-running and took locks. pg_prewarm is
--   the opposite: it is read-only, takes no user-visible locks, and completes in
--   well under a second for a working set this small. The function also pins its
--   own statement_timeout so a single pass can never hang and hold a cron worker's
--   connection open.
--
-- SAFETY / REVERSIBILITY
--   * Purely additive. Installs one extension (pg_prewarm), one function, one job.
--   * The scheduling is wrapped in the existing public.is_pgcron_available() guard
--     so a fresh replay / free-tier environment where pg_cron is absent simply
--     skips it (the function is still installed but never invoked) -- keeps the
--     Supabase Preview green.
--   * Every prewarm call is individually exception-guarded, so a renamed/missing
--     relation or a permission hiccup on one index degrades to a no-op for that
--     one relation instead of failing the whole pass.
--   * To remove: SELECT cron.unschedule('keepwarm-dashboards');
--                DROP FUNCTION public.keepwarm_dashboards();
-- ============================================================

-- 1. Enable pg_prewarm. Guarded so a (very unlikely) unavailability degrades to a
--    NOTICE rather than reddening a from-scratch replay. pg_prewarm is a standard
--    contrib module present in the Supabase Postgres image and, unlike pg_cron,
--    needs no shared_preload_libraries entry.
DO $prewarm_ext$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_prewarm WITH SCHEMA extensions;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_prewarm extension unavailable (keepwarm will no-op): %', SQLERRM;
END $prewarm_ext$;

-- 2. The warmer. Loads the heap + every index of each hot dashboard relation into
--    shared_buffers. SECURITY DEFINER + owned by the migration role (postgres),
--    which owns the public tables, so it can prewarm their blocks. search_path is
--    pinned empty (all refs schema-qualified) per this repo's hardening convention;
--    statement_timeout is pinned so the pass is strictly bounded.
CREATE OR REPLACE FUNCTION public.keepwarm_dashboards()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
SET statement_timeout = '30s'
AS $$
DECLARE
  -- The measured dashboard working set (hot across student/teacher/coordinator/
  -- admin). Names are resolved at runtime via to_regclass, so an absent/renamed
  -- table is skipped rather than erroring -- the list is safe to extend later.
  v_targets text[] := ARRAY[
    'public.profiles',
    'public.student_profiles',
    'public.student_gamification',
    'public.student_courses',
    'public.outcome_attainment',
    'public.learning_outcomes',
    'public.outcome_mappings',
    'public.assignments',
    'public.submissions',
    'public.grades',
    'public.badges',
    'public.notifications',
    'public.habit_logs',
    'public.announcements',
    'public.institution_settings',
    'public.courses',
    'public.programs',
    'public.cqi_action_plans',
    'public.xp_transactions',
    'public.audit_logs'
  ];
  v_name   text;
  v_relid  oid;
  v_idx    oid;
  v_warmed integer := 0;
BEGIN
  FOREACH v_name IN ARRAY v_targets LOOP
    v_relid := to_regclass(v_name);
    CONTINUE WHEN v_relid IS NULL;  -- absent on a fresh replay: skip, never fail

    -- Heap.
    BEGIN
      PERFORM extensions.pg_prewarm(v_relid);
      v_warmed := v_warmed + 1;
    EXCEPTION WHEN OTHERS THEN
      NULL;  -- one relation's failure must not abort the pass
    END;

    -- Every index on the relation (dashboard lookups are index-driven).
    FOR v_idx IN
      SELECT indexrelid FROM pg_catalog.pg_index WHERE indrelid = v_relid
    LOOP
      BEGIN
        PERFORM extensions.pg_prewarm(v_idx);
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
    END LOOP;
  END LOOP;

  RETURN v_warmed;  -- surfaced in cron.job_run_details for post-deploy observability
END;
$$;

-- Least-privilege hygiene (see .kiro/steering/supabase-patterns.md): this is an
-- internal maintenance function with no auth guard, so it must not be reachable
-- from the PostgREST RPC surface. Owner (postgres, the cron runner) keeps EXECUTE.
REVOKE EXECUTE ON FUNCTION public.keepwarm_dashboards() FROM PUBLIC;

-- 3. Schedule every 5 minutes -- only where pg_cron actually exists. Idempotent:
--    cron.schedule with an existing name replaces that job, so re-running is safe.
DO $schedule$
BEGIN
  IF public.is_pgcron_available() THEN
    PERFORM cron.schedule(
      'keepwarm-dashboards',
      '*/5 * * * *',
      $cmd$SELECT public.keepwarm_dashboards()$cmd$
    );
    RAISE NOTICE 'keepwarm-dashboards scheduled (*/5 * * * *)';
  ELSE
    RAISE NOTICE 'pg_cron unavailable -- keepwarm-dashboards not scheduled (function still installed).';
  END IF;
END $schedule$;
