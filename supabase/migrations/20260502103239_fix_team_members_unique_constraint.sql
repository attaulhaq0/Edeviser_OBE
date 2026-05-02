-- Task 1.3: Fix team_members table to match design doc
-- The original migration (20260411221627) created a plain UNIQUE(team_id, student_id)
-- constraint which conflicts with the soft-delete pattern (left_at column).
-- The partial unique index idx_team_members_active already exists from 20260415071312.
-- This migration drops the old constraint and enforces joined_at NOT NULL.

-- 1. Drop the old full unique constraint that blocks re-joining after leaving
ALTER TABLE team_members DROP CONSTRAINT IF EXISTS team_members_team_id_student_id_key;

-- 2. Enforce NOT NULL on joined_at (design doc: NOT NULL, default now())
ALTER TABLE team_members ALTER COLUMN joined_at SET NOT NULL;

-- 3. Ensure partial unique index exists (idempotent, already created in 20260415071312)
CREATE UNIQUE INDEX IF NOT EXISTS idx_team_members_active
  ON team_members (team_id, student_id) WHERE left_at IS NULL;

-- 4. Ensure student active lookup index exists (idempotent)
CREATE INDEX IF NOT EXISTS idx_team_members_student_active
  ON team_members (student_id) WHERE left_at IS NULL;;
