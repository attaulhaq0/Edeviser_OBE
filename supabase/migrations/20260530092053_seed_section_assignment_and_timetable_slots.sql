-- =============================================================================
-- SEED MIGRATION: section assignment + timetable slots (R13.1, R13.4)
-- Student Experience Remediation, task 3.3.
--
-- (a) Defensive assignment mechanism: ensure every active enrollment has a
--     section_id by round-robin distributing any unassigned enrollment across
--     its course's active sections. Idempotent (only touches NULL section_id).
-- (b) Seed timetable_slots for every section that has enrolled students, using
--     a deterministic, globally clash-free weekly schedule so no student ever
--     sees two classes in the same (day, hour) cell. Idempotent via the
--     existing UNIQUE (section_id, day_of_week, start_time) constraint.
--
-- Schedule labels (day names, slot types, headings) are localized in the
-- frontend via en/ar i18n keys; this seed stores only canonical enum slot_type
-- values and plain room codes so the UI can localize them.
-- =============================================================================

-- (a) Assign section_id to any active enrollment that lacks one.
WITH unassigned AS (
  SELECT
    sc.id AS enrollment_id,
    sc.course_id,
    row_number() OVER (PARTITION BY sc.course_id ORDER BY sc.student_id) - 1 AS rn
  FROM student_courses sc
  WHERE sc.section_id IS NULL
    AND sc.status = 'active'
),
sections_ranked AS (
  SELECT
    cs.id AS section_id,
    cs.course_id,
    row_number() OVER (PARTITION BY cs.course_id ORDER BY cs.section_code) - 1 AS sidx,
    count(*) OVER (PARTITION BY cs.course_id) AS scount
  FROM course_sections cs
  WHERE cs.is_active = true
)
UPDATE student_courses sc
SET section_id = sr.section_id
FROM unassigned u
JOIN sections_ranked sr
  ON sr.course_id = u.course_id
 AND sr.sidx = (u.rn % sr.scount)
WHERE sc.id = u.enrollment_id;

-- (b) Seed a deterministic, clash-free weekly timetable for enrolled sections.
WITH enrolled_sections AS (
  SELECT DISTINCT
    cs.id AS section_id,
    c.code AS course_code,
    cs.section_code
  FROM course_sections cs
  JOIN courses c ON c.id = cs.course_id
  WHERE EXISTS (
    SELECT 1 FROM student_courses sc
    WHERE sc.section_id = cs.id AND sc.status = 'active'
  )
),
ranked AS (
  SELECT
    section_id,
    course_code,
    section_code,
    (row_number() OVER (ORDER BY course_code, section_code) - 1)::int AS idx
  FROM enrolled_sections
),
total AS (
  SELECT count(*)::int AS n FROM ranked
),
meetings AS (
  -- Meeting 1: lecture
  SELECT r.section_id, r.course_code, r.idx,
         r.idx AS lin,
         'lecture'::text AS slot_type
  FROM ranked r
  UNION ALL
  -- Meeting 2: lab for STEM courses, tutorial otherwise; offset by the total
  -- section count so its (day, hour) cells never overlap meeting 1's cells.
  SELECT r.section_id, r.course_code, r.idx,
         (t.n + r.idx) AS lin,
         CASE
           WHEN r.course_code LIKE 'SCI%' OR r.course_code LIKE 'MATH%' THEN 'lab'
           ELSE 'tutorial'
         END AS slot_type
  FROM ranked r CROSS JOIN total t
)
INSERT INTO timetable_slots (section_id, day_of_week, start_time, end_time, room, slot_type)
SELECT
  m.section_id,
  (1 + (m.lin % 5))::int AS day_of_week,                 -- 1=Mon .. 5=Fri
  make_time((8 + (m.lin / 5))::int, 0, 0) AS start_time,  -- 08:00 .. 17:00
  make_time((9 + (m.lin / 5))::int, 0, 0) AS end_time,    -- one hour later
  (101 + m.idx)::text AS room,                            -- stable room per section
  m.slot_type
FROM meetings m
ON CONFLICT (section_id, day_of_week, start_time) DO NOTHING;;
