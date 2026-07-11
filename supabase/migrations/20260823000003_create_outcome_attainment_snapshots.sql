-- =============================================================================
-- outcome_attainment_snapshots — per-semester attainment history for trends
-- =============================================================================
--
-- outcome_attainment holds only the CURRENT attainment per (outcome, student,
-- course, scope) — it is updated in place and has no time dimension, so there
-- is no way to draw a per-term trend from it. This migration adds a snapshot
-- table + a capture function + a monthly pg_cron job so that a per-semester
-- attainment history ACCUMULATES over time. The coordinator Outcome Attainment
-- screen reads it to show "vs last term" once ≥2 terms have been captured
-- (until then the trend UI stays hidden — honest, no fabricated history).
--
-- Grain: one row per (institution, semester, outcome, scope) = the mean
-- attainment for that outcome in that term. A baseline snapshot for the current
-- active term is captured at the end of this migration (a no-op on a fresh
-- Preview branch where attainment is empty; real data on production).
--
-- Replay-safe: table + function are created before they are referenced; the
-- REVOKE/GRANT target the function created just above; the pg_cron scheduling
-- and the seed call live in DO blocks / are guarded (is_pgcron_available from
-- 20260615000001). Passes scripts/check-migration-replay-order.mjs.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.outcome_attainment_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  semester_id uuid NOT NULL REFERENCES public.semesters(id) ON DELETE CASCADE,
  outcome_id uuid NOT NULL REFERENCES public.learning_outcomes(id) ON DELETE CASCADE,
  scope text NOT NULL,
  mean_attainment_percent numeric NOT NULL,
  sample_count integer NOT NULL DEFAULT 0,
  snapshot_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, semester_id, outcome_id, scope)
);

COMMENT ON TABLE public.outcome_attainment_snapshots IS
  'Per-semester mean attainment per outcome (trend history). Written by capture_active_semester_snapshots (service role / cron); read-only for institution coordinators/admins.';

CREATE INDEX IF NOT EXISTS idx_outcome_attainment_snapshots_trend
  ON public.outcome_attainment_snapshots (institution_id, outcome_id, snapshot_at);

ALTER TABLE public.outcome_attainment_snapshots ENABLE ROW LEVEL SECURITY;

-- Read: coordinators/admins see their own institution's snapshots.
CREATE POLICY "outcome_attainment_snapshots_read" ON public.outcome_attainment_snapshots
  FOR SELECT TO authenticated
  USING (
    institution_id = (SELECT public.auth_institution_id())
    AND (SELECT public.auth_user_role()) IN ('coordinator', 'admin')
  );
-- No write policies: only the SECURITY DEFINER capture function (service role)
-- inserts/updates rows, so clients cannot fabricate history.

-- ─── Capture function ────────────────────────────────────────────────────────
-- Snapshots the CURRENT outcome_attainment (mean per outcome+scope) into each
-- institution's ACTIVE semester bucket. Idempotent per term via the unique
-- constraint (re-running the same term refreshes that term's row rather than
-- appending), so a monthly cron keeps the current term fresh and each NEW term
-- lands its own row → a real per-term series.
CREATE OR REPLACE FUNCTION public.capture_active_semester_snapshots()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_count integer := 0;
BEGIN
  INSERT INTO public.outcome_attainment_snapshots
    (institution_id, semester_id, outcome_id, scope, mean_attainment_percent, sample_count)
  SELECT
    lo.institution_id,
    s.id,
    oa.outcome_id,
    oa.scope::text,
    round(avg(oa.attainment_percent), 2),
    count(*)::integer
  FROM public.outcome_attainment oa
  JOIN public.learning_outcomes lo ON lo.id = oa.outcome_id
  JOIN public.semesters s
    ON s.institution_id = lo.institution_id AND s.is_active = true
  WHERE oa.attainment_percent IS NOT NULL
  GROUP BY lo.institution_id, s.id, oa.outcome_id, oa.scope
  ON CONFLICT (institution_id, semester_id, outcome_id, scope)
  DO UPDATE SET
    mean_attainment_percent = EXCLUDED.mean_attainment_percent,
    sample_count = EXCLUDED.sample_count,
    snapshot_at = now();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION public.capture_active_semester_snapshots() IS
  'Captures a per-active-semester snapshot of mean outcome attainment into outcome_attainment_snapshots. Service-role/cron only.';

-- Hygiene: this is a service/cron function, never called by clients.
REVOKE ALL ON FUNCTION public.capture_active_semester_snapshots() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.capture_active_semester_snapshots() TO service_role;

-- ─── Baseline snapshot (current term) ────────────────────────────────────────
-- Guarded so a fresh replay (function guaranteed to exist above) is safe; on a
-- Preview branch outcome_attainment is empty → 0 rows; on production it captures
-- the current term as the first trend point.
DO $$
BEGIN
  PERFORM public.capture_active_semester_snapshots();
END;
$$;

-- ─── Monthly cron (Pro tier only; guarded) ───────────────────────────────────
DO $$
BEGIN
  IF public.is_pgcron_available() THEN
    PERFORM cron.schedule(
      'capture-outcome-attainment-snapshots',
      '0 3 1 * *',
      'SELECT public.capture_active_semester_snapshots()'
    );
  END IF;
END;
$$;
