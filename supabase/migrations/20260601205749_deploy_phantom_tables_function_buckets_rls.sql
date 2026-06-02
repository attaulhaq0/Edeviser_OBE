-- Forward additive migration (migration-history-reconciliation Task 3)
-- Mirrors local 20260901000010 + 20260901000011 EXACTLY, with one hardening change:
--   fn_track_habit_level_change deployed SECURITY DEFINER + SET search_path = '' (public.-qualified body)
-- No destructive operations. All CREATE ... IF NOT EXISTS / ON CONFLICT DO NOTHING.

-- ============================================================================
-- 1. student_habit_levels
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.student_habit_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  current_level integer NOT NULL DEFAULT 4
    CHECK (current_level >= 1 AND current_level <= 4),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(student_id)
);

ALTER TABLE public.student_habit_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "student_habit_levels_select"
  ON public.student_habit_levels FOR SELECT TO authenticated
  USING (
    student_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role IN ('admin', 'teacher', 'coordinator')
    )
  );

CREATE POLICY "student_habit_levels_insert"
  ON public.student_habit_levels FOR INSERT TO authenticated
  WITH CHECK (student_id = (select auth.uid()));

CREATE POLICY "student_habit_levels_update"
  ON public.student_habit_levels FOR UPDATE TO authenticated
  USING (student_id = (select auth.uid()));

-- ============================================================================
-- 2. student_habit_level_history
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.student_habit_level_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  new_level integer NOT NULL CHECK (new_level >= 1 AND new_level <= 4),
  previous_level integer CHECK (previous_level >= 1 AND previous_level <= 4),
  changed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.student_habit_level_history ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_student_habit_level_history_student
  ON public.student_habit_level_history (student_id, changed_at);

CREATE POLICY "student_habit_level_history_select"
  ON public.student_habit_level_history FOR SELECT TO authenticated
  USING (
    student_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role IN ('admin', 'teacher', 'coordinator')
    )
  );

CREATE POLICY "student_habit_level_history_insert"
  ON public.student_habit_level_history FOR INSERT TO authenticated
  WITH CHECK (student_id = (select auth.uid()));

-- ============================================================================
-- 3. team_gamification
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.team_gamification (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  xp_total integer NOT NULL DEFAULT 0,
  xp_this_week integer NOT NULL DEFAULT 0,
  streak_current integer NOT NULL DEFAULT 0,
  streak_longest integer NOT NULL DEFAULT 0,
  last_streak_date text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(team_id)
);

ALTER TABLE public.team_gamification ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_team_gamification_team
  ON public.team_gamification (team_id);

CREATE POLICY "team_gamification_select"
  ON public.team_gamification FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "team_gamification_insert"
  ON public.team_gamification FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "team_gamification_update"
  ON public.team_gamification FOR UPDATE TO authenticated
  USING (true);

-- ============================================================================
-- 4. teams.avatar_letter (already present on live; IF NOT EXISTS no-op for parity)
-- ============================================================================
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS avatar_letter text DEFAULT '';

-- ============================================================================
-- 5. student_badges
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
-- 6. quiz_clos
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
-- 7. Trigger function fn_track_habit_level_change (HARDENED: search_path = '')
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_track_habit_level_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.current_level IS DISTINCT FROM NEW.current_level THEN
    INSERT INTO public.student_habit_level_history
      (student_id, new_level, previous_level, changed_at)
    VALUES
      (NEW.student_id, NEW.current_level, OLD.current_level, now());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_track_habit_level_change ON public.student_habit_levels;
CREATE TRIGGER trg_track_habit_level_change
  AFTER UPDATE ON public.student_habit_levels
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_track_habit_level_change();

-- ============================================================================
-- 8. Storage buckets: reports + transcripts (private) + RLS policies
-- ============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('reports', 'reports', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('transcripts', 'transcripts', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "reports_bucket_admin_upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'reports'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role IN ('admin', 'coordinator')
    )
  );

CREATE POLICY "reports_bucket_admin_read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'reports'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role IN ('admin', 'coordinator', 'teacher')
    )
  );

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
;
