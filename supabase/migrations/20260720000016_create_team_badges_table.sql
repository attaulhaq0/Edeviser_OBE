-- Task 1.7: Create team_badges table with columns and unique constraint
CREATE TABLE IF NOT EXISTS team_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id),
  badge_key text NOT NULL,
  earned_at timestamptz NOT NULL DEFAULT now()
);

-- Idempotent badge awards: one badge per team per badge_key
CREATE UNIQUE INDEX IF NOT EXISTS idx_team_badges_unique
  ON team_badges (team_id, badge_key);

ALTER TABLE team_badges ENABLE ROW LEVEL SECURITY;
