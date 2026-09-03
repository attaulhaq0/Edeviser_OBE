-- T22 (E2.F): the teacher respond path updated the handoff row but never
-- messaged the student (notifications_own RLS forbids cross-user inserts from
-- the client). This SECURITY DEFINER RPC resolves the handoff and delivers the
-- teacher's response as a notification, reusing the handoff's own ownership
-- data for authorization instead of trusting client-supplied ids.

CREATE OR REPLACE FUNCTION public.respond_teacher_handoff(
  p_handoff_id uuid,
  p_response text,
  p_status text DEFAULT 'resolved'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_teacher uuid := (SELECT auth.uid());
  v_student uuid;
  v_current_status text;
BEGIN
  IF p_status NOT IN ('resolved', 'dismissed') THEN
    RAISE EXCEPTION 'Invalid handoff status' USING ERRCODE = '22023';
  END IF;
  IF btrim(p_response) = '' THEN
    RAISE EXCEPTION 'Response message must not be empty' USING ERRCODE = '22023';
  END IF;

  SELECT student_id, status INTO v_student, v_current_status
  FROM public.teacher_handoff_requests
  WHERE id = p_handoff_id AND teacher_id = v_teacher;

  IF v_student IS NULL THEN
    RAISE EXCEPTION 'Not authorized: handoff not found or not assigned to you'
      USING ERRCODE = '42501';
  END IF;
  IF v_current_status NOT IN ('pending') THEN
    RAISE EXCEPTION 'Handoff already %', v_current_status USING ERRCODE = '23505';
  END IF;

  UPDATE public.teacher_handoff_requests
  SET teacher_response = p_response,
      status = p_status,
      resolved_at = now()
  WHERE id = p_handoff_id;

  INSERT INTO public.notifications (user_id, type, title, body, is_read)
  VALUES (
    v_student,
    'handoff_response',
    'Your teacher followed up on your tutor handoff',
    p_response,
    false
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.respond_teacher_handoff(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.respond_teacher_handoff(uuid, text, text) TO authenticated;