-- Recursion-safe rewrite of the parent read policies: replace inline
-- parent_student_links subqueries with the parent_has_verified_link()
-- SECURITY DEFINER helper to avoid the 42P17 infinite-recursion cycle
-- (student_courses -> parent_student_links -> profiles -> student_courses).
-- This is the FINAL definition of these four policies in replay order.
-- Helper created in 20260602073802; tables/columns all exist by here.

DROP POLICY IF EXISTS "parent_read_student_courses" ON public.student_courses;
CREATE POLICY "parent_read_student_courses" ON public.student_courses
  FOR SELECT TO authenticated USING (
    (select auth_user_role()) = 'parent'
    AND student_id IS NOT NULL
    AND (select public.parent_has_verified_link(student_courses.student_id))
  );

DROP POLICY IF EXISTS "parent_read_course_sections" ON public.course_sections;
CREATE POLICY "parent_read_course_sections" ON public.course_sections
  FOR SELECT TO authenticated USING (
    (select auth_user_role()) = 'parent'
    AND EXISTS (
      SELECT 1 FROM student_courses sc
      WHERE (sc.section_id = course_sections.id OR sc.course_id = course_sections.course_id)
      AND (select public.parent_has_verified_link(sc.student_id))
    )
  );

DROP POLICY IF EXISTS "parent_read_class_sessions" ON public.class_sessions;
CREATE POLICY "parent_read_class_sessions" ON public.class_sessions
  FOR SELECT TO authenticated USING (
    (select auth_user_role()) = 'parent'
    AND EXISTS (
      SELECT 1 FROM course_sections cs
      JOIN student_courses sc ON (sc.section_id = cs.id OR sc.course_id = cs.course_id)
      WHERE class_sessions.section_id = cs.id
      AND (select public.parent_has_verified_link(sc.student_id))
    )
  );

DROP POLICY IF EXISTS "parent_read_linked_assignments" ON public.assignments;
CREATE POLICY "parent_read_linked_assignments" ON public.assignments
  FOR SELECT TO authenticated USING (
    (select auth_user_role()) = 'parent'
    AND EXISTS (
      SELECT 1 FROM student_courses sc
      WHERE sc.course_id = assignments.course_id
      AND (select public.parent_has_verified_link(sc.student_id))
    )
  );
