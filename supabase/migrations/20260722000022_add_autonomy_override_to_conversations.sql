-- Add autonomy_override column to tutor_conversations table
-- Students can toggle between L1 (figure it out) and L3 (just explain it)
-- NULL means no override — use teacher-configured level
ALTER TABLE tutor_conversations
  ADD COLUMN IF NOT EXISTS autonomy_override VARCHAR(2)
  CHECK (autonomy_override IN ('L1', 'L3'));
