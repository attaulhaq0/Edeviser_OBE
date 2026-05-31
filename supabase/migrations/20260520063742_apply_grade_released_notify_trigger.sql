-- Trigger 1: grade_released -> student notification
CREATE OR REPLACE FUNCTION public.trg_grade_released_notify()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id uuid;
  v_assignment_title text;
BEGIN
  IF NOT (NEW.is_released = true AND (OLD.is_released IS NULL OR OLD.is_released = false)) THEN
    RETURN NEW;
  END IF;

  SELECT student_id INTO v_student_id
  FROM public.submissions
  WHERE id = NEW.submission_id;

  IF v_student_id IS NULL THEN RETURN NEW; END IF;

  SELECT a.title INTO v_assignment_title
  FROM public.assignments a
  JOIN public.submissions s ON s.assignment_id = a.id
  WHERE s.id = NEW.submission_id;

  PERFORM public.emit_notification(
    v_student_id,
    'grade_released',
    'Grade released: ' || COALESCE(v_assignment_title, 'Assignment'),
    'Your grade has been released. Tap to view.',
    jsonb_build_object('submission_id', NEW.submission_id, 'grade_id', NEW.id),
    'grade:' || NEW.submission_id::text
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_grade_released_notify ON public.grades;
CREATE TRIGGER trg_grade_released_notify
  AFTER INSERT OR UPDATE OF is_released ON public.grades
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_grade_released_notify();

REVOKE EXECUTE ON FUNCTION public.trg_grade_released_notify() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.trg_grade_released_notify() TO postgres, service_role;;
