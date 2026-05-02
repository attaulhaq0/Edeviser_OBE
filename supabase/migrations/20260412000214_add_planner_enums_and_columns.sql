-- Create enums if not exist
DO $$ BEGIN
  CREATE TYPE timer_mode_type AS ENUM ('pomodoro', 'custom');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE session_status_type AS ENUM ('planned', 'in_progress', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE task_priority_type AS ENUM ('low', 'medium', 'high');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE task_status_type AS ENUM ('pending', 'completed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE goal_type_enum AS ENUM ('study_hours', 'sessions_completed', 'tasks_completed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add missing columns to study_sessions
ALTER TABLE study_sessions
  ADD COLUMN IF NOT EXISTS title varchar(255),
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS planned_date date,
  ADD COLUMN IF NOT EXISTS planned_start_time time,
  ADD COLUMN IF NOT EXISTS actual_start_at timestamptz,
  ADD COLUMN IF NOT EXISTS actual_end_at timestamptz,
  ADD COLUMN IF NOT EXISTS timer_mode timer_mode_type,
  ADD COLUMN IF NOT EXISTS status session_status_type DEFAULT 'planned',
  ADD COLUMN IF NOT EXISTS satisfaction_rating integer,
  ADD COLUMN IF NOT EXISTS clo_ids uuid[],
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Add CHECK constraints safely
DO $$ BEGIN
  ALTER TABLE study_sessions ADD CONSTRAINT chk_planned_duration CHECK (planned_duration_minutes >= 15 AND planned_duration_minutes <= 240);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE study_sessions ADD CONSTRAINT chk_satisfaction_rating CHECK (satisfaction_rating IS NULL OR (satisfaction_rating >= 1 AND satisfaction_rating <= 5));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_study_sessions_student_date ON study_sessions(student_id, planned_date);
CREATE INDEX IF NOT EXISTS idx_study_sessions_student_status ON study_sessions(student_id, status);

-- Ensure planner_tasks has correct columns and constraints
DO $$ BEGIN
  ALTER TABLE planner_tasks ADD CONSTRAINT chk_task_priority CHECK (priority IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_planner_tasks_student_date ON planner_tasks(student_id, due_date);
CREATE INDEX IF NOT EXISTS idx_planner_tasks_student_status ON planner_tasks(student_id, status);;
