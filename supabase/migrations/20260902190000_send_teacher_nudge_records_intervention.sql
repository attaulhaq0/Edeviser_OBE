-- QA Round 2026-09-02 (V6): the nudge RPC now records a follow-up
-- intervention, closing the teacher → student intervention loop
-- (notification alone did not create any trackable follow-up).
-- Return type changes void → uuid, so the function must be dropped first.

DROP FUNCTION IF EXISTS public.send_teacher_nudge(uuid, text);

CREATE FUNCTION public.send_teacher_nudge(
  p_student_id uuid,
  p_message text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_teacher uuid := (SELECT auth.uid());
  v_course uuid;
  v_institution uuid;
  v_intervention uuid;
BEGIN
  -- Authorization: caller must teach the target student in an active course.
  SELECT c.id INTO v_course
  FROM public.courses c
  JOIN public.student_courses sc ON sc.course_id = c.id
  WHERE c.teacher_id = v_teacher
    AND sc.student_id = p_student_id
    AND c.is_active = true
  LIMIT 1;

  IF v_course IS NULL THEN
    RAISE EXCEPTION 'Not authorized: you do not teach this student'
      USING ERRCODE = '42501';
  END IF;

  IF btrim(p_message) = '' THEN
    RAISE EXCEPTION 'Nudge message must not be empty'
      USING ERRCODE = '22023';
  END IF;

  SELECT p.institution_id INTO v_institution
  FROM public.profiles p
  WHERE p.id = p_student_id;

  INSERT INTO public.notifications (user_id, type, title, body, is_read)
  VALUES (p_student_id, 'nudge', 'Your teacher sent you a nudge', p_message, false);

  -- Record the follow-up loop entry so the nudge is trackable to completion.
  INSERT INTO public.learning_interventions
    (institution_id, student_id, course_id, intervention_type, payload,
     source, status, created_by, started_at)
  VALUES
    (v_institution, p_student_id, v_course, 'nudge',
     jsonb_build_object('message', p_message, 'channel', 'notification'),
     'teacher', 'active', v_teacher, now())
  RETURNING id INTO v_intervention;

  RETURN v_intervention;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.send_teacher_nudge(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.send_teacher_nudge(uuid, text) TO authenticated;