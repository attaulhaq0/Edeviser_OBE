-- Migration: Create tables referenced in code but missing from schema
-- Fixes: student_habit_levels, student_habit_level_history, team_gamification
-- Also: adds missing avatar_letter column to teams

-- ============================================================================
-- 1. student_habit_levels — tracks each student's current habit difficulty level
-- Used by: useStudentHabitLevel.ts (line 20)
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
-- 2. student_habit_level_history — audit trail of level changes
-- Used by: useStudentHabitLevel.ts (line 49), useHeatmapData.ts (line 230)
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
-- 3. team_gamification — per-team XP / streak aggregates
-- Used by: useTeams.ts (line 132, useTeamGamification hook)
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
-- 4. Add missing avatar_letter column to teams table
-- Used by: useTeams.ts (line 176, useAutoGenerateTeams)
-- ============================================================================
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS avatar_letter text DEFAULT '';

-- ============================================================================
-- 5. Trigger: auto-insert level history row when student_habit_levels changes
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_track_habit_level_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
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
