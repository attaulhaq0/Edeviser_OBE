-- L3-4 Fix: Add unique constraint on evidence to prevent duplicates
-- First, remove duplicates (keep the oldest row per combo)
DELETE FROM evidence
WHERE id NOT IN (
  SELECT DISTINCT ON (student_id, submission_id, clo_id) id
  FROM evidence
  ORDER BY student_id, submission_id, clo_id, created_at ASC
);

-- Now add the unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_evidence_unique_student_submission_clo
ON evidence (student_id, submission_id, clo_id);;
