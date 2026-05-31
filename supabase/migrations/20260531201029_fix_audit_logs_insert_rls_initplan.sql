-- Re-optimize the audit_logs INSERT policy to use (select auth.uid()) so the
-- auth function is evaluated once per statement (init-plan) instead of per row.
-- Functionally identical to the prior policy; clears the RLS performance lint.
DROP POLICY IF EXISTS audit_logs_authenticated_insert ON public.audit_logs;
CREATE POLICY "audit_logs_authenticated_insert" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (actor_id = (select auth.uid()));;
