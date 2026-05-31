-- Fix: trg_new_assignment_notify references non-existent is_published column
-- Assignments don't have a draft/published workflow - they're live on INSERT
CREATE OR REPLACE FUNCTION public.trg_new_assignment_notify()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student record;
BEGIN
  -- Fire on every new assignment INSERT (no is_published column exists)
  IF TG_OP = 'INSERT' THEN
    FOR v_student IN
      SELECT sc.student_id
      FROM public.student_courses sc
      WHERE sc.course_id = NEW.course_id
        AND sc.status = 'active'
    LOOP
      PERFORM public.emit_notification(
        v_student.student_id,
        'new_assignment',
        'New assignment: ' || NEW.title,
        'A new assignment has been posted. Due: ' || COALESCE(NEW.due_date::text, 'No deadline'),
        jsonb_build_object('assignment_id', NEW.id, 'course_id', NEW.course_id),
        'assignment:' || NEW.id::text || ':' || v_student.student_id::text
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;;
