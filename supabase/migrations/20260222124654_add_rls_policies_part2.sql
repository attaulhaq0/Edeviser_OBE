-- ============================================
-- Migration 5b: RLS Policies for LMS Tables (Part 2)
-- ============================================

-- announcements policies
CREATE POLICY "announcements_course_read" ON announcements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM courses c
      JOIN programs p ON p.id = c.program_id
      WHERE c.id = announcements.course_id
      AND p.institution_id = auth_institution_id()
    )
  );
CREATE POLICY "announcements_teacher_write" ON announcements
  FOR ALL USING (
    auth_user_role() = 'teacher'
    AND EXISTS (SELECT 1 FROM courses c WHERE c.id = announcements.course_id AND c.teacher_id = auth.uid())
  );
CREATE POLICY "announcements_admin_write" ON announcements
  FOR ALL USING (
    auth_user_role() = 'admin'
    AND EXISTS (
      SELECT 1 FROM courses c JOIN programs p ON p.id = c.program_id
      WHERE c.id = announcements.course_id AND p.institution_id = auth_institution_id()
    )
  );

-- course_modules policies
CREATE POLICY "course_modules_read" ON course_modules
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM courses c JOIN programs p ON p.id = c.program_id
      WHERE c.id = course_modules.course_id AND p.institution_id = auth_institution_id()
    )
  );
CREATE POLICY "course_modules_teacher_write" ON course_modules
  FOR ALL USING (
    auth_user_role() = 'teacher'
    AND EXISTS (SELECT 1 FROM courses c WHERE c.id = course_modules.course_id AND c.teacher_id = auth.uid())
  );

-- course_materials policies
CREATE POLICY "course_materials_read" ON course_materials
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM course_modules cm
      JOIN courses c ON c.id = cm.course_id
      JOIN programs p ON p.id = c.program_id
      WHERE cm.id = course_materials.module_id AND p.institution_id = auth_institution_id()
    )
  );
CREATE POLICY "course_materials_teacher_write" ON course_materials
  FOR ALL USING (
    auth_user_role() = 'teacher'
    AND EXISTS (
      SELECT 1 FROM course_modules cm
      JOIN courses c ON c.id = cm.course_id
      WHERE cm.id = course_materials.module_id AND c.teacher_id = auth.uid()
    )
  );

-- discussion_threads policies
CREATE POLICY "discussion_threads_course_read" ON discussion_threads
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM courses c JOIN programs p ON p.id = c.program_id
      WHERE c.id = discussion_threads.course_id AND p.institution_id = auth_institution_id()
    )
  );
CREATE POLICY "discussion_threads_author_write" ON discussion_threads
  FOR INSERT WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM courses c JOIN programs p ON p.id = c.program_id
      WHERE c.id = discussion_threads.course_id AND p.institution_id = auth_institution_id()
    )
  );
CREATE POLICY "discussion_threads_teacher_manage" ON discussion_threads
  FOR ALL USING (
    auth_user_role() = 'teacher'
    AND EXISTS (SELECT 1 FROM courses c WHERE c.id = discussion_threads.course_id AND c.teacher_id = auth.uid())
  );

-- discussion_replies policies
CREATE POLICY "discussion_replies_read" ON discussion_replies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM discussion_threads dt
      JOIN courses c ON c.id = dt.course_id
      JOIN programs p ON p.id = c.program_id
      WHERE dt.id = discussion_replies.thread_id AND p.institution_id = auth_institution_id()
    )
  );
CREATE POLICY "discussion_replies_author_insert" ON discussion_replies
  FOR INSERT WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM discussion_threads dt
      JOIN courses c ON c.id = dt.course_id
      JOIN programs p ON p.id = c.program_id
      WHERE dt.id = discussion_replies.thread_id AND p.institution_id = auth_institution_id()
    )
  );
CREATE POLICY "discussion_replies_teacher_manage" ON discussion_replies
  FOR ALL USING (
    auth_user_role() = 'teacher'
    AND EXISTS (
      SELECT 1 FROM discussion_threads dt
      JOIN courses c ON c.id = dt.course_id
      WHERE dt.id = discussion_replies.thread_id AND c.teacher_id = auth.uid()
    )
  );

-- class_sessions policies
CREATE POLICY "class_sessions_read" ON class_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM course_sections cs
      JOIN courses c ON c.id = cs.course_id
      JOIN programs p ON p.id = c.program_id
      WHERE cs.id = class_sessions.section_id AND p.institution_id = auth_institution_id()
    )
  );
CREATE POLICY "class_sessions_teacher_write" ON class_sessions
  FOR ALL USING (
    auth_user_role() = 'teacher'
    AND EXISTS (
      SELECT 1 FROM course_sections cs WHERE cs.id = class_sessions.section_id AND cs.teacher_id = auth.uid()
    )
  );

-- attendance_records policies
CREATE POLICY "attendance_own_read" ON attendance_records
  FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "attendance_teacher_manage" ON attendance_records
  FOR ALL USING (
    auth_user_role() = 'teacher'
    AND EXISTS (
      SELECT 1 FROM class_sessions cs
      JOIN course_sections sect ON sect.id = cs.section_id
      WHERE cs.id = attendance_records.session_id AND sect.teacher_id = auth.uid()
    )
  );
CREATE POLICY "attendance_admin_read" ON attendance_records
  FOR SELECT USING (auth_user_role() = 'admin');
;
