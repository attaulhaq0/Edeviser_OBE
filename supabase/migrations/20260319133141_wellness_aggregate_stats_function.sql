CREATE OR REPLACE FUNCTION get_wellness_aggregate_stats(p_institution_id uuid)
RETURNS TABLE (
  wellness_type text,
  total_logs bigint,
  unique_students bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    whl.wellness_type::text,
    COUNT(*)::bigint AS total_logs,
    COUNT(DISTINCT whl.student_id)::bigint AS unique_students
  FROM wellness_habit_logs whl
  JOIN profiles p ON p.id = whl.student_id
  WHERE p.institution_id = p_institution_id
  GROUP BY whl.wellness_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;;
