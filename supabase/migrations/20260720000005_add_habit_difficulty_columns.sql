-- Task 145.1: Habit Difficulty Level columns on student_gamification
ALTER TABLE student_gamification
  ADD COLUMN IF NOT EXISTS habit_difficulty_level integer NOT NULL DEFAULT 1
    CHECK (habit_difficulty_level IN (1, 2, 3)),
  ADD COLUMN IF NOT EXISTS habit_level_streak integer NOT NULL DEFAULT 0
    CHECK (habit_level_streak >= 0);
