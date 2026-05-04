-- Drop the overly permissive policy and replace with admin-only scoped policy
DROP POLICY IF EXISTS "admin_manage_spotlight" ON public.badge_spotlight_schedule;

CREATE POLICY "admin_manage_spotlight" ON public.badge_spotlight_schedule
  FOR ALL TO authenticated
  USING (public.auth_user_role() = 'admin')
  WITH CHECK (public.auth_user_role() = 'admin');

-- Add read-only policy for authenticated users to view spotlights
CREATE POLICY "authenticated_read_spotlight" ON public.badge_spotlight_schedule
  FOR SELECT TO authenticated
  USING (true);;
