-- Migration: notification_emitter_triggers
-- Task 102 — UI Consistency Global Fixes
-- Database triggers that emit role-aware notifications on domain events
-- All triggers use service-role semantics via SECURITY DEFINER

-- ─── Helper: emit a notification (dedup-safe) ────────────────────────────────
CREATE OR REPLACE FUNCTION public.emit_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_body text DEFAULT NULL,
  p_metadata jsonb DEFAULT NULL,
  p_dedup_key text DEFAULT NULL  -- unique key for idempotency (e.g. 'grade:submission_id')
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Dedup: skip if a notification with this dedup_key was sent in the last hour
  IF p_dedup_key IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.notifications
      WHERE user_id = p_user_id
        AND type = p_type
        AND metadata->>'dedup_key' = p_dedup_key
        AND created_at > now() - interval '1 hour'
    ) THEN
      RETURN;
    END IF;
  END IF;

  INSERT INTO public.notifications (user_id, type, title, body, metadata, is_read)
  VALUES (
    p_user_id,
    p_type,
    p_title,
    p_body,
    COALESCE(p_metadata, '{}'::jsonb) || CASE
      WHEN p_dedup_key IS NOT NULL THEN jsonb_build_object('dedup_key', p_dedup_key)
      ELSE '{}'::jsonb
    END,
    false
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Never let notification emission crash the parent transaction
    RAISE WARNING 'emit_notification failed for user % type %: %', p_user_id, p_type, SQLERRM;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.emit_notification FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.emit_notification TO postgres, service_role;

-- ─── Trigger 1: grade_released → student ─────────────────────────────────────
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
  -- Only fire when a grade is newly released (is_released flips to true)
  IF NOT (NEW.is_released = true AND (OLD.is_released IS NULL OR OLD.is_released = false)) THEN
    RETURN NEW;
  END IF;

  -- Get student_id from submission
  SELECT student_id INTO v_student_id
  FROM public.submissions
  WHERE id = NEW.submission_id;

  IF v_student_id IS NULL THEN RETURN NEW; END IF;

  -- Get assignment title
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

DO $$
BEGIN
  IF to_regclass('public.grades') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_grade_released_notify ON public.grades;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'grades'
      AND column_name = 'is_released'
  ) THEN
    CREATE TRIGGER trg_grade_released_notify
      AFTER INSERT OR UPDATE OF is_released ON public.grades
      FOR EACH ROW
      EXECUTE FUNCTION public.trg_grade_released_notify();
  END IF;
END $$;

-- ─── Trigger 2: new_assignment → enrolled students ───────────────────────────
CREATE OR REPLACE FUNCTION public.trg_new_assignment_notify()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student record;
BEGIN
  -- Only fire on INSERT of published assignments
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

-- ─── Trigger 3: badge_earned → student ───────────────────────────────────────
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

-- ─── Trigger 4: pending_approval → admins ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trg_pending_approval_notify()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin record;
BEGIN
  -- Only fire when a new non-student profile is created with pending_verification status
  IF NEW.role = 'student' OR NEW.status != 'pending_verification' THEN
    RETURN NEW;
  END IF;

  -- Notify all admins of the same institution
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

-- ─── Trigger 5: outcome_attainment_drop → coordinator ────────────────────────
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
  -- Only fire when attainment drops below threshold
  IF NOT (NEW.attainment_percent < v_threshold AND OLD.attainment_percent >= v_threshold) THEN
    RETURN NEW;
  END IF;

  -- Get outcome title
  SELECT title INTO v_outcome_title
  FROM public.learning_outcomes
  WHERE id = NEW.outcome_id;

  -- Find coordinator for the program associated with this outcome
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

-- ─── Grant trigger functions ──────────────────────────────────────────────────
REVOKE EXECUTE ON FUNCTION public.trg_grade_released_notify() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_new_assignment_notify() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_badge_earned_notify() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_pending_approval_notify() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_outcome_attainment_drop_notify() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.trg_grade_released_notify() TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.trg_new_assignment_notify() TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.trg_badge_earned_notify() TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.trg_pending_approval_notify() TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.trg_outcome_attainment_drop_notify() TO postgres, service_role;
