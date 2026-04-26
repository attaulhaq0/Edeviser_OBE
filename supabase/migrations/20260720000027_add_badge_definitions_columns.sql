-- ============================================================
-- Migration: Create badge_definitions table with tier_conditions
-- and is_archived columns.
-- Task 17.2: Badge Progression — badge definitions with tiers
-- The badge_definitions table stores institution-level badge
-- templates. Previously badges were defined only in code
-- (src/lib/badgeDefinitions.ts). This table enables DB-driven
-- badge management with tiered progression and archiving.
-- ============================================================

CREATE TABLE IF NOT EXISTS badge_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  emoji TEXT NOT NULL DEFAULT '🏆',
  badge_key TEXT NOT NULL,
  category TEXT,
  tier_conditions JSONB DEFAULT '{"bronze": {}, "silver": {}, "gold": {}}',
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(institution_id, badge_key)
);

ALTER TABLE badge_definitions ENABLE ROW LEVEL SECURITY;

-- Index for spotlight queries (non-archived badges)
CREATE INDEX IF NOT EXISTS idx_badge_definitions_active
  ON badge_definitions (institution_id, is_archived)
  WHERE is_archived = false;

-- Students and teachers can read badge definitions in their institution
CREATE POLICY "badge_definitions_read" ON badge_definitions
  FOR SELECT TO authenticated
  USING (institution_id = auth_institution_id());

-- Admins can manage badge definitions in their institution
CREATE POLICY "badge_definitions_admin_all" ON badge_definitions
  FOR ALL TO authenticated
  USING (
    auth_user_role() = 'admin'
    AND institution_id = auth_institution_id()
  );
