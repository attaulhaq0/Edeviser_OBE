-- Real pgTAP/DML assertions for isolated replay only.
-- Requires supabase/test-fixtures/submission-authority/before.sql BEFORE the new migration.
-- This suite must fail, not skip, when fixtures, grants, extension or migration differ.
BEGIN;
SET LOCAL ROLE postgres;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path=public,extensions;
SET LOCAL timezone='Pacific/Honolulu';
SELECT no_plan();
CREATE OR REPLACE FUNCTION pg_temp.phase_id(n integer) RETURNS uuid LANGUAGE sql IMMUTABLE AS $$
  SELECT ('7a000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid;
$$;
DO $required$ BEGIN
  IF to_regprocedure('public.submission_authority_phase_a_v1()') IS NULL OR
     NOT EXISTS(SELECT 1 FROM public.grades WHERE id=pg_temp.phase_id(1301)) THEN
    RAISE EXCEPTION 'Required Phase A migration and pre-migration fixture are missing';
  END IF;
END; $required$;

-- Session-local, INVOKER-only test helper. Business DML actually runs as authenticated.
-- No fake policies, no public RPC, no disabled triggers, no test clock in production.
CREATE FUNCTION pg_temp.run_as(n integer,command text,privileged boolean DEFAULT false) RETURNS text
LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE result text; prior_role text:=current_user; prior_claims text:=current_setting('request.jwt.claims',true); prior_sub text:=current_setting('request.jwt.claim.sub',true); actor uuid:=pg_temp.phase_id(n);
BEGIN
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated')::text,true);
  PERFORM set_config('request.jwt.claim.sub',actor::text,true);
  IF NOT privileged THEN EXECUTE 'SET LOCAL ROLE authenticated'; END IF;
  EXECUTE command INTO result;
  EXECUTE format('SET LOCAL ROLE %I',prior_role);
  PERFORM set_config('request.jwt.claims',coalesce(prior_claims,''),true);
  PERFORM set_config('request.jwt.claim.sub',coalesce(prior_sub,''),true);
  RETURN result;
EXCEPTION WHEN OTHERS THEN
  EXECUTE format('SET LOCAL ROLE %I',prior_role);
  PERFORM set_config('request.jwt.claims',coalesce(prior_claims,''),true);
  PERFORM set_config('request.jwt.claim.sub',coalesce(prior_sub,''),true);
  RAISE;
END;
$$;
CREATE FUNCTION pg_temp.submission_sql(a integer,s integer DEFAULT 101,file_key text DEFAULT NULL,body text DEFAULT 'Valid text receipt') RETURNS text LANGUAGE sql AS $$
  SELECT format('INSERT INTO public.submissions(id,assignment_id,student_id,file_url,text_content,submitted_at,is_late,status,plagiarism_score) VALUES(%L,%L,%L,%L,%L,%L,true,%L,99) RETURNING id::text',
    pg_temp.phase_id(a+100),pg_temp.phase_id(a),pg_temp.phase_id(s),file_key,body,'2000-01-01T00:00:00Z','graded');
$$;
CREATE FUNCTION pg_temp.window_receipt(a integer,delta interval,late boolean,hours integer) RETURNS text LANGUAGE plpgsql SECURITY INVOKER AS $$
BEGIN
  UPDATE public.assignments SET due_date=statement_timestamp()+delta,is_late_allowed=late,late_window_hours=hours WHERE id=pg_temp.phase_id(a);
  RETURN pg_temp.run_as(101,pg_temp.submission_sql(a));
END;
$$;
CREATE FUNCTION pg_temp.extension_receipt(a integer,extension_delta interval,due_delta interval,late boolean,hours integer) RETURNS text LANGUAGE plpgsql SECURITY INVOKER AS $$
BEGIN
  UPDATE public.deadline_extensions SET extended_deadline=statement_timestamp()+extension_delta WHERE assignment_id=pg_temp.phase_id(a);
  RETURN pg_temp.window_receipt(a,due_delta,late,hours);
END;
$$;
CREATE FUNCTION pg_temp.grade_sql(sub integer,teacher integer) RETURNS text LANGUAGE sql AS $$
  SELECT format('INSERT INTO public.grades(submission_id,graded_by,total_score,score_percent,is_released) VALUES(%L,%L,7,70,false) RETURNING id::text',pg_temp.phase_id(sub),pg_temp.phase_id(teacher));
$$;

SELECT is(pg_temp.run_as(101,'SELECT current_user::text'),'authenticated','negative/positive DML uses the actual authenticated role');
SELECT is(pg_temp.run_as(101,'SELECT current_user::text',true),'postgres','privileged path tests retain table-owner role');
SELECT is((SELECT count(*)::integer FROM pg_trigger WHERE tgrelid='public.submissions'::regclass AND NOT tgisinternal),2,'one receipt guard and one habit trigger');
SELECT ok(NOT has_function_privilege('anon','public.record_quiz_attempt_grade_v1(uuid)','EXECUTE'),'anonymous cannot call quiz receipt RPC');
SELECT ok(NOT has_function_privilege('authenticated','public.submission_authority_phase_a_v1()','EXECUTE'),'receipt trigger is not a callable RPC');
SELECT ok(NOT has_function_privilege('service_role','public.record_quiz_attempt_grade_v1(uuid)','EXECUTE'),'legacy service-only quiz RPC path is closed');

SELECT lives_ok($$SELECT pg_temp.run_as(101,pg_temp.submission_sql(901,101,pg_temp.phase_id(101)::text||'/QA-owned.txt','File plus note'))$$,'owned object metadata and text produce a real assignment submission');
SELECT is((SELECT status::text FROM public.submissions WHERE id=pg_temp.phase_id(1001)),'submitted','forged graded status is normalized');
SELECT is((SELECT is_late FROM public.submissions WHERE id=pg_temp.phase_id(1001)),false,'forged late flag is normalized');
SELECT ok((SELECT submitted_at>'2026-01-01'::timestamptz AND plagiarism_score IS NULL FROM public.submissions WHERE id=pg_temp.phase_id(1001)),'browser timestamp and plagiarism result are not authority');
SELECT lives_ok($$SELECT pg_temp.run_as(101,pg_temp.submission_sql(902))$$,'nonblank text-only receipt succeeds');
SELECT is((SELECT count(*)::integer FROM public.habit_logs WHERE student_id=pg_temp.phase_id(101) AND habit_type='submit' AND date=(statement_timestamp() AT TIME ZONE 'UTC')::date),1,'two receipts create one UTC daily habit');
SELECT is((SELECT completed_at FROM public.habit_logs WHERE student_id=pg_temp.phase_id(101) AND habit_type='submit' AND date=(statement_timestamp() AT TIME ZONE 'UTC')::date),(SELECT submitted_at FROM public.submissions WHERE id=pg_temp.phase_id(1001)),'daily habit preserves the first accepted timestamp');

SELECT throws_ok($$SELECT pg_temp.run_as(102,pg_temp.submission_sql(903,101))$$,'42501',NULL,'cannot submit as another student');
SELECT throws_ok($$SELECT pg_temp.run_as(102,pg_temp.submission_sql(903,102))$$,'42501',NULL,'same institution does not grant enrollment');
SELECT throws_ok($$SELECT pg_temp.run_as(103,pg_temp.submission_sql(903,103))$$,'42501',NULL,'foreign institution does not grant assignment scope');
SELECT throws_ok($$SELECT pg_temp.run_as(201,pg_temp.submission_sql(903,201))$$,'42501',NULL,'teacher cannot create learner receipt as themselves');
UPDATE public.profiles SET is_active=false WHERE id=pg_temp.phase_id(101);
SELECT throws_ok($$SELECT pg_temp.run_as(101,pg_temp.submission_sql(903))$$,'42501',NULL,'inactive student cannot submit');
SELECT is(pg_temp.run_as(101,format('SELECT count(*)::text FROM public.submissions WHERE id=%L',pg_temp.phase_id(1001))),'0','inactive owner cannot read historical submission');
SELECT is(pg_temp.run_as(101,format('SELECT count(*)::text FROM storage.objects WHERE bucket_id=%L AND name=%L','submissions',pg_temp.phase_id(101)::text||'/QA-owned.txt')),'0','inactive owner cannot read submission bucket object');
-- Build literal historical values as fixture owner so inactive SELECT filtering
-- cannot turn this attack into an empty INSERT ... SELECT and a false positive.
SELECT throws_ok(format('SELECT pg_temp.run_as(101,%L)',(SELECT format('INSERT INTO public.habit_logs(student_id,habit_type,date,completed_at) VALUES(%L,%L,%L,%L) RETURNING id::text',s.student_id,'submit',(s.submitted_at AT TIME ZONE 'UTC')::date,s.submitted_at) FROM public.submissions s WHERE s.id=pg_temp.phase_id(1103))),'42501',NULL,'inactive owner cannot mint a matching historical submit habit');
UPDATE public.profiles SET is_active=true WHERE id=pg_temp.phase_id(101);
SELECT lives_ok($$SELECT pg_temp.run_as(101,format('INSERT INTO public.habit_logs(student_id,habit_type,date,completed_at) VALUES(%L,%L,(statement_timestamp() AT TIME ZONE %L)::date,statement_timestamp()) ON CONFLICT(student_id,habit_type,date) DO UPDATE SET completed_at=EXCLUDED.completed_at RETURNING id::text',pg_temp.phase_id(101),'login','UTC'))$$,'other habit types retain their existing active-owner write path');
UPDATE public.student_courses SET status='dropped' WHERE student_id=pg_temp.phase_id(101);
SELECT throws_ok($$SELECT pg_temp.run_as(101,pg_temp.submission_sql(903))$$,'42501',NULL,'dropped enrollment blocks new submission');
SELECT is(pg_temp.run_as(101,format('SELECT count(*)::text FROM public.submissions WHERE id=%L',pg_temp.phase_id(1001))),'1','active owner retains accepted history after unenrollment');
SELECT lives_ok($$SELECT pg_temp.run_as(201,pg_temp.grade_sql(1001,201))$$,'authorized taught-course grading remains possible after learner unenrollment');
UPDATE public.student_courses SET status='active' WHERE student_id=pg_temp.phase_id(101);
UPDATE public.courses SET is_active=false WHERE id=pg_temp.phase_id(701);
SELECT throws_ok($$SELECT pg_temp.run_as(101,pg_temp.submission_sql(903))$$,'42501',NULL,'inactive course blocks new submission');
SELECT is(pg_temp.run_as(101,format('SELECT count(*)::text FROM public.submissions WHERE id=%L',pg_temp.phase_id(1001))),'1','inactive historical course does not hide owner receipt');
UPDATE public.courses SET is_active=true WHERE id=pg_temp.phase_id(701);
UPDATE public.programs SET is_active=false WHERE id=pg_temp.phase_id(601);
SELECT throws_ok($$SELECT pg_temp.run_as(101,pg_temp.submission_sql(903))$$,'42501',NULL,'inactive program blocks new submission');
UPDATE public.programs SET is_active=true WHERE id=pg_temp.phase_id(601);

-- Approved populated-grade report-reader contract; no grading or raw-answer grant.
SELECT is(pg_temp.run_as(501,format('SELECT count(*)::text FROM public.grades WHERE id=%L',pg_temp.phase_id(1302))),'1','active institution admin reads a populated source-scoped grade');
SELECT is(pg_temp.run_as(401,format('SELECT count(*)::text FROM public.grades WHERE id=%L',pg_temp.phase_id(1302))),'1','active assigned coordinator reads a populated source-scoped grade');
UPDATE public.profiles SET institution_id=pg_temp.phase_id(2) WHERE id=pg_temp.phase_id(501);
SELECT is(pg_temp.run_as(501,format('SELECT count(*)::text FROM public.grades WHERE id=%L',pg_temp.phase_id(1302))),'0','foreign institution admin cannot read grade');
UPDATE public.profiles SET institution_id=pg_temp.phase_id(1) WHERE id=pg_temp.phase_id(501);
UPDATE public.profiles SET institution_id=pg_temp.phase_id(2) WHERE id=pg_temp.phase_id(401);
SELECT is(pg_temp.run_as(401,format('SELECT count(*)::text FROM public.grades WHERE id=%L',pg_temp.phase_id(1302))),'0','assigned coordinator in wrong institution cannot read grade');
UPDATE public.profiles SET institution_id=pg_temp.phase_id(1) WHERE id=pg_temp.phase_id(401);
UPDATE public.programs SET coordinator_id=NULL WHERE id=pg_temp.phase_id(601);
SELECT is(pg_temp.run_as(401,format('SELECT count(*)::text FROM public.grades WHERE id=%L',pg_temp.phase_id(1302))),'0','unassigned same-institution coordinator cannot read grade');
UPDATE public.programs SET coordinator_id=pg_temp.phase_id(401) WHERE id=pg_temp.phase_id(601);
UPDATE public.profiles SET is_active=false WHERE id=pg_temp.phase_id(501);
SELECT is(pg_temp.run_as(501,format('SELECT count(*)::text FROM public.grades WHERE id=%L',pg_temp.phase_id(1302))),'0','inactive admin cannot read grade');
UPDATE public.profiles SET is_active=true WHERE id=pg_temp.phase_id(501);
UPDATE public.profiles SET is_active=false WHERE id=pg_temp.phase_id(401);
SELECT is(pg_temp.run_as(401,format('SELECT count(*)::text FROM public.grades WHERE id=%L',pg_temp.phase_id(1302))),'0','inactive assigned coordinator cannot read grade');
UPDATE public.profiles SET is_active=true WHERE id=pg_temp.phase_id(401);
SELECT is(pg_temp.run_as(101,format('SELECT count(*)::text FROM public.grades WHERE id=%L',pg_temp.phase_id(1302))),'1','active historical owner retains grade read');
SELECT is(pg_temp.run_as(301,format('SELECT count(*)::text FROM public.grades WHERE id=%L',pg_temp.phase_id(1302))),'1','verified linked parent retains grade read');
SELECT is(pg_temp.run_as(201,format('SELECT count(*)::text FROM public.grades WHERE id=%L',pg_temp.phase_id(1302))),'1','taught-course teacher retains grade read');
SELECT is(pg_temp.run_as(302,format('SELECT count(*)::text FROM public.grades WHERE id=%L',pg_temp.phase_id(1302))),'0','unverified parent still cannot read grade');
SELECT throws_ok($$SELECT pg_temp.run_as(501,pg_temp.grade_sql(1002,501))$$,'42501',NULL,'admin report access does not grant grading writes');
SELECT throws_ok($$SELECT pg_temp.run_as(401,pg_temp.grade_sql(1002,401))$$,'42501',NULL,'coordinator report access does not grant grading writes');
SELECT is(pg_temp.run_as(501,format('SELECT count(*)::text FROM public.quiz_attempts WHERE id=%L',pg_temp.phase_id(1201))),'0','admin grade report access does not expose raw quiz attempts');
SELECT is(pg_temp.run_as(401,format('SELECT count(*)::text FROM public.quiz_attempts WHERE id=%L',pg_temp.phase_id(1201))),'0','coordinator grade report access does not expose raw quiz attempts');

-- Each fixture UPDATE and actual receipt execute inside ONE SQL statement, sharing
-- statement_timestamp(). No sleep or production-clock substitution is involved.
SELECT lives_ok($$SELECT pg_temp.window_receipt(903,'0 seconds',false,0)$$,'exact due instant accepted');
SELECT lives_ok($$SELECT pg_temp.window_receipt(904,'-2 hours',true,2)$$,'exact configured late close accepted');
SELECT is((SELECT is_late FROM public.submissions WHERE id=pg_temp.phase_id(1004)),true,'accepted late receipt has server is_late');
SELECT throws_ok($$SELECT pg_temp.window_receipt(905,'-2 hours -1 microsecond',true,2)$$,'42501',NULL,'one microsecond beyond late close rejected');
SELECT throws_ok($$SELECT pg_temp.window_receipt(906,'-1 microsecond',false,24)$$,'42501',NULL,'late disallowed overrides a positive window');
SELECT throws_ok($$SELECT pg_temp.window_receipt(907,'-1 microsecond',true,0)$$,'42501',NULL,'zero window grants no grace');
SELECT throws_ok($$SELECT pg_temp.window_receipt(908,'1 day',true,-1)$$,'22023',NULL,'negative stored window is rejected even before due');
SELECT lives_ok($$SELECT pg_temp.extension_receipt(910,'1 hour','-1 hour',false,0)$$,'exact student/assignment stored extension shifts deadline without invented duration');
SELECT lives_ok($$SELECT pg_temp.extension_receipt(911,'0 seconds','-1 hour',false,0)$$,'exact extended due instant accepted');
SELECT throws_ok($$SELECT pg_temp.extension_receipt(912,'1 hour','-1 hour',false,0)$$,'42501',NULL,'other learner extension ignored');
SELECT throws_ok($$SELECT pg_temp.extension_receipt(913,'1 hour','-1 hour',false,0)$$,'42501',NULL,'revoked extension ignored');
SELECT throws_ok($$SELECT pg_temp.window_receipt(915,'-1 hour',false,0)$$,'42501',NULL,'other assignment extension ignored');
SELECT lives_ok($$SELECT pg_temp.extension_receipt(916,'-2 hours','-6 hours',true,2)$$,'extension plus exact configured late close accepted');
SELECT throws_ok($$SELECT pg_temp.extension_receipt(917,'-2 hours','1 hour',false,0)$$,'22023',NULL,'stale extension cannot shorten a rescheduled assignment deadline silently');
SELECT throws_ok($$SELECT pg_temp.run_as(101,format('INSERT INTO public.deadline_extensions(student_id,assignment_id,purchase_id,original_deadline,extended_deadline) VALUES(%L,%L,%L,now(),now()+interval %L) RETURNING id::text',pg_temp.phase_id(101),pg_temp.phase_id(918),pg_temp.phase_id(1501),'1 day'))$$,'42501',NULL,'no new client extension writer granted');

SELECT throws_ok($$SELECT pg_temp.run_as(101,pg_temp.submission_sql(909,101,NULL,E' \n\t'))$$,'23514',NULL,'whitespace without a file rejected');
SELECT throws_ok($$SELECT pg_temp.run_as(101,pg_temp.submission_sql(909,101,pg_temp.phase_id(102)::text||'/QA-owned.txt'))$$,'23514',NULL,'foreign object prefix rejected despite metadata existence');
SELECT throws_ok($$SELECT pg_temp.run_as(101,pg_temp.submission_sql(909,101,'https://example.invalid/QA-owned.txt'))$$,'23514',NULL,'full URL is not an object key');
SELECT throws_ok($$SELECT pg_temp.run_as(101,pg_temp.submission_sql(909,101,pg_temp.phase_id(101)::text||'/../QA-owned.txt'))$$,'23514',NULL,'path traversal rejected');
SELECT throws_ok($$SELECT pg_temp.run_as(101,pg_temp.submission_sql(909,101,pg_temp.phase_id(101)::text||'//QA-owned.txt'))$$,'23514',NULL,'empty path segment rejected');
SELECT throws_ok($$SELECT pg_temp.run_as(101,pg_temp.submission_sql(909,101,pg_temp.phase_id(101)::text||'/missing.txt'))$$,'23514',NULL,'missing Storage metadata rejected');
SELECT throws_ok($$SELECT pg_temp.run_as(101,format('INSERT INTO public.submissions(student_id,text_content) VALUES(%L,%L) RETURNING id::text',pg_temp.phase_id(101),'No source'))$$,'23514',NULL,'no academic source rejected');
SELECT throws_ok($$SELECT pg_temp.run_as(101,format('INSERT INTO public.submissions(student_id,assignment_id,quiz_attempt_id,text_content) VALUES(%L,%L,%L,%L) RETURNING id::text',pg_temp.phase_id(101),pg_temp.phase_id(909),pg_temp.phase_id(1202),'Two sources'))$$,'23514',NULL,'dual academic sources rejected');

SELECT is(pg_temp.run_as(201,format('SELECT count(*)::text FROM public.submissions WHERE id=%L',pg_temp.phase_id(1001))),'1','teacher reads taught-course receipt');
SELECT is(pg_temp.run_as(202,format('SELECT count(*)::text FROM public.submissions WHERE id=%L',pg_temp.phase_id(1001))),'0','foreign-course teacher cannot read receipt');
SELECT is(pg_temp.run_as(301,format('SELECT count(*)::text FROM public.submissions WHERE id=%L',pg_temp.phase_id(1001))),'1','verified linked parent retains academic read');
SELECT is(pg_temp.run_as(302,format('SELECT count(*)::text FROM public.submissions WHERE id=%L',pg_temp.phase_id(1001))),'0','unverified parent cannot read receipt');
SELECT is(pg_temp.run_as(101,format('WITH changed AS(UPDATE public.submissions SET text_content=%L WHERE id=%L RETURNING id) SELECT count(*)::text FROM changed','Replacement',pg_temp.phase_id(1001))),'0','student cannot replace accepted content');
SELECT is(pg_temp.run_as(101,format('WITH changed AS(DELETE FROM public.submissions WHERE id=%L RETURNING id) SELECT count(*)::text FROM changed',pg_temp.phase_id(1001))),'0','student cannot delete accepted receipt');
SELECT throws_ok($$SELECT pg_temp.run_as(501,format('UPDATE public.submissions SET text_content=%L WHERE id=%L RETURNING id::text','Replacement',pg_temp.phase_id(1001)),true)$$,'55000',NULL,'privileged retarget/content path also denied');
SELECT throws_ok($$SELECT pg_temp.run_as(101,format('UPDATE public.habit_logs SET completed_at=completed_at+interval %L WHERE student_id=%L AND habit_type=%L RETURNING id::text','1 second',pg_temp.phase_id(101),'submit'))$$,'55000',NULL,'client cannot overwrite daily first completion');
SELECT throws_ok($$SELECT pg_temp.run_as(101,format('INSERT INTO public.habit_logs(student_id,habit_type,date,completed_at) VALUES(%L,%L,%L,%L) RETURNING id::text',pg_temp.phase_id(101),'submit','2001-01-01','2001-01-01T01:00:00Z'))$$,'23514',NULL,'fabricated submit habit has no receipt');
SELECT throws_ok($$DO $rollback$ BEGIN PERFORM pg_temp.run_as(103,pg_temp.submission_sql(932,103)); RAISE EXCEPTION 'deliberate rollback'; END; $rollback$;$$,'P0001','deliberate rollback','statement rollback undoes actual submission and habit together');
SELECT is((SELECT count(*)::integer FROM public.submissions WHERE id=pg_temp.phase_id(1032)),0,'rolled-back receipt absent');
SELECT is((SELECT count(*)::integer FROM public.habit_logs WHERE student_id=pg_temp.phase_id(103)),0,'rolled-back new daily habit absent');

SELECT throws_ok($$SELECT pg_temp.run_as(202,pg_temp.grade_sql(1002,202))$$,'42501',NULL,'same-institution unrelated teacher cannot write grade with own attribution');
SELECT throws_ok($$SELECT pg_temp.run_as(203,pg_temp.grade_sql(1002,203))$$,'42501',NULL,'foreign-institution teacher cannot write grade');
SELECT throws_ok($$SELECT pg_temp.run_as(204,pg_temp.grade_sql(1002,204))$$,'42501',NULL,'inactive teacher cannot write grade');
SELECT throws_ok($$SELECT pg_temp.run_as(201,pg_temp.grade_sql(1002,202))$$,'42501',NULL,'taught-course teacher cannot impersonate another grader');
SELECT throws_ok($$SELECT pg_temp.run_as(202,pg_temp.grade_sql(1002,202),true)$$,'42501',NULL,'privileged assignment grading still requires taught-source actor');
SELECT is(pg_temp.run_as(202,format('SELECT count(*)::text FROM public.grades WHERE id=%L',pg_temp.phase_id(1302))),'0','legacy forged attribution grants no read shortcut');
SELECT is(pg_temp.run_as(202,format('WITH changed AS(UPDATE public.grades SET total_score=9 WHERE id=%L RETURNING id) SELECT count(*)::text FROM changed',pg_temp.phase_id(1302))),'0','legacy forged attribution grants no update shortcut');
SELECT throws_ok($$SELECT pg_temp.run_as(201,format('UPDATE public.grades SET submission_id=%L WHERE submission_id=%L RETURNING id::text',pg_temp.phase_id(1002),pg_temp.phase_id(1001)))$$,'55000',NULL,'authorized grader cannot retarget a grade');
SELECT is(pg_temp.run_as(201,format('WITH changed AS(DELETE FROM public.grades WHERE submission_id=%L RETURNING id) SELECT count(*)::text FROM changed',pg_temp.phase_id(1001))),'0','no direct teacher grade deletion policy');

SELECT lives_ok($$SELECT pg_temp.run_as(101,format('INSERT INTO public.quiz_attempts(id,quiz_id,student_id,started_at,attempt_number,mode) VALUES(%L,%L,%L,%L,999,%L) RETURNING id::text',pg_temp.phase_id(1210),pg_temp.phase_id(801),pg_temp.phase_id(101),'2000-01-01','graded'))$$,'empty scoped quiz opening only (not a working finalizer)');
SELECT is((SELECT attempt_number FROM public.quiz_attempts WHERE id=pg_temp.phase_id(1210)),4,'ordinal is server-derived rather than client 999');
SELECT ok((SELECT started_at>'2026-01-01'::timestamptz AND score IS NULL AND submitted_at IS NULL FROM public.quiz_attempts WHERE id=pg_temp.phase_id(1210)),'empty opening has server timestamp and no fabricated completion');
SELECT throws_ok($$SELECT pg_temp.run_as(101,format('INSERT INTO public.quiz_attempts(quiz_id,student_id,score) VALUES(%L,%L,100) RETURNING id::text',pg_temp.phase_id(801),pg_temp.phase_id(101)))$$,'55000',NULL,'forged own score INSERT is contained');
SELECT throws_ok($$SELECT pg_temp.run_as(101,format('INSERT INTO public.quiz_attempts(quiz_id,student_id,submitted_at) VALUES(%L,%L,now()) RETURNING id::text',pg_temp.phase_id(801),pg_temp.phase_id(101)))$$,'55000',NULL,'forged own completion INSERT is contained');
SELECT throws_ok($$SELECT pg_temp.run_as(101,format('INSERT INTO public.quiz_attempts(quiz_id,student_id,answers) VALUES(%L,%L,%L) RETURNING id::text',pg_temp.phase_id(801),pg_temp.phase_id(101),'{"q":"answer"}'))$$,'55000',NULL,'prefilled answers cannot become a trusted opening');
SELECT throws_ok($$SELECT pg_temp.run_as(101,format('INSERT INTO public.quiz_attempts(quiz_id,student_id,question_sequence) VALUES(%L,%L,%L) RETURNING id::text',pg_temp.phase_id(801),pg_temp.phase_id(101),'["forged"]'))$$,'55000',NULL,'forged question provenance is contained');
SELECT throws_ok($$SELECT pg_temp.run_as(101,format('INSERT INTO public.quiz_attempts(quiz_id,student_id) VALUES(%L,%L) RETURNING id::text',pg_temp.phase_id(802),pg_temp.phase_id(101)))$$,'42501',NULL,'opening must belong to enrolled course');
SELECT throws_ok($$SELECT pg_temp.run_as(101,format('INSERT INTO public.quiz_attempts(quiz_id,student_id) VALUES(%L,%L) RETURNING id::text',pg_temp.phase_id(804),pg_temp.phase_id(101)))$$,'42501',NULL,'unpublished quiz cannot open');
SELECT throws_ok($$SELECT pg_temp.run_as(101,format('UPDATE public.quiz_attempts SET score=100 WHERE id=%L RETURNING id::text',pg_temp.phase_id(1210)),true)$$,'55000',NULL,'privileged legacy producer cannot finalize attempt');
SELECT throws_ok($$SELECT pg_temp.run_as(101,format('DELETE FROM public.quiz_attempts WHERE id=%L RETURNING id::text',pg_temp.phase_id(1210)),true)$$,'55000',NULL,'privileged deletion cannot erase attempt history');
SELECT is(pg_temp.run_as(101,format('WITH changed AS(UPDATE public.quiz_attempts SET mode=%L WHERE id=%L RETURNING id) SELECT count(*)::text FROM changed','practice',pg_temp.phase_id(1210))),'0','no direct student attempt UPDATE permission');
SELECT is(pg_temp.run_as(101,format('SELECT public.record_quiz_attempt_grade_v1(%L)::text',pg_temp.phase_id(1201))),pg_temp.phase_id(1101)::text,'authorized historical graded receipt returns existing submission ID');
SELECT is(pg_temp.run_as(201,format('SELECT public.record_quiz_attempt_grade_v1(%L)::text',pg_temp.phase_id(1201))),pg_temp.phase_id(1101)::text,'taught-source teacher retains historical quiz receipt');
SELECT throws_ok($$SELECT pg_temp.run_as(102,format('SELECT public.record_quiz_attempt_grade_v1(%L)::text',pg_temp.phase_id(1201)))$$,'55000',NULL,'foreign caller cannot obtain graded receipt');
SELECT throws_ok($$SELECT pg_temp.run_as(101,format('SELECT public.record_quiz_attempt_grade_v1(%L)::text',pg_temp.phase_id(1202)))$$,'55000',NULL,'old client score cannot create official grade');
SELECT throws_ok($$SELECT pg_temp.run_as(101,format('INSERT INTO public.submissions(student_id,quiz_attempt_id) VALUES(%L,%L) RETURNING id::text',pg_temp.phase_id(101),pg_temp.phase_id(1202)),true)$$,'55000',NULL,'privileged alternate quiz-submission creation is contained');
SELECT throws_ok($$SELECT pg_temp.run_as(201,pg_temp.grade_sql(1102,201),true)$$,'55000',NULL,'privileged grade insert against existing quiz submission is contained');
SELECT throws_ok($$SELECT pg_temp.run_as(201,format('UPDATE public.grades SET total_score=10 WHERE id=%L RETURNING id::text',pg_temp.phase_id(1301)),true)$$,'55000',NULL,'privileged historical quiz grade change is contained');
SELECT throws_ok($$SELECT pg_temp.run_as(201,format('DELETE FROM public.grades WHERE id=%L RETURNING id::text',pg_temp.phase_id(1301)),true)$$,'55000',NULL,'privileged quiz-grade deletion is contained');
SELECT is((SELECT score FROM public.quiz_attempts WHERE id=pg_temp.phase_id(1201)),75::numeric,'historical RPC did not rewrite score');
SELECT is((SELECT count(*)::integer FROM public.grades WHERE submission_id=pg_temp.phase_id(1102)),0,'alternate path did not produce grade');

SELECT is(pg_temp.run_as(201,format('SELECT count(*)::text FROM storage.objects WHERE bucket_id=%L AND name=%L','submissions',pg_temp.phase_id(101)::text||'/QA-owned.txt')),'1','teacher can read referenced taught-source object metadata');
SELECT is(pg_temp.run_as(202,format('SELECT count(*)::text FROM storage.objects WHERE bucket_id=%L AND name=%L','submissions',pg_temp.phase_id(101)::text||'/QA-owned.txt')),'0','same institution teacher cannot read another course file');
SELECT is(pg_temp.run_as(201,format('SELECT count(*)::text FROM storage.objects WHERE bucket_id=%L AND name=%L','submissions',pg_temp.phase_id(101)::text||'/QA-unreferenced.txt')),'0','teacher cannot read unsubmitted files by student institution');
SELECT is(pg_temp.run_as(101,format('SELECT count(*)::text FROM storage.objects WHERE bucket_id=%L AND name=%L','submissions',pg_temp.phase_id(102)::text||'/QA-owned.txt')),'0','legacy forged metadata reference does not grant foreign file read');
SELECT is(pg_temp.run_as(301,format('SELECT count(*)::text FROM storage.objects WHERE bucket_id=%L AND name=%L','submissions',pg_temp.phase_id(101)::text||'/QA-owned.txt')),'0','linked parent is not newly granted raw file access');
SELECT lives_ok($$SELECT pg_temp.run_as(101,format('INSERT INTO storage.objects(bucket_id,name) VALUES(%L,%L) RETURNING id::text','submissions',pg_temp.phase_id(101)::text||'/QA-new.txt'))$$,'active student can insert owned object metadata');
SELECT throws_ok($$SELECT pg_temp.run_as(102,format('INSERT INTO storage.objects(bucket_id,name) VALUES(%L,%L) RETURNING id::text','submissions',pg_temp.phase_id(101)::text||'/QA-foreign.txt'))$$,'42501',NULL,'foreign object prefix INSERT denied');
SELECT is(pg_temp.run_as(101,format('WITH changed AS(UPDATE storage.objects SET name=%L WHERE bucket_id=%L AND name=%L RETURNING id) SELECT count(*)::text FROM changed',pg_temp.phase_id(101)::text||'/QA-renamed.txt','submissions',pg_temp.phase_id(101)::text||'/QA-owned.txt')),'0','no new submission object UPDATE grant');
-- Official Storage v1.69.11 migration 0055 installs a statement-level SQL DELETE
-- guard, even for zero affected rows. This is not proof of Storage API deletion RLS.
-- https://github.com/supabase/storage/blob/v1.69.11/migrations/tenant/0055-prevent-direct-deletes.sql
SELECT throws_ok($$SELECT pg_temp.run_as(101,format('WITH changed AS(DELETE FROM storage.objects WHERE bucket_id=%L AND name=%L RETURNING id) SELECT count(*)::text FROM changed','submissions',pg_temp.phase_id(101)::text||'/QA-owned.txt'))$$,'42501','Direct deletion from storage tables is not allowed. Use the Storage API instead.','official Storage SQL DELETE guard rejects direct deletion; API deletion remains unverified');

SELECT * FROM finish();
ROLLBACK;
