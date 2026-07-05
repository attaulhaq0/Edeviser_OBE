-- H1 RLS consolidation: merge the 3 permissive SELECT policies on
-- student_gamification (staff / student-own / verified-parent) into ONE policy
-- TO authenticated. The separate anon public-portfolio policy is left untouched.
--
-- Behavior-identical by construction: Postgres OR-combines permissive policies, so
-- one policy = (staff) OR (student) OR (parent) with the exact same predicates is
-- equivalent. The parent policy was TO {public}; folding it into TO authenticated
-- is safe because its predicate yields nothing for anon (auth_user_role() is null).
--
-- Verified live via impersonation probes on prod before recording:
--   student: sees only own row (1/1);
--   parent:  sees only the verified-linked child (linked=1, other=0);
--   staff:   result byte-identical to the original gamification_staff_read (the
--            staff subquery reads profiles under RLS, unchanged);
--   select policy count 4 -> 2 (merged + anon portfolio).

DROP POLICY IF EXISTS "gamification_staff_read" ON public.student_gamification;
DROP POLICY IF EXISTS "gamification_student_read" ON public.student_gamification;
DROP POLICY IF EXISTS "parent_read_student_gamification" ON public.student_gamification;

CREATE POLICY "gamification_read" ON public.student_gamification
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    (((select public.auth_user_role()) = ANY (ARRAY['teacher'::text,'coordinator'::text,'admin'::text]))
      AND (student_id IN (
        select p.id from public.profiles p
        where p.institution_id = (select public.auth_institution_id())
      )))
    OR (student_id = (select auth.uid()))
    OR (((select public.auth_user_role()) = 'parent'::text)
      AND EXISTS (
        select 1 from public.parent_student_links psl
        where psl.student_id = student_gamification.student_id
          and psl.parent_id = (select auth.uid())
          and psl.verified = true
      ))
  );
