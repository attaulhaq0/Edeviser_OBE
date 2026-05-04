-- ============================================================
-- Migration: RLS policies for all AI Tutor tables
-- Feature: AI Chat Tutor with RAG Engine
-- Uses (select auth.uid()), (select auth_user_role()),
-- (select auth_institution_id()) patterns for InitPlan optimization
-- ============================================================

-- ══════════════════════════════════════════════════════════════
-- 1. course_material_embeddings — RLS
-- ══════════════════════════════════════════════════════════════
ALTER TABLE course_material_embeddings ENABLE ROW LEVEL SECURITY;
-- Students can read embeddings for courses they are enrolled in
DROP POLICY IF EXISTS "embeddings_student_read" ON course_material_embeddings;
CREATE POLICY "embeddings_student_read" ON course_material_embeddings
  FOR SELECT TO authenticated
  USING (
    (select auth_user_role()) = 'student'
    AND course_id IN (
      SELECT course_id FROM student_courses WHERE student_id = (select auth.uid())
    )
  );
-- Teachers can read/write embeddings for their courses
DROP POLICY IF EXISTS "embeddings_teacher_all" ON course_material_embeddings;
CREATE POLICY "embeddings_teacher_all" ON course_material_embeddings
  FOR ALL TO authenticated
  USING (
    (select auth_user_role()) = 'teacher'
    AND course_id IN (
      SELECT id FROM courses WHERE teacher_id = (select auth.uid())
    )
  );
-- Admins can manage all embeddings in their institution
DROP POLICY IF EXISTS "embeddings_admin_all" ON course_material_embeddings;
CREATE POLICY "embeddings_admin_all" ON course_material_embeddings
  FOR ALL TO authenticated
  USING (
    (select auth_user_role()) = 'admin'
    AND institution_id = (select auth_institution_id())
  );
-- Coordinators can read embeddings in their institution
DROP POLICY IF EXISTS "embeddings_coordinator_read" ON course_material_embeddings;
CREATE POLICY "embeddings_coordinator_read" ON course_material_embeddings
  FOR SELECT TO authenticated
  USING (
    (select auth_user_role()) = 'coordinator'
    AND institution_id = (select auth_institution_id())
  );
-- ══════════════════════════════════════════════════════════════
-- 2. tutor_conversations — RLS (student-private)
-- ══════════════════════════════════════════════════════════════
ALTER TABLE tutor_conversations ENABLE ROW LEVEL SECURITY;
-- Students can only access their own conversations (full CRUD)
DROP POLICY IF EXISTS "conversations_student_own" ON tutor_conversations;
CREATE POLICY "conversations_student_own" ON tutor_conversations
  FOR ALL TO authenticated
  USING (
    (select auth_user_role()) = 'student'
    AND student_id = (select auth.uid())
  );
-- ══════════════════════════════════════════════════════════════
-- 3. tutor_messages — RLS (student-private)
-- ══════════════════════════════════════════════════════════════
ALTER TABLE tutor_messages ENABLE ROW LEVEL SECURITY;
-- Students can access messages in their own conversations
DROP POLICY IF EXISTS "messages_student_own" ON tutor_messages;
CREATE POLICY "messages_student_own" ON tutor_messages
  FOR ALL TO authenticated
  USING (
    conversation_id IN (
      SELECT id FROM tutor_conversations WHERE student_id = (select auth.uid())
    )
  );
-- ══════════════════════════════════════════════════════════════
-- 4. tutor_usage_limits — RLS
-- ══════════════════════════════════════════════════════════════
ALTER TABLE tutor_usage_limits ENABLE ROW LEVEL SECURITY;
-- Students can read their own usage
DROP POLICY IF EXISTS "usage_student_read" ON tutor_usage_limits;
CREATE POLICY "usage_student_read" ON tutor_usage_limits
  FOR SELECT TO authenticated
  USING (
    (select auth_user_role()) = 'student'
    AND student_id = (select auth.uid())
  );
-- Admins can read all usage in their institution
DROP POLICY IF EXISTS "usage_admin_read" ON tutor_usage_limits;
CREATE POLICY "usage_admin_read" ON tutor_usage_limits
  FOR SELECT TO authenticated
  USING (
    (select auth_user_role()) = 'admin'
    AND institution_id = (select auth_institution_id())
  );
-- ══════════════════════════════════════════════════════════════
-- 5. tutor_llm_logs — RLS (admin-only read)
-- ══════════════════════════════════════════════════════════════
ALTER TABLE tutor_llm_logs ENABLE ROW LEVEL SECURITY;
-- Admins can read LLM logs in their institution
DROP POLICY IF EXISTS "llm_logs_admin_read" ON tutor_llm_logs;
CREATE POLICY "llm_logs_admin_read" ON tutor_llm_logs
  FOR SELECT TO authenticated
  USING (
    (select auth_user_role()) = 'admin'
    AND institution_id = (select auth_institution_id())
  );
