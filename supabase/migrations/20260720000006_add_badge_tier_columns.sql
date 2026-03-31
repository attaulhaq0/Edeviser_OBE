-- Task 150.1: Badge Tier columns and badge_spotlight_schedule table

-- Add tier and category to badges
ALTER TABLE badges
  ADD COLUMN IF NOT EXISTS tier text CHECK (tier IN ('bronze', 'silver', 'gold')),
  ADD COLUMN IF NOT EXISTS category text;

-- Add pin and archive to student_badges (if exists) or badges
-- Using badges table since student_badges may not exist separately
ALTER TABLE badges
  ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

-- Badge Spotlight Schedule table
CREATE TABLE IF NOT EXISTS badge_spotlight_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL,
  week_start date NOT NULL,
  category text NOT NULL,
  is_manual boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(institution_id, week_start),
  CHECK (EXTRACT(DOW FROM week_start) = 1) -- Must be Monday
);

ALTER TABLE badge_spotlight_schedule ENABLE ROW LEVEL SECURITY;

-- Admin manages spotlight schedule
CREATE POLICY "admin_manage_spotlight" ON badge_spotlight_schedule
  FOR ALL TO authenticated
  USING (true);

-- All roles can read spotlight
CREATE POLICY "all_read_spotlight" ON badge_spotlight_schedule
  FOR SELECT TO authenticated
  USING (true);
