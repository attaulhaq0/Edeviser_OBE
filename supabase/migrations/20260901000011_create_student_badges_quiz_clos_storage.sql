-- Migration: Create remaining phantom tables and storage buckets
-- Fixes: student_badges, quiz_clos, reports bucket, transcripts bucket

-- ============================================================================
-- 1. student_badges — tracks which badges each student has earned
-- Used by: check-badges edge function (insert/select by student_id + badge_id)
-- badge_id stores the badge_key slug (e.g. "streak_7", "self_aware_scholar")
-- matching badge_definitions.badge_key — NOT a UUID FK
-- Different from legacy `badges` table which stores badge metadata inline
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.student_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_id text NOT NULL,
  awarded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(student_id, badge_id)
);

ALTER TABLE public.student_badges ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_student_badges_student
  ON public.student_badges (student_id);

CREATE INDEX IF NOT EXISTS idx_student_badges_badge
  ON public.student_badges (badge_id);

CREATE POLICY "student_badges_select"
  ON public.student_badges FOR SELECT TO authenticated
  USING (
    student_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role IN ('admin', 'teacher', 'coordinator')
    )
  );

CREATE POLICY "student_badges_insert"
  ON public.student_badges FOR INSERT TO authenticated
  WITH CHECK (true);

-- ============================================================================
-- 2. quiz_clos — junction table linking quizzes to CLOs
-- Used by: select-adaptive-question edge function (select clo_id by quiz_id)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.quiz_clos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  clo_id uuid NOT NULL REFERENCES public.learning_outcomes(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(quiz_id, clo_id)
);

ALTER TABLE public.quiz_clos ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_quiz_clos_quiz
  ON public.quiz_clos (quiz_id);

CREATE POLICY "quiz_clos_select"
  ON public.quiz_clos FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "quiz_clos_insert"
  ON public.quiz_clos FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "quiz_clos_delete"
  ON public.quiz_clos FOR DELETE TO authenticated
  USING (true);

-- ============================================================================
-- 3. Storage bucket: reports (for generated course files / accreditation PDFs)
-- Used by: generate-course-file, generate-accreditation-report edge functions
-- Note: edge functions also auto-create bucket on first use as fallback
-- ============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('reports', 'reports', false)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 4. Storage bucket: transcripts (for generated student transcript PDFs)
-- Used by: generate-transcript edge function
-- ============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('transcripts', 'transcripts', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for reports bucket
CREATE POLICY "reports_admin_upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'reports'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role IN ('admin', 'coordinator')
    )
  );

CREATE POLICY "reports_admin_read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'reports'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role IN ('admin', 'coordinator', 'teacher')
    )
  );

-- Storage policies for transcripts bucket
CREATE POLICY "transcripts_admin_upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'transcripts'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role IN ('admin', 'coordinator')
    )
  );

CREATE POLICY "transcripts_read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'transcripts'
    AND (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = (select auth.uid()) AND role IN ('admin', 'coordinator', 'teacher')
      )
      OR (select auth.uid())::text = (storage.foldername(name))[1]
    )
  );
