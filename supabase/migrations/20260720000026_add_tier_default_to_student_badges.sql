-- ============================================================
-- Migration: Ensure tier column on badges (student_badges) has
-- proper default and NOT NULL constraint.
-- Task 17.1: Badge Progression — tier column
-- The tier column already exists from migration 20260720000006
-- but lacks a default value. This migration adds the default
-- and backfills existing NULL values.
-- ============================================================

-- Backfill existing NULL tier values to 'bronze'
UPDATE badges SET tier = 'bronze' WHERE tier IS NULL;

-- Set default for future inserts
ALTER TABLE badges ALTER COLUMN tier SET DEFAULT 'bronze';

-- Make NOT NULL now that all rows have a value
ALTER TABLE badges ALTER COLUMN tier SET NOT NULL;
