-- Add missing columns to teams table
ALTER TABLE teams ADD COLUMN IF NOT EXISTS institution_id uuid REFERENCES institutions(id);
ALTER TABLE teams ADD COLUMN IF NOT EXISTS captain_id uuid REFERENCES profiles(id);
ALTER TABLE teams ADD COLUMN IF NOT EXISTS xp_total integer NOT NULL DEFAULT 0;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS streak_count integer NOT NULL DEFAULT 0;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS streak_last_active_date date;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS cooperation_score integer NOT NULL DEFAULT 100;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS health_score integer NOT NULL DEFAULT 100;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS health_status text NOT NULL DEFAULT 'healthy' CHECK (health_status IN ('healthy', 'needs_attention', 'at_risk'));
ALTER TABLE teams ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE teams ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Make created_by NOT NULL if it was nullable
ALTER TABLE teams ALTER COLUMN created_by SET NOT NULL;
ALTER TABLE teams ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE teams ALTER COLUMN created_at SET DEFAULT now();

-- Add indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_teams_unique_name_per_course ON teams (course_id, name) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_teams_course_active ON teams (course_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_teams_institution ON teams (institution_id);;
