-- Add team_formation_mode column to courses table
-- Controls how teams are created: teacher_assigned (default) or student_formed
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS team_formation_mode text NOT NULL DEFAULT 'teacher_assigned'
    CHECK (team_formation_mode IN ('teacher_assigned', 'student_formed'));;
