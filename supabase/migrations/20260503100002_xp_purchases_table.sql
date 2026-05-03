-- ============================================================
-- Migration 1.2: xp_purchases table (append-only ledger)
-- Feature: XP Marketplace & Virtual Economy
-- Adds missing institution_id FK column if not present
-- ============================================================

-- Create enum if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'xp_purchase_status') THEN
    CREATE TYPE xp_purchase_status AS ENUM ('active', 'consumed', 'expired', 'refunded');
  END IF;
END $$;

-- Create table if not exists
CREATE TABLE IF NOT EXISTS xp_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES marketplace_items(id) ON DELETE RESTRICT,
  xp_cost INTEGER NOT NULL CHECK (xp_cost > 0),
  status xp_purchase_status NOT NULL DEFAULT 'active',
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  consumed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'
);

-- Add institution_id column if missing (existing table upgrade)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'xp_purchases' AND column_name = 'institution_id'
  ) THEN
    ALTER TABLE xp_purchases
      ADD COLUMN institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE;

    -- Backfill institution_id from the student's profile
    UPDATE xp_purchases xp
      SET institution_id = p.institution_id
      FROM profiles p
      WHERE xp.student_id = p.id
        AND xp.institution_id IS NULL;
  END IF;
END $$;

-- Indexes (idempotent)
CREATE INDEX IF NOT EXISTS idx_xp_purchases_student ON xp_purchases(student_id);
CREATE INDEX IF NOT EXISTS idx_xp_purchases_item ON xp_purchases(item_id);
CREATE INDEX IF NOT EXISTS idx_xp_purchases_institution ON xp_purchases(institution_id);
CREATE INDEX IF NOT EXISTS idx_xp_purchases_student_status ON xp_purchases(student_id, status);
CREATE INDEX IF NOT EXISTS idx_xp_purchases_purchased_at ON xp_purchases(purchased_at DESC);

ALTER TABLE xp_purchases ENABLE ROW LEVEL SECURITY;

-- Prevent DELETE trigger (append-only enforcement)
CREATE OR REPLACE FUNCTION prevent_xp_purchases_delete()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Deletion of xp_purchases records is not allowed';
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_prevent_xp_purchases_delete'
  ) THEN
    CREATE TRIGGER trg_prevent_xp_purchases_delete
      BEFORE DELETE ON xp_purchases
      FOR EACH ROW EXECUTE FUNCTION prevent_xp_purchases_delete();
  END IF;
END $$;
