-- ============================================================
-- SEED MIGRATION: 20260901000004_seed_demo_data.sql
-- Scale-realistic demo data: 3 institutions × ~757 users each
-- 6-month history for dashboards to never render empty
-- Deterministic UUIDs via uuid_generate_v5 for idempotency
-- ============================================================

-- This seed migration is timestamped before the signup hardening migration that
-- formally adds these columns. Re-assert the prerequisites idempotently so a
-- fresh preview database can replay migrations in timestamp order.
ALTER TABLE public.institutions
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS allowed_email_domains text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS join_mode text
    CHECK (join_mode IN ('open', 'invite_only', 'domain_restricted'))
    NOT NULL
    DEFAULT 'invite_only';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS status text
    CHECK (status IN ('active', 'pending_verification', 'suspended'))
    NOT NULL
    DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS email_verified_at timestamptz;

-- ============================================================
-- 9.1 SEED INSTITUTIONS (3 rows)
-- ============================================================
INSERT INTO institutions (id, name, slug, join_mode, logo_url, created_at)
VALUES
  (
    uuid_generate_v5(uuid_nil(), 'institution-open-demo'),
    'Open Demo University',
    'open-demo-university',
    'open',
    'https://via.placeholder.com/200x100?text=Open+Demo',
    now()
  ),
  (
    uuid_generate_v5(uuid_nil(), 'institution-invite-demo'),
    'Invite-Only Academy',
    'invite-only-academy',
    'invite_only',
    'https://via.placeholder.com/200x100?text=Invite+Academy',
    now()
  ),
  (
    uuid_generate_v5(uuid_nil(), 'institution-domain-demo'),
    'Qatar Ministry of Education',
    'qatar-moehe-demo',
    'domain_restricted',
    'https://via.placeholder.com/200x100?text=Qatar+MOEHE',
    now()
  )
ON CONFLICT DO NOTHING;

-- Update domain restrictions for the domain-restricted institution
UPDATE institutions
SET allowed_email_domains = ARRAY['moehe.edu.qa', 'qatar.edu.qa']
WHERE slug = 'qatar-moehe-demo';

-- ============================================================
-- 9.2 SEED PROFILES (~2,271 total: 3 institutions × 757 users each)
-- Per institution: 500 students + 50 teachers + 5 coordinators + 2 admins + 200 parents
-- ============================================================

-- Helper CTE to generate all institutions
WITH institutions_cte AS (
  SELECT id, slug FROM institutions WHERE slug IN ('open-demo-university', 'invite-only-academy', 'qatar-moehe-demo')
),

-- Generate student profiles (500 per institution)
students_gen AS (
  SELECT
    institutions_cte.id as institution_id,
    uuid_generate_v5(institutions_cte.id, 'student-' || i::text) as profile_id,
    'student' as role,
    'Student ' || i::text as full_name,
    'student' || i::text || '@' || institutions_cte.slug || '.demo' as email,
    i
  FROM institutions_cte
  CROSS JOIN LATERAL generate_series(1, 500) AS i
),

-- Generate teacher profiles (50 per institution)
teachers_gen AS (
  SELECT
    institutions_cte.id as institution_id,
    uuid_generate_v5(institutions_cte.id, 'teacher-' || i::text) as profile_id,
    'teacher' as role,
    'Teacher ' || i::text as full_name,
    'teacher' || i::text || '@' || institutions_cte.slug || '.demo' as email,
    i
  FROM institutions_cte
  CROSS JOIN LATERAL generate_series(1, 50) AS i
),

-- Generate coordinator profiles (5 per institution)
coordinators_gen AS (
  SELECT
    institutions_cte.id as institution_id,
    uuid_generate_v5(institutions_cte.id, 'coordinator-' || i::text) as profile_id,
    'coordinator' as role,
    'Coordinator ' || i::text as full_name,
    'coordinator' || i::text || '@' || institutions_cte.slug || '.demo' as email,
    i
  FROM institutions_cte
  CROSS JOIN LATERAL generate_series(1, 5) AS i
),

