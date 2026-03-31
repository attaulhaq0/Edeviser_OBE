-- Task 109.1: Sub-CLO database migration
-- Adds weight column, updates type constraint, creates validation trigger

-- 1. Add weight column to learning_outcomes
ALTER TABLE learning_outcomes
  ADD COLUMN IF NOT EXISTS weight numeric DEFAULT 1.0
  CHECK (weight > 0 AND weight <= 1.0);

-- 2. Update type check constraint to include SUB_CLO
ALTER TABLE learning_outcomes
  DROP CONSTRAINT IF EXISTS learning_outcomes_type_check;

ALTER TABLE learning_outcomes
  ADD CONSTRAINT learning_outcomes_type_check
  CHECK (type IN ('ILO', 'PLO', 'CLO', 'SUB_CLO'));

-- 3. Create trigger function to validate Sub-CLO parent is a CLO
CREATE OR REPLACE FUNCTION validate_sub_clo_weights()
RETURNS trigger AS $$
DECLARE
  parent_type text;
BEGIN
  -- Only validate SUB_CLO records
  IF NEW.type != 'SUB_CLO' THEN
    RETURN NEW;
  END IF;

  -- Ensure parent_outcome_id is set
  IF NEW.parent_outcome_id IS NULL THEN
    RAISE EXCEPTION 'Sub-CLO must have a parent_outcome_id';
  END IF;

  -- Ensure parent is a CLO
  SELECT type INTO parent_type
  FROM learning_outcomes
  WHERE id = NEW.parent_outcome_id;

  IF parent_type IS NULL THEN
    RAISE EXCEPTION 'Parent outcome not found';
  END IF;

  IF parent_type != 'CLO' THEN
    RAISE EXCEPTION 'Sub-CLO parent must be a CLO, got %', parent_type;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger on learning_outcomes
DROP TRIGGER IF EXISTS trg_validate_sub_clo ON learning_outcomes;

CREATE TRIGGER trg_validate_sub_clo
  BEFORE INSERT OR UPDATE ON learning_outcomes
  FOR EACH ROW
  EXECUTE FUNCTION validate_sub_clo_weights();
