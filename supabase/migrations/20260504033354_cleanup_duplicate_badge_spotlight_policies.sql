-- Clean up duplicate badge_spotlight_schedule policies
-- We have both old (admin_all_badge_spotlight_schedule, all_read_spotlight, all_roles_read_badge_spotlight_schedule)
-- and new (admin_manage_spotlight, authenticated_read_spotlight) from our security fix
-- Drop the old ones, keep the new tighter ones
DROP POLICY IF EXISTS "admin_all_badge_spotlight_schedule" ON public.badge_spotlight_schedule;
DROP POLICY IF EXISTS "all_read_spotlight" ON public.badge_spotlight_schedule;
DROP POLICY IF EXISTS "all_roles_read_badge_spotlight_schedule" ON public.badge_spotlight_schedule;;
