-- H1 RLS consolidation: merge the 3 permissive SELECT policies on submissions
-- (admin/coordinator-by-institution / verified-parent / teacher-by-course) into
-- ONE policy TO authenticated. The student-own policy (cmd ALL) already covers a
-- student SELECTing their own rows and is left untouched.
--
-- Behavior-identical by construction: Postgres OR-combines permissive policies;
-- all three merged policies were already TO authenticated with the exact
-- predicates re-used verbatim below. Halves per-row policy evaluation.
--
-- Replay-safe: every old policy name below is created by an earlier migration
-- (submissions_parent_read last at 20260821000021, submissions_teacher_read at
-- 20260821000018, submissions_admin_read at 20260601004741), so all exist here
-- and are dropped; "submissions_read" is new. No function ALTER/GRANT (no 42883).

DROP POLICY IF EXISTS "submissions_admin_read" ON public.submissions;
DROP POLICY IF EXISTS "submissions_parent_read" ON public.submissions;
DROP POLICY IF EXISTS "submissions_teacher_read" ON public.submissions;

CREATE POLICY "submissions_read" ON public.submissions
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    -- admin / coordinator: submissions by students in their institution
    (((select public.auth_user_role()) = ANY (ARRAY['admin'::text,'coordinator'::text]))
      AND (student_id IN (
        select p.id from public.profiles p
        where p.institution_id = (select public.auth_institution_id())
      )))
    -- verified parent: their linked child's submissions
    OR (((select public.auth_user_role()) = 'parent'::text)
      AND (student_id IN (
        select psl.student_id from public.parent_student_links psl
        where psl.parent_id = (select auth.uid())
          and psl.verified = true
      )))
    -- teacher: submissions for assignments in a course they teach
    OR (((select public.auth_user_role()) = 'teacher'::text)
      AND (assignment_id IN (
        select a.id from public.assignments a
        where a.course_id IN (
          select c.id from public.courses c
          where c.teacher_id = (select auth.uid())
        )
      )))
  );
