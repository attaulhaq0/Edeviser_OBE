-- Task 1.18: Create peer_teaching_moments table with columns, indexes, and CHECK constraints
CREATE TABLE IF NOT EXISTS peer_teaching_moments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id),
  author_id uuid NOT NULL REFERENCES profiles(id),
  clo_id uuid NOT NULL REFERENCES clos(id),
  title text NOT NULL,
  explanation_text text NOT NULL CHECK (length(explanation_text) BETWEEN 50 AND 500),
  media_url text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Per-CLO limit check: max 3 per student per CLO
CREATE INDEX IF NOT EXISTS idx_peer_teaching_author_clo
  ON peer_teaching_moments (author_id, clo_id);

-- Listing active moments per team
CREATE INDEX IF NOT EXISTS idx_peer_teaching_team_status
  ON peer_teaching_moments (team_id, status);

ALTER TABLE peer_teaching_moments ENABLE ROW LEVEL SECURITY;
