-- Task 19 (migration-history-reconciliation): close the parent cross-profile visibility gap.
-- A verified parent could read a linked child's grades/attendance/gamification/submissions,
-- but NOT the child's profiles row (no parent SELECT policy on profiles), so the parent
-- "My Children" dashboard rendered nameless/empty children. This is purely additive: it
-- creates ONE new SELECT policy scoped to verified parent_student_links and does NOT modify
-- or drop any existing profiles policy. Uses the optimized initplan form (auth calls wrapped
-- in subselects) to match the repo convention and avoid auth_rls_initplan advisories.
CREATE POLICY "profiles_parent_read_linked" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    (SELECT public.auth_user_role()) = 'parent'
    AND id IN (
      SELECT psl.student_id
      FROM public.parent_student_links psl
      WHERE psl.parent_id = (SELECT auth.uid()) AND psl.verified = true
    )
  );;
