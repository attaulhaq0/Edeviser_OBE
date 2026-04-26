-- Add tutor_autonomy_level column to clos table
-- L1 = hints only, L2 = guided discovery, L3 = direct explanation
-- Default L2 for CLOs (moderate scaffolding)
ALTER TABLE clos
  ADD COLUMN IF NOT EXISTS tutor_autonomy_level VARCHAR(2) DEFAULT 'L2'
  CHECK (tutor_autonomy_level IN ('L1', 'L2', 'L3'));