-- Generate admin profiles (2 per institution)
admins_gen AS (
  SELECT
    institutions_cte.id as institution_id,
    uuid_generate_v5(institutions_cte.id, 'admin-' || i::text) as profile_id,
    'admin' as role,
    'Admin ' || i::text as full_name,
    'admin' || i::text || '@' || institutions_cte.slug || '.demo' as email,
    i
  FROM institutions_cte
  CROSS JOIN LATERAL generate_series(1, 2) AS i
),

-- Generate parent profiles (200 per institution)
parents_gen AS (
  SELECT
    institutions_cte.id as institution_id,
    uuid_generate_v5(institutions_cte.id, 'parent-' || i::text) as profile_id,
    'parent' as role,
    'Parent ' || i::text as full_name,
    'parent' || i::text || '@' || institutions_cte.slug || '.demo' as email,
    i
  FROM institutions_cte
  CROSS JOIN LATERAL generate_series(1, 200) AS i
),

-- Union all profiles
all_profiles AS (
  SELECT institution_id, profile_id, role, full_name, email FROM students_gen
  UNION ALL
  SELECT institution_id, profile_id, role, full_name, email FROM teachers_gen
  UNION ALL
  SELECT institution_id, profile_id, role, full_name, email FROM coordinators_gen
  UNION ALL
  SELECT institution_id, profile_id, role, full_name, email FROM admins_gen
  UNION ALL
  SELECT institution_id, profile_id, role, full_name, email FROM parents_gen
)

INSERT INTO profiles (
  id, institution_id, full_name, email, role, status, theme_preference, language_preference,
  tour_completed_at, email_verified_at, created_at
)
SELECT
  profile_id,
  institution_id,
  full_name,
  email,
  role::public.user_role,
  'active',
  'system',
  CASE WHEN (ROW_NUMBER() OVER (PARTITION BY institution_id ORDER BY profile_id)) % 3 = 0 THEN 'ar' ELSE 'en' END,
  NULL,
  now(),
  now()
FROM all_profiles
ON CONFLICT DO NOTHING;

-- ============================================================
-- 9.3 SEED PROGRAMS + COURSES (5 programs × 4 courses per institution = 60 courses total)
-- Aligned to Qatar MOEHE program naming
-- ============================================================

WITH institutions_cte AS (
  SELECT id FROM institutions WHERE slug IN ('open-demo-university', 'invite-only-academy', 'qatar-moehe-demo')
),

programs_gen AS (
  SELECT
    institutions_cte.id as institution_id,
    uuid_generate_v5(institutions_cte.id, 'program-' || p::text) as program_id,
    'Program ' || p::text as name,
    'program-' || p::text as code,
    p
  FROM institutions_cte
  CROSS JOIN LATERAL generate_series(1, 5) AS p
),

courses_gen AS (
  SELECT
    programs_gen.institution_id,
    programs_gen.program_id,
    uuid_generate_v5(programs_gen.program_id, 'course-' || c::text) as course_id,
    'Course ' || programs_gen.p::text || '-' || c::text as name,
    'COURSE' || programs_gen.p::text || c::text as code,
    'Course ' || programs_gen.p::text || '-' || c::text || ' description',
    c
  FROM programs_gen
  CROSS JOIN LATERAL generate_series(1, 4) AS c
)

INSERT INTO programs (id, institution_id, name, code, created_at)
SELECT DISTINCT institution_id, institution_id, name, code, now()
FROM programs_gen
ON CONFLICT DO NOTHING;

INSERT INTO courses (id, program_id, name, code, description, created_at)
SELECT course_id, program_id, name, code, description, now()
FROM courses_gen
ON CONFLICT DO NOTHING;

-- ============================================================
-- 9.4 SEED SEMESTERS (current + 1 past per institution)
-- ============================================================

WITH institutions_cte AS (
  SELECT id FROM institutions WHERE slug IN ('open-demo-university', 'invite-only-academy', 'qatar-moehe-demo')
)

INSERT INTO semesters (id, institution_id, name, code, start_date, end_date, is_current, created_at)
SELECT
  uuid_generate_v5(institutions_cte.id, 'semester-current'),
  institutions_cte.id,
  'Spring 2026',
  'SP2026',
  (now() - interval '2 months')::date,
  (now() + interval '4 months')::date,
  true,
  now()
