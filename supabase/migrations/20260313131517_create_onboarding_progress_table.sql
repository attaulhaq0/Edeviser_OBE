CREATE TABLE onboarding_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id),
  current_step VARCHAR(30) NOT NULL DEFAULT 'welcome' CHECK (current_step IN (
    'welcome', 'personality', 'self_efficacy', 'learning_style', 'study_strategy',
    'baseline_select', 'baseline_test', 'summary'
  )),
  personality_completed BOOLEAN NOT NULL DEFAULT false,
  learning_style_completed BOOLEAN NOT NULL DEFAULT false,
  self_efficacy_completed BOOLEAN NOT NULL DEFAULT false,
  study_strategy_completed BOOLEAN NOT NULL DEFAULT false,
  baseline_completed BOOLEAN NOT NULL DEFAULT false,
  baseline_course_ids UUID[] DEFAULT '{}',
  skipped_sections TEXT[] DEFAULT '{}',
  assessment_version INTEGER NOT NULL DEFAULT 1,
  day1_completed BOOLEAN NOT NULL DEFAULT false,
  micro_assessment_day INTEGER NOT NULL DEFAULT 0,
  micro_assessment_dismissals INTEGER NOT NULL DEFAULT 0,
  profile_completeness INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id)
);

ALTER TABLE onboarding_progress ENABLE ROW LEVEL SECURITY;;
