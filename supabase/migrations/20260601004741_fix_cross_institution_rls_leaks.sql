-- 1. student_gamification: staff read scoped to own institution's students
DROP POLICY IF EXISTS gamification_staff_read ON public.student_gamification;
CREATE POLICY gamification_staff_read ON public.student_gamification
  FOR SELECT TO authenticated
  USING (
    (SELECT public.auth_user_role()) = ANY (ARRAY['teacher','coordinator','admin'])
    AND student_id IN (
      SELECT p.id FROM public.profiles p
      WHERE p.institution_id = (SELECT public.auth_institution_id())
    )
  );

-- 2. evidence: staff read scoped to own institution's students
DROP POLICY IF EXISTS evidence_staff_read ON public.evidence;
CREATE POLICY evidence_staff_read ON public.evidence
  FOR SELECT TO authenticated
  USING (
    (SELECT public.auth_user_role()) = ANY (ARRAY['teacher','coordinator','admin'])
    AND student_id IN (
      SELECT p.id FROM public.profiles p
      WHERE p.institution_id = (SELECT public.auth_institution_id())
    )
  );

-- 3. submissions: admin/coordinator read scoped to own institution's students
DROP POLICY IF EXISTS submissions_admin_read ON public.submissions;
CREATE POLICY submissions_admin_read ON public.submissions
  FOR SELECT TO authenticated
  USING (
    (SELECT public.auth_user_role()) = ANY (ARRAY['admin','coordinator'])
    AND student_id IN (
      SELECT p.id FROM public.profiles p
      WHERE p.institution_id = (SELECT public.auth_institution_id())
    )
  );

-- 4. sub_clos: staff read+write scoped to own institution via parent CLO
DROP POLICY IF EXISTS sub_clos_manage ON public.sub_clos;
CREATE POLICY sub_clos_manage ON public.sub_clos
  FOR ALL TO authenticated
  USING (
    (SELECT public.auth_user_role()) = ANY (ARRAY['admin','coordinator','teacher'])
    AND clo_id IN (
      SELECT lo.id FROM public.learning_outcomes lo
      WHERE lo.institution_id = (SELECT public.auth_institution_id())
    )
  )
  WITH CHECK (
    (SELECT public.auth_user_role()) = ANY (ARRAY['admin','coordinator','teacher'])
    AND clo_id IN (
      SELECT lo.id FROM public.learning_outcomes lo
      WHERE lo.institution_id = (SELECT public.auth_institution_id())
    )
  );

-- 5. audit_logs: admin read scoped to own institution via actor's profile
--    (no institution_id column; scope through actor_id -> profiles.institution_id)
DROP POLICY IF EXISTS audit_logs_admin_read ON public.audit_logs;
CREATE POLICY audit_logs_admin_read ON public.audit_logs
  FOR SELECT TO authenticated
  USING (
    (SELECT public.auth_user_role()) = 'admin'
    AND actor_id IN (
      SELECT p.id FROM public.profiles p
      WHERE p.institution_id = (SELECT public.auth_institution_id())
    )
  );;
