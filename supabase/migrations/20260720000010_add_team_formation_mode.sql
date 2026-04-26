-- Task 1.1: Add team_formation_mode column to courses table
ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS team_formation_mode text NOT NULL DEFAULT 'teacher_assigned'
    CHECK (team_formation_mode IN ('teacher_assigned', 'student_formed'));

COMMENT ON COLUMN courses.team_formation_mode IS 'Controls how teams are created: teacher_assigned (only teacher) or student_formed (students can create/invite)';
