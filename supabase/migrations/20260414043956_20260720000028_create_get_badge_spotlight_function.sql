-- ============================================================
-- Migration: get_badge_spotlight PL/pgSQL function
-- Task 17.3: Deterministic badge rotation per student per week.
-- Returns a badge_definition_id using:
--   hash(student_id + week_number) mod count of eligible badges
-- Eligible = non-archived badges the student hasn't fully earned
-- (gold tier).
-- ============================================================

CREATE OR REPLACE FUNCTION get_badge_spotlight(
  p_student_id UUID,
  p_week_number INTEGER
)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  WITH eligible_badges AS (
    SELECT bd.id,
      ROW_NUMBER() OVER (ORDER BY bd.created_at) AS rn
    FROM badge_definitions bd
    WHERE bd.is_archived = false
      AND bd.id NOT IN (
        SELECT b.badge_key::uuid
        FROM badges b
        WHERE b.student_id = p_student_id
          AND b.tier = 'gold'
      )
  ),
  total AS (
    SELECT COUNT(*) AS cnt FROM eligible_badges
  )
  SELECT eb.id
  FROM eligible_badges eb, total t
  WHERE t.cnt > 0
    AND eb.rn = (
      (('x' || substr(md5(p_student_id::text || p_week_number::text), 1, 8))::bit(32)::int
       % t.cnt) + 1
    );
$$;;