FROM institutions_cte
UNION ALL
SELECT
  uuid_generate_v5(institutions_cte.id, 'semester-past'),
  institutions_cte.id,
  'Fall 2025',
  'FA2025',
  (now() - interval '8 months')::date,
  (now() - interval '2 months')::date,
  false,
  now()
FROM institutions_cte
ON CONFLICT DO NOTHING;

-- ============================================================
-- 9.5 SEED ILO/PLO/CLO CHAINS WITH OUTCOME_MAPPINGS
-- 6 ILOs per institution, 4 PLOs per program, 5 CLOs per course
-- Enforce weights sum to 100 per child-to-parent relationship
-- ============================================================

WITH institutions_cte AS (
  SELECT id FROM institutions WHERE slug IN ('open-demo-university', 'invite-only-academy', 'qatar-moehe-demo')
),

ilos_gen AS (
  SELECT
    institutions_cte.id as institution_id,
    uuid_generate_v5(institutions_cte.id, 'ilo-' || i::text) as ilo_id,
    'ILO ' || i::text as name,
    'ilo-' || i::text as code,
    i
  FROM institutions_cte
  CROSS JOIN LATERAL generate_series(1, 6) AS i
),

programs_cte AS (
  SELECT id, institution_id FROM programs
),

plos_gen AS (
  SELECT
    programs_cte.id as program_id,
    programs_cte.institution_id,
    uuid_generate_v5(programs_cte.id, 'plo-' || p::text) as plo_id,
    'PLO ' || p::text as name,
    'plo-' || p::text as code,
    p
  FROM programs_cte
  CROSS JOIN LATERAL generate_series(1, 4) AS p
),

courses_cte AS (
  SELECT id, program_id FROM courses
),

clos_gen AS (
  SELECT
    courses_cte.id as course_id,
    courses_cte.program_id,
    uuid_generate_v5(courses_cte.id, 'clo-' || c::text) as clo_id,
    'CLO ' || c::text as name,
    'clo-' || c::text as code,
    ARRAY['remembering', 'understanding', 'applying', 'analyzing', 'evaluating', 'creating'][c] as bloom_level,
    c
  FROM courses_cte
  CROSS JOIN LATERAL generate_series(1, 5) AS c
)

INSERT INTO learning_outcomes (id, institution_id, outcome_type, name, code, bloom_level, created_at)
SELECT ilo_id, institution_id, 'ILO', name, code, NULL, now() FROM ilos_gen
ON CONFLICT DO NOTHING;

INSERT INTO learning_outcomes (id, institution_id, outcome_type, name, code, bloom_level, created_at)
SELECT plo_id, institution_id, 'PLO', name, code, NULL, now() FROM plos_gen
ON CONFLICT DO NOTHING;

INSERT INTO learning_outcomes (id, institution_id, outcome_type, name, code, bloom_level, created_at)
SELECT clo_id, (SELECT institution_id FROM programs WHERE id = program_id LIMIT 1), 'CLO', name, code, bloom_level, now() FROM clos_gen
ON CONFLICT DO NOTHING;

-- Seed outcome_mappings: PLO → ILO (weights sum to 100)
WITH plos_cte AS (
  SELECT id, institution_id FROM learning_outcomes WHERE outcome_type = 'PLO'
),
ilos_cte AS (
  SELECT id, institution_id FROM learning_outcomes WHERE outcome_type = 'ILO'
),
plo_ilo_pairs AS (
  SELECT
    plos_cte.id as child_id,
    ilos_cte.id as parent_id,
    plos_cte.institution_id,
    ROW_NUMBER() OVER (PARTITION BY plos_cte.id ORDER BY ilos_cte.id) as rn,
    COUNT(*) OVER (PARTITION BY plos_cte.id) as total_count
  FROM plos_cte
  CROSS JOIN ilos_cte
  WHERE plos_cte.institution_id = ilos_cte.institution_id
)
INSERT INTO outcome_mappings (child_outcome_id, parent_outcome_id, weight, created_at)
SELECT
  child_id,
  parent_id,
  CASE
    WHEN rn < total_count THEN 25
    ELSE 100 - (25 * (total_count - 1))
  END as weight,
  now()
FROM plo_ilo_pairs
ON CONFLICT DO NOTHING;

