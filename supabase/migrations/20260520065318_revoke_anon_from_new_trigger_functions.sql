-- Fix: Revoke EXECUTE from anon on all notification trigger functions and emit_notification
-- These should only be callable by postgres/service_role (they're trigger functions)
REVOKE EXECUTE ON FUNCTION public.emit_notification(uuid, text, text, text, jsonb, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.trg_grade_released_notify() FROM anon;
REVOKE EXECUTE ON FUNCTION public.trg_new_assignment_notify() FROM anon;
REVOKE EXECUTE ON FUNCTION public.trg_badge_earned_notify() FROM anon;
REVOKE EXECUTE ON FUNCTION public.trg_pending_approval_notify() FROM anon;
REVOKE EXECUTE ON FUNCTION public.trg_outcome_attainment_drop_notify() FROM anon;

-- Also revoke from authenticated — these are internal trigger functions, not user-callable RPCs
REVOKE EXECUTE ON FUNCTION public.emit_notification(uuid, text, text, text, jsonb, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_grade_released_notify() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_new_assignment_notify() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_badge_earned_notify() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_pending_approval_notify() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_outcome_attainment_drop_notify() FROM authenticated;

-- Fix the leaderboard_weekly view SECURITY DEFINER issue
-- Recreate as SECURITY INVOKER (the default for views)
DROP VIEW IF EXISTS public.leaderboard_weekly;
CREATE VIEW public.leaderboard_weekly AS
SELECT
  student_id,
  SUM(xp_amount) AS weekly_xp,
  RANK() OVER (ORDER BY SUM(xp_amount) DESC) AS rank
FROM xp_transactions
WHERE created_at >= date_trunc('week', now())
GROUP BY student_id;;
