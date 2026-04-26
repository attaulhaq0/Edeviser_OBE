-- ============================================================
-- teacher_handoff_requests — AI-to-teacher escalation
-- Requirement 30, 31: Teacher Handoff Mechanism & Dashboard
-- ============================================================

CREATE TABLE IF NOT EXISTS teacher_handoff_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES tutor_conversations(id),
  student_id UUID NOT NULL REFERENCES profiles(id),
  teacher_id UUID NOT NULL REFERENCES profiles(id),
  institution_id UUID NOT NULL REFERENCES institutions(id),
  course_id UUID NOT NULL REFERENCES courses(id),
  clo_id UUID,
  conversation_summary TEXT NOT NULL,
  suggested_intervention TEXT NOT NULL,
  trigger_reason VARCHAR(30) NOT NULL CHECK (trigger_reason IN (
    'low_rag_confidence', 'repeated_question', 'low_satisfaction'
  )),
  student_consent BOOLEAN NOT NULL DEFAULT false,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
  teacher_response TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

-- Index for teacher queries (pending requests, most recent first)
CREATE INDEX IF NOT EXISTS idx_handoffs_teacher
  ON teacher_handoff_requests (teacher_id, status, created_at DESC);

-- Index for student queries
CREATE INDEX IF NOT EXISTS idx_handoffs_student
  ON teacher_handoff_requests (student_id, created_at DESC);

-- Index for course-scoped queries
CREATE INDEX IF NOT EXISTS idx_handoffs_course
  ON teacher_handoff_requests (course_id, status);

-- ============================================================
-- RLS Policies
-- ============================================================

ALTER TABLE teacher_handoff_requests ENABLE ROW LEVEL SECURITY;

-- Students can see and create their own handoff requests
CREATE POLICY "handoffs_student_own" ON teacher_handoff_requests
  FOR ALL TO authenticated
  USING (student_id = auth.uid());

-- Teachers can see handoff requests for their courses (only with student consent)
CREATE POLICY "handoffs_teacher_read" ON teacher_handoff_requests
  FOR SELECT TO authenticated
  USING (
    auth_user_role() = 'teacher'
    AND teacher_id = auth.uid()
    AND student_consent = true
  );

-- Teachers can update status of handoff requests they own
CREATE POLICY "handoffs_teacher_update" ON teacher_handoff_requests
  FOR UPDATE TO authenticated
  USING (
    auth_user_role() = 'teacher'
    AND teacher_id = auth.uid()
    AND student_consent = true
  );

-- Admin can read all within institution
CREATE POLICY "handoffs_admin_read" ON teacher_handoff_requests
  FOR SELECT TO authenticated
  USING (
    auth_user_role() = 'admin'
    AND institution_id = auth_institution_id()
  );
