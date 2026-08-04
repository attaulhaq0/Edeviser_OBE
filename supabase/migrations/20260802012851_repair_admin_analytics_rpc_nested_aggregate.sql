
CREATE OR REPLACE FUNCTION public.get_admin_analytics(
  p_date_from date DEFAULT NULL,
  p_date_to date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_inst_id uuid;
  v_from date := COALESCE(p_date_from, current_date - 28);
  v_to date := COALESCE(p_date_to, current_date);
  v_prev_from date;
  v_prev_to date;
  v_total_students int;
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

  IF v_to < v_from THEN
    RAISE EXCEPTION 'p_date_to must be on or after p_date_from' USING ERRCODE = '22007';
  END IF;

  v_prev_to := v_from - 1;
  v_prev_from := v_prev_to - (v_to - v_from);

  SELECT count(*)::int INTO v_total_students
  FROM public.profiles
  WHERE institution_id = v_inst_id AND role = 'student' AND is_active = true;

  SELECT jsonb_build_object(
    'weeklyActiveLearners', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'week', to_char(w.week_start, 'Mon DD'),
          'activeLearners', w.active_count,
          'eligibleLearners', v_total_students,
          'activePercent', CASE WHEN v_total_students > 0
            THEN round((w.active_count::numeric / v_total_students) * 100) ELSE 0 END
        ) ORDER BY w.week_start
      )
      FROM (
        SELECT gs::date AS week_start, count(DISTINCT sp.id)::int AS active_count
        FROM generate_series(v_from::timestamp, v_to::timestamp, interval '7 days') gs
        LEFT JOIN public.student_activity_log l
          ON l.created_at >= gs
         AND l.created_at < least(gs + interval '7 days', v_to + interval '1 day')
        LEFT JOIN public.profiles sp
          ON sp.id = l.student_id
         AND sp.institution_id = v_inst_id
         AND sp.role = 'student'
         AND sp.is_active = true
        GROUP BY gs
      ) w
    ), '[]'::jsonb),

    'masteryDistribution', COALESCE((
      SELECT jsonb_build_object(
        'excellentPercent', COALESCE(round((count(*) FILTER (WHERE avg_score >= 85)::numeric / NULLIF(count(*), 0)) * 100), 0),
        'satisfactoryPercent', COALESCE(round((count(*) FILTER (WHERE avg_score >= 70 AND avg_score < 85)::numeric / NULLIF(count(*), 0)) * 100), 0),
        'developingPercent', COALESCE(round((count(*) FILTER (WHERE avg_score >= 50 AND avg_score < 70)::numeric / NULLIF(count(*), 0)) * 100), 0),
        'notYetPercent', COALESCE(round((count(*) FILTER (WHERE avg_score < 50)::numeric / NULLIF(count(*), 0)) * 100), 0),
        'unmeasuredPercent', COALESCE(round((count(*) FILTER (WHERE avg_score IS NULL)::numeric / NULLIF(v_total_students, 0)) * 100), 0)
      )
      FROM (
        SELECT sp.id, avg(oa.attainment_percent) AS avg_score
        FROM public.profiles sp
        LEFT JOIN public.outcome_attainment oa ON oa.student_id = sp.id
        WHERE sp.institution_id = v_inst_id AND sp.role = 'student' AND sp.is_active = true
        GROUP BY sp.id
      ) mastery
    ), jsonb_build_object(
      'excellentPercent', 0, 'satisfactoryPercent', 0, 'developingPercent', 0,
      'notYetPercent', 0, 'unmeasuredPercent', 0
    )),

    'retentionRisk', COALESCE((
      SELECT jsonb_build_object(
        'onTrack', count(*) FILTER (WHERE avg_score >= 70 AND has_activity),
        'watch', count(*) FILTER (WHERE avg_score >= 50 AND avg_score < 70 AND has_activity),
        'atRisk', count(*) FILTER (WHERE avg_score < 50 OR (NOT has_activity AND avg_score IS NOT NULL)),
        'insufficientEvidence', count(*) FILTER (WHERE avg_score IS NULL OR (NOT has_activity AND avg_score IS NULL)),
        'total', v_total_students
      )
      FROM (
        SELECT sp.id,
          avg(oa.attainment_percent) AS avg_score,
          EXISTS (
            SELECT 1 FROM public.student_activity_log l
            WHERE l.student_id = sp.id
              AND l.created_at >= v_from
              AND l.created_at < v_to + 1
          ) AS has_activity
        FROM public.profiles sp
        LEFT JOIN public.outcome_attainment oa ON oa.student_id = sp.id
        WHERE sp.institution_id = v_inst_id AND sp.role = 'student' AND sp.is_active = true
        GROUP BY sp.id
      ) retention
    ), jsonb_build_object(
      'onTrack', 0, 'watch', 0, 'atRisk', 0,
      'insufficientEvidence', v_total_students, 'total', v_total_students
    )),

    'departments', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'departmentName', d.name,
        'learners', COALESCE(cur.learners, 0),
        'activePercent', COALESCE(round((cur.active_learners::numeric / NULLIF(cur.learners, 0)) * 100), 0),
        'masteryPercent', COALESCE(cur.mastery_percent, 0),
        'trend', CASE
          WHEN COALESCE(cur.active_percent, 0) > COALESCE(prev.active_percent, 0) THEN 'up'
          WHEN COALESCE(cur.active_percent, 0) < COALESCE(prev.active_percent, 0) THEN 'down'
          ELSE 'stable' END
      ) ORDER BY d.name)
      FROM public.departments d
      LEFT JOIN LATERAL (
        SELECT
          count(DISTINCT sc.student_id)::int AS learners,
          count(DISTINCT sp.id)::int AS active_learners,
          round(avg(oa.attainment_percent))::int AS mastery_percent,
          CASE WHEN count(DISTINCT sc.student_id) > 0 THEN
            count(DISTINCT sp.id)::numeric / count(DISTINCT sc.student_id) * 100 ELSE 0 END AS active_percent
        FROM public.programs p
        JOIN public.courses c ON c.program_id = p.id
        JOIN public.student_courses sc ON sc.course_id = c.id AND sc.status = 'active'
        LEFT JOIN public.profiles sp
          ON sp.id = sc.student_id
         AND sp.institution_id = v_inst_id
         AND sp.role = 'student'
         AND sp.is_active = true
        LEFT JOIN public.student_activity_log l
          ON l.student_id = sp.id
         AND l.created_at >= v_from AND l.created_at < v_to + 1
        LEFT JOIN public.outcome_attainment oa ON oa.student_id = sp.id
        WHERE p.department_id = d.id AND p.institution_id = v_inst_id
      ) cur ON true
      LEFT JOIN LATERAL (
        SELECT CASE WHEN count(DISTINCT sc.student_id) > 0 THEN
          count(DISTINCT sp.id)::numeric / count(DISTINCT sc.student_id) * 100 ELSE 0 END AS active_percent
        FROM public.programs p
        JOIN public.courses c ON c.program_id = p.id
        JOIN public.student_courses sc ON sc.course_id = c.id AND sc.status = 'active'
        LEFT JOIN public.profiles sp
          ON sp.id = sc.student_id
         AND sp.institution_id = v_inst_id
         AND sp.role = 'student'
         AND sp.is_active = true
        LEFT JOIN public.student_activity_log l
          ON l.student_id = sp.id
         AND l.created_at >= v_prev_from AND l.created_at < v_prev_to + 1
        WHERE p.department_id = d.id AND p.institution_id = v_inst_id
      ) prev ON true
      WHERE d.institution_id = v_inst_id
    ), '[]'::jsonb),

    'aiCopilotPerformance', COALESCE((
      SELECT jsonb_build_object(
        'hasSufficientData', count(*) >= 5,
        'suggestionAcceptanceRate', CASE WHEN count(*) FILTER (WHERE feature_context ILIKE '%suggest%') > 0
          THEN round((count(*) FILTER (WHERE feature_context ILIKE '%suggest%' AND event_type = 'accepted')::numeric /
            count(*) FILTER (WHERE feature_context ILIKE '%suggest%')) * 100) ELSE 0 END,
        'suggestionTotal', count(*) FILTER (WHERE feature_context ILIKE '%suggest%'),
        'predictionAccuracyRate', CASE WHEN count(*) FILTER (WHERE feature_context ILIKE '%predict%') > 0
          THEN round((count(*) FILTER (WHERE feature_context ILIKE '%predict%' AND event_type = 'accepted')::numeric /
            count(*) FILTER (WHERE feature_context ILIKE '%predict%')) * 100) ELSE 0 END,
        'predictionTotal', count(*) FILTER (WHERE feature_context ILIKE '%predict%'),
        'draftAcceptanceRate', CASE WHEN count(*) FILTER (WHERE feature_context ILIKE '%draft%') > 0
          THEN round((count(*) FILTER (WHERE feature_context ILIKE '%draft%' AND event_type = 'accepted')::numeric /
            count(*) FILTER (WHERE feature_context ILIKE '%draft%')) * 100) ELSE 0 END,
        'draftTotal', count(*) FILTER (WHERE feature_context ILIKE '%draft%')
      )
      FROM public.ai_assistance_events
      WHERE institution_id = v_inst_id
        AND created_at >= v_from AND created_at < v_to + 1
    ), jsonb_build_object(
      'hasSufficientData', false, 'suggestionAcceptanceRate', 0, 'suggestionTotal', 0,
      'predictionAccuracyRate', 0, 'predictionTotal', 0, 'draftAcceptanceRate', 0, 'draftTotal', 0
    )),

    'ploAttainment', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'ploId', q.id,
        'ploCodeTitle', q.title,
        'meanAttainment', COALESCE(q.mean_attainment, -1),
        'derivationLabel', CASE WHEN q.evidence_count > 0 THEN 'live attainment evidence' ELSE 'unmeasured' END,
        'statusBand', CASE
          WHEN q.evidence_count = 0 THEN 'unmeasured'
          WHEN q.mean_attainment >= 85 THEN 'excellent'
          WHEN q.mean_attainment >= 70 THEN 'satisfactory'
          WHEN q.mean_attainment >= 50 THEN 'developing'
          ELSE 'notYet' END
      ) ORDER BY q.title)
      FROM (
        SELECT lo.id, lo.title,
          round(avg(oa.attainment_percent))::int AS mean_attainment,
          count(oa.id)::int AS evidence_count
        FROM public.learning_outcomes lo
        JOIN public.programs p ON p.id = lo.program_id
        LEFT JOIN public.outcome_attainment oa ON oa.outcome_id = lo.id
        WHERE p.institution_id = v_inst_id AND lo.type = 'PLO'
        GROUP BY lo.id, lo.title
      ) q
    ), '[]'::jsonb),

    'calculatedAt', now(),
    'dateFrom', v_from,
    'dateTo', v_to
  ) INTO v_result;

  RETURN v_result;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_admin_analytics(date, date) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_analytics(date, date) TO authenticated;
