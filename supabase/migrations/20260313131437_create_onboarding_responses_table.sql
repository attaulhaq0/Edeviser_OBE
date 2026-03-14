CREATE TABLE onboarding_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id),
  question_id UUID NOT NULL REFERENCES onboarding_questions(id),
  assessment_version INTEGER NOT NULL DEFAULT 1,
  selected_option SMALLINT NOT NULL,
  score_contribution NUMERIC(5,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, question_id, assessment_version)
);

CREATE INDEX idx_onboarding_responses_student ON onboarding_responses (student_id, assessment_version);

ALTER TABLE onboarding_responses ENABLE ROW LEVEL SECURITY;;
