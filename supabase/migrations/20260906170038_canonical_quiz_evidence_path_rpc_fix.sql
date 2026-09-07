-- canonical_quiz_evidence_path fix-up: the v_attempt record in
-- record_quiz_attempt_grade_v1 was assigned field-by-field before assignment
-- ("record is not assigned yet"). Replaced with scalar variables; logic unchanged.
-- Applied LIVE via MCP as version 20260906170038 (file committed to match).
CREATE OR REPLACE FUNCTION public.record_quiz_attempt_grade_v1(p_attempt_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_student_id uuid;
  v_score numeric;
  v_mode text;
  v_submitted_at timestamptz;
  v_course_inst uuid;
  v_teacher uuid;
  v_submission_id uuid;
  v_grade_id uuid;
  v_actor uuid;
  v_role text;
  v_inst uuid;
BEGIN
  SELECT qa.student_id, qa.score, qa.mode, qa.submitted_at,
         p.institution_id, c.teacher_id
  INTO v_student_id, v_score, v_mode, v_submitted_at,
       v_course_inst, v_teacher
  FROM public.quiz_attempts qa
  JOIN public.quizzes q ON q.id = qa.quiz_id
  JOIN public.courses c ON c.id = q.course_id
  JOIN public.programs p ON p.id = c.program_id
  WHERE qa.id = p_attempt_id;

  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'quiz attempt not found';
  END IF;
  IF v_score IS NULL THEN
    RAISE EXCEPTION 'quiz attempt has no score yet';
  END IF;
  IF v_mode = 'practice' THEN
    RAISE EXCEPTION 'practice attempts do not generate evidence';
  END IF;

  v_actor := auth.uid();
  IF v_actor IS DISTINCT FROM v_student_id THEN
    IF current_user IN ('postgres', 'service_role') THEN
      -- trusted server/admin path
    ELSE
      v_role := auth_user_role();
      v_inst := auth_institution_id();
      IF v_role NOT IN ('teacher', 'coordinator', 'admin')
         OR v_inst IS NULL
         OR v_inst <> v_course_inst THEN
        RAISE EXCEPTION 'not authorized to record this quiz attempt';
      END IF;
    END IF;
  END IF;

  SELECT s.id INTO v_submission_id
  FROM public.submissions s
  WHERE s.quiz_attempt_id = p_attempt_id;

  IF v_submission_id IS NULL THEN
    INSERT INTO public.submissions (student_id, quiz_attempt_id, status, submitted_at)
    VALUES (v_student_id, p_attempt_id, 'graded', COALESCE(v_submitted_at, now()))
    RETURNING id INTO v_submission_id;
  END IF;

  SELECT g.id INTO v_grade_id
  FROM public.grades g
  WHERE g.submission_id = v_submission_id
  LIMIT 1;

  IF v_grade_id IS NULL THEN
    IF v_teacher IS NULL THEN
      RAISE EXCEPTION 'course has no teacher to attribute the grade';
    END IF;
    INSERT INTO public.grades (
      submission_id, graded_by, rubric_selections, total_score,
      score_percent, is_released
    ) VALUES (
      v_submission_id, v_teacher, '[]'::jsonb, v_score, v_score, true
    );
  END IF;

  UPDATE public.quiz_attempts
  SET submitted_at = COALESCE(submitted_at, now())
  WHERE id = p_attempt_id;

  RETURN v_submission_id;
END;
$fn$;

REVOKE ALL ON FUNCTION public.record_quiz_attempt_grade_v1(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_quiz_attempt_grade_v1(uuid) TO authenticated, service_role;