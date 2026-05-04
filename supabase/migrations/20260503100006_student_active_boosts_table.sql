-- ============================================================
-- Migration 1.6: student_active_boosts table
-- Feature: XP Marketplace & Virtual Economy
-- Index on student_id + expires_at for active boost lookups
-- ============================================================

CREATE TABLE IF NOT EXISTS student_active_boosts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  boost_type TEXT NOT NULL DEFAULT 'xp_boost',
  multiplier NUMERIC(3,1) NOT NULL DEFAULT 2.0 CHECK (multiplier > 1.0),
  purchase_id UUID NOT NULL REFERENCES xp_purchases(id) ON DELETE CASCADE,
  activated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT chk_boost_duration CHECK (expires_at > activated_at)
);
-- Indexes (idempotent)
CREATE INDEX IF NOT EXISTS idx_student_active_boosts_student ON student_active_boosts(student_id);
CREATE INDEX IF NOT EXISTS idx_student_active_boosts_expires ON student_active_boosts(student_id, expires_at DESC);
ALTER TABLE student_active_boosts ENABLE ROW LEVEL SECURITY;
