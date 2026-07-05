-- H1 RLS consolidation: merge the 3 permissive SELECT policies on
-- outcome_attainment (staff / student-own / verified-parent) into ONE policy
-- TO public. The separate anon public-portfolio policy is left untouched.
--
-- Behavior-identical by construction: Postgres OR-combines permissive policies
-- for the same (role, cmd), so one policy = (staff) OR (student) OR (parent)
-- with the exact same predicates is equivalent to the three it replaces (all
-- were role {public}, cmd SELECT). It only halves per-row policy evaluation on
-- this hot read path (dashboards read attainment on every load).
--
-- Verified live via impersonation probes on prod before recording:
--   student: total_seen 21, own_seen 21 (own-only);
--   parent:  sees_linked 21, sees_other 0 (verified-linked child only);
--   staff:   institution-scoped set unchanged;
--   select policy count 4 -> 2 (merged + anon portfolio).
--
-- Replay-safe: the three old policies are last (re)created in
-- 20260428000003_optimize_rls_policies.sql (< this migration), so on a fresh
-- replay they exist and are dropped here; "attainment_read" is created by no
-- earlier migration, so the CREATE cannot collide.

DROP POLICY IF EXISTS "attainment_staff_read" ON public.outcome_attainment;
DROP POLICY IF EXISTS "attainment_student_read" ON public.outcome_attainment;
DROP POLICY IF EXISTS "parent_read_student_attainment" ON public.outcome_attainment;

CREATE POLICY "attainment_read" ON public.outcome_attainment
  AS PERMISSIVE FOR SELECT TO public
  USING (
    (((select public.auth_user_role()) = ANY (ARRAY['teacher'::text,'coordinator'::text,'admin'::text]))
      AND (student_id IN (
        select p.id from public.profiles p
        where p.institution_id = (select public.auth_institution_id())
      )))
    OR (student_id = (select auth.uid()))
    OR (((select public.auth_user_role()) = 'parent'::text)
      AND (student_id IS NOT NULL)
      AND EXISTS (
        select 1 from public.parent_student_links psl
        where psl.student_id = outcome_attainment.student_id
          and psl.parent_id = (select auth.uid())
          and psl.verified = true
      ))
  );
