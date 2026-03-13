CREATE TABLE onboarding_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id),
  assessment_type VARCHAR(20) NOT NULL CHECK (assessment_type IN (
    'personality', 'learning_style', 'baseline', 'self_efficacy', 'study_strategy'
  )),
  question_text TEXT NOT NULL,
  dimension VARCHAR(30) CHECK (dimension IN (
    'openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism'
  )),
  weight SMALLINT CHECK (weight IN (-1, 1)),
  options JSONB,
  correct_option SMALLINT CHECK (correct_option >= 0 AND correct_option <= 3),
  clo_id UUID REFERENCES learning_outcomes(id),
  course_id UUID REFERENCES courses(id),
  difficulty_level VARCHAR(10) CHECK (difficulty_level IN ('easy', 'medium', 'hard')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_onboarding_questions_type ON onboarding_questions (institution_id, assessment_type, is_active);
CREATE INDEX idx_onboarding_questions_course ON onboarding_questions (course_id) WHERE assessment_type = 'baseline';

ALTER TABLE onboarding_questions ENABLE ROW LEVEL SECURITY;;
