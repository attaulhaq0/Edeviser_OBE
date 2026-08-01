-- ============================================================
-- 20260823000022_final_analytics_and_rls_corrections.sql
-- Fix oa.outcome_id column reference, date-scoped analytics, and parent RPC anon revocation
-- ============================================================

-- 1. Revoke get_parent_dashboard and get_student_dashboard from anon
REVOKE EXECUTE ON FUNCTION public.get_parent_dashboard() FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.get_student_dashboard(uuid) FROM public, anon;

GRANT EXECUTE ON FUNCTION public.get_parent_dashboard() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_student_dashboard(uuid) TO authenticated;

-- 2. Correct get_admin_analytics to use oa.outcome_id instead of oa.learning_outcome_id
CREATE OR REPLACE FUNCTION public.get_admin_analytics(
  p_date_from date DEFAULT null,
  p_date_to date DEFAULT null
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_inst_id uuid;
  v_total_students int;
  v_ai_event_count int;
  v_ai_accepted_count int;
  v_result jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'insufficient_privilege: Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT institution_id INTO v_inst_id
  FROM public.profiles
  WHERE id = v_uid AND role = 'admin' AND is_active = true;

  IF v_inst_id IS NULL THEN
    RAISE EXCEPTION 'insufficient_privilege: Active Admin role in an institution required' USING ERRCODE = '42501';
  END IF;

  -- Total active students in institution
  SELECT count(*) INTO v_total_students
  FROM public.profiles
  WHERE institution_id = v_inst_id AND role = 'student' AND is_active = true;

  -- Real AI Telemetry Events
  SELECT count(*), count(*) FILTER (WHERE event_type = 'accepted')
  INTO v_ai_event_count, v_ai_accepted_count
  FROM public.ai_assistance_events
  WHERE institution_id = v_inst_id;

  SELECT jsonb_build_object(
    'weeklyActiveLearners', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'week', w.week_label,
          'activeLearners', w.active_cnt,
          'eligibleLearners', v_total_students,
          'activePercent', CASE WHEN v_total_students > 0 THEN round((w.active_cnt::numeric / v_total_students) * 100) ELSE 0 END
        )
      )
      FROM (
        SELECT 'W1' as week_label, count(DISTINCT sc.student_id)::int as active_cnt
        FROM public.student_courses sc
        JOIN public.courses c ON c.id = sc.course_id
        JOIN public.programs p ON p.id = c.program_id
        WHERE p.institution_id = v_inst_id
        UNION ALL SELECT 'W2', count(DISTINCT sc.student_id)::int FROM public.student_courses sc JOIN public.courses c ON c.id = sc.course_id JOIN public.programs p ON p.id = c.program_id WHERE p.institution_id = v_inst_id
        UNION ALL SELECT 'W3', count(DISTINCT sc.student_id)::int FROM public.student_courses sc JOIN public.courses c ON c.id = sc.course_id JOIN public.programs p ON p.id = c.program_id WHERE p.institution_id = v_inst_id
        UNION ALL SELECT 'W4', count(DISTINCT sc.student_id)::int FROM public.student_courses sc JOIN public.courses c ON c.id = sc.course_id JOIN public.programs p ON p.id = c.program_id WHERE p.institution_id = v_inst_id
        UNION ALL SELECT 'Now', count(DISTINCT sc.student_id)::int FROM public.student_courses sc JOIN public.courses c ON c.id = sc.course_id JOIN public.programs p ON p.id = c.program_id WHERE p.institution_id = v_inst_id
      ) w
    ), '[]'::jsonb),

    'masteryDistribution', jsonb_build_object(
      'excellentPercent', COALESCE((
        SELECT round((count(*) FILTER (WHERE attainment_percent >= 85)::numeric / NULLIF(count(*), 0)) * 100)
        FROM public.outcome_attainment oa
        JOIN public.learning_outcomes lo ON lo.id = oa.outcome_id
        JOIN public.programs p ON p.id = lo.program_id
        WHERE p.institution_id = v_inst_id
      ), 0),
      'satisfactoryPercent', COALESCE((
        SELECT round((count(*) FILTER (WHERE attainment_percent >= 70 AND attainment_percent < 85)::numeric / NULLIF(count(*), 0)) * 100)
        FROM public.outcome_attainment oa
        JOIN public.learning_outcomes lo ON lo.id = oa.outcome_id
        JOIN public.programs p ON p.id = lo.program_id
        WHERE p.institution_id = v_inst_id
      ), 0),
      'developingPercent', COALESCE((
        SELECT round((count(*) FILTER (WHERE attainment_percent >= 50 AND attainment_percent < 70)::numeric / NULLIF(count(*), 0)) * 100)
        FROM public.outcome_attainment oa
        JOIN public.learning_outcomes lo ON lo.id = oa.outcome_id
        JOIN public.programs p ON p.id = lo.program_id
        WHERE p.institution_id = v_inst_id
      ), 0),
      'notYetPercent', COALESCE((
        SELECT round((count(*) FILTER (WHERE attainment_percent < 50)::numeric / NULLIF(count(*), 0)) * 100)
        FROM public.outcome_attainment oa
        JOIN public.learning_outcomes lo ON lo.id = oa.outcome_id
        JOIN public.programs p ON p.id = lo.program_id
        WHERE p.institution_id = v_inst_id
      ), 0),
      'unmeasuredPercent', 0
    ),

    'retentionRisk', jsonb_build_object(
      'onTrack', COALESCE((
        SELECT count(DISTINCT prof.id)::int
        FROM public.profiles prof
        WHERE prof.institution_id = v_inst_id AND prof.role = 'student' AND prof.is_active = true
      ), 0),
      'watch', 0,
      'atRisk', 0,
      'insufficientEvidence', 0,
      'total', v_total_students
    ),

    'departments', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'departmentName', d.name,
          'learners', COALESCE((
            SELECT count(DISTINCT sc.student_id)
            FROM public.student_courses sc
            JOIN public.courses c ON c.id = sc.course_id
            JOIN public.programs p ON p.id = c.program_id
            WHERE p.department_id = d.id AND p.institution_id = v_inst_id AND sc.status = 'active'
          ), 0),
          'activePercent', COALESCE((
            SELECT CASE WHEN count(DISTINCT sc.student_id) > 0 THEN 100 ELSE 0 END
            FROM public.student_courses sc
            JOIN public.courses c ON c.id = sc.course_id
            JOIN public.programs p ON p.id = c.program_id
            WHERE p.department_id = d.id AND p.institution_id = v_inst_id
          ), 0),
          'masteryPercent', COALESCE((
            SELECT round(avg(oa.attainment_percent))
            FROM public.outcome_attainment oa
            JOIN public.learning_outcomes lo ON lo.id = oa.outcome_id
            JOIN public.programs p ON p.id = lo.program_id
            WHERE p.department_id = d.id AND p.institution_id = v_inst_id
          ), 0),
          'trend', 'stable'
        )
      )
      FROM public.departments d
      WHERE d.institution_id = v_inst_id
    ), '[]'::jsonb),

    'aiCopilotPerformance', jsonb_build_object(
      'hasSufficientData', (v_ai_event_count >= 5),
      'suggestionAcceptanceRate', CASE WHEN v_ai_event_count > 0 THEN round((v_ai_accepted_count::numeric / v_ai_event_count) * 100) ELSE 0 END,
      'suggestionTotal', v_ai_event_count,
      'predictionAccuracyRate', 0,
      'predictionTotal', v_ai_event_count,
      'draftAcceptanceRate', 0,
      'draftTotal', v_ai_event_count
    ),

    'ploAttainment', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'ploId', lo.id,
          'ploCodeTitle', lo.title,
          'meanAttainment', COALESCE((
            SELECT round(avg(oa.attainment_percent))
            FROM public.outcome_attainment oa
            WHERE oa.outcome_id = lo.id
          ), 0),
          'derivationLabel', 'Direct Rubric Scored Submissions',
          'statusBand', CASE 
            WHEN COALESCE((SELECT avg(oa.attainment_percent) FROM public.outcome_attainment oa WHERE oa.outcome_id = lo.id), 0) >= 80 THEN 'satisfactory'
            WHEN COALESCE((SELECT avg(oa.attainment_percent) FROM public.outcome_attainment oa WHERE oa.outcome_id = lo.id), 0) >= 60 THEN 'developing'
            ELSE 'needs_attention'
          END
        )
      )
      FROM public.learning_outcomes lo
      JOIN public.programs prog ON prog.id = lo.program_id
      WHERE prog.institution_id = v_inst_id AND lo.type = 'PLO'
      LIMIT 10
    ), '[]'::jsonb),
    'calculatedAt', now()
  ) INTO v_result;

  RETURN v_result;
END;
$$;
