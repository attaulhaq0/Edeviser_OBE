-- =============================================================================
-- get_curriculum_ingest_suggestions_v1 - continuous-verification task 7.8
-- In-form CLO suggestions for the teacher's CLO creation form: surfaces the
-- candidate CLOs from the most recently EXECUTED ingest_curriculum proposal
-- for the course. SECURITY INVOKER: the caller's RLS scopes the course.
-- Teachers/coordinators/admins of the course institution may read.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_curriculum_ingest_suggestions_v1(
  p_course_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $function$
DECLARE
  v_course_institution uuid;
  v_execution record;
BEGIN
  SELECT institution_id INTO v_course_institution
  FROM public.courses WHERE id = p_course_id;
  IF v_course_institution IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  -- The most recent executed ingestion for this course (executed implies the
  -- coordinator approved the proposal).
  SELECT e.result->'cloIds' AS clo_ids, e.executed_at
    INTO v_execution
  FROM public.agent_action_executions e
  JOIN public.agent_action_proposals p ON p.id = e.proposal_id
  WHERE p.course_id = p_course_id
    AND p.action_type = 'ingest_curriculum'
    AND e.result->>'targetType' = 'learning_outcomes'
  ORDER BY e.executed_at DESC
  LIMIT 1;

  IF v_execution.clo_ids IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  -- Return the ingested draft CLOs for the form to prefill.
  RETURN (
    SELECT jsonb_agg(jsonb_build_object(
      'title_en', lo.title,
      'title_ar', lo.title_ar,
      'description_en', lo.description,
      'blooms', CASE lo.blooms_level::text
        WHEN 'remembering' THEN 1
        WHEN 'understanding' THEN 2
        WHEN 'applying' THEN 3
        WHEN 'analyzing' THEN 4
        WHEN 'evaluating' THEN 5
        WHEN 'creating' THEN 6
        ELSE 3
      END
    ) ORDER BY lo.sort_order)
    FROM public.learning_outcomes lo
    WHERE lo.course_id = p_course_id
      AND lo.type = 'CLO'
      AND lo.review_status = 'draft'
      AND lo.id = ANY (ARRAY(
        SELECT (x::text)::uuid FROM jsonb_array_elements_text(v_execution.clo_ids) AS x
      ))
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.get_curriculum_ingest_suggestions_v1(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_curriculum_ingest_suggestions_v1(uuid) TO authenticated;

COMMENT ON FUNCTION public.get_curriculum_ingest_suggestions_v1(uuid) IS
  '7.8: in-form CLO suggestions - returns bilingual CLO candidates from the most recently executed curriculum-ingest proposal for the course. SECURITY INVOKER: caller RLS scopes the course.';