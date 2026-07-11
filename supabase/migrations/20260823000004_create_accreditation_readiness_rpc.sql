-- =============================================================================
-- get_coordinator_accreditation_readiness() → jsonb
-- =============================================================================
--
-- Derives a REAL accreditation "evidence coverage" readiness for the caller's
-- institution from existing data (no new tables): per course, whether its CLOs
-- are mapped to a PLO (outcome_mappings, either direction) and whether evidence
-- (public.evidence) and attainment (public.outcome_attainment) have been
-- collected. Each course is classified documented / partial / blocked (CLOs
-- exist but none mapped) / not_started, and the headline readiness is the share
-- of documented courses. Also returns a derived accreditation-pack checklist
-- (CLO mapping / student-work samples / assessment analysis / CQI closure).
--
-- SECURITY DEFINER (not invoker) because it reads public.evidence, which
-- coordinators do not have a broad SELECT policy on; the function is therefore
-- fail-closed with an explicit role guard and scopes EVERY read to the caller's
-- own institution via auth_institution_id() (no parameter → no cross-tenant
-- surface). Mirrors the get_earn_spend_ratio / get_wellness_aggregate_stats
-- guard pattern. Returns only per-course aggregate statuses — no student PII.
--
-- Replay-safe: CREATE OR REPLACE; auth_user_role/auth_institution_id
-- (20260222073710) and all referenced tables exist far earlier; REVOKE/GRANT
-- target the function created just above. Passes check-migration-replay-order.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_coordinator_accreditation_readiness()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_inst uuid;
  v_result jsonb;
