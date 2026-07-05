-- Perf (queryperformance.md H3): wrap the one remaining bare auth_user_role()
-- call in submissions_parent_read with (select ...) so Postgres evaluates it once
-- per statement (initplan) instead of once per row. This is the last un-wrapped
-- policy on the 6 hot tables; every sibling policy already uses the wrapped form
-- (Splinter 0003_auth_rls_initplan). BEHAVIOR-IDENTICAL: the boolean result is
-- unchanged (auth.uid() was already wrapped) — this only changes evaluation count,
-- not the allowed/denied matrix. Idempotent: DROP POLICY IF EXISTS + CREATE.

DROP POLICY IF EXISTS "submissions_parent_read" ON public.submissions;

CREATE POLICY "submissions_parent_read" ON public.submissions
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    ((select auth_user_role()) = 'parent'::text)
    AND (student_id IN (
      SELECT psl.student_id
      FROM parent_student_links psl
      WHERE ((psl.parent_id = (select auth.uid())) AND (psl.verified = true))
    ))
  );
