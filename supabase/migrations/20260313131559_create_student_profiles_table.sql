CREATE TABLE student_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id),
  institution_id UUID NOT NULL REFERENCES institutions(id),
  personality_traits JSONB,
  learning_style JSONB,
  self_efficacy JSONB,
  study_strategies JSONB,
  profile_completeness INTEGER NOT NULL DEFAULT 0 CHECK (profile_completeness >= 0 AND profile_completeness <= 100),
  assessment_version INTEGER NOT NULL DEFAULT 1,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, assessment_version)
);

CREATE INDEX idx_student_profiles_student ON student_profiles (student_id, assessment_version DESC);
CREATE INDEX idx_student_profiles_institution ON student_profiles (institution_id);

ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;;
