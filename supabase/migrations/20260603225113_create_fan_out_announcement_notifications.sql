-- Feature: qa-partner-review-remediation — Req 15 (P11)
-- Task 24.2: Announcement notification fan-out via authorized SECURITY DEFINER RPC.
--
-- useCreateAnnouncement currently inserts a single notification for user_id = author_id
-- (the teacher), so enrolled students are never notified. The notifications_own RLS
-- policy (FOR ALL USING user_id = auth.uid()) also forbids a teacher writing a student's
-- row directly. This RPC is the only sanctioned cross-user path: it verifies the caller
-- authored the announcement, then inserts one notification per active enrolled student,
-- excluding the author. Returns the number of notifications created.
--
-- Replay integrity (migration-replay-integrity.md): references only pre-existing tables
-- (public.announcements, public.student_courses, public.notifications), hardened at the
-- CREATE site (SET search_path = '', public.-qualified, REVOKE PUBLIC/anon + GRANT
-- authenticated here, with no later bare ALTER/GRANT on this function).
CREATE OR REPLACE FUNCTION public.fan_out_announcement_notifications(
  p_announcement_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_author uuid := (SELECT auth.uid());
  v_course uuid;
  v_title  text;
  v_body   text;
  v_count  integer;
BEGIN
  -- Authorization: caller must be the author of the announcement.
  SELECT a.course_id, a.title, left(a.content, 200)
    INTO v_course, v_title, v_body
  FROM public.announcements a
  WHERE a.id = p_announcement_id
    AND a.author_id = v_author;

  IF v_course IS NULL THEN
    RAISE EXCEPTION 'Not authorized or announcement not found'
      USING ERRCODE = '42501';
  END IF;

  -- Fan out: one notification per active enrolled student, excluding the author.
  INSERT INTO public.notifications (user_id, type, title, body, metadata, is_read)
  SELECT sc.student_id,
         'announcement',
         left('New Announcement: ' || v_title, 200),
         v_body,
         jsonb_build_object('course_id', v_course, 'announcement_id', p_announcement_id),
         false
  FROM public.student_courses sc
  WHERE sc.course_id = v_course
    AND sc.student_id <> v_author
    AND sc.status = 'active';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fan_out_announcement_notifications(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fan_out_announcement_notifications(uuid) TO authenticated;;
