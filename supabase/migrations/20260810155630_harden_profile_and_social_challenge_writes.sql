-- Fail closed for protected profile mutations.  The RLS helper-based policy
-- remains useful for ordinary self-edits, but a BEFORE trigger is required to
-- compare OLD and NEW values reliably during UPDATE evaluation.
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Trusted server-side callers (no end-user JWT) and institution admins may
  -- perform the existing administrative profile-management workflow.
  IF auth.uid() IS NULL OR public.auth_user_role() = 'admin' THEN
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role
     OR NEW.institution_id IS DISTINCT FROM OLD.institution_id
     OR NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'protected profile fields cannot be changed by this role'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_protect_privilege_fields ON public.profiles;
CREATE TRIGGER profiles_protect_privilege_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_privilege_mutation();

-- Replace the permissive self-created challenge escape.  PostgreSQL combines
-- permissive policies with OR, so role and course scope must be present in
-- both USING and WITH CHECK for write policies.
DROP POLICY IF EXISTS "teacher_manage_challenges" ON public.social_challenges;
DROP POLICY IF EXISTS "admin_manage_challenges" ON public.social_challenges;

CREATE POLICY "teacher_manage_challenges" ON public.social_challenges
  FOR ALL TO authenticated
  USING (
    (SELECT public.auth_user_role()) = 'teacher'
    AND EXISTS (
      SELECT 1
      FROM public.courses AS c
      WHERE c.id = social_challenges.course_id
        AND c.teacher_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    (SELECT public.auth_user_role()) = 'teacher'
    AND EXISTS (
      SELECT 1
      FROM public.courses AS c
      WHERE c.id = social_challenges.course_id
        AND c.teacher_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "admin_manage_challenges" ON public.social_challenges
  FOR ALL TO authenticated
  USING (
    (SELECT public.auth_user_role()) = 'admin'
    AND institution_id = (SELECT public.auth_institution_id())
  )
  WITH CHECK (
    (SELECT public.auth_user_role()) = 'admin'
    AND institution_id = (SELECT public.auth_institution_id())
  );
