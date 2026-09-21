-- ONLY on a fresh isolated replay of the original 491 migrations, BEFORE Phase A.
-- Not a seed for any shared/Preview/Production database. No guard disabling.
-- Parent must explicitly set test.phase_a_fixture_authorized='isolated-replay-only'.
BEGIN;
DO $guard$ BEGIN
  IF current_setting('test.phase_a_fixture_authorized',true) IS DISTINCT FROM 'isolated-replay-only' THEN
    RAISE EXCEPTION 'Explicit isolated replay fixture authorization required';
  END IF;
  IF to_regprocedure('public.submission_authority_phase_a_v1()') IS NOT NULL THEN
    RAISE EXCEPTION 'Historical fixture must precede the Phase A migration';
  END IF;
  IF EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.submissions'::regclass AND tgname='trg_habit_signals_on_submission' AND NOT tgisinternal) THEN
    RAISE EXCEPTION 'Use clean 491-source replay; do not bypass an installed legacy habit trigger';
  END IF;
  IF EXISTS(SELECT 1 FROM public.institutions WHERE slug LIKE 'qa-phase-a-%') THEN
    RAISE EXCEPTION 'Fixture already exists; use a new isolated replay, not cleanup/reset';
  END IF;
END; $guard$;
CREATE FUNCTION pg_temp.phase_id(n integer) RETURNS uuid LANGUAGE sql IMMUTABLE AS $$
  SELECT ('7a000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid;
$$;
INSERT INTO public.institutions(id,name,slug,join_mode) VALUES
  (pg_temp.phase_id(1),'QA Phase A A','qa-phase-a-a','open'),
  (pg_temp.phase_id(2),'QA Phase A B','qa-phase-a-b','open');
-- Actual auth trigger creates each profile; privileged fixture setup assigns roles.
INSERT INTO auth.users(id,email,role,aud,email_confirmed_at,raw_user_meta_data)
SELECT pg_temp.phase_id(n),'qa-phase-a-'||n||'@example.invalid','authenticated','authenticated',now(),
  jsonb_build_object('institution_id',pg_temp.phase_id(inst),'full_name','QA Phase A '||n)
FROM (VALUES(101,1),(102,1),(103,2),(201,1),(202,1),(203,2),(204,1),(301,1),(302,1),(401,1),(501,1)) x(n,inst);
UPDATE public.profiles SET role='teacher' WHERE id IN(pg_temp.phase_id(201),pg_temp.phase_id(202),pg_temp.phase_id(203),pg_temp.phase_id(204));
UPDATE public.profiles SET role='parent' WHERE id IN(pg_temp.phase_id(301),pg_temp.phase_id(302));
UPDATE public.profiles SET role='coordinator' WHERE id=pg_temp.phase_id(401);
UPDATE public.profiles SET role='admin' WHERE id=pg_temp.phase_id(501);
UPDATE public.profiles SET is_active=false WHERE id=pg_temp.phase_id(204);
INSERT INTO public.programs(id,institution_id,coordinator_id,name,code) VALUES
  (pg_temp.phase_id(601),pg_temp.phase_id(1),pg_temp.phase_id(401),'QA Phase A A','QA-PHASE-A-A'),
  (pg_temp.phase_id(602),pg_temp.phase_id(2),NULL,'QA Phase A B','QA-PHASE-A-B');
INSERT INTO public.courses(id,program_id,teacher_id,name,code,semester,academic_year) VALUES
  (pg_temp.phase_id(701),pg_temp.phase_id(601),pg_temp.phase_id(201),'QA A1','QA-PHASE-A-1','Test','2026'),
  (pg_temp.phase_id(702),pg_temp.phase_id(601),pg_temp.phase_id(202),'QA A2','QA-PHASE-A-2','Test','2026'),
  (pg_temp.phase_id(703),pg_temp.phase_id(602),pg_temp.phase_id(203),'QA B1','QA-PHASE-A-3','Test','2026');
INSERT INTO public.student_courses(student_id,course_id) VALUES
  (pg_temp.phase_id(101),pg_temp.phase_id(701)),(pg_temp.phase_id(102),pg_temp.phase_id(702)),(pg_temp.phase_id(103),pg_temp.phase_id(703));
INSERT INTO public.parent_student_links(parent_id,student_id,relationship,verified,institution_id,status) VALUES
  (pg_temp.phase_id(301),pg_temp.phase_id(101),'parent',true,pg_temp.phase_id(1),'verified'),
  (pg_temp.phase_id(302),pg_temp.phase_id(101),'parent',false,pg_temp.phase_id(1),'pending');
INSERT INTO public.assignments(id,course_id,created_by,title,total_marks,due_date,is_late_allowed,late_window_hours)
SELECT pg_temp.phase_id(n),pg_temp.phase_id(701),pg_temp.phase_id(201),'QA Phase A '||n,10,now()+interval '30 days',true,2 FROM generate_series(901,930) n;
INSERT INTO public.assignments(id,course_id,created_by,title,total_marks,due_date) VALUES
  (pg_temp.phase_id(931),pg_temp.phase_id(702),pg_temp.phase_id(202),'QA Phase A foreign course',10,now()+interval '30 days'),
  (pg_temp.phase_id(932),pg_temp.phase_id(703),pg_temp.phase_id(203),'QA Phase A foreign tenant',10,now()+interval '30 days');
INSERT INTO public.quizzes(id,course_id,title,due_date,is_published,practice_mode_enabled) VALUES
  (pg_temp.phase_id(801),pg_temp.phase_id(701),'QA Phase A quiz',now()+interval '30 days',true,true),
  (pg_temp.phase_id(802),pg_temp.phase_id(702),'QA Phase A foreign quiz',now()+interval '30 days',true,true),
  (pg_temp.phase_id(803),pg_temp.phase_id(703),'QA Phase A foreign tenant quiz',now()+interval '30 days',true,true),
  (pg_temp.phase_id(804),pg_temp.phase_id(701),'QA Phase A unpublished quiz',now()+interval '30 days',false,false);
INSERT INTO public.quiz_attempts(id,quiz_id,student_id,score,submitted_at,attempt_number) VALUES
  (pg_temp.phase_id(1201),pg_temp.phase_id(801),pg_temp.phase_id(101),75,now()-interval '2 days',1),
  (pg_temp.phase_id(1202),pg_temp.phase_id(801),pg_temp.phase_id(101),85,now()-interval '2 days',2),
  (pg_temp.phase_id(1203),pg_temp.phase_id(801),pg_temp.phase_id(101),90,now()-interval '2 days',3);
-- These historical rows intentionally precede the new guards; no new result proof.
INSERT INTO public.submissions(id,student_id,quiz_attempt_id,status,submitted_at) VALUES
  (pg_temp.phase_id(1101),pg_temp.phase_id(101),pg_temp.phase_id(1201),'graded',now()-interval '2 days'),
  (pg_temp.phase_id(1102),pg_temp.phase_id(101),pg_temp.phase_id(1203),'submitted',now()-interval '2 days');
INSERT INTO public.submissions(id,student_id,assignment_id,text_content,status,submitted_at) VALUES
  (pg_temp.phase_id(1103),pg_temp.phase_id(101),pg_temp.phase_id(930),'Historical attribution attack fixture','graded',now()-interval '2 days');
INSERT INTO public.grades(id,submission_id,graded_by,total_score,score_percent,is_released) VALUES
  (pg_temp.phase_id(1301),pg_temp.phase_id(1101),pg_temp.phase_id(201),7.5,75,false),
  (pg_temp.phase_id(1302),pg_temp.phase_id(1103),pg_temp.phase_id(202),8,80,false);
-- Storage metadata fixtures are not physical upload/byte-integrity evidence.
INSERT INTO storage.objects(bucket_id,name,owner) VALUES
  ('submissions',pg_temp.phase_id(101)::text||'/QA-owned.txt',pg_temp.phase_id(101)),
  ('submissions',pg_temp.phase_id(102)::text||'/QA-owned.txt',pg_temp.phase_id(102)),
  ('submissions',pg_temp.phase_id(101)::text||'/QA-unreferenced.txt',pg_temp.phase_id(101));
INSERT INTO public.submissions(id,student_id,assignment_id,file_url,submitted_at) VALUES
  (pg_temp.phase_id(1104),pg_temp.phase_id(101),pg_temp.phase_id(929),pg_temp.phase_id(102)::text||'/QA-owned.txt',now()-interval '2 days');
-- Existing extension authority fixtures, not execution/certification of purchases.
INSERT INTO public.marketplace_items(id,institution_id,name,description,category,sub_category,xp_price,icon_identifier)
VALUES(pg_temp.phase_id(1401),pg_temp.phase_id(1),'QA stored extension','Only a foreign-key fixture, not an earned entitlement','educational_perk','deadline_extension',1,'clock');
INSERT INTO public.xp_purchases(id,student_id,institution_id,item_id,xp_cost) VALUES
  (pg_temp.phase_id(1501),pg_temp.phase_id(101),pg_temp.phase_id(1),pg_temp.phase_id(1401),1),
  (pg_temp.phase_id(1502),pg_temp.phase_id(102),pg_temp.phase_id(1),pg_temp.phase_id(1401),1);
INSERT INTO public.deadline_extensions(student_id,assignment_id,purchase_id,original_deadline,extended_deadline,revoked)
SELECT pg_temp.phase_id(s),pg_temp.phase_id(a),pg_temp.phase_id(p),now()-interval '1 day',now()+interval '1 day',revoked
FROM (VALUES(101,910,1501,false),(101,911,1501,false),(102,912,1502,false),(101,913,1501,true),(101,914,1501,false),(101,916,1501,false),(101,917,1501,false)) x(s,a,p,revoked);
COMMIT;
