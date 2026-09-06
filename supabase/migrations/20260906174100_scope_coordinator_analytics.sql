-- =============================================================================
-- scope_coordinator_analytics — continuous-verification task 7.6
-- ONE scoped RPC feeding the coordinator analytics (gap analysis, coverage
-- heatmap, sankey). Replaces the client-side whole-table reads:
--   learning_outcomes (ALL rows) → program-scoped outcomes only
--   outcome_mappings (ALL rows)  → edges within the program's outcome set
--   evidence (ALL rows)          → evidence for the program's CLOs only
-- SECURITY INVOKER: the caller's RLS scopes every row (coordinator/admin see
-- their institution; students/parents get only what their policies allow).
-- Deterministic classification stays in the shared client libs
-- (gapAnalysis.ts / coverageHeatmap.ts / sankeyTransform.ts) — one source.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_coordinator_analytics_v1(p_program_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = public
AS $fn$
WITH prog_courses AS (
  SELECT id, name
  FROM public.courses
  WHERE program_id = p_program_id
),
prog_plos AS (
  SELECT id, title, type, course_id, program_id
  FROM public.learning_outcomes
  WHERE program_id = p_program_id
    AND type = 'PLO'
),
prog_clos AS (
  SELECT lo.id, lo.title, lo.type, lo.course_id, lo.program_id
  FROM public.learning_outcomes lo
  WHERE lo.course_id IN (SELECT id FROM prog_courses)
    AND lo.type = 'CLO'
),
prog_ilos AS (
  SELECT lo.id, lo.title, lo.type, lo.course_id, lo.program_id
  FROM public.learning_outcomes lo
  WHERE lo.type = 'ILO'
    AND EXISTS (
      SELECT 1
      FROM public.outcome_mappings m
      WHERE m.target_outcome_id IN (SELECT id FROM prog_plos)
        AND m.source_outcome_id = lo.id
    )
),
prog_outcomes AS (
  SELECT id, title, type, course_id, program_id FROM prog_plos
  UNION
  SELECT id, title, type, course_id, program_id FROM prog_clos
  UNION
  SELECT id, title, type, course_id, program_id FROM prog_ilos
),
children AS (
  SELECT m.source_outcome_id, count(DISTINCT m.target_outcome_id)::int AS mapped_children
  FROM public.outcome_mappings m
  WHERE m.source_outcome_id IN (SELECT id FROM prog_outcomes)
  GROUP BY m.source_outcome_id
),
ev AS (
  SELECT e.clo_id, count(*)::int AS evidence_count
  FROM public.evidence e
  WHERE e.clo_id IN (SELECT id FROM prog_clos)
  GROUP BY e.clo_id
),
mappings AS (
  SELECT m.source_outcome_id, m.target_outcome_id, m.weight
  FROM public.outcome_mappings m
  WHERE m.source_outcome_id IN (SELECT id FROM prog_outcomes)
    AND m.target_outcome_id IN (SELECT id FROM prog_outcomes)
),
attainment AS (
  SELECT oa.outcome_id, oa.attainment_percent
  FROM public.outcome_attainment oa
  WHERE oa.outcome_id IN (SELECT id FROM prog_outcomes)
)
SELECT jsonb_build_object(
  'outcomes', COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', o.id,
      'title', o.title,
      'type', o.type,
      'mapped_children_count', COALESCE(ch.mapped_children, 0),
      'evidence_count', COALESCE(ev.evidence_count, 0)
    ) ORDER BY o.type, o.title)
    FROM prog_outcomes o
    LEFT JOIN children ch ON ch.source_outcome_id = o.id
    LEFT JOIN ev ON ev.clo_id = o.id
  ), '[]'::jsonb),
  'mappings', COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'source_outcome_id', m.source_outcome_id,
      'target_outcome_id', m.target_outcome_id,
      'weight', m.weight
    ))
    FROM mappings m
  ), '[]'::jsonb),
  'courses', COALESCE((
    SELECT jsonb_agg(jsonb_build_object('id', pc.id, 'name', pc.name) ORDER BY pc.name)
    FROM prog_courses pc
  ), '[]'::jsonb),
  'clos', COALESCE((
    SELECT jsonb_agg(jsonb_build_object('id', pc.id, 'title', pc.title, 'course_id', pc.course_id))
    FROM prog_clos pc
  ), '[]'::jsonb),
  'evidence', COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'clo_id', pc.id,
      'course_id', pc.course_id,
      'score_percent', e.score_percent
    ))
    FROM public.evidence e
    JOIN prog_clos pc ON pc.id = e.clo_id
  ), '[]'::jsonb),
  'attainment', COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'outcome_id', a.outcome_id,
      'attainment_percent', a.attainment_percent
    ))
    FROM attainment a
  ), '[]'::jsonb)
);
$fn$;

REVOKE ALL ON FUNCTION public.get_coordinator_analytics_v1(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_coordinator_analytics_v1(uuid) TO authenticated, service_role;

COMMENT ON FUNCTION public.get_coordinator_analytics_v1(uuid) IS
  '7.6: program-scoped coordinator analytics payload (outcomes + mapped-children/evidence counts, in-program mapping edges, per-CLO evidence rows, attainment rows). Invoker-rights; replaces client-side whole-table reads.';