CREATE TYPE xp_purchase_status AS ENUM ('active', 'consumed', 'expired', 'refunded');

CREATE TABLE xp_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES marketplace_items(id) ON DELETE RESTRICT,
  xp_cost INTEGER NOT NULL CHECK (xp_cost > 0),
  status xp_purchase_status NOT NULL DEFAULT 'active',
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  consumed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_xp_purchases_student ON xp_purchases(student_id);
CREATE INDEX idx_xp_purchases_item ON xp_purchases(item_id);
CREATE INDEX idx_xp_purchases_student_status ON xp_purchases(student_id, status);
CREATE INDEX idx_xp_purchases_purchased_at ON xp_purchases(purchased_at DESC);

ALTER TABLE xp_purchases ENABLE ROW LEVEL SECURITY;

-- Prevent DELETE on xp_purchases (append-only)
CREATE OR REPLACE FUNCTION prevent_xp_purchases_delete()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Deletion of xp_purchases records is not allowed';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_xp_purchases_delete
  BEFORE DELETE ON xp_purchases
  FOR EACH ROW EXECUTE FUNCTION prevent_xp_purchases_delete();;
