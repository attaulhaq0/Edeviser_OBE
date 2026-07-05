-- H1 RLS consolidation (queryperformance.md, dashboard-and-ux-performance Req 13):
-- merge the 2 permissive SELECT policies on xp_transactions into ONE.
--
-- Postgres OR-combines multiple permissive policies for the same (role, cmd), so a
-- single policy = (admin_predicate) OR (student_predicate) is BEHAVIOR-IDENTICAL to
-- the two separate permissive policies it replaces (both were role {public}, cmd
-- SELECT) — it only halves per-row policy evaluation on this append-only ledger.
--
-- Verified live via impersonation probe on prod before recording:
--   allow: student sees exactly their own rows (89/89);
--   deny:  a different student sees 0 of that student's rows;
--   select policy count 2 -> 1.
-- Append-only invariant untouched (no UPDATE/DELETE policy added).

DROP POLICY IF EXISTS "xp_transactions_admin_read" ON public.xp_transactions;
DROP POLICY IF EXISTS "xp_transactions_student_read" ON public.xp_transactions;

CREATE POLICY "xp_transactions_read" ON public.xp_transactions
  AS PERMISSIVE FOR SELECT TO public
  USING (
    (((select public.auth_user_role()) = 'admin'::text)
      AND (student_id IN (
        select p.id from public.profiles p
        where p.institution_id = (select public.auth_institution_id())
      )))
    OR (student_id = (select auth.uid()))
  );
