DROP POLICY IF EXISTS "parent_read_student_courses" ON public.student_courses;
CREATE POLICY "parent_read_student_courses" ON public.student_courses
  FOR SELECT TO authenticated USING (
    (select auth_user_role()) = 'parent'
    AND student_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM parent_student_links psl
      WHERE psl.student_id = student_courses.student_id
      AND psl.parent_id = (select auth.uid())
      AND psl.verified = true
    )
  );

DROP POLICY IF EXISTS "parent_read_course_sections" ON public.course_sections;
CREATE POLICY "parent_read_course_sections" ON public.course_sections
  FOR SELECT TO authenticated USING (
    (select auth_user_role()) = 'parent'
    AND EXISTS (
      SELECT 1 FROM student_courses sc
      JOIN parent_student_links psl ON psl.student_id = sc.student_id
      WHERE (sc.section_id = course_sections.id OR sc.course_id = course_sections.course_id)
      AND psl.parent_id = (select auth.uid())
      AND psl.verified = true
    )
  );

DROP POLICY IF EXISTS "parent_read_class_sessions" ON public.class_sessions;
CREATE POLICY "parent_read_class_sessions" ON public.class_sessions
  FOR SELECT TO authenticated USING (
    (select auth_user_role()) = 'parent'
    AND EXISTS (
      SELECT 1 FROM course_sections cs
      JOIN student_courses sc ON (sc.section_id = cs.id OR sc.course_id = cs.course_id)
      JOIN parent_student_links psl ON psl.student_id = sc.student_id
      WHERE class_sessions.section_id = cs.id
      AND psl.parent_id = (select auth.uid())
      AND psl.verified = true
    )
  );;
