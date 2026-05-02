CREATE TABLE IF NOT EXISTS team_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id),
  invited_student_id uuid NOT NULL REFERENCES profiles(id),
  invited_by uuid NOT NULL REFERENCES profiles(id),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_team_invitations_student_status ON team_invitations (invited_student_id, status);
CREATE INDEX IF NOT EXISTS idx_team_invitations_team_status ON team_invitations (team_id, status);

ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;;
