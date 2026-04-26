-- ============================================================
-- class_donation_contributions — Individual student contributions
-- Links to class_donations and optionally to xp_purchases.
-- ============================================================

CREATE TABLE class_donation_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donation_id UUID NOT NULL REFERENCES class_donations(id),
  student_id UUID NOT NULL REFERENCES profiles(id),
  xp_amount INTEGER NOT NULL CHECK (xp_amount > 0),
  purchase_id UUID REFERENCES xp_purchases(id),
  contributed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_donation_contributions_donation ON class_donation_contributions (donation_id);
CREATE INDEX idx_donation_contributions_student ON class_donation_contributions (student_id);
