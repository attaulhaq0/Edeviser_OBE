-- 11. audit_runs: admin-only read
CREATE POLICY "admins_read_audit_runs" ON public.audit_runs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

-- 12. audit_findings: admin-only read
CREATE POLICY "admins_read_audit_findings" ON public.audit_findings
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

-- 13. invitations: institution-scoped read for staff
CREATE POLICY "staff_read_invitations" ON public.invitations
  FOR SELECT TO authenticated
  USING (
    institution_id IN (
      SELECT institution_id FROM public.profiles WHERE id = (select auth.uid())
    )
  );;
