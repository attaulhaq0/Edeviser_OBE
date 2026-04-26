-- Add autonomy_level and nudge_type columns to tutor_messages table
-- autonomy_level: the resolved autonomy level used for this message
-- nudge_type: type of nudge injected (e.g., 'independence', 'handoff')
ALTER TABLE tutor_messages
  ADD COLUMN IF NOT EXISTS autonomy_level VARCHAR(2)
  CHECK (autonomy_level IN ('L1', 'L2', 'L3'));

ALTER TABLE tutor_messages
  ADD COLUMN IF NOT EXISTS nudge_type VARCHAR(30);
