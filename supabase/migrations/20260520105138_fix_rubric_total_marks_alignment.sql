-- L13-1 Fix: Align rubric criteria max_points with assignment total_marks
-- Strategy: Update assignment.total_marks to match the rubric sum (the rubric is the source of truth for grading)
-- This way teachers grade against the rubric and the math works out
UPDATE assignments a
SET total_marks = sub.rubric_total
FROM (
  SELECT a.id, COALESCE(SUM(rc.max_points), 0) as rubric_total
  FROM assignments a
  JOIN rubrics r ON r.clo_id IN (
    SELECT (elem->>'clo_id')::uuid
    FROM jsonb_array_elements(a.clo_weights) elem
  )
  JOIN rubric_criteria rc ON rc.rubric_id = r.id
  GROUP BY a.id
  HAVING COALESCE(SUM(rc.max_points), 0) > 0
    AND COALESCE(SUM(rc.max_points), 0) != a.total_marks
) sub
WHERE a.id = sub.id;;
