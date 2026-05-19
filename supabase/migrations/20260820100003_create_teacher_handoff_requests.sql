-- ============================================================
-- teacher_handoff_requests — AI-to-teacher escalation
-- Task 18.1: Create teacher_handoff_requests table
-- ============================================================

-- Guard: only create if table does not already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'teacher_handoff_requests'
  ) THEN

    CREATE TABLE teacher_handoff_requests (
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
      status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'resolved', 'dismissed'
      )),
      teacher_response TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      resolved_at TIMESTAMPTZ
    );

    -- Indexes for teacher dashboard queries and student history
    CREATE INDEX idx_handoffs_teacher ON teacher_handoff_requests (teacher_id, status, created_at DESC);
    CREATE INDEX idx_handoffs_student ON teacher_handoff_requests (student_id, created_at DESC);

    -- Enable RLS
    ALTER TABLE teacher_handoff_requests ENABLE ROW LEVEL SECURITY;

    -- Students can create handoff requests (with consent) and view their own
    CREATE POLICY "handoffs_student_own" ON teacher_handoff_requests
      FOR ALL USING (student_id = (select auth.uid()));

    -- Teachers can read handoff requests for their courses (only with student consent)
    CREATE POLICY "handoffs_teacher_read" ON teacher_handoff_requests
      FOR SELECT USING (
        auth_user_role() = 'teacher'
        AND teacher_id = (select auth.uid())
        AND student_consent = true
      );

    -- Teachers can update status of handoff requests they own
    CREATE POLICY "handoffs_teacher_update" ON teacher_handoff_requests
      FOR UPDATE USING (
        auth_user_role() = 'teacher'
        AND teacher_id = (select auth.uid())
        AND student_consent = true
      );

  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_teacher_handoff_requests_conversation_id
  ON teacher_handoff_requests (conversation_id);
CREATE INDEX IF NOT EXISTS idx_teacher_handoff_requests_course_id
  ON teacher_handoff_requests (course_id);
CREATE INDEX IF NOT EXISTS idx_teacher_handoff_requests_institution_id
  ON teacher_handoff_requests (institution_id);
