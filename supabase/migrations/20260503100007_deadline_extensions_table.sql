-- ============================================================
-- Migration 1.7: deadline_extensions table
-- Feature: XP Marketplace & Virtual Economy
-- UNIQUE constraint on (student_id, assignment_id)
-- ============================================================

CREATE TABLE IF NOT EXISTS deadline_extensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  purchase_id UUID NOT NULL REFERENCES xp_purchases(id) ON DELETE CASCADE,
  original_deadline TIMESTAMPTZ NOT NULL,
  extended_deadline TIMESTAMPTZ NOT NULL,
  revoked BOOLEAN NOT NULL DEFAULT false,
  revoked_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_deadline_extension_student_assignment UNIQUE (student_id, assignment_id)
);
-- Indexes (idempotent)
CREATE INDEX IF NOT EXISTS idx_deadline_extensions_student ON deadline_extensions(student_id);
CREATE INDEX IF NOT EXISTS idx_deadline_extensions_assignment ON deadline_extensions(assignment_id);
ALTER TABLE deadline_extensions ENABLE ROW LEVEL SECURITY;
