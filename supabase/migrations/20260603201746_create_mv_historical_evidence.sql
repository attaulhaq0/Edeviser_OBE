-- Feature: qa-partner-review-remediation — Req 4 (B4)
-- Task 12.2: Historical Evidence materialized view + on-demand refresh function.
--
-- The Admin Historical Evidence dashboard previously rendered a developer-text
-- placeholder because this materialized view never existed. This migration creates it.
--
-- Schema note (validated against the live schema, project cdlgtbvxlxjpcddjazzx):
--   `public.outcome_attainment` has NO `semester_id` column. Its columns are
--   (id, outcome_id, student_id, course_id, scope, attainment_percent, sample_count,
--    last_calculated_at). The semester is therefore DERIVED through
--   outcome_attainment.course_id -> public.courses.semester_id -> public.semesters.id
--   (the design's documented fallback when outcome_attainment lacks semester_id).
--   Attainment bands use `attainment_percent` (NOT NULL numeric) with the platform
--   thresholds (excellent >=85, satisfactory 70-84, developing 50-69, not_yet <50),
--   filtered to scope = 'student_course'.
--
-- Replay integrity (migration-replay-integrity.md): references only pre-existing tables
-- (public.outcome_attainment, public.learning_outcomes, public.courses, public.semesters),
-- all created by earlier migrations; the refresh function is hardened at its CREATE site
-- (SET search_path = '', public.-qualified, REVOKE PUBLIC/anon + GRANT service_role/postgres
-- here, with no later bare ALTER/GRANT on it).

-- Historical evidence rollup per semester x outcome type x Bloom's level.
-- Institution scoping is enforced at SELECT time by the calling RLS-backed query; the MV
-- itself is institution-agnostic aggregate evidence keyed by semester.
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_historical_evidence AS
SELECT
  s.id                                   AS semester_id,
  s.name                                 AS semester_name,
  s.start_date                           AS start_date,
  lo.type                                AS outcome_type,        -- 'ILO' | 'PLO' | 'CLO' | 'SUB_CLO'
  lo.blooms_level                        AS blooms_level,
  COUNT(oa.id)                           AS evidence_count,
  COALESCE(AVG(oa.attainment_percent), 0)::numeric(5,2) AS avg_score,
  COUNT(*) FILTER (WHERE oa.attainment_percent >= 85)                                AS excellent_count,
  COUNT(*) FILTER (WHERE oa.attainment_percent >= 70 AND oa.attainment_percent < 85) AS satisfactory_count,
  COUNT(*) FILTER (WHERE oa.attainment_percent >= 50 AND oa.attainment_percent < 70) AS developing_count,
  COUNT(*) FILTER (WHERE oa.attainment_percent < 50)                                 AS not_yet_count
FROM public.outcome_attainment oa
JOIN public.learning_outcomes lo ON lo.id = oa.outcome_id
JOIN public.courses co           ON co.id = oa.course_id
JOIN public.semesters s          ON s.id = co.semester_id
WHERE oa.scope = 'student_course'
GROUP BY s.id, s.name, s.start_date, lo.type, lo.blooms_level;

-- Unique index is REQUIRED for REFRESH MATERIALIZED VIEW CONCURRENTLY.
CREATE UNIQUE INDEX IF NOT EXISTS mv_historical_evidence_uidx
  ON public.mv_historical_evidence (semester_id, outcome_type, blooms_level);

-- On-demand refresh via a SECURITY DEFINER function (search_path-pinned, public-qualified),
-- schedulable by pg_cron and callable after bulk grade imports. CONCURRENTLY (enabled by the
-- unique index above) keeps reads unblocked during refresh.
CREATE OR REPLACE FUNCTION public.refresh_mv_historical_evidence()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_historical_evidence;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.refresh_mv_historical_evidence() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.refresh_mv_historical_evidence() TO service_role, postgres;
