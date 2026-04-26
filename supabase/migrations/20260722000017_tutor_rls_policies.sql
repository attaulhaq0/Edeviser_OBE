-- ============================================================
-- RLS Policies for AI Tutor tables
-- ============================================================

-- ── course_material_embeddings ──────────────────────────────
ALTER TABLE course_material_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "embeddings_student_read" ON course_material_embeddings
  FOR SELECT USING (
    auth_user_role() = 'student'
    AND course_id IN (
      SELECT course_id FROM student_courses WHERE student_id = auth.uid()
    )
  );

CREATE POLICY "embeddings_teacher_all" ON course_material_embeddings
  FOR ALL USING (
    auth_user_role() = 'teacher'
    AND course_id IN (
      SELECT id FROM courses WHERE teacher_id = auth.uid()
    )
  );

CREATE POLICY "embeddings_admin_all" ON course_material_embeddings
  FOR ALL USING (
    auth_user_role() = 'admin'
    AND institution_id = auth_institution_id()
  );

-- ── tutor_conversations (student-private) ───────────────────
ALTER TABLE tutor_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conversations_student_own" ON tutor_conversations
  FOR ALL USING (student_id = auth.uid());

-- ── tutor_messages (student-private) ────────────────────────
ALTER TABLE tutor_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "messages_student_own" ON tutor_messages
  FOR ALL USING (
    conversation_id IN (
      SELECT id FROM tutor_conversations WHERE student_id = auth.uid()
    )
  );

-- ── tutor_usage_limits ──────────────────────────────────────
ALTER TABLE tutor_usage_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usage_student_read" ON tutor_usage_limits
  FOR SELECT USING (student_id = auth.uid());

-- ── tutor_llm_logs (admin-only read) ────────────────────────
ALTER TABLE tutor_llm_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "llm_logs_admin_read" ON tutor_llm_logs
  FOR SELECT USING (
    auth_user_role() = 'admin'
    AND institution_id = auth_institution_id()
  );
