-- ============================================================
-- student_content — RLS
-- ============================================================
ALTER TABLE student_content ENABLE ROW LEVEL SECURITY;

-- Students: SELECT and INSERT their own content
CREATE POLICY "student_content_student_select" ON student_content
  FOR SELECT TO authenticated
  USING (
    auth_user_role() = 'student'
    AND student_id = (select auth.uid())
  );

CREATE POLICY "student_content_student_insert" ON student_content
  FOR INSERT TO authenticated
  WITH CHECK (
    auth_user_role() = 'student'
    AND student_id = (select auth.uid())
    AND institution_id = auth_institution_id()
  );

-- Teachers: SELECT content in their institution (submitted/approved/rejected)
CREATE POLICY "student_content_teacher_select" ON student_content
  FOR SELECT TO authenticated
  USING (
    auth_user_role() = 'teacher'
    AND institution_id = auth_institution_id()
    AND status IN ('pending', 'approved', 'rejected')
  );

-- Teachers: UPDATE status (approve/reject)
CREATE POLICY "student_content_teacher_review" ON student_content
  FOR UPDATE TO authenticated
  USING (
    auth_user_role() = 'teacher'
    AND institution_id = auth_institution_id()
  )
  WITH CHECK (
    auth_user_role() = 'teacher'
    AND institution_id = auth_institution_id()
  );

-- Admins: full access within institution
CREATE POLICY "student_content_admin_all" ON student_content
  FOR ALL TO authenticated
  USING (
    auth_user_role() = 'admin'
    AND institution_id = auth_institution_id()
  );

-- ============================================================
-- knowledge_quests — RLS
-- ============================================================
ALTER TABLE knowledge_quests ENABLE ROW LEVEL SECURITY;

-- Students: SELECT active quests in their institution
CREATE POLICY "knowledge_quests_student_select" ON knowledge_quests
  FOR SELECT TO authenticated
  USING (
    auth_user_role() = 'student'
    AND institution_id = auth_institution_id()
  );

-- Admins: full CRUD within institution
CREATE POLICY "knowledge_quests_admin_all" ON knowledge_quests
  FOR ALL TO authenticated
  USING (
    auth_user_role() = 'admin'
    AND institution_id = auth_institution_id()
  );

-- ============================================================
-- student_quest_progress — RLS
-- ============================================================
ALTER TABLE student_quest_progress ENABLE ROW LEVEL SECURITY;

-- Students: SELECT, INSERT, UPDATE their own progress
CREATE POLICY "quest_progress_student_own" ON student_quest_progress
  FOR ALL TO authenticated
  USING (
    auth_user_role() = 'student'
    AND student_id = (select auth.uid())
  );

-- Admins: SELECT within institution
CREATE POLICY "quest_progress_admin_select" ON student_quest_progress
  FOR SELECT TO authenticated
  USING (
    auth_user_role() = 'admin'
    AND quest_id IN (
      SELECT id FROM knowledge_quests WHERE institution_id = auth_institution_id()
    )
  );;
