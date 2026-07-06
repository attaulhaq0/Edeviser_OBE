-- RLS permissive-policy consolidation (dashboard-and-ux-performance Req 13,
-- "Index/RLS hygiene" follow-up): merge the 3 permissive SELECT policies on
-- public.reflection_digests into ONE.
--
-- Postgres OR-combines multiple PERMISSIVE policies for the same (role, cmd),
-- so a single policy whose USING clause is (pred_student OR pred_parent OR
-- pred_teacher) — built from the byte-identical per-role predicates it replaces
-- (all three were role {authenticated}, cmd SELECT) — grants precisely the same
-- rows as the three separate policies. It only reduces per-row policy
-- evaluation on direct PostgREST reads of this table (the definer-RPC dashboard
-- path bypasses RLS and is unaffected).
--
-- Live-verified against prod before recording (read-only, no DDL applied):
--   reflection_digests permissive SELECT policy count 3 -> 1;
--   the student / verified-parent / enrolled-teacher predicate SHAPES are the
--   same ones already proven allow+deny in rlsConsolidation.rls.test.ts on
--   outcome_attainment, submissions and profiles.
--
-- Scope guardrails:
--   * Only the 3 SELECT policies are touched. The separate UPDATE policy
--     reflection_digests_student_update is a DIFFERENT command and is left
--     exactly as-is (students may still edit their own digest).
--   * No admin/coordinator SELECT branch existed before, so none is added here
--     (exact parity — admins still cannot read reflection_digests directly).
--   * Table/function references are public.-qualified and auth.uid() is
--     wrapped in (SELECT ...) for initplan hoisting, matching repo hygiene and
--     the search_path='' convention.
--
-- Recovery (re-split into the 3 originals):
--   DROP POLICY IF EXISTS "reflection_digests_read" ON public.reflection_digests;
--   CREATE POLICY "reflection_digests_student_select" ON public.reflection_digests
--     AS PERMISSIVE FOR SELECT TO authenticated
--     USING (student_id = (SELECT auth.uid()));
--   CREATE POLICY "reflection_digests_parent_select" ON public.reflection_digests
--     AS PERMISSIVE FOR SELECT TO authenticated
--     USING ((student_id IN (SELECT psl.student_id FROM public.parent_student_links psl
--       WHERE psl.parent_id = (SELECT auth.uid()) AND psl.verified = true))
--       AND (shared_with @> '[{"role": "parent"}]'::jsonb));
--   CREATE POLICY "reflection_digests_teacher_select" ON public.reflection_digests
--     AS PERMISSIVE FOR SELECT TO authenticated
--     USING ((shared_with @> '[{"role": "teacher"}]'::jsonb)
--       AND (student_id IN (SELECT sc.student_id FROM public.student_courses sc
--         JOIN public.courses c ON c.id = sc.course_id
--         WHERE c.teacher_id = (SELECT auth.uid()))));

DROP POLICY IF EXISTS "reflection_digests_student_select" ON public.reflection_digests;
DROP POLICY IF EXISTS "reflection_digests_parent_select" ON public.reflection_digests;
DROP POLICY IF EXISTS "reflection_digests_teacher_select" ON public.reflection_digests;

CREATE POLICY "reflection_digests_read" ON public.reflection_digests
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    -- student: own digests (unconditional ownership)
    (student_id = (SELECT auth.uid()))
    -- verified parent: linked child AND explicitly shared with parent
    OR (
      (student_id IN (
        SELECT psl.student_id
        FROM public.parent_student_links psl
        WHERE psl.parent_id = (SELECT auth.uid())
          AND psl.verified = true
      ))
      AND (shared_with @> '[{"role": "parent"}]'::jsonb)
    )
    -- teacher: student enrolled in one of the teacher's courses AND shared with teacher
    OR (
      (shared_with @> '[{"role": "teacher"}]'::jsonb)
      AND (student_id IN (
        SELECT sc.student_id
        FROM public.student_courses sc
        JOIN public.courses c ON c.id = sc.course_id
        WHERE c.teacher_id = (SELECT auth.uid())
      ))
    )
  );
