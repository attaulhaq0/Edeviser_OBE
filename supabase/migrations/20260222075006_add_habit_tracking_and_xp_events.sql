-- Habit Tracking table (Pillar 5/6: SRL + BJ Fogg)
-- Tracks 4 daily habits: login, submit, journal, read
CREATE TABLE public.habit_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id),
  habit_date date NOT NULL,
  login boolean NOT NULL DEFAULT false,
  submit boolean NOT NULL DEFAULT false,
  journal boolean NOT NULL DEFAULT false,
  read_content boolean NOT NULL DEFAULT false,
  is_perfect_day boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(student_id, habit_date)
);
ALTER TABLE public.habit_tracking ENABLE ROW LEVEL SECURITY;

-- Students can read/write their own habits
CREATE POLICY "habit_tracking_student_own" ON public.habit_tracking
  FOR ALL USING (student_id = auth.uid());

-- Teachers/admins can read for monitoring
CREATE POLICY "habit_tracking_staff_read" ON public.habit_tracking
  FOR SELECT USING (auth_user_role() IN ('teacher', 'coordinator', 'admin'));

-- XP Events table (Pillar 7: Hooked Model - Variable Rewards)
-- Defines bonus XP events like "Streak Bonus Weekend", mystery badges
CREATE TABLE public.xp_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid REFERENCES public.institutions(id),
  name text NOT NULL,
  description text,
  event_type text NOT NULL CHECK (event_type IN ('bonus_weekend', 'mystery_badge', 'first_attempt_bonus', 'perfect_day_bonus', 'custom')),
  xp_multiplier numeric NOT NULL DEFAULT 1.0,
  bonus_xp integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT false,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.xp_events ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read active events
CREATE POLICY "xp_events_read" ON public.xp_events
  FOR SELECT USING (is_active = true);

-- Admins can manage events
CREATE POLICY "xp_events_admin_write" ON public.xp_events
  FOR ALL USING (
    auth_user_role() = 'admin'
    AND (institution_id IS NULL OR institution_id = auth_institution_id())
  );

-- Learning Path Nodes table (Pillar 9: Flow Theory - Bloom's gated progression)
CREATE TABLE public.learning_path_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id),
  assignment_id uuid NOT NULL REFERENCES public.assignments(id),
  sort_order integer NOT NULL DEFAULT 0,
  prerequisite_node_id uuid REFERENCES public.learning_path_nodes(id),
  unlock_threshold numeric NOT NULL DEFAULT 0.0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.learning_path_nodes ENABLE ROW LEVEL SECURITY;

-- All course members can read path nodes
CREATE POLICY "learning_path_nodes_read" ON public.learning_path_nodes
  FOR SELECT USING (
    course_id IN (
      SELECT course_id FROM public.student_courses WHERE student_id = auth.uid()
      UNION
      SELECT id FROM public.courses WHERE teacher_id = auth.uid()
    )
  );

-- Teachers can manage path nodes for their courses
CREATE POLICY "learning_path_nodes_teacher_write" ON public.learning_path_nodes
  FOR ALL USING (
    auth_user_role() = 'teacher'
    AND course_id IN (SELECT id FROM public.courses WHERE teacher_id = auth.uid())
  );

-- Add notification_preferences to profiles for email opt-in (Pillar 6: BJ Fogg prompts)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notification_preferences jsonb NOT NULL DEFAULT '{"email_streak_risk": true, "email_grade_released": true, "email_weekly_summary": true, "email_new_assignment": true}'::jsonb;

-- Add leaderboard_anonymous to student_gamification for opt-out (Pillar 8: Octalysis Drive 5)
ALTER TABLE public.student_gamification
  ADD COLUMN IF NOT EXISTS leaderboard_anonymous boolean NOT NULL DEFAULT false;

-- Update xp_transactions source check to include new sources
ALTER TABLE public.xp_transactions DROP CONSTRAINT IF EXISTS xp_transactions_source_check;
ALTER TABLE public.xp_transactions ADD CONSTRAINT xp_transactions_source_check
  CHECK (source IN ('login', 'submission', 'grade', 'badge', 'streak', 'journal', 'perfect_day', 'first_attempt', 'bonus_event', 'admin_adjustment'));;
