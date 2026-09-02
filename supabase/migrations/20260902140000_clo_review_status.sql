-- T18 (E2.B) Curriculum Studio: CLO review workflow (draft → in_review → confirmed).
-- Mirror of the migration applied to the live project via MCP (verified against
-- pg_catalog: columns + partial index below match the live definitions exactly).
-- Guarded (IF NOT EXISTS) so replay on Preview/fresh environments is idempotent.

ALTER TABLE public.learning_outcomes
  ADD COLUMN IF NOT EXISTS review_status text NOT NULL DEFAULT 'draft'::text;
ALTER TABLE public.learning_outcomes
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;
ALTER TABLE public.learning_outcomes
  ADD COLUMN IF NOT EXISTS reviewed_by uuid;

CREATE INDEX IF NOT EXISTS idx_learning_outcomes_confirmed_by_course
  ON public.learning_outcomes USING btree (course_id)
  WHERE ((type = 'CLO'::outcome_type) AND (review_status = 'confirmed'::text));
