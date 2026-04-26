-- ============================================================
-- tutor_usage_limits — Per-student daily usage tracking
-- ============================================================
CREATE TABLE tutor_usage_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id),
  institution_id UUID NOT NULL REFERENCES institutions(id),
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  message_count INTEGER NOT NULL DEFAULT 0,
  token_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, usage_date)
);

CREATE INDEX idx_usage_student_date ON tutor_usage_limits (student_id, usage_date);
