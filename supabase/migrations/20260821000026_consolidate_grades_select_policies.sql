-- H1 RLS consolidation: merge the 4 permissive SELECT policies on grades
-- (student-own / teacher-by-course / teacher-own-graded / verified-parent) into
-- ONE policy TO authenticated. The teacher WRITE policy (cmd ALL) is untouched.
--
-- Behavior-identical by construction: Postgres OR-combines permissive policies
-- for the same (role, cmd). Three of the four were TO {public}, but every
-- branch requires a role or auth.uid() (both null for anon) and grades has no
-- anon policy, so anon never saw a grade before and does not after -- folding
-- into TO authenticated only halves per-row policy evaluation on this hot read.
--
-- Replay-safe: every old policy name below is created by an earlier migration
-- (grades_teacher_read_own last at 20260821000018, the rest at 20260428000003),
-- so all exist here and are dropped; "grades_read" is created by no earlier
-- migration. No function is ALTERed/GRANTed/COMMENTed (no 42883 replay risk).

DROP POLICY IF EXISTS "grades_student_read" ON public.grades;
DROP POLICY IF EXISTS "grades_teacher_read" ON public.grades;
DROP POLICY IF EXISTS "grades_teacher_read_own" ON public.grades;
DROP POLICY IF EXISTS "parent_read_student_grades" ON public.grades;

CREATE POLICY "grades_read" ON public.grades
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    -- student: grades on their own submissions
    (submission_id IN (
      select s.id from public.submissions s
      where s.student_id = (select auth.uid())
    ))
    -- teacher: grades on submissions in a course they teach
    OR (((select public.auth_user_role()) = 'teacher'::text)
      AND (submission_id IN (
        select s.id
        from public.submissions s
          join public.assignments a on a.id = s.assignment_id
          join public.courses c on c.id = a.course_id
        where c.teacher_id = (select auth.uid())
      )))
    -- teacher: grades they themselves recorded
    OR (((select public.auth_user_role()) = 'teacher'::text)
      AND (graded_by = (select auth.uid())))
    -- verified parent: grades on their linked child's submissions
    OR (((select public.auth_user_role()) = 'parent'::text)
      AND EXISTS (
        select 1
        from public.submissions s
          join public.parent_student_links psl on psl.student_id = s.student_id
        where s.id = grades.submission_id
          and psl.parent_id = (select auth.uid())
          and psl.verified = true
      ))
  );
