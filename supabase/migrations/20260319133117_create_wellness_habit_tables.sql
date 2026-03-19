-- 1.1: Create wellness_habit_type enum
CREATE TYPE wellness_habit_type AS ENUM ('meditation', 'hydration', 'exercise', 'sleep');

-- 1.2: Create wellness_habit_logs table
CREATE TABLE wellness_habit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date date NOT NULL,
  wellness_type wellness_habit_type NOT NULL,
  value numeric,
  completed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, date, wellness_type)
);

CREATE INDEX idx_wellness_habit_logs_student_date ON wellness_habit_logs(student_id, date);
CREATE INDEX idx_wellness_habit_logs_student_type_date ON wellness_habit_logs(student_id, wellness_type, date);

-- 1.3: Create student_wellness_preferences table
CREATE TABLE student_wellness_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  enabled_habits text[] NOT NULL DEFAULT '{}',
  parent_visibility boolean NOT NULL DEFAULT false,
  habit_targets jsonb NOT NULL DEFAULT '{}',
  reminder_times jsonb NOT NULL DEFAULT '{}',
  dismissed_onboarding_tips text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 1.4: Add wellness_xp_amount to institution_settings
ALTER TABLE institution_settings ADD COLUMN IF NOT EXISTS wellness_xp_amount integer NOT NULL DEFAULT 5;

-- 1.5: Create index on existing habit_tracking table
CREATE INDEX IF NOT EXISTS idx_habit_tracking_student_date ON habit_tracking(student_id, habit_date);;
