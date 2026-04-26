-- ============================================================
-- tutor_conversations — Chat sessions
-- ============================================================
CREATE TABLE tutor_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id),
  institution_id UUID NOT NULL REFERENCES institutions(id),
  course_id UUID REFERENCES courses(id),
  persona VARCHAR(30) NOT NULL DEFAULT 'socratic_guide' CHECK (persona IN (
    'socratic_guide', 'step_by_step_coach', 'quick_explainer'
  )),
  title VARCHAR(200),
  clo_scope UUID[] DEFAULT '{}',
  message_count INTEGER NOT NULL DEFAULT 0,
  xp_awarded BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_conversations_student ON tutor_conversations (student_id, updated_at DESC);
CREATE INDEX idx_conversations_course ON tutor_conversations (course_id);
