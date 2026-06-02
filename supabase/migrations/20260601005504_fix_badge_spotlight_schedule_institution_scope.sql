-- badge_spotlight_schedule is per-institution feature data (has institution_id),
-- not platform-system. Both policies leaked across institutions:
--   admin_manage_spotlight: any admin could read/write ANY institution's schedule
--   authenticated_read_spotlight: USING (true) let any user read ALL institutions
-- Scope both to the caller's own institution.

DROP POLICY IF EXISTS admin_manage_spotlight ON public.badge_spotlight_schedule;
CREATE POLICY admin_manage_spotlight ON public.badge_spotlight_schedule
  FOR ALL TO authenticated
  USING (
    (SELECT public.auth_user_role()) = 'admin'
    AND institution_id = (SELECT public.auth_institution_id())
  )
  WITH CHECK (
    (SELECT public.auth_user_role()) = 'admin'
    AND institution_id = (SELECT public.auth_institution_id())
  );

DROP POLICY IF EXISTS authenticated_read_spotlight ON public.badge_spotlight_schedule;
CREATE POLICY authenticated_read_spotlight ON public.badge_spotlight_schedule
  FOR SELECT TO authenticated
  USING (institution_id = (SELECT public.auth_institution_id()));;
