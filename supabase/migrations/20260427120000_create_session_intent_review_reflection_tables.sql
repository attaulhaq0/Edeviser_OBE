-- =============================================================================
-- Task 16: Session Intent, Flow Check-ins, Spaced Repetition,
-- Reflection Digests, Reflection Quality Scores
-- Spec: weekly-planner-today-view (Tasks 16.1–16.11)
-- =============================================================================

-- ─── Enums ───────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE flow_response_type AS ENUM ('in_the_zone', 'stuck', 'too_easy');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE review_status_type AS ENUM ('pending', 'completed', 'skipped');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE reflection_type_enum AS ENUM ('session_reflection', 'journal_entry');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE reflection_template_type AS ENUM ('free_form', 'simple', 'gibbs');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE quality_category_type AS ENUM ('thoughtful', 'good_effort', 'needs_detail');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── session_intents (Task 16.2) ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS session_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES study_sessions(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  concept text NOT NULL,
  success_criterion text NOT NULL,
  is_auto_suggested boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(session_id)
);

CREATE INDEX IF NOT EXISTS idx_session_intents_student ON session_intents(student_id);

ALTER TABLE session_intents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "session_intents_student_select" ON session_intents
  FOR SELECT TO authenticated
  USING (student_id = (select auth.uid()));

CREATE POLICY "session_intents_student_insert" ON session_intents
  FOR INSERT TO authenticated
  WITH CHECK (student_id = (select auth.uid()));

-- ─── flow_check_ins (Task 16.3) ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS flow_check_ins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES study_sessions(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  interval_number int NOT NULL CHECK (interval_number >= 1),
  response flow_response_type NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(session_id, interval_number)
);

CREATE INDEX IF NOT EXISTS idx_flow_check_ins_student ON flow_check_ins(student_id);

ALTER TABLE flow_check_ins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "flow_check_ins_student_select" ON flow_check_ins
  FOR SELECT TO authenticated
  USING (student_id = (select auth.uid()));

CREATE POLICY "flow_check_ins_student_insert" ON flow_check_ins
  FOR INSERT TO authenticated
  WITH CHECK (student_id = (select auth.uid()));

-- ─── review_schedules (Task 16.4) ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS review_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  clo_id uuid NOT NULL,
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE,
  source_session_id uuid REFERENCES study_sessions(id) ON DELETE SET NULL,
  review_date date NOT NULL,
  interval_days int NOT NULL CHECK (interval_days IN (1, 3, 7)),
  status review_status_type NOT NULL DEFAULT 'pending',
  review_session_id uuid REFERENCES study_sessions(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(student_id, clo_id, review_date, interval_days)
);

CREATE INDEX IF NOT EXISTS idx_review_schedules_student_date
  ON review_schedules(student_id, review_date);
CREATE INDEX IF NOT EXISTS idx_review_schedules_status
  ON review_schedules(student_id, status);

ALTER TABLE review_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "review_schedules_student_all" ON review_schedules
  FOR ALL TO authenticated
  USING (student_id = (select auth.uid()))
  WITH CHECK (student_id = (select auth.uid()));

CREATE POLICY "review_schedules_parent_select" ON review_schedules
  FOR SELECT TO authenticated
  USING (
    student_id IN (
      SELECT student_id FROM parent_student_links
      WHERE parent_id = (select auth.uid()) AND verified = true
    )
  );

-- ─── reflection_digests (Task 16.5) ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS reflection_digests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  month text NOT NULL,
  themes jsonb NOT NULL DEFAULT '[]'::jsonb,
  growth_patterns jsonb NOT NULL DEFAULT '[]'::jsonb,
  emotional_trends jsonb NOT NULL DEFAULT '[]'::jsonb,
  suggested_focus jsonb NOT NULL DEFAULT '[]'::jsonb,
  shared_with jsonb NOT NULL DEFAULT '[]'::jsonb,
  generated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(student_id, month)
);

CREATE INDEX IF NOT EXISTS idx_reflection_digests_student
  ON reflection_digests(student_id, month);

ALTER TABLE reflection_digests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reflection_digests_student_select" ON reflection_digests
  FOR SELECT TO authenticated
  USING (student_id = (select auth.uid()));

CREATE POLICY "reflection_digests_student_update" ON reflection_digests
  FOR UPDATE TO authenticated
  USING (student_id = (select auth.uid()))
  WITH CHECK (student_id = (select auth.uid()));

CREATE POLICY "reflection_digests_parent_select" ON reflection_digests
  FOR SELECT TO authenticated
  USING (
    student_id IN (
      SELECT student_id FROM parent_student_links
      WHERE parent_id = (select auth.uid()) AND verified = true
    )
    AND shared_with @> '[{"role": "parent"}]'::jsonb
  );

CREATE POLICY "reflection_digests_teacher_select" ON reflection_digests
  FOR SELECT TO authenticated
  USING (
    shared_with @> '[{"role": "teacher"}]'::jsonb
    AND student_id IN (
      SELECT sc.student_id FROM student_courses sc
      JOIN courses c ON c.id = sc.course_id
      WHERE c.teacher_id = (select auth.uid())
    )
  );

-- ─── reflection_quality_scores (Task 16.6) ───────────────────────────────────

CREATE TABLE IF NOT EXISTS reflection_quality_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reflection_id uuid NOT NULL,
  reflection_type reflection_type_enum NOT NULL,
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  score int NOT NULL CHECK (score >= 0 AND score <= 100),
  originality_score int NOT NULL CHECK (originality_score >= 0 AND originality_score <= 100),
  relevance_score int NOT NULL CHECK (relevance_score >= 0 AND relevance_score <= 100),
  depth_score int NOT NULL CHECK (depth_score >= 0 AND depth_score <= 100),
  flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  scored_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reflection_quality_reflection
  ON reflection_quality_scores(reflection_id, reflection_type);
CREATE INDEX IF NOT EXISTS idx_reflection_quality_student
  ON reflection_quality_scores(student_id);

ALTER TABLE reflection_quality_scores ENABLE ROW LEVEL SECURITY;

-- Students may only SELECT their own scores. INSERT/UPDATE only via service_role
-- (the score-reflection-quality Edge Function).
CREATE POLICY "reflection_quality_scores_student_select" ON reflection_quality_scores
  FOR SELECT TO authenticated
  USING (student_id = (select auth.uid()));

-- ─── Trigger: keep review_schedules.updated_at fresh ─────────────────────────

CREATE OR REPLACE FUNCTION trg_review_schedules_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS review_schedules_set_updated_at ON review_schedules;
CREATE TRIGGER review_schedules_set_updated_at
  BEFORE UPDATE ON review_schedules
  FOR EACH ROW EXECUTE FUNCTION trg_review_schedules_set_updated_at();
