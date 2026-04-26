-- Task 1.3: Create team_members table with columns, unique partial index
CREATE TABLE IF NOT EXISTS team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id),
  student_id uuid NOT NULL REFERENCES profiles(id),
  role text NOT NULL CHECK (role IN ('captain', 'member')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  left_at timestamptz,
  contribution_status text NOT NULL DEFAULT 'active'
    CHECK (contribution_status IN ('active', 'warning', 'inactive')),
  contribution_status_since timestamptz,
  consecutive_low_days integer NOT NULL DEFAULT 0
);

-- One active membership per team per student
CREATE UNIQUE INDEX IF NOT EXISTS idx_team_members_active
  ON team_members (team_id, student_id) WHERE left_at IS NULL;

-- Fast lookup: is student on a team?
CREATE INDEX IF NOT EXISTS idx_team_members_student_active
  ON team_members (student_id) WHERE left_at IS NULL;

ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
