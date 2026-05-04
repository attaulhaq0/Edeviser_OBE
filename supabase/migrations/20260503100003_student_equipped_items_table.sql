-- ============================================================
-- Migration 1.3: student_equipped_items table
-- Feature: XP Marketplace & Virtual Economy
-- UNIQUE constraint on (student_id, slot) enforces one item per slot
-- ============================================================

-- Create enum if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cosmetic_slot') THEN
    CREATE TYPE cosmetic_slot AS ENUM ('profile_theme', 'avatar_frame', 'display_title');
  END IF;
END $$;
-- Create table if not exists
CREATE TABLE IF NOT EXISTS student_equipped_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  purchase_id UUID NOT NULL REFERENCES xp_purchases(id) ON DELETE CASCADE,
  slot cosmetic_slot NOT NULL,
  equipped_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_student_equipped_slot UNIQUE (student_id, slot)
);
-- Indexes (idempotent)
CREATE INDEX IF NOT EXISTS idx_student_equipped_student ON student_equipped_items(student_id);
ALTER TABLE student_equipped_items ENABLE ROW LEVEL SECURITY;
