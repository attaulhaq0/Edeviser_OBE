-- Add expires_at column to replacement_votes for vote expiry tracking
-- Existing rows get a default of 7 days from created_at

ALTER TABLE replacement_votes
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

-- Backfill existing rows: set expires_at to 7 days after created_at
UPDATE replacement_votes
  SET expires_at = created_at + INTERVAL '7 days'
  WHERE expires_at IS NULL;

-- Now make it NOT NULL
ALTER TABLE replacement_votes
  ALTER COLUMN expires_at SET NOT NULL;;