BEGIN
  IF (SELECT public.auth_user_role()) NOT IN ('coordinator', 'admin') THEN
    RAISE EXCEPTION 'unauthorized: coordinator or admin role required'
      USING ERRCODE = '42501';
  END IF;

  v_inst := (SELECT public.auth_institution_id());
  IF v_inst IS NULL THEN
    RETURN jsonb_build_object(
      'readinessPercent', 0, 'documented', 0, 'partial', 0,
      'blocked', 0, 'notStarted', 0,
      'courses', '[]'::jsonb, 'pack', '[]'::jsonb
    );
  END IF;

  WITH mapped_outcomes AS (
    SELECT source_outcome_id AS outcome_id FROM public.outcome_mappings
    UNION
    SELECT target_outcome_id AS outcome_id FROM public.outcome_mappings
  ),
  inst_courses AS (
    SELECT c.id, c.code, c.name
    FROM public.courses c
    JOIN public.programs p ON p.id = c.program_id
    WHERE p.institution_id = v_inst
  ),
  course_clo AS (
    SELECT ic.id AS course_id,
           count(lo.id) AS clos,
           count(lo.id) FILTER (WHERE mo.outcome_id IS NOT NULL) AS mapped_clos
    FROM inst_courses ic
    LEFT JOIN public.learning_outcomes lo
      ON lo.course_id = ic.id AND lo.type = 'CLO'
    LEFT JOIN mapped_outcomes mo ON mo.outcome_id = lo.id
    GROUP BY ic.id
  ),
  course_ev AS (
    SELECT lo.course_id, count(e.id) AS n
    FROM public.learning_outcomes lo
    JOIN public.evidence e ON e.clo_id = lo.id
    WHERE lo.type = 'CLO'
    GROUP BY lo.course_id
  ),
  course_att AS (
    SELECT lo.course_id, count(oa.id) AS n
    FROM public.learning_outcomes lo
    JOIN public.outcome_attainment oa ON oa.outcome_id = lo.id
    WHERE lo.type = 'CLO'
    GROUP BY lo.course_id
  ),
  classified AS (
    SELECT ic.id, ic.code, ic.name,
      CASE
        WHEN coalesce(cc.clos, 0) = 0 THEN 'not_started'
        WHEN coalesce(cc.mapped_clos, 0) = 0 THEN 'blocked'
        WHEN coalesce(ce.n, 0) > 0 AND coalesce(ca.n, 0) > 0 THEN 'documented'
        WHEN coalesce(ce.n, 0) > 0 OR coalesce(ca.n, 0) > 0 THEN 'partial'
        ELSE 'not_started'
      END AS status
    FROM inst_courses ic
    LEFT JOIN course_clo cc ON cc.course_id = ic.id
    LEFT JOIN course_ev ce ON ce.course_id = ic.id
    LEFT JOIN course_att ca ON ca.course_id = ic.id
  ),
  agg AS (
    SELECT
      count(*) AS total,
      count(*) FILTER (WHERE status = 'documented') AS documented,
      count(*) FILTER (WHERE status = 'partial') AS partial,
      count(*) FILTER (WHERE status = 'blocked') AS blocked,
      count(*) FILTER (WHERE status = 'not_started') AS not_started
    FROM classified
  ),
  pack AS (
    SELECT
      (SELECT count(*) FROM public.learning_outcomes
        WHERE institution_id = v_inst AND type = 'CLO') AS clos,
      (SELECT count(DISTINCT o.id) FROM public.learning_outcomes o
        WHERE o.institution_id = v_inst AND o.type = 'CLO'
          AND o.id IN (SELECT outcome_id FROM mapped_outcomes)) AS mapped_clos,
      (SELECT count(*) FROM public.evidence e
        JOIN public.learning_outcomes lo ON lo.id = e.clo_id
        WHERE lo.institution_id = v_inst) AS evidence_n,
      (SELECT count(*) FROM public.outcome_attainment oa
        JOIN public.learning_outcomes lo ON lo.id = oa.outcome_id
        WHERE lo.institution_id = v_inst) AS att_n,
      (SELECT count(*) FROM public.cqi_action_plans cq
        JOIN public.programs p ON p.id = cq.program_id
        WHERE p.institution_id = v_inst) AS cqi_total,
      (SELECT count(*) FROM public.cqi_action_plans cq
        JOIN public.programs p ON p.id = cq.program_id
        WHERE p.institution_id = v_inst
          AND cq.status IN ('completed', 'evaluated')) AS cqi_closed
  )
  SELECT jsonb_build_object(
    'readinessPercent',
      CASE WHEN a.total > 0
        THEN round((a.documented::numeric / a.total) * 100)
        ELSE 0 END,
    'documented', a.documented,
    'partial', a.partial,
    'blocked', a.blocked,
    'notStarted', a.not_started,
    'courses', coalesce(
      (SELECT jsonb_agg(
        jsonb_build_object('code', code, 'name', name, 'status', status)
        ORDER BY code) FROM classified), '[]'::jsonb),
    'pack', jsonb_build_array(
      jsonb_build_object('key', 'cloMapping', 'state',
        CASE WHEN ps.clos > 0 AND ps.mapped_clos >= ps.clos THEN 'done'
             WHEN ps.mapped_clos > 0 THEN 'prog' ELSE 'pending' END),
      jsonb_build_object('key', 'samples', 'state',
        CASE WHEN ps.evidence_n > 0 THEN 'done' ELSE 'pending' END),
      jsonb_build_object('key', 'analysis', 'state',
        CASE WHEN ps.att_n > 0 THEN 'done' ELSE 'pending' END),
      jsonb_build_object('key', 'cqi', 'state',
        CASE WHEN ps.cqi_total > 0 AND ps.cqi_closed = ps.cqi_total THEN 'done'
             WHEN ps.cqi_total > 0 THEN 'prog' ELSE 'pending' END)
    )
  )
  INTO v_result
  FROM agg a, pack ps;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_coordinator_accreditation_readiness() IS
  'Derives institution accreditation evidence-coverage readiness (per-course documented/partial/blocked/not_started + derived pack checklist) from courses/outcomes/evidence/attainment/cqi. SECURITY DEFINER, role-gated, scoped to auth_institution_id().';

REVOKE ALL ON FUNCTION public.get_coordinator_accreditation_readiness() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_coordinator_accreditation_readiness() TO authenticated;
