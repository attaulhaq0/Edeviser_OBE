-- Found by Task 15 cron-health cross-check: badge_auto_archive() referenced
-- public.badges.updated_at and .created_at, which DO NOT EXIST on the badges
-- table (columns are: id, student_id, badge_key, badge_name, emoji, awarded_at,
-- tier, category, is_pinned, archived_at, team_id, scope). The COALESCE errored
-- with 42703 every nightly run, so the badge auto-archive cron has never worked.
-- Fix: use awarded_at (the actual badge-granted timestamp) as the age basis.
-- Preserves SECURITY DEFINER + SET search_path='' (search_path-qualification
-- hardening) and the public.-qualified table reference.
CREATE OR REPLACE FUNCTION public.badge_auto_archive()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  UPDATE public.badges
  SET archived_at = now()
  WHERE archived_at IS NULL
    AND is_pinned = false
    AND tier IS NOT NULL
    AND awarded_at < now() - interval '90 days';
END;
$function$;;
