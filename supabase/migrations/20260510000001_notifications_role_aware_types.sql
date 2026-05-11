-- Migration: notifications_role_aware_types
-- Task 101 — UI Consistency Global Fixes
-- Extends notifications.type CHECK constraint with the full role-aware union (ADR-20 §3.5)
-- Creates a guard trigger to prevent cross-role notification delivery
-- Adds performance index for unread notification queries

-- ─── 1. Extend notifications.type CHECK constraint ───────────────────────────
-- Drop existing constraint (if any) and re-create with the full union

ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check CHECK (
    type IN (
      -- Student notifications
      'grade_released',
      'new_assignment',
      'badge_earned',
      'streak_at_risk',
      'at_risk_alert',
      'peer_milestone',
      'perfect_day_nudge',
      'prerequisite_unlocked',
      -- Teacher notifications
      'grading_queue_new',
      'course_announcement_required',
      'at_risk_student_flagged',
      -- Coordinator notifications
      'cqi_plan_review_due',
      'curriculum_gap_flagged',
      'outcome_attainment_drop',
      -- Admin notifications
      'pending_approval',
      'rate_limit_exceeded',
      'system_alert',
      'user_onboarded',
      -- Parent notifications
      'child_grade_released',
      'child_at_risk',
      'child_streak_milestone',
      'fee_due',
      -- Universal
      'digest'
    )
  );

-- ─── 2. Role-to-allowed-types guard trigger ───────────────────────────────────
-- Prevents cross-role notification delivery at the database level

CREATE OR REPLACE FUNCTION public.notifications_type_role_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_allowed_types text[];
BEGIN
  -- Look up the recipient's role
  SELECT role INTO v_role
  FROM public.profiles
  WHERE id = NEW.user_id;

  -- Define allowed types per role
  CASE v_role
    WHEN 'student' THEN
      v_allowed_types := ARRAY[
        'grade_released', 'new_assignment', 'badge_earned',
        'streak_at_risk', 'at_risk_alert', 'peer_milestone',
        'perfect_day_nudge', 'prerequisite_unlocked', 'digest'
      ];
    WHEN 'teacher' THEN
      v_allowed_types := ARRAY[
        'grading_queue_new', 'course_announcement_required',
        'at_risk_student_flagged', 'digest'
      ];
    WHEN 'coordinator' THEN
      v_allowed_types := ARRAY[
        'cqi_plan_review_due', 'curriculum_gap_flagged',
        'outcome_attainment_drop', 'digest'
      ];
    WHEN 'admin' THEN
      v_allowed_types := ARRAY[
        'pending_approval', 'rate_limit_exceeded',
        'system_alert', 'user_onboarded', 'digest'
      ];
    WHEN 'parent' THEN
      v_allowed_types := ARRAY[
        'child_grade_released', 'child_at_risk',
        'child_streak_milestone', 'fee_due', 'digest'
      ];
    ELSE
      -- Unknown role — allow only digest
      v_allowed_types := ARRAY['digest'];
  END CASE;

  -- Reject if type is not in the allowed set for this role
  IF NOT (NEW.type = ANY(v_allowed_types)) THEN
    RAISE EXCEPTION 'Notification type % is not allowed for role %', NEW.type, v_role
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

-- Attach the guard trigger
DROP TRIGGER IF EXISTS trg_notifications_type_role_guard ON public.notifications;
CREATE TRIGGER trg_notifications_type_role_guard
  BEFORE INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.notifications_type_role_guard();

-- ─── 3. Performance index for unread notification queries ────────────────────
CREATE INDEX IF NOT EXISTS notifications_user_unread_idx
  ON public.notifications (user_id, is_read, created_at DESC);

-- ─── 4. Backfill any out-of-enum rows to 'digest' ────────────────────────────
-- Soft migration — no data loss, just normalizes legacy rows
UPDATE public.notifications
SET type = 'digest'
WHERE type NOT IN (
  'grade_released', 'new_assignment', 'badge_earned',
  'streak_at_risk', 'at_risk_alert', 'peer_milestone',
  'perfect_day_nudge', 'prerequisite_unlocked',
  'grading_queue_new', 'course_announcement_required',
  'at_risk_student_flagged',
  'cqi_plan_review_due', 'curriculum_gap_flagged',
  'outcome_attainment_drop',
  'pending_approval', 'rate_limit_exceeded',
  'system_alert', 'user_onboarded',
  'child_grade_released', 'child_at_risk',
  'child_streak_milestone', 'fee_due',
  'digest'
);

-- ─── 5. RLS hardening ────────────────────────────────────────────────────────
-- Ensure clients cannot INSERT or DELETE notifications directly
-- (all notification writes go through service-role Edge Functions / triggers)

REVOKE INSERT, DELETE ON public.notifications FROM authenticated;

-- Re-assert read + update-own policies
DROP POLICY IF EXISTS notifications_user_read_own ON public.notifications;
CREATE POLICY notifications_user_read_own ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS notifications_user_update_own ON public.notifications;
CREATE POLICY notifications_user_update_own ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Grant trigger function to postgres and service_role only
REVOKE EXECUTE ON FUNCTION public.notifications_type_role_guard() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.notifications_type_role_guard() TO postgres, service_role;
