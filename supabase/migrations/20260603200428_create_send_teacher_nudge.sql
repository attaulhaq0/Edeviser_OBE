-- Feature: qa-partner-review-remediation — Req 1 (B1)
-- Task 9.2: Teacher-to-Student Nudge via authorized SECURITY DEFINER RPC.
--
-- The teacher's direct insert into `notifications` for a student's `user_id` is
-- rejected by the `notifications_own` RLS policy (FOR ALL USING user_id = auth.uid()).
-- This RPC is the only sanctioned path that may write a cross-user notification: it
-- verifies the teaching relationship (courses ⋈ student_courses for auth.uid()) before
-- inserting, and raises an authorization error (42501) otherwise.
--
-- Replay integrity (migration-replay-integrity.md): references only pre-existing tables
-- (public.courses, public.student_courses, public.notifications), hardened at the CREATE
-- site (SET search_path = '', public.-qualified, REVOKE PUBLIC/anon + GRANT authenticated
-- here, with no later bare ALTER/GRANT on this function).
CREATE OR REPLACE FUNCTION public.send_teacher_nudge(
  p_student_id uuid,
  p_message text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_teacher uuid := (SELECT auth.uid());
BEGIN
  -- Authorization: caller must teach the target student in an active course.
  IF NOT EXISTS (
    SELECT 1
    FROM public.courses c
    JOIN public.student_courses sc ON sc.course_id = c.id
    WHERE c.teacher_id = v_teacher
      AND sc.student_id = p_student_id
      AND c.is_active = true
  ) THEN
    RAISE EXCEPTION 'Not authorized: you do not teach this student'
      USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.notifications (user_id, type, title, body, is_read)
  VALUES (p_student_id, 'nudge', 'Your teacher sent you a nudge', p_message, false);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.send_teacher_nudge(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.send_teacher_nudge(uuid, text) TO authenticated;
