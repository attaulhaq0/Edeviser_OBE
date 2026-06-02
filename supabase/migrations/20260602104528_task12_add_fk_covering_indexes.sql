-- Task 12 (Req 10.4): add covering indexes for unindexed foreign keys.
-- assignments_rubric_id_fkey -> assignments(rubric_id); quiz_clos_clo_id_fkey -> quiz_clos(clo_id).
CREATE INDEX IF NOT EXISTS idx_assignments_rubric_id ON public.assignments USING btree (rubric_id);
CREATE INDEX IF NOT EXISTS idx_quiz_clos_clo_id ON public.quiz_clos USING btree (clo_id);;
