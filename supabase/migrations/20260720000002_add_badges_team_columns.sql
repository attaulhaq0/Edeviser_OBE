-- Task 132.1: Add team scope columns to badges table
ALTER TABLE badges
  ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'individual'
    CHECK (scope IN ('individual', 'team')),
  ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES teams(id);

-- Index for team badge queries
CREATE INDEX IF NOT EXISTS idx_badges_team
  ON badges (team_id)
  WHERE team_id IS NOT NULL;

-- Task 132.4: Add last_streak_date to team_gamification for team streak tracking
ALTER TABLE team_gamification
  ADD COLUMN IF NOT EXISTS last_streak_date text;
