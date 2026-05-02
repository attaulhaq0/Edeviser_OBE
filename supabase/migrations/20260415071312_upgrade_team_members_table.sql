-- Add missing columns to team_members table
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'member' CHECK (role IN ('captain', 'member'));
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS left_at timestamptz;
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS contribution_status text NOT NULL DEFAULT 'active' CHECK (contribution_status IN ('active', 'warning', 'inactive'));
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS contribution_status_since timestamptz;
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS consecutive_low_days integer NOT NULL DEFAULT 0;

-- Add indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_team_members_active ON team_members (team_id, student_id) WHERE left_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_team_members_student_active ON team_members (student_id) WHERE left_at IS NULL;;
