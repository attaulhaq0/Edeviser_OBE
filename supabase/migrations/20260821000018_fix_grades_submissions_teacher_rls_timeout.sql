-- Fix: teacher grading page 500 timeouts on grades + submissions tables.
--
-- Root cause (grades): `grades_teacher_read` does an expensive 3-table join
-- (submissions -> assignments -> courses) per row. The teacher's own grades
-- query filters by `graded_by = teacher_id`, but the RLS policy still
-- evaluates the join for every candidate row.
--
-- Fix (grades): add a simple `graded_by = auth.uid()` fast-path SELECT
-- policy for teachers. Since permissive policies are OR-ed, Postgres can
-- satisfy the policy via the simple equality check without the join.
--
-- Root cause (submissions): `submissions_teacher_read` uses bare
-- `auth_user_role()` (not initplan-wrapped), causing per-row function calls.
--
-- Fix (submissions): replace with initplan-wrapped version using
-- `(select auth_user_role())` and `(select auth.uid())`.

-- 1. Grades: add teacher fast-path read policy
DROP POLICY IF EXISTS "grades_teacher_read_own" ON public.grades;
CREATE POLICY "grades_teacher_read_own" ON public.grades
  FOR SELECT TO authenticated
  USING (
    (select auth_user_role()) = 'teacher'
    AND graded_by = (select auth.uid())
  );

-- 2. Submissions: replace with initplan-wrapped version
DROP POLICY IF EXISTS "submissions_teacher_read" ON public.submissions;
CREATE POLICY "submissions_teacher_read" ON public.submissions
  FOR SELECT TO authenticated
  USING (
    (select auth_user_role()) = 'teacher'
    AND assignment_id IN (
      SELECT a.id FROM public.assignments a
      WHERE a.course_id IN (
        SELECT c.id FROM public.courses c WHERE c.teacher_id = (select auth.uid())
      )
    )
  );
