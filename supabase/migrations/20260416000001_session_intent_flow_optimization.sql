-- =============================================================================
-- Session Intent & Flow Optimization — Database Schema
-- =============================================================================

-- Enums
DO $$ BEGIN
  CREATE TYPE flow_response_type AS ENUM ('in_the_zone', 'stuck', 'too_easy');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE review_status_type AS ENUM ('pending', 'completed', 'skipped');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE reflection_type_enum AS ENUM ('session_reflection', 'journal_entry');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE reflection_template_type AS ENUM ('free_form', 'simple', 'gibbs');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE quality_category_type AS ENUM ('thoughtful', 'good_effort', 'needs_detail');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- session_intents
-- =============================================================================
CREATE TABLE IF NOT EXISTS session_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL UNIQUE REFERENCES study_sessions(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  concept varchar(200) NOT NULL,
  success_criterion varchar(200) NOT NULL,
  is_auto_suggested boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_session_intents_session ON session_intents(session_id);

-- RLS
ALTER TABLE session_intents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "student_read_own_intents" ON session_intents
  FOR SELECT TO authenticated
  USING (student_id = auth.uid());

CREATE POLICY "student_insert_own_intents" ON session_intents
  FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid() AND auth_user_role() = 'student');

-- =============================================================================
-- flow_check_ins
-- =============================================================================
CREATE TABLE IF NOT EXISTS flow_check_ins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES study_sessions(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  interval_number integer NOT NULL CHECK (interval_number >= 1),
  response flow_response_type NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, interval_number)
);

CREATE INDEX IF NOT EXISTS idx_flow_check_ins_session ON flow_check_ins(session_id);

-- RLS
ALTER TABLE flow_check_ins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "student_read_own_check_ins" ON flow_check_ins
  FOR SELECT TO authenticated
  USING (student_id = auth.uid());

CREATE POLICY "student_insert_own_check_ins" ON flow_check_ins
  FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid() AND auth_user_role() = 'student');

-- =============================================================================
-- review_schedules
-- =============================================================================
CREATE TABLE IF NOT EXISTS review_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  clo_id uuid NOT NULL,
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  source_session_id uuid NOT NULL REFERENCES study_sessions(id) ON DELETE CASCADE,
  review_date date NOT NULL,
  interval_days integer NOT NULL CHECK (interval_days IN (1, 3, 7)),
  status review_status_type NOT NULL DEFAULT 'pending',
  review_session_id uuid REFERENCES study_sessions(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, clo_id, review_date, interval_days)
);

CREATE INDEX IF NOT EXISTS idx_review_schedules_student_date ON review_schedules(student_id, review_date);

-- RLS
ALTER TABLE review_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "student_manage_own_reviews" ON review_schedules
  FOR ALL TO authenticated
  USING (student_id = auth.uid() AND auth_user_role() = 'student')
  WITH CHECK (student_id = auth.uid() AND auth_user_role() = 'student');

CREATE POLICY "parent_read_linked_reviews" ON review_schedules
  FOR SELECT TO authenticated
  USING (
    auth_user_role() = 'parent'
    AND student_id IN (
      SELECT student_id FROM parent_student_links
      WHERE parent_id = auth.uid() AND verified = true
    )
  );

-- =============================================================================
-- reflection_digests
-- =============================================================================
CREATE TABLE IF NOT EXISTS reflection_digests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  month date NOT NULL,
  themes jsonb NOT NULL DEFAULT '[]'::jsonb,
  growth_patterns jsonb NOT NULL DEFAULT '[]'::jsonb,
  emotional_trends jsonb NOT NULL DEFAULT '[]'::jsonb,
  suggested_focus jsonb NOT NULL DEFAULT '[]'::jsonb,
  shared_with jsonb NOT NULL DEFAULT '[]'::jsonb,
  generated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, month)
);

-- RLS
ALTER TABLE reflection_digests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "student_read_own_digests" ON reflection_digests
  FOR SELECT TO authenticated
  USING (student_id = auth.uid());

CREATE POLICY "student_update_sharing" ON reflection_digests
  FOR UPDATE TO authenticated
  USING (student_id = auth.uid() AND auth_user_role() = 'student')
  WITH CHECK (student_id = auth.uid() AND auth_user_role() = 'student');

CREATE POLICY "parent_read_shared_digests" ON reflection_digests
  FOR SELECT TO authenticated
  USING (
    auth_user_role() = 'parent'
    AND student_id IN (
      SELECT student_id FROM parent_student_links
      WHERE parent_id = auth.uid() AND verified = true
    )
    AND shared_with @> jsonb_build_array(jsonb_build_object('role', 'parent', 'user_id', auth.uid()::text))
  );

CREATE POLICY "teacher_read_shared_digests" ON reflection_digests
  FOR SELECT TO authenticated
  USING (
    auth_user_role() = 'teacher'
    AND shared_with @> jsonb_build_array(jsonb_build_object('role', 'advisor', 'user_id', auth.uid()::text))
  );

-- =============================================================================
-- reflection_quality_scores
-- =============================================================================
CREATE TABLE IF NOT EXISTS reflection_quality_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reflection_id uuid NOT NULL,
  reflection_type reflection_type_enum NOT NULL,
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  score integer NOT NULL CHECK (score >= 0 AND score <= 100),
  originality_score integer NOT NULL CHECK (originality_score >= 0 AND originality_score <= 100),
  relevance_score integer NOT NULL CHECK (relevance_score >= 0 AND relevance_score <= 100),
  depth_score integer NOT NULL CHECK (depth_score >= 0 AND depth_score <= 100),
  flags text[] NOT NULL DEFAULT '{}',
  scored_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quality_scores_reflection ON reflection_quality_scores(reflection_id, reflection_type);
CREATE INDEX IF NOT EXISTS idx_quality_scores_student ON reflection_quality_scores(student_id);

-- RLS
ALTER TABLE reflection_quality_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "student_read_own_scores" ON reflection_quality_scores
  FOR SELECT TO authenticated
  USING (student_id = auth.uid());

-- Service role INSERT only (Edge Function uses service role key)
