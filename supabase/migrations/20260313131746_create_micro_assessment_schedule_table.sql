CREATE TABLE micro_assessment_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id),
  scheduled_day INTEGER NOT NULL CHECK (scheduled_day >= 1 AND scheduled_day <= 14),
  assessment_type VARCHAR(20) NOT NULL CHECK (assessment_type IN (
    'personality', 'self_efficacy', 'study_strategy', 'learning_style', 'baseline_prompt'
  )),
  question_ids UUID[] NOT NULL DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'skipped', 'dismissed')),
  dismissal_count INTEGER NOT NULL DEFAULT 0,
  scheduled_at DATE NOT NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, scheduled_day)
);

CREATE INDEX idx_micro_assessment_schedule_student ON micro_assessment_schedule (student_id, status, scheduled_at);

ALTER TABLE micro_assessment_schedule ENABLE ROW LEVEL SECURITY;;