-- Seed outcome_mappings: CLO → PLO (weights sum to 100)
WITH clos_cte AS (
  SELECT id, program_id FROM learning_outcomes WHERE outcome_type = 'CLO'
),
plos_cte AS (
  SELECT id, institution_id FROM learning_outcomes WHERE outcome_type = 'PLO'
),
clo_plo_pairs AS (
  SELECT
    clos_cte.id as child_id,
    plos_cte.id as parent_id,
    clos_cte.program_id,
    ROW_NUMBER() OVER (PARTITION BY clos_cte.id ORDER BY plos_cte.id) as rn,
    COUNT(*) OVER (PARTITION BY clos_cte.id) as total_count
  FROM clos_cte
  CROSS JOIN plos_cte
  WHERE (SELECT institution_id FROM programs WHERE id = clos_cte.program_id) = plos_cte.institution_id
)
INSERT INTO outcome_mappings (child_outcome_id, parent_outcome_id, weight, created_at)
SELECT
  child_id,
  parent_id,
  CASE
    WHEN rn < total_count THEN 25
    ELSE 100 - (25 * (total_count - 1))
  END as weight,
  now()
FROM clo_plo_pairs
ON CONFLICT DO NOTHING;

-- ============================================================
-- 9.6 SEED ASSIGNMENTS + EVIDENCE + XP_TRANSACTIONS
-- 6 months of history: 2 assignments per course per month
-- ============================================================

WITH courses_cte AS (
  SELECT id, program_id FROM courses
),
months AS (
  SELECT generate_series(0, 5) as month_offset
),
assignments_gen AS (
  SELECT
    uuid_generate_v5(courses_cte.id, 'assignment-' || months.month_offset::text || '-1') as assignment_id,
    courses_cte.id as course_id,
    'Assignment ' || months.month_offset::text || '-1' as name,
    'assignment-' || months.month_offset::text || '-1' as code,
    (now() - interval '6 months' + interval '1 month' * months.month_offset)::date as due_date,
    months.month_offset
  FROM courses_cte
  CROSS JOIN months
  UNION ALL
  SELECT
    uuid_generate_v5(courses_cte.id, 'assignment-' || months.month_offset::text || '-2') as assignment_id,
    courses_cte.id as course_id,
    'Assignment ' || months.month_offset::text || '-2' as name,
    'assignment-' || months.month_offset::text || '-2' as code,
    (now() - interval '6 months' + interval '1 month' * months.month_offset + interval '15 days')::date as due_date,
    months.month_offset
  FROM courses_cte
  CROSS JOIN months
)

INSERT INTO assignments (id, course_id, name, code, due_date, created_at)
SELECT assignment_id, course_id, name, code, due_date, now()
FROM assignments_gen
ON CONFLICT DO NOTHING;

-- Seed evidence (submissions + grades for each student per assignment)
WITH assignments_cte AS (
  SELECT id, course_id FROM assignments
),
students_cte AS (
  SELECT id, institution_id FROM profiles WHERE role = 'student'
),
evidence_gen AS (
  SELECT
    uuid_generate_v5(assignments_cte.id, 'evidence-' || students_cte.id::text) as evidence_id,
    assignments_cte.id as assignment_id,
    students_cte.id as student_id,
    (RANDOM() * 100)::int as score,
    (now() - interval '6 months' + interval '1 day' * (RANDOM() * 180)::int)::timestamp as created_at
  FROM assignments_cte
  CROSS JOIN students_cte
  WHERE (SELECT institution_id FROM courses WHERE id = assignments_cte.course_id) = students_cte.institution_id
)

INSERT INTO evidence (id, assignment_id, student_id, score, created_at)
SELECT evidence_id, assignment_id, student_id, score, created_at
FROM evidence_gen
ON CONFLICT DO NOTHING;

-- Seed xp_transactions (derived from evidence scores)
WITH evidence_cte AS (
  SELECT id, student_id, score, created_at FROM evidence
),
xp_gen AS (
  SELECT
    uuid_generate_v5(evidence_cte.id, 'xp-submission') as xp_id,
    evidence_cte.student_id,
    'submission' as event_type,
    CASE
      WHEN evidence_cte.score >= 90 THEN 40
      WHEN evidence_cte.score >= 80 THEN 30
      WHEN evidence_cte.score >= 70 THEN 20
      ELSE 10
    END as xp_amount,
    evidence_cte.created_at
  FROM evidence_cte
)

