CREATE TABLE baseline_attainment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id),
  course_id UUID NOT NULL REFERENCES courses(id),
  clo_id UUID NOT NULL REFERENCES learning_outcomes(id),
  score NUMERIC(5,2) NOT NULL CHECK (score >= 0 AND score <= 100),
  question_count INTEGER NOT NULL,
  correct_count INTEGER NOT NULL,
  assessment_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, course_id, clo_id)
);

CREATE INDEX idx_baseline_attainment_student ON baseline_attainment (student_id, course_id);
CREATE INDEX idx_baseline_attainment_course ON baseline_attainment (course_id, clo_id);

ALTER TABLE baseline_attainment ENABLE ROW LEVEL SECURITY;;
