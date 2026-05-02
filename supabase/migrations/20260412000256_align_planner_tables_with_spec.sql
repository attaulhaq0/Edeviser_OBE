-- Add missing columns to planner_tasks
ALTER TABLE planner_tasks
  ADD COLUMN IF NOT EXISTS course_id uuid REFERENCES courses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Add missing columns to session_evidence
ALTER TABLE session_evidence
  ADD COLUMN IF NOT EXISTS student_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS file_name varchar(255),
  ADD COLUMN IF NOT EXISTS file_size_bytes integer,
  ADD COLUMN IF NOT EXISTS mime_type varchar(100),
  ADD COLUMN IF NOT EXISTS notes text;

-- Add missing columns to weekly_goals
ALTER TABLE weekly_goals
  ADD COLUMN IF NOT EXISTS week_start_date date,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Backfill week_start_date from week_start if it exists
UPDATE weekly_goals SET week_start_date = week_start WHERE week_start_date IS NULL AND week_start IS NOT NULL;;
