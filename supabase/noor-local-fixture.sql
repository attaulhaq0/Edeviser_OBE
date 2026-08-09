-- Explicit local-only Noor five-role fixture.
-- Invoke with psql -v fixture_password='...' and never include the password in git.
\set ON_ERROR_STOP on
BEGIN;

CREATE TEMP TABLE noor_fixture_users (
  id uuid PRIMARY KEY,
  email text NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL
) ON COMMIT DROP;

INSERT INTO noor_fixture_users VALUES
  ('00000000-0000-4000-8000-000000000301', 'noor.admin@local.test', 'Noor Local Admin', 'admin'),
  ('00000000-0000-4000-8000-000000000302', 'noor.coordinator@local.test', 'Noor Local Coordinator', 'coordinator'),
  ('00000000-0000-4000-8000-000000000303', 'noor.teacher@local.test', 'Noor Local Teacher', 'teacher'),
  ('00000000-0000-4000-8000-000000000304', 'noor.student@local.test', 'Noor Local Student', 'student'),
  ('00000000-0000-4000-8000-000000000305', 'noor.parent@local.test', 'Noor Local Parent', 'parent');

INSERT INTO institutions (id, name, slug, settings, join_mode)
VALUES (
  '00000000-0000-4000-8000-000000000003',
  'Noor International School (Local)',
  'noor-local',
  '{"seed_owned": true, "local_fixture": true}'::jsonb,
  'open'
)
ON CONFLICT (id) DO UPDATE SET join_mode = 'open';

INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
SELECT
  '00000000-0000-0000-0000-000000000000',
  u.id,
  'authenticated',
  'authenticated',
  u.email,
  crypt(:'fixture_password', gen_salt('bf')),
  now(),
  '', '', '', '',
  jsonb_build_object('provider', 'email', 'providers', ARRAY['email'], 'seed_owned', true),
  jsonb_build_object('full_name', u.full_name, 'institution_id', '00000000-0000-4000-8000-000000000003'),
  now(),
  now()
FROM noor_fixture_users u
ON CONFLICT (id) DO NOTHING;

UPDATE auth.users au
SET confirmation_token = '',
    recovery_token = '',
    email_change_token_new = '',
    email_change = ''
FROM noor_fixture_users u
WHERE au.id = u.id;

UPDATE profiles p
SET role = u.role::user_role,
    full_name = u.full_name,
    institution_id = '00000000-0000-4000-8000-000000000003',
    status = 'active',
    is_active = true,
    onboarding_completed = true
FROM noor_fixture_users u
WHERE p.id = u.id;

INSERT INTO departments (id, institution_id, name, code)
VALUES ('00000000-0000-4000-8000-000000000311', '00000000-0000-4000-8000-000000000003', 'Humanities', 'HUM')
ON CONFLICT (id) DO NOTHING;
INSERT INTO programs (id, institution_id, coordinator_id, department_id, name, code, is_active)
VALUES ('00000000-0000-4000-8000-000000000312', '00000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000302', '00000000-0000-4000-8000-000000000311', 'Connected Learning', 'CL', true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO courses (id, program_id, teacher_id, name, code, semester, academic_year, is_active)
VALUES ('00000000-0000-4000-8000-000000000313', '00000000-0000-4000-8000-000000000312', '00000000-0000-4000-8000-000000000303', 'English Language Arts', 'ELA7', 'Fall 2026', '2026-2027', true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO student_courses (id, student_id, course_id, status)
VALUES ('00000000-0000-4000-8000-000000000319', '00000000-0000-4000-8000-000000000304', '00000000-0000-4000-8000-000000000313', 'active')
ON CONFLICT (id) DO NOTHING;
INSERT INTO assignments (id, course_id, created_by, title, description, type, total_marks, due_date, is_late_allowed, late_window_hours, clo_weights)
VALUES ('00000000-0000-4000-8000-000000000314', '00000000-0000-4000-8000-000000000313', '00000000-0000-4000-8000-000000000303', 'Thesis Workshop', 'Local connected fixture assignment', 'assignment', 100, now() + interval '5 days', true, 24, '[]'::jsonb)
ON CONFLICT (id) DO NOTHING;
INSERT INTO journal_entries (id, student_id, course_id, content, is_shared)
VALUES ('00000000-0000-4000-8000-000000000315', '00000000-0000-4000-8000-000000000304', '00000000-0000-4000-8000-000000000313', 'I connected my thesis to the course outcome.', false)
ON CONFLICT (id) DO NOTHING;
INSERT INTO parent_student_links (id, parent_id, student_id, institution_id, relationship, relationship_label, verified, status)
VALUES ('00000000-0000-4000-8000-000000000318', '00000000-0000-4000-8000-000000000305', '00000000-0000-4000-8000-000000000304', '00000000-0000-4000-8000-000000000003', 'parent', 'Parent', true, 'active')
ON CONFLICT (id) DO NOTHING;
INSERT INTO parent_reminders (id, parent_id, student_id, title, reminder_time, is_delivered)
VALUES ('00000000-0000-4000-8000-000000000316', '00000000-0000-4000-8000-000000000305', '00000000-0000-4000-8000-000000000304', 'Review thesis workshop', now() + interval '2 days', false)
ON CONFLICT (id) DO NOTHING;
INSERT INTO academic_calendar_events (id, institution_id, title, event_type, start_date, end_date, is_recurring)
VALUES ('00000000-0000-4000-8000-000000000317', '00000000-0000-4000-8000-000000000003', 'Noor Learning Showcase', 'custom', now() + interval '7 days', now() + interval '7 days 2 hours', false)
ON CONFLICT (id) DO NOTHING;

UPDATE institutions SET join_mode = 'invite_only' WHERE id = '00000000-0000-4000-8000-000000000003';

COMMIT;
