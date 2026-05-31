-- L8-1 Fix v2: Correct indexes (no parent_outcome_id column on learning_outcomes)
CREATE INDEX IF NOT EXISTS idx_learning_outcomes_course_type
  ON learning_outcomes (course_id, type) WHERE course_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_learning_outcomes_program_type
  ON learning_outcomes (program_id, type) WHERE program_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_learning_outcomes_institution_type
  ON learning_outcomes (institution_id, type) WHERE institution_id IS NOT NULL;

-- outcome_mappings target+source composite (used in cascade joins)
CREATE INDEX IF NOT EXISTS idx_outcome_mappings_target_source
  ON outcome_mappings (target_outcome_id, source_outcome_id);;
