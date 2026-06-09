DROP POLICY IF EXISTS "parent_read_linked_assignments" ON public.assignments;
CREATE POLICY "parent_read_linked_assignments" ON public.assignments
  FOR SELECT TO authenticated USING (
    (select auth_user_role()) = 'parent'
    AND EXISTS (
      SELECT 1 FROM student_courses sc
      JOIN parent_student_links psl ON psl.student_id = sc.student_id
      WHERE sc.course_id = assignments.course_id
      AND psl.parent_id = (select auth.uid())
      AND psl.verified = true
    )
  );;
