-- E2.A (platform-hardening-and-integration): provenance flag for AI feedback.
-- ai_applied = any AI draft (criterion or overall) was applied to the saved
-- grade; ai_edited_by_teacher (existing) = the teacher then edited that text.
ALTER TABLE public.grades
  ADD COLUMN IF NOT EXISTS ai_applied boolean NOT NULL DEFAULT false;

-- Column-explicit grants exist on grades (reconcile-table-grants parity):
-- extend every column grant with the new column.
GRANT SELECT, INSERT, UPDATE, REFERENCES
  (id, submission_id, graded_by, rubric_selections, total_score, score_percent,
   overall_feedback, graded_at, is_released, ai_edited_by_teacher, ai_applied)
  ON public.grades TO anon, authenticated, service_role;
