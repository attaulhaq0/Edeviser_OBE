CREATE TABLE IF NOT EXISTS peer_teaching_moments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id),
  author_id uuid NOT NULL REFERENCES profiles(id),
  clo_id uuid NOT NULL REFERENCES learning_outcomes(id),
  title text NOT NULL,
  explanation_text text NOT NULL CHECK (length(explanation_text) BETWEEN 50 AND 500),
  media_url text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_peer_teaching_author_clo ON peer_teaching_moments (author_id, clo_id);
CREATE INDEX IF NOT EXISTS idx_peer_teaching_team_status ON peer_teaching_moments (team_id, status);

ALTER TABLE peer_teaching_moments ENABLE ROW LEVEL SECURITY;;