INSERT INTO xp_transactions (id, student_id, event_type, xp_amount, created_at)
SELECT xp_id, student_id, event_type, xp_amount, created_at
FROM xp_gen
ON CONFLICT DO NOTHING;

-- ============================================================
-- 9.7 SEED HABIT_TRACKING + GRADES + NOTIFICATIONS + AUDIT_LOGS
-- ============================================================

-- Seed habit_tracking (6 months of daily rows per student)
WITH students_cte AS (
  SELECT id FROM profiles WHERE role = 'student'
),
dates AS (
  SELECT generate_series((now() - interval '6 months')::date, now()::date, interval '1 day')::date as habit_date
),
habits_gen AS (
  SELECT
    uuid_generate_v5(students_cte.id, 'habit-' || dates.habit_date::text) as habit_id,
    students_cte.id as student_id,
    dates.habit_date,
    CASE WHEN RANDOM() > 0.3 THEN true ELSE false END as login_completed,
    CASE WHEN RANDOM() > 0.4 THEN true ELSE false END as submit_completed,
    CASE WHEN RANDOM() > 0.5 THEN true ELSE false END as journal_completed,
    CASE WHEN RANDOM() > 0.6 THEN true ELSE false END as read_completed,
    now()
  FROM students_cte
  CROSS JOIN dates
)

INSERT INTO habit_tracking (id, student_id, habit_date, login_completed, submit_completed, journal_completed, read_completed, created_at)
SELECT habit_id, student_id, habit_date, login_completed, submit_completed, journal_completed, read_completed, created_at
FROM habits_gen
ON CONFLICT DO NOTHING;

-- Seed grades (released grades for every submitted assignment)
WITH evidence_cte AS (
  SELECT id, assignment_id, student_id, score FROM evidence
)

INSERT INTO grades (id, evidence_id, score, released_at, created_at)
SELECT
  uuid_generate_v5(evidence_cte.id, 'grade'),
  evidence_cte.id,
  evidence_cte.score,
  evidence_cte.id::timestamp,
  now()
FROM evidence_cte
ON CONFLICT DO NOTHING;

-- Seed notifications (10 per student across 6-month window)
WITH students_cte AS (
  SELECT id, institution_id FROM profiles WHERE role = 'student'
),
notification_types AS (
  SELECT ARRAY['grade_released', 'new_assignment', 'badge_earned', 'streak_at_risk', 'peer_milestone'] as types
),
notifications_gen AS (
  SELECT
    uuid_generate_v5(students_cte.id, 'notification-' || i::text) as notification_id,
    students_cte.id as user_id,
    students_cte.institution_id,
    notification_types.types[((i - 1) % 5) + 1] as notification_type,
    'Notification ' || i::text as title,
    'Notification body ' || i::text as body,
    (now() - interval '6 months' + interval '1 day' * (RANDOM() * 180)::int)::timestamp as created_at,
    false as is_read
  FROM students_cte
  CROSS JOIN notification_types
  CROSS JOIN LATERAL generate_series(1, 10) AS i
)

INSERT INTO notifications (id, user_id, institution_id, notification_type, title, body, created_at, is_read)
SELECT notification_id, user_id, institution_id, notification_type, title, body, created_at, is_read
FROM notifications_gen
ON CONFLICT DO NOTHING;

-- Seed audit_logs (representative admin/coordinator actions)
WITH admins_cte AS (
  SELECT id, institution_id FROM profiles WHERE role = 'admin'
),
audit_gen AS (
  SELECT
    uuid_generate_v5(admins_cte.id, 'audit-' || i::text) as audit_id,
    admins_cte.institution_id,
    admins_cte.id as performed_by,
    ARRAY['create_user', 'update_course', 'create_assignment', 'release_grade', 'update_outcome'][((i - 1) % 5) + 1] as event_type,
    'entity_' || i::text as entity_type,
    'entity-id-' || i::text as entity_id,
    jsonb_build_object('action', 'demo_action', 'index', i) as changes,
    (now() - interval '6 months' + interval '1 day' * (RANDOM() * 180)::int)::timestamp as created_at
  FROM admins_cte
  CROSS JOIN LATERAL generate_series(1, 20) AS i
)

