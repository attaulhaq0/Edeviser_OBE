-- Trigger 2: new_assignment -> enrolled students
CREATE OR REPLACE FUNCTION public.trg_new_assignment_notify()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student record;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.is_published = true THEN
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
$$;

DROP TRIGGER IF EXISTS trg_new_assignment_notify ON public.assignments;
CREATE TRIGGER trg_new_assignment_notify
  AFTER INSERT ON public.assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_new_assignment_notify();

-- Trigger 3: badge_earned -> student
CREATE OR REPLACE FUNCTION public.trg_badge_earned_notify()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.emit_notification(
    NEW.student_id,
    'badge_earned',
    'Badge earned: ' || COALESCE(NEW.badge_name, 'New badge'),
    'Congratulations! You earned a new badge.',
    jsonb_build_object('badge_id', NEW.id, 'badge_name', NEW.badge_name),
    'badge:' || NEW.id::text
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_badge_earned_notify ON public.badges;
CREATE TRIGGER trg_badge_earned_notify
  AFTER INSERT ON public.badges
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_badge_earned_notify();

-- Trigger 4: pending_approval -> admins
CREATE OR REPLACE FUNCTION public.trg_pending_approval_notify()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin record;
BEGIN
  IF NEW.role = 'student' OR NEW.status != 'pending_verification' THEN
    RETURN NEW;
  END IF;
  FOR v_admin IN
    SELECT id FROM public.profiles
    WHERE institution_id = NEW.institution_id
      AND role = 'admin'
      AND is_active = true
  LOOP
    PERFORM public.emit_notification(
      v_admin.id,
      'pending_approval',
      'New ' || NEW.role || ' pending approval',
      COALESCE(NEW.full_name, NEW.email) || ' has registered and needs approval.',
      jsonb_build_object('profile_id', NEW.id, 'role', NEW.role),
      'approval:' || NEW.id::text
    );
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pending_approval_notify ON public.profiles;
CREATE TRIGGER trg_pending_approval_notify
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_pending_approval_notify();

-- Trigger 5: outcome_attainment_drop -> coordinator
CREATE OR REPLACE FUNCTION public.trg_outcome_attainment_drop_notify()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_threshold numeric := 70.0;
  v_coordinator_id uuid;
  v_outcome_title text;
BEGIN
  IF NOT (NEW.attainment_percent < v_threshold AND OLD.attainment_percent >= v_threshold) THEN
    RETURN NEW;
  END IF;
  SELECT title INTO v_outcome_title FROM public.learning_outcomes WHERE id = NEW.outcome_id;
  SELECT p.coordinator_id INTO v_coordinator_id
  FROM public.learning_outcomes lo
  JOIN public.programs p ON p.id = lo.program_id
  WHERE lo.id = NEW.outcome_id
  LIMIT 1;
  IF v_coordinator_id IS NULL THEN RETURN NEW; END IF;
  PERFORM public.emit_notification(
    v_coordinator_id,
    'outcome_attainment_drop',
    'Attainment drop: ' || COALESCE(v_outcome_title, 'Outcome'),
    'Attainment fell below ' || v_threshold || '% (' || round(NEW.attainment_percent, 1) || '%).',
    jsonb_build_object('outcome_id', NEW.outcome_id, 'attainment', NEW.attainment_percent),
    'attainment_drop:' || NEW.outcome_id::text
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_outcome_attainment_drop_notify ON public.outcome_attainment;
CREATE TRIGGER trg_outcome_attainment_drop_notify
  AFTER UPDATE OF attainment_percent ON public.outcome_attainment
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_outcome_attainment_drop_notify();

-- Revoke from public, grant to postgres/service_role
REVOKE EXECUTE ON FUNCTION public.trg_new_assignment_notify() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_badge_earned_notify() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_pending_approval_notify() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_outcome_attainment_drop_notify() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.trg_new_assignment_notify() TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.trg_badge_earned_notify() TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.trg_pending_approval_notify() TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.trg_outcome_attainment_drop_notify() TO postgres, service_role;;
