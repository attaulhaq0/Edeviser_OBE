-- Task 1.6: Align challenge_progress table with design spec
-- The table already exists from prior migrations. This migration fixes
-- column constraints and removes legacy columns.

-- 1. Fix updated_at to be NOT NULL with default
ALTER TABLE challenge_progress ALTER COLUMN updated_at SET NOT NULL;
ALTER TABLE challenge_progress ALTER COLUMN updated_at SET DEFAULT now();

-- 2. Drop the FK constraint on participant_id (it references profiles.id but
-- per design spec participant_id is a plain uuid that can reference either
-- teams.id or profiles.id depending on participant_type)
DO $$ DECLARE
  fk_name text;
BEGIN
  SELECT conname INTO fk_name
  FROM pg_constraint
  WHERE conrelid = 'public.challenge_progress'::regclass
    AND contype = 'f'
    AND (SELECT attname FROM pg_attribute WHERE attrelid = conrelid AND attnum = conkey[1]) = 'participant_id';
  IF fk_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE challenge_progress DROP CONSTRAINT %I', fk_name);
  END IF;
END $$;

-- 3. Drop legacy columns not in design spec
ALTER TABLE challenge_progress DROP COLUMN IF EXISTS team_id;
ALTER TABLE challenge_progress DROP COLUMN IF EXISTS current_value;

-- 4. Ensure participant_type CHECK constraint exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.challenge_progress'::regclass
      AND conname = 'challenge_progress_participant_type_check'
  ) THEN
    ALTER TABLE challenge_progress ADD CONSTRAINT challenge_progress_participant_type_check
      CHECK (participant_type IN ('team', 'individual'));
  END IF;
END $$;

-- 5. Ensure unique constraint on (challenge_id, participant_id) exists
-- Already exists from prior migration as challenge_progress_challenge_id_participant_id_key

-- 6. Ensure leaderboard index exists (idempotent)
CREATE INDEX IF NOT EXISTS idx_challenge_progress_leaderboard ON challenge_progress (challenge_id, current_progress DESC);

-- RLS is already enabled from prior migrations;
