-- Enforce NOT NULL constraints on teams.institution_id and teams.captain_id
-- per design doc: both columns are required (NOT NULL)
-- The table and all other columns/indexes already exist from prior migrations.

-- Set NOT NULL on institution_id
ALTER TABLE teams ALTER COLUMN institution_id SET NOT NULL;

-- Set NOT NULL on captain_id
ALTER TABLE teams ALTER COLUMN captain_id SET NOT NULL;;
