-- ============================================
-- Migration 6: Leaderboard Materialized View + Full-Text Search
-- ============================================

-- Leaderboard materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS leaderboard_weekly AS
SELECT
  sg.student_id,
  p.full_name,
  p.institution_id,
  sg.xp_total,
  sg.level,
  sg.streak_current,
  RANK() OVER (ORDER BY sg.xp_total DESC) AS global_rank
FROM student_gamification sg
JOIN profiles p ON p.id = sg.student_id
WHERE p.is_active = true
ORDER BY sg.xp_total DESC;

CREATE UNIQUE INDEX IF NOT EXISTS idx_leaderboard_weekly_student ON leaderboard_weekly(student_id);

-- Full-text search tsvector columns and GIN indexes
ALTER TABLE courses ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(name, '') || ' ' || coalesce(code, ''))) STORED;
CREATE INDEX IF NOT EXISTS idx_courses_search ON courses USING GIN(search_vector);

ALTER TABLE assignments ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, ''))) STORED;
CREATE INDEX IF NOT EXISTS idx_assignments_search ON assignments USING GIN(search_vector);

ALTER TABLE announcements ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, ''))) STORED;
CREATE INDEX IF NOT EXISTS idx_announcements_search ON announcements USING GIN(search_vector);

ALTER TABLE course_materials ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, ''))) STORED;
CREATE INDEX IF NOT EXISTS idx_materials_search ON course_materials USING GIN(search_vector);

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(full_name, '') || ' ' || coalesce(email, ''))) STORED;
CREATE INDEX IF NOT EXISTS idx_profiles_search ON profiles USING GIN(search_vector);
;
