-- E2.A (platform-hardening-and-integration): distinguish teacher-EDITED AI
-- feedback from accepted-as-is AI drafts on saved grades. The flag is set by
-- the grading client when a teacher confirms an edit to an AI-generated
-- criterion draft (or modifies AI-applied feedback) before submitting.

ALTER TABLE public.grades
  ADD COLUMN IF NOT EXISTS ai_edited_by_teacher boolean NOT NULL DEFAULT false;

-- Column-explicit grants exist on grades (reconcile-table-grants parity):
-- extend every column grant with the new column.
GRANT SELECT, INSERT, UPDATE, REFERENCES
  (id, submission_id, graded_by, rubric_selections, total_score, score_percent,
   overall_feedback, graded_at, is_released, ai_edited_by_teacher)
  ON public.grades TO anon, authenticated, service_role;
