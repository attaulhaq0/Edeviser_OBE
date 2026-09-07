-- unit_close_review_rpc — continuous-verification task 7.7
-- Section × CLO attainment matrix for the Unit-Close review journey.
-- SECURITY INVOKER: the caller's RLS scopes every row.
-- (2026-09-07 replay repair: this file previously carried SQL-string-escaped
-- double apostrophes (''CLO'' etc.) inside the dollar-quoted body — a syntax
-- error on every fresh replay (SQLSTATE 42601). Production received the
-- correct body via MCP; this file now matches production's live definition.)
CREATE OR REPLACE FUNCTION public.get_unit_close_review_v1(p_course_id uuid)
RETURNS jsonb
LANGUAGE sql STABLE SET search_path = public
AS $fn$
WITH course_clos AS (
  SELECT lo.id AS clo_id, lo.title AS clo_title, lo.blooms_level::text AS blooms_level
  FROM public.learning_outcomes lo
  WHERE lo.course_id = p_course_id AND lo.type = 'CLO'
),
course_sections AS (
  SELECT cs.id AS section_id, cs.section_code, cs.teacher_id,
         p.full_name AS teacher_name
  FROM public.course_sections cs
  LEFT JOIN public.profiles p ON p.id = cs.teacher_id
  WHERE cs.course_id = p_course_id AND cs.is_active
),
enrollments AS (
  SELECT sc.student_id, sc.section_id
  FROM public.student_courses sc
  WHERE sc.course_id = p_course_id AND sc.status = 'active'
),
section_attainment AS (
  SELECT
    oa.outcome_id AS clo_id,
    en.section_id,
    round(avg(oa.attainment_percent), 1) AS avg_attainment,
    count(*)::int AS student_count,
    count(*) FILTER (WHERE oa.attainment_percent < 70)::int AS below_target
  FROM public.outcome_attainment oa
  JOIN enrollments en ON en.student_id = oa.student_id
  WHERE oa.course_id = p_course_id
    AND oa.scope = 'student_course'
  GROUP BY oa.outcome_id, en.section_id
),
clo_summary AS (
  SELECT
    cc.clo_id,
    cc.clo_title,
    cc.blooms_level,
    round(avg(sa.avg_attainment), 1) AS course_avg,
    sum(sa.below_target)::int AS total_below_target,
    count(DISTINCT sa.section_id)::int AS sections_with_data
  FROM course_clos cc
  LEFT JOIN section_attainment sa ON sa.clo_id = cc.clo_id
  GROUP BY cc.clo_id, cc.clo_title, cc.blooms_level
),
coverage AS (
  SELECT
    lo.id AS clo_id,
    CASE WHEN EXISTS (
      SELECT 1 FROM public.assignments a
      WHERE a.course_id = p_course_id
        AND jsonb_typeof(a.clo_weights) = 'array'
        AND EXISTS (SELECT 1 FROM jsonb_array_elements(a.clo_weights) el
                    WHERE el.value->>'clo_id' = lo.id::text)
    ) OR EXISTS (
      SELECT 1 FROM public.quizzes q
      WHERE q.course_id = p_course_id
        AND (
          EXISTS (SELECT 1 FROM public.quiz_clos qc WHERE qc.quiz_id = q.id AND qc.clo_id = lo.id)
          OR (jsonb_typeof(q.clo_ids) = 'array'
              AND EXISTS (SELECT 1 FROM jsonb_array_elements(q.clo_ids) el
                          WHERE el.value::text = lo.id::text))
        )
    ) THEN true ELSE false END AS has_assessment
  FROM public.learning_outcomes lo
  WHERE lo.course_id = p_course_id AND lo.type = 'CLO'
)
SELECT jsonb_build_object(
  'course_id', p_course_id,
  'clos', COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'clo_id', cs.clo_id,
      'clo_title', cs.clo_title,
      'blooms_level', cs.blooms_level,
      'course_avg', cs.course_avg,
      'total_below_target', cs.total_below_target,
      'sections_with_data', cs.sections_with_data,
      'has_assessment', cv.has_assessment
    ) ORDER BY cs.course_avg ASC NULLS LAST)
    FROM clo_summary cs
    LEFT JOIN coverage cv ON cv.clo_id = cs.clo_id
  ), '[]'::jsonb),
  'sections', COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'section_id', sec.section_id,
      'section_code', sec.section_code,
      'teacher_name', sec.teacher_name
    ) ORDER BY sec.section_code)
    FROM course_sections sec
  ), '[]'::jsonb),
  'matrix', COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'clo_id', sa.clo_id,
      'section_id', sa.section_id,
      'avg_attainment', sa.avg_attainment,
      'student_count', sa.student_count,
      'below_target', sa.below_target
    ) ORDER BY sa.clo_id, sa.section_id)
    FROM section_attainment sa
  ), '[]'::jsonb)
);
$fn$;

REVOKE ALL ON FUNCTION public.get_unit_close_review_v1(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_unit_close_review_v1(uuid) TO authenticated, service_role;