-- ============================================================
-- student_content — Student-created learning content
-- ============================================================

CREATE TABLE student_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id),
  student_id UUID NOT NULL REFERENCES profiles(id),
  content_type VARCHAR(30) NOT NULL CHECK (content_type IN ('study_plan', 'quiz_question', 'explanation_video')),
  clo_id UUID REFERENCES learning_outcomes(id),
  title VARCHAR(200) NOT NULL,
  content_data JSONB NOT NULL DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewer_id UUID REFERENCES profiles(id),
  reviewer_feedback TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_student_content_student ON student_content (student_id, status);
CREATE INDEX idx_student_content_institution ON student_content (institution_id, status);
CREATE INDEX idx_student_content_clo ON student_content (clo_id) WHERE clo_id IS NOT NULL;
