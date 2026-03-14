CREATE TABLE baseline_test_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) UNIQUE,
  time_limit_minutes INTEGER NOT NULL DEFAULT 15 CHECK (time_limit_minutes >= 5 AND time_limit_minutes <= 60),
  is_active BOOLEAN NOT NULL DEFAULT false,
  min_questions_per_clo INTEGER NOT NULL DEFAULT 2,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE baseline_test_config ENABLE ROW LEVEL SECURITY;;
