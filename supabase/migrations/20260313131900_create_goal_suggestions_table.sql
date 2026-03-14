CREATE TABLE goal_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id),
  week_start DATE NOT NULL,
  goal_text TEXT NOT NULL,
  smart_specific TEXT,
  smart_measurable TEXT,
  smart_achievable TEXT,
  smart_relevant TEXT,
  smart_timebound DATE,
  difficulty VARCHAR(10) NOT NULL CHECK (difficulty IN ('easy', 'moderate', 'ambitious')),
  cohort_completion_rate NUMERIC(5,2),
  status VARCHAR(20) NOT NULL DEFAULT 'suggested' CHECK (status IN ('suggested', 'accepted', 'modified', 'dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_goal_suggestions_student ON goal_suggestions (student_id, week_start, status);

ALTER TABLE goal_suggestions ENABLE ROW LEVEL SECURITY;;
