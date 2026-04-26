-- Add tutor_autonomy_level column to assignments table
-- L1 = hints only, L2 = guided discovery, L3 = direct explanation
-- Default L1 for graded assignments (most restrictive)
ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS tutor_autonomy_level VARCHAR(2) DEFAULT 'L1'
  CHECK (tutor_autonomy_level IN ('L1', 'L2', 'L3'));
