-- E2.E (T21): server-side attendance percentages + idempotent marking RPC.
-- 1) attendance_summary_v1: per (section, student) counts + percentage.
--    Formula mirrors the previous client calc exactly (Req 78.3):
--    round(((present + late) / total_sessions) * 100), NULL when no sessions.
--    security_invoker = true so underlying RLS scopes every row.
-- 2) record_attendance_v1: bulk upsert keyed on (session_id, student_id);
--    marked_by is set server-side to auth.uid(); returns recomputed
--    percentages read back from the view (single source of truth).
--
-- NOTE: applied to production via Supabase MCP
-- (migration: attendance_summary_view_and_record_rpc). This file is the
-- repo parity mirror for db:check-replay — do not edit independently.

CREATE OR REPLACE VIEW public.attendance_summary_v1
WITH (security_invoker = true) AS
SELECT
  e.section_id,
  e.course_id,
  e.student_id,
  prof.full_name AS student_name,
  COUNT(cs.id) AS total_sessions,
  COUNT(cs.id) FILTER (WHERE ar.status = 'present') AS present_count,
  COUNT(cs.id) FILTER (WHERE ar.status = 'late') AS late_count,
  COUNT(cs.id) FILTER (WHERE ar.status = 'absent') AS absent_count,
  COUNT(cs.id) FILTER (WHERE ar.status = 'excused') AS excused_count,
  CASE
    WHEN COUNT(cs.id) = 0 THEN NULL::numeric
    ELSE ROUND(
      (
        (COUNT(cs.id) FILTER (WHERE ar.status = 'present'))
        + (COUNT(cs.id) FILTER (WHERE ar.status = 'late'))
      )::numeric * 100 / COUNT(cs.id)
    )
  END AS attendance_pct,
  CASE
    WHEN COUNT(cs.id) = 0 THEN false
    ELSE ROUND(
      (
        (COUNT(cs.id) FILTER (WHERE ar.status = 'present'))
        + (COUNT(cs.id) FILTER (WHERE ar.status = 'late'))
      )::numeric * 100 / COUNT(cs.id)
    ) < 75
  END AS below_threshold
FROM student_courses e
JOIN profiles prof ON prof.id = e.student_id
JOIN class_sessions cs ON cs.section_id = e.section_id
LEFT JOIN attendance_records ar
  ON ar.session_id = cs.id AND ar.student_id = e.student_id
WHERE e.status = 'active' AND e.section_id IS NOT NULL
GROUP BY e.section_id, e.course_id, e.student_id, prof.full_name;

CREATE OR REPLACE FUNCTION public.record_attendance_v1(
  p_session_id uuid,
  p_records jsonb
)
RETURNS TABLE (student_id uuid, attendance_pct numeric)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_section_id uuid;
BEGIN
  SELECT section_id INTO v_section_id
  FROM class_sessions
  WHERE id = p_session_id;

  IF v_section_id IS NULL THEN
    RAISE EXCEPTION 'Session % not found', p_session_id;
  END IF;

  -- Idempotent bulk upsert; marked_by is always the authenticated teacher.
  -- RLS (attendance_teacher_manage) enforces section ownership per row.
  INSERT INTO attendance_records (session_id, student_id, status, marked_by)
  SELECT
    p_session_id,
    (rec->>'student_id')::uuid,
    rec->>'status',
    auth.uid()
  FROM jsonb_array_elements(p_records) AS rec
  ON CONFLICT (session_id, student_id)
  DO UPDATE SET status = EXCLUDED.status, marked_by = EXCLUDED.marked_by;

  -- Server-computed percentages read back from the summary view.
  RETURN QUERY
  SELECT v.student_id, v.attendance_pct
  FROM attendance_summary_v1 v
  WHERE v.section_id = v_section_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_attendance_v1(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_attendance_v1(uuid, jsonb) TO authenticated;