INSERT INTO audit_logs (id, institution_id, performed_by, event_type, entity_type, entity_id, changes, created_at)
SELECT audit_id, institution_id, performed_by, event_type, entity_type, entity_id, changes, created_at
FROM audit_gen
ON CONFLICT DO NOTHING;

-- ============================================================
-- 9.8 SEED BADGE SPOTLIGHT HISTORY + LEADERBOARD STATE
-- Weekly badge spotlight rows for past 12 weeks (valid Mondays)
-- ============================================================

WITH institutions_cte AS (
  SELECT id FROM institutions WHERE slug IN ('open-demo-university', 'invite-only-academy', 'qatar-moehe-demo')
),
weeks AS (
  SELECT generate_series(0, 11) as week_offset
),
badge_spotlight_gen AS (
  SELECT
    uuid_generate_v5(institutions_cte.id, 'badge-spotlight-' || weeks.week_offset::text) as badge_spotlight_id,
    institutions_cte.id as institution_id,
    (date_trunc('week', now() - interval '1 week' * weeks.week_offset)::date - interval '1 day' * (EXTRACT(dow FROM date_trunc('week', now() - interval '1 week' * weeks.week_offset))::int - 1))::date as week_start,
    'Badge ' || weeks.week_offset::text as badge_name,
    'badge-' || weeks.week_offset::text as badge_code,
    weeks.week_offset
  FROM institutions_cte
  CROSS JOIN weeks
)

INSERT INTO badge_spotlight_schedule (id, institution_id, week_start, badge_name, badge_code, created_at)
SELECT badge_spotlight_id, institution_id, week_start, badge_name, badge_code, now()
FROM badge_spotlight_gen
WHERE EXTRACT(dow FROM week_start) = 1
ON CONFLICT DO NOTHING;

-- Refresh materialized view for leaderboard
REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard;

-- ============================================================
-- 9.9 ONBOARDING PROGRESS SEEDING
-- Demo student at step 'welcome', others randomized
-- ============================================================

WITH students_cte AS (
  SELECT id, institution_id, ROW_NUMBER() OVER (PARTITION BY institution_id ORDER BY id) as rn
  FROM profiles
  WHERE role = 'student'
),
demo_student AS (
  SELECT id, institution_id FROM students_cte WHERE rn = 1
),
other_students AS (
  SELECT id, institution_id FROM students_cte WHERE rn > 1
),
steps AS (
  SELECT ARRAY['welcome', 'baseline_select', 'learning_style', 'goal_setting', 'dashboard_tour'] as step_array
)

INSERT INTO onboarding_progress (id, student_id, current_step, welcome_completed, baseline_completed, learning_style_completed, goal_setting_completed, dashboard_tour_completed, created_at)
SELECT
  uuid_generate_v5(demo_student.id, 'onboarding'),
  demo_student.id,
  'welcome',
  false,
  false,
  false,
  false,
  false,
  now()
FROM demo_student
ON CONFLICT DO NOTHING;

INSERT INTO onboarding_progress (id, student_id, current_step, welcome_completed, baseline_completed, learning_style_completed, goal_setting_completed, dashboard_tour_completed, created_at)
SELECT
  uuid_generate_v5(other_students.id, 'onboarding'),
  other_students.id,
  steps.step_array[((ROW_NUMBER() OVER (ORDER BY other_students.id) - 1) % 5) + 1],
  CASE WHEN ((ROW_NUMBER() OVER (ORDER BY other_students.id) - 1) % 5) >= 1 THEN true ELSE false END,
  CASE WHEN ((ROW_NUMBER() OVER (ORDER BY other_students.id) - 1) % 5) >= 2 THEN true ELSE false END,
  CASE WHEN ((ROW_NUMBER() OVER (ORDER BY other_students.id) - 1) % 5) >= 3 THEN true ELSE false END,
  CASE WHEN ((ROW_NUMBER() OVER (ORDER BY other_students.id) - 1) % 5) >= 4 THEN true ELSE false END,
  CASE WHEN ((ROW_NUMBER() OVER (ORDER BY other_students.id) - 1) % 5) >= 5 THEN true ELSE false END,
  now()
FROM other_students
CROSS JOIN steps
ON CONFLICT DO NOTHING;
