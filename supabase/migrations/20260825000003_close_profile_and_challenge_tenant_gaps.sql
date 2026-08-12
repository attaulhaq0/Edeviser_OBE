-- Additive closure for the profile and social challenge write protections.
-- This follows the already-applied hardening migrations; historical files stay immutable.
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.auth_user_role() = 'admin' THEN
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role
     OR NEW.institution_id IS DISTINCT FROM OLD.institution_id
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.is_active IS DISTINCT FROM OLD.is_active THEN
    RAISE EXCEPTION 'protected profile fields cannot be changed by this role'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP POLICY IF EXISTS "teacher_manage_challenges" ON public.social_challenges;
DROP POLICY IF EXISTS "admin_manage_challenges" ON public.social_challenges;

CREATE POLICY "teacher_manage_challenges" ON public.social_challenges
  FOR ALL TO authenticated
  USING (
    (SELECT public.auth_user_role()) = 'teacher'
    AND EXISTS (
      SELECT 1
      FROM public.courses AS c
      JOIN public.programs AS p ON p.id = c.program_id
      WHERE c.id = social_challenges.course_id
        AND c.teacher_id = (SELECT auth.uid())
        AND p.institution_id = social_challenges.institution_id
    )
  )
  WITH CHECK (
    (SELECT public.auth_user_role()) = 'teacher'
    AND EXISTS (
      SELECT 1
      FROM public.courses AS c
      JOIN public.programs AS p ON p.id = c.program_id
      WHERE c.id = social_challenges.course_id
        AND c.teacher_id = (SELECT auth.uid())
        AND p.institution_id = social_challenges.institution_id
    )
  );

CREATE POLICY "admin_manage_challenges" ON public.social_challenges
  FOR ALL TO authenticated
  USING (
    (SELECT public.auth_user_role()) = 'admin'
    AND EXISTS (
      SELECT 1
      FROM public.courses AS c
      JOIN public.programs AS p ON p.id = c.program_id
      WHERE c.id = social_challenges.course_id
        AND p.institution_id = (SELECT public.auth_institution_id())
        AND social_challenges.institution_id = p.institution_id
    )
  )
  WITH CHECK (
    (SELECT public.auth_user_role()) = 'admin'
    AND EXISTS (
      SELECT 1
      FROM public.courses AS c
      JOIN public.programs AS p ON p.id = c.program_id
      WHERE c.id = social_challenges.course_id
        AND p.institution_id = (SELECT public.auth_institution_id())
        AND social_challenges.institution_id = p.institution_id
    )
  );
