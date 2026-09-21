-- Phase A: assignment receipts and paired academic authorization.
-- Quiz writes are CONTAINED, not completed quiz functionality. No standalone rollout:
-- pair with frontend receipt/habit handling and honest Edge/UI containment errors.
-- No native score conversion, extension producer, status/XP writer or revision model.
BEGIN;

DO $preflight$
DECLARE r record; c text; actual text[];
BEGIN
  FOR r IN SELECT key AS relation_name,value AS columns FROM jsonb_each('{
    "public.profiles":["id","role","institution_id","is_active"],
    "public.programs":["id","institution_id","coordinator_id","is_active"],
    "public.courses":["id","program_id","teacher_id","is_active"],
    "public.student_courses":["student_id","course_id","status"],
    "public.assignments":["id","course_id","due_date","is_late_allowed","late_window_hours"],
    "public.deadline_extensions":["student_id","assignment_id","extended_deadline","revoked"],
    "public.submissions":["id","student_id","assignment_id","quiz_attempt_id","file_url","text_content","submitted_at","is_late","status","plagiarism_score"],
    "public.habit_logs":["student_id","habit_type","date","completed_at"],
    "public.quizzes":["id","course_id","is_published","practice_mode_enabled"],
    "public.quiz_attempts":["id","student_id","quiz_id","answers","score","started_at","submitted_at","attempt_number","mode","question_sequence","difficulty_trajectory","per_question_times","blooms_climb_state"],
    "public.grades":["id","submission_id","graded_by"],
    "public.parent_student_links":["parent_id","student_id","verified"],
    "storage.objects":["bucket_id","name"]
  }'::jsonb) LOOP
    IF to_regclass(r.relation_name) IS NULL THEN RAISE EXCEPTION 'Missing Phase A relation: %',r.relation_name; END IF;
    FOR c IN SELECT jsonb_array_elements_text(r.columns) LOOP
      IF NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass(r.relation_name) AND attname=c AND attnum>0 AND NOT attisdropped) THEN
        RAISE EXCEPTION 'Missing Phase A column: %.%',r.relation_name,c;
      END IF;
    END LOOP;
  END LOOP;
  FOR r IN SELECT * FROM (VALUES
    ('public.submissions',ARRAY['submissions_read','submissions_student_own']::text[]),
    ('public.grades',ARRAY['grades_read','grades_teacher_write']::text[]),
    ('public.quiz_attempts',ARRAY['quiz_attempts_student_insert','quiz_attempts_student_read','quiz_attempts_teacher_read']::text[])
  ) x(relation_name,policies) LOOP
    SELECT array_agg(polname::text ORDER BY polname::text) INTO actual FROM pg_policy WHERE polrelid=to_regclass(r.relation_name);
    IF actual IS DISTINCT FROM r.policies THEN RAISE EXCEPTION 'Unexpected Phase A policy topology: % (%)',r.relation_name,actual; END IF;
  END LOOP;
  IF EXISTS(SELECT 1 FROM pg_class WHERE oid IN ('public.submissions'::regclass,'public.grades'::regclass,'public.quiz_attempts'::regclass,'public.habit_logs'::regclass,'public.deadline_extensions'::regclass,'storage.objects'::regclass) AND NOT relrowsecurity) THEN
    RAISE EXCEPTION 'Phase A requires enabled RLS';
  END IF;
  IF EXISTS(SELECT 1 FROM pg_policy WHERE polrelid='public.deadline_extensions'::regclass AND polcmd<>'r') THEN
    RAISE EXCEPTION 'Unexpected client extension writer';
  END IF;
  IF EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.submissions'::regclass AND NOT tgisinternal AND tgname<>'trg_habit_signals_on_submission') THEN
    RAISE EXCEPTION 'Unknown submission trigger; explicit compatibility review required';
  END IF;
  IF EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.submissions'::regclass AND NOT tgisinternal AND tgname='trg_habit_signals_on_submission' AND
    (tgfoid IS DISTINCT FROM to_regprocedure('public.generate_habit_signals_from_submission_v1()') OR tgtype<>5 OR tgenabled<>'O' OR tgnargs<>0 OR tgqual IS NOT NULL OR tgoldtable IS NOT NULL OR tgnewtable IS NOT NULL)) THEN
    RAISE EXCEPTION 'Unexpected canonical habit trigger binding';
  END IF;
  IF EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid IN ('public.quiz_attempts'::regclass,'public.habit_logs'::regclass) AND NOT tgisinternal AND (tgtype::integer & 2)<>0) OR
     EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.grades'::regclass AND NOT tgisinternal AND (tgtype::integer & 2)<>0 AND (tgtype::integer & 28)<>0) THEN
    RAISE EXCEPTION 'Unknown BEFORE authority trigger; explicit compatibility review required';
  END IF;
  FOR r IN SELECT * FROM (VALUES
    ('public.submissions',ARRAY['assignment_id','student_id']::text[]),
    ('public.habit_logs',ARRAY['student_id','habit_type','date']::text[]),
    ('public.deadline_extensions',ARRAY['student_id','assignment_id']::text[]),
    ('public.quiz_attempts',ARRAY['quiz_id','student_id','attempt_number']::text[])
  ) x(relation_name,column_names) LOOP
    IF NOT EXISTS(SELECT 1 FROM pg_constraint pc WHERE pc.conrelid=to_regclass(r.relation_name) AND pc.contype IN ('u','p') AND NOT pc.condeferrable AND pc.convalidated AND
      pc.conkey=(SELECT array_agg(a.attnum ORDER BY u.ord)::smallint[] FROM unnest(r.column_names) WITH ORDINALITY u(name,ord) JOIN pg_attribute a ON a.attrelid=pc.conrelid AND a.attname=u.name AND NOT a.attisdropped)) THEN
      RAISE EXCEPTION 'Missing immediate identity constraint: % (%)',r.relation_name,r.column_names;
    END IF;
  END LOOP;
  IF NOT EXISTS(SELECT 1 FROM pg_policy WHERE polrelid='storage.objects'::regclass AND polname='submissions_student_read' AND polcmd='r') OR
     NOT EXISTS(SELECT 1 FROM pg_policy WHERE polrelid='storage.objects'::regclass AND polname='submissions_teacher_read' AND polcmd='r') OR
     NOT EXISTS(SELECT 1 FROM pg_policy WHERE polrelid='storage.objects'::regclass AND polname='submissions_student_upload' AND polcmd='a') THEN
    RAISE EXCEPTION 'Unexpected submission-bucket policy topology';
  END IF;
END;
$preflight$;

-- These narrow owned helpers read protected tables directly and return booleans.
-- No policy-to-policy recursion; current profile is authority, not user metadata.
CREATE FUNCTION public.submission_actor_active_v1() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $fn$
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND is_active IS TRUE);
$fn$;

CREATE FUNCTION public.submission_course_scope_v1(p_course_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $fn$
  SELECT EXISTS(SELECT 1 FROM public.profiles actor
    JOIN public.student_courses sc ON sc.student_id=actor.id
    JOIN public.courses c ON c.id=sc.course_id
    JOIN public.programs pr ON pr.id=c.program_id
    WHERE actor.id=auth.uid() AND actor.is_active IS TRUE AND actor.role::text='student'
      AND sc.status='active' AND c.id=p_course_id AND c.is_active IS TRUE AND pr.is_active IS TRUE
      AND pr.institution_id=actor.institution_id);
$fn$;

-- p_oversight enables approved source-scoped submission/file/grade report reads.
-- It does not grant grading writes or raw quiz-attempt/answer access.
-- Parents retain linked academic reads but are not granted raw file access.
CREATE FUNCTION public.submission_read_scope_v1(p_submission_id uuid,p_oversight boolean DEFAULT false,p_parent boolean DEFAULT true) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $fn$
  SELECT EXISTS(SELECT 1 FROM public.profiles actor JOIN public.submissions s ON s.id=p_submission_id
    WHERE actor.id=auth.uid() AND actor.is_active IS TRUE AND (
      s.student_id=actor.id OR
      (p_parent AND actor.role::text='parent' AND EXISTS(SELECT 1 FROM public.parent_student_links l WHERE l.parent_id=actor.id AND l.student_id=s.student_id AND l.verified IS TRUE)) OR
      EXISTS(SELECT 1 FROM public.courses c JOIN public.programs pr ON pr.id=c.program_id
        WHERE pr.institution_id=actor.institution_id AND (
          (s.assignment_id IS NOT NULL AND s.quiz_attempt_id IS NULL AND EXISTS(SELECT 1 FROM public.assignments a WHERE a.id=s.assignment_id AND a.course_id=c.id)) OR
          (s.assignment_id IS NULL AND s.quiz_attempt_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.quiz_attempts qa JOIN public.quizzes q ON q.id=qa.quiz_id WHERE qa.id=s.quiz_attempt_id AND qa.student_id=s.student_id AND q.course_id=c.id))
        ) AND ((actor.role::text='teacher' AND c.teacher_id=actor.id) OR
          (p_oversight AND ((actor.role::text='coordinator' AND pr.coordinator_id=actor.id) OR actor.role::text='admin'))))
    ));
$fn$;

CREATE FUNCTION public.assignment_grade_write_scope_phase_a_v1(p_submission_id uuid,p_graded_by uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $fn$
  SELECT p_graded_by=auth.uid() AND EXISTS(SELECT 1 FROM public.profiles actor
    JOIN public.submissions s ON s.id=p_submission_id
    JOIN public.assignments a ON a.id=s.assignment_id
    JOIN public.courses c ON c.id=a.course_id
    JOIN public.programs pr ON pr.id=c.program_id
    WHERE actor.id=auth.uid() AND actor.is_active IS TRUE AND actor.role::text='teacher'
      AND s.quiz_attempt_id IS NULL AND c.teacher_id=actor.id AND pr.institution_id=actor.institution_id);
$fn$;

CREATE FUNCTION public.submission_owned_key_v1(p_key text) RETURNS boolean
LANGUAGE sql STABLE SET search_path='' AS $fn$
  SELECT auth.uid() IS NOT NULL AND p_key ~ ('^'||auth.uid()::text||'/[A-Za-z0-9._/-]+$')
    AND p_key !~ '(^|/)\.{1,2}(/|$)' AND position('//' IN p_key)=0 AND right(p_key,1)<>'/';
$fn$;

CREATE FUNCTION public.submission_file_staff_read_v1(p_key text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $fn$
  SELECT EXISTS(SELECT 1 FROM public.profiles actor JOIN public.submissions s ON s.file_url=p_key
    WHERE actor.id=auth.uid() AND actor.is_active IS TRUE AND actor.role::text IN ('teacher','coordinator','admin')
      AND split_part(p_key,'/',1)=s.student_id::text AND public.submission_read_scope_v1(s.id,true,false));
$fn$;

CREATE FUNCTION public.quiz_start_scope_phase_a_v1(p_quiz_id uuid,p_mode text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $fn$
  SELECT EXISTS(SELECT 1 FROM public.quizzes q WHERE q.id=p_quiz_id AND q.is_published IS TRUE
    AND public.submission_course_scope_v1(q.course_id) AND p_mode IN ('graded','practice')
    AND (p_mode='graded' OR q.practice_mode_enabled IS TRUE));
$fn$;

CREATE FUNCTION public.quiz_attempt_read_scope_v1(p_attempt_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $fn$
  SELECT EXISTS(SELECT 1 FROM public.profiles actor JOIN public.quiz_attempts qa ON qa.id=p_attempt_id
    JOIN public.quizzes q ON q.id=qa.quiz_id JOIN public.courses c ON c.id=q.course_id JOIN public.programs pr ON pr.id=c.program_id
    WHERE actor.id=auth.uid() AND actor.is_active IS TRUE AND (qa.student_id=actor.id OR
      (actor.role::text='teacher' AND c.teacher_id=actor.id AND pr.institution_id=actor.institution_id)));
$fn$;

CREATE FUNCTION public.submission_authority_phase_a_v1() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE actor_id uuid:=auth.uid(); receipt timestamptz:=statement_timestamp(); due_at timestamptz; extension_at timestamptz; allow_late boolean; late_hours integer;
BEGIN
  IF TG_OP='DELETE' THEN
    IF OLD.quiz_attempt_id IS NOT NULL OR EXISTS(SELECT 1 FROM public.grades WHERE submission_id=OLD.id) THEN
      RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='Academic submission history cannot be deleted';
    END IF;
    RETURN OLD; -- No authenticated DELETE policy is granted.
  ELSIF TG_OP='UPDATE' THEN
    IF OLD.quiz_attempt_id IS NOT NULL OR NEW.quiz_attempt_id IS NOT NULL THEN
      IF NEW IS DISTINCT FROM OLD THEN RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='Quiz submission mutation is contained pending an authoritative finalizer'; END IF;
      RETURN NEW;
    END IF;
    IF ROW(NEW.id,NEW.student_id,NEW.assignment_id,NEW.quiz_attempt_id,NEW.file_url,NEW.text_content,NEW.submitted_at,NEW.is_late)
      IS DISTINCT FROM ROW(OLD.id,OLD.student_id,OLD.assignment_id,OLD.quiz_attempt_id,OLD.file_url,OLD.text_content,OLD.submitted_at,OLD.is_late) THEN
      RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='Submission source and receipt provenance are immutable';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status AND NOT(OLD.status::text='submitted' AND NEW.status::text='graded' AND EXISTS(SELECT 1 FROM public.grades WHERE submission_id=OLD.id)) THEN
      RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='Unsupported submission status transition';
    END IF;
    RETURN NEW; -- Existing privileged plagiarism/status writers only; no new authority.
  END IF;
  IF (NEW.assignment_id IS NULL)=(NEW.quiz_attempt_id IS NULL) THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='A submission must have exactly one academic source';
  END IF;
  IF NEW.quiz_attempt_id IS NOT NULL THEN
    RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='New official quiz submissions require an authoritative finalizer';
  END IF;
  IF actor_id IS NULL OR NEW.student_id IS DISTINCT FROM actor_id THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Submission actor is not authorized';
  END IF;
  SELECT a.due_date,a.is_late_allowed,a.late_window_hours INTO due_at,allow_late,late_hours
    FROM public.assignments a JOIN public.courses c ON c.id=a.course_id JOIN public.programs pr ON pr.id=c.program_id
    JOIN public.student_courses sc ON sc.course_id=c.id AND sc.student_id=actor_id JOIN public.profiles actor ON actor.id=sc.student_id
    WHERE a.id=NEW.assignment_id AND actor.role::text='student' AND actor.is_active IS TRUE
      AND sc.status='active' AND c.is_active IS TRUE AND pr.is_active IS TRUE AND actor.institution_id=pr.institution_id
    FOR SHARE OF a,c,pr,sc,actor;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Assignment submission scope is not authorized'; END IF;
  SELECT e.extended_deadline INTO extension_at FROM public.deadline_extensions e
    WHERE e.student_id=actor_id AND e.assignment_id=NEW.assignment_id AND e.revoked IS FALSE FOR SHARE OF e;
  IF FOUND THEN
    IF extension_at IS NULL OR NOT isfinite(extension_at) OR due_at IS NULL OR NOT isfinite(due_at) OR extension_at<due_at THEN
      RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Stored extension conflicts with assignment deadline; review rescheduling';
    END IF;
    due_at:=extension_at;
  END IF;
  -- Malformed configuration is rejected for this assignment, never clamped.
  IF due_at IS NULL OR NOT isfinite(due_at) OR allow_late IS NULL OR late_hours IS NULL OR late_hours<0 THEN
    RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Assignment submission deadline configuration is invalid';
  END IF;
  IF receipt>due_at AND (NOT allow_late OR receipt>due_at+make_interval(hours=>late_hours)) THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Assignment submission window is closed';
  END IF;
  IF NEW.file_url IS NOT NULL THEN
    IF public.submission_owned_key_v1(NEW.file_url) IS NOT TRUE THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Submission file key is not owned and canonical';
    END IF;
    PERFORM 1 FROM storage.objects o WHERE o.bucket_id='submissions' AND o.name=NEW.file_url FOR SHARE OF o;
    IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Submission file object does not exist'; END IF;
  END IF;
  -- One academic source; content may be a file, nonblank text, or both.
  IF NEW.file_url IS NULL AND (NEW.text_content IS NULL OR NEW.text_content !~ '[^[:space:]]') THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Submission requires a file or nonblank text';
  END IF;
  NEW.submitted_at:=receipt; NEW.is_late:=receipt>due_at;
  NEW.status:='submitted'::public.submission_status; NEW.plagiarism_score:=NULL;
  RETURN NEW;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.generate_habit_signals_from_submission_v1() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
BEGIN
  IF NEW.assignment_id IS NOT NULL THEN
    INSERT INTO public.habit_logs(student_id,habit_type,date,completed_at)
      VALUES(NEW.student_id,'submit',(NEW.submitted_at AT TIME ZONE 'UTC')::date,NEW.submitted_at)
      ON CONFLICT(student_id,habit_type,date) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$fn$;

-- Keep academic submit completion source-backed even when an old client upserts.
-- Other habit types and their existing policies are unchanged.
CREATE FUNCTION public.submission_habit_authority_phase_a_v1() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
BEGIN
  IF TG_OP IN ('UPDATE','DELETE') AND OLD.habit_type='submit' THEN
    IF TG_OP='DELETE' THEN RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='Accepted submission habit cannot be deleted'; END IF;
    IF NEW IS DISTINCT FROM OLD THEN RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='First accepted daily submission habit is immutable'; END IF;
    RETURN NEW;
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  IF NEW.habit_type='submit' THEN
    IF TG_OP='UPDATE' THEN RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='A habit cannot be retargeted to academic submission evidence'; END IF;
    IF public.submission_actor_active_v1() IS NOT TRUE THEN
      RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='An active account is required to record submission habit evidence';
    END IF;
    IF NOT EXISTS(SELECT 1 FROM public.submissions s WHERE s.student_id=NEW.student_id AND s.assignment_id IS NOT NULL AND s.quiz_attempt_id IS NULL
      AND s.submitted_at=NEW.completed_at AND (s.submitted_at AT TIME ZONE 'UTC')::date=NEW.date) THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Submission habit requires a matching accepted receipt';
    END IF;
  END IF;
  RETURN NEW;
END;
$fn$;

CREATE FUNCTION public.quiz_attempt_authority_phase_a_v1() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE actor_id uuid:=auth.uid(); ordinal bigint;
BEGIN
  IF TG_OP<>'INSERT' THEN RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='Quiz attempt mutation is contained pending an authoritative finalizer'; END IF;
  IF actor_id IS NULL OR NEW.student_id IS DISTINCT FROM actor_id OR public.quiz_start_scope_phase_a_v1(NEW.quiz_id,NEW.mode::text) IS NOT TRUE THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Quiz attempt opening is not authorized';
  END IF;
  IF NEW.score IS NOT NULL OR NEW.submitted_at IS NOT NULL OR NEW.answers IS DISTINCT FROM '{}'::jsonb
    OR coalesce(NEW.question_sequence,'[]'::jsonb)<>'[]'::jsonb OR coalesce(NEW.difficulty_trajectory,'[]'::jsonb)<>'[]'::jsonb
    OR coalesce(NEW.per_question_times,'[]'::jsonb)<>'[]'::jsonb OR coalesce(NEW.blooms_climb_state,'{}'::jsonb)<>'{}'::jsonb THEN
    RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='Untrusted quiz opening cannot contain answers results or completion provenance';
  END IF;
  -- Serialize ordinals, including first opening; no client ordinal entitlement.
  PERFORM 1 FROM public.profiles WHERE id=actor_id AND is_active IS TRUE AND role::text='student' FOR UPDATE;
  IF NOT FOUND OR public.quiz_start_scope_phase_a_v1(NEW.quiz_id,NEW.mode::text) IS NOT TRUE THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Quiz opening actor is no longer authorized';
  END IF;
  PERFORM 1 FROM public.quizzes q JOIN public.courses c ON c.id=q.course_id JOIN public.programs pr ON pr.id=c.program_id
    JOIN public.student_courses sc ON sc.course_id=c.id AND sc.student_id=actor_id JOIN public.profiles actor ON actor.id=sc.student_id
    WHERE q.id=NEW.quiz_id AND q.is_published IS TRUE AND c.is_active IS TRUE AND pr.is_active IS TRUE AND sc.status='active'
      AND actor.is_active IS TRUE AND actor.role::text='student' AND pr.institution_id=actor.institution_id
      AND (NEW.mode::text='graded' OR (NEW.mode::text='practice' AND q.practice_mode_enabled IS TRUE))
    FOR SHARE OF q,c,pr,sc;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Quiz opening scope is no longer authorized'; END IF;
  SELECT coalesce(max(attempt_number)::bigint,0)+1 INTO ordinal FROM public.quiz_attempts WHERE quiz_id=NEW.quiz_id AND student_id=actor_id;
  IF ordinal<1 OR ordinal>2147483647 THEN RAISE EXCEPTION USING ERRCODE='22003',MESSAGE='Quiz ordinal is outside supported range'; END IF;
  NEW.attempt_number:=ordinal::integer; NEW.started_at:=statement_timestamp();
  NEW.question_sequence:='[]'::jsonb; NEW.difficulty_trajectory:='[]'::jsonb;
  NEW.per_question_times:='[]'::jsonb; NEW.blooms_climb_state:='{}'::jsonb;
  RETURN NEW;
END;
$fn$;

CREATE FUNCTION public.grade_source_authority_phase_a_v1() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='Grade deletion requires an evidence-preserving lifecycle'; END IF;
  IF TG_OP='UPDATE' THEN
    IF ROW(NEW.id,NEW.submission_id,NEW.graded_by) IS DISTINCT FROM ROW(OLD.id,OLD.submission_id,OLD.graded_by) THEN
      RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='Grade source and attribution cannot be retargeted';
    END IF;
    IF EXISTS(SELECT 1 FROM public.submissions WHERE id=OLD.submission_id AND quiz_attempt_id IS NOT NULL) THEN
      RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='Quiz grade mutation is contained pending an authoritative finalizer';
    END IF;
  END IF;
  IF EXISTS(SELECT 1 FROM public.submissions WHERE id=NEW.submission_id AND quiz_attempt_id IS NOT NULL) THEN
    RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='New official quiz grades require an authoritative finalizer';
  END IF;
  IF NEW.graded_by IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Assignment grading source is not authorized'; END IF;
  PERFORM 1 FROM public.submissions s JOIN public.assignments a ON a.id=s.assignment_id
    JOIN public.courses c ON c.id=a.course_id JOIN public.programs pr ON pr.id=c.program_id
    JOIN public.profiles actor ON actor.id=auth.uid()
    WHERE s.id=NEW.submission_id AND s.quiz_attempt_id IS NULL AND actor.role::text='teacher' AND actor.is_active IS TRUE
      AND c.teacher_id=actor.id AND pr.institution_id=actor.institution_id
    FOR SHARE OF s,a,c,pr,actor;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Assignment grading source is not authorized'; END IF;
  RETURN NEW;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.record_quiz_attempt_grade_v1(p_attempt_id uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE receipt_id uuid;
BEGIN
  IF p_attempt_id IS NULL THEN RAISE EXCEPTION USING ERRCODE='22004',MESSAGE='Quiz attempt ID is required'; END IF;
  IF public.submission_actor_active_v1() IS NOT TRUE THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='An active authorized account is required'; END IF;
  SELECT s.id INTO receipt_id FROM public.submissions s JOIN public.grades g ON g.submission_id=s.id
    JOIN public.quiz_attempts qa ON qa.id=s.quiz_attempt_id AND qa.student_id=s.student_id
    WHERE qa.id=p_attempt_id AND s.assignment_id IS NULL AND public.submission_read_scope_v1(s.id,true,false) LIMIT 1;
  IF FOUND THEN RETURN receipt_id; END IF;
  RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='No authorized existing graded quiz receipt; new finalization is contained';
END;
$fn$;

DROP POLICY submissions_student_own ON public.submissions;
DROP POLICY submissions_read ON public.submissions;
-- RETURNING checks the proposed row before a self-table lookup can see it.
-- Keep the equivalent active-owner branch on row values; staff/parent use the helper.
CREATE POLICY submissions_history_scoped_v1 ON public.submissions FOR SELECT TO authenticated USING(
  (student_id=(SELECT auth.uid()) AND (SELECT public.submission_actor_active_v1()))
  OR public.submission_read_scope_v1(id,true,true));
CREATE POLICY submissions_student_insert_v1 ON public.submissions FOR INSERT TO authenticated WITH CHECK(
  student_id=(SELECT auth.uid()) AND assignment_id IS NOT NULL AND quiz_attempt_id IS NULL AND status='submitted'::public.submission_status
  AND submitted_at=statement_timestamp() AND plagiarism_score IS NULL
  AND EXISTS(SELECT 1 FROM public.assignments a WHERE a.id=assignment_id AND public.submission_course_scope_v1(a.course_id)));

DROP POLICY grades_teacher_write ON public.grades;
DROP POLICY grades_read ON public.grades;
CREATE POLICY grades_history_scoped_v1 ON public.grades FOR SELECT TO authenticated USING(public.submission_read_scope_v1(submission_id,true,true));
CREATE POLICY grades_teacher_insert_scoped_v1 ON public.grades FOR INSERT TO authenticated WITH CHECK(public.assignment_grade_write_scope_phase_a_v1(submission_id,graded_by));
CREATE POLICY grades_teacher_update_scoped_v1 ON public.grades FOR UPDATE TO authenticated USING(public.assignment_grade_write_scope_phase_a_v1(submission_id,graded_by)) WITH CHECK(public.assignment_grade_write_scope_phase_a_v1(submission_id,graded_by));

DROP POLICY quiz_attempts_student_insert ON public.quiz_attempts;
CREATE POLICY quiz_attempts_empty_opening_v1 ON public.quiz_attempts FOR INSERT TO authenticated WITH CHECK(
  student_id=(SELECT auth.uid()) AND public.quiz_start_scope_phase_a_v1(quiz_id,mode::text) AND score IS NULL AND submitted_at IS NULL
  AND started_at=statement_timestamp() AND answers='{}'::jsonb AND question_sequence='[]'::jsonb AND difficulty_trajectory='[]'::jsonb
  AND per_question_times='[]'::jsonb AND blooms_climb_state='{}'::jsonb);
DROP POLICY quiz_attempts_student_read ON public.quiz_attempts;
DROP POLICY quiz_attempts_teacher_read ON public.quiz_attempts;
CREATE POLICY quiz_attempts_history_scoped_v1 ON public.quiz_attempts FOR SELECT TO authenticated USING(
  (student_id=(SELECT auth.uid()) AND (SELECT public.submission_actor_active_v1()))
  OR public.quiz_attempt_read_scope_v1(id));

-- Exact submission bucket policies only. Other buckets and UPDATE/DELETE grants unchanged.
DROP POLICY submissions_student_read ON storage.objects;
DROP POLICY submissions_student_upload ON storage.objects;
DROP POLICY submissions_teacher_read ON storage.objects;
CREATE POLICY submissions_student_read ON storage.objects FOR SELECT TO authenticated USING(
  bucket_id='submissions' AND (SELECT public.submission_actor_active_v1()) AND split_part(name,'/',1)=(SELECT auth.uid())::text);
CREATE POLICY submissions_student_upload ON storage.objects FOR INSERT TO authenticated WITH CHECK(
  bucket_id='submissions' AND (SELECT public.submission_actor_active_v1()) AND public.submission_owned_key_v1(name)
  AND EXISTS(SELECT 1 FROM public.profiles actor WHERE actor.id=(SELECT auth.uid()) AND actor.role::text='student'));
CREATE POLICY submissions_teacher_read ON storage.objects FOR SELECT TO authenticated USING(bucket_id='submissions' AND public.submission_file_staff_read_v1(name));
-- Restrictive fence also prevents an unrelated permissive policy bypassing these predicates.
CREATE POLICY submissions_bucket_read_fence_v1 ON storage.objects AS RESTRICTIVE FOR SELECT TO authenticated USING(
  bucket_id IS DISTINCT FROM 'submissions' OR ((SELECT public.submission_actor_active_v1()) AND
    (split_part(name,'/',1)=(SELECT auth.uid())::text OR public.submission_file_staff_read_v1(name))));
CREATE POLICY submissions_bucket_insert_fence_v1 ON storage.objects AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK(
  bucket_id IS DISTINCT FROM 'submissions' OR ((SELECT public.submission_actor_active_v1()) AND public.submission_owned_key_v1(name)
    AND EXISTS(SELECT 1 FROM public.profiles actor WHERE actor.id=(SELECT auth.uid()) AND actor.role::text='student')));

CREATE TRIGGER trg_submission_authority_phase_a_v1 BEFORE INSERT OR UPDATE OR DELETE ON public.submissions FOR EACH ROW EXECUTE FUNCTION public.submission_authority_phase_a_v1();
DO $binding$ BEGIN
  IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.submissions'::regclass AND tgname='trg_habit_signals_on_submission' AND NOT tgisinternal) THEN
    CREATE TRIGGER trg_habit_signals_on_submission AFTER INSERT ON public.submissions FOR EACH ROW EXECUTE FUNCTION public.generate_habit_signals_from_submission_v1();
  END IF;
END; $binding$;
CREATE TRIGGER trg_submission_habit_authority_phase_a_v1 BEFORE INSERT OR UPDATE OR DELETE ON public.habit_logs FOR EACH ROW EXECUTE FUNCTION public.submission_habit_authority_phase_a_v1();
CREATE TRIGGER trg_quiz_attempt_authority_phase_a_v1 BEFORE INSERT OR UPDATE OR DELETE ON public.quiz_attempts FOR EACH ROW EXECUTE FUNCTION public.quiz_attempt_authority_phase_a_v1();
CREATE TRIGGER trg_grade_source_authority_phase_a_v1 BEFORE INSERT OR UPDATE OR DELETE ON public.grades FOR EACH ROW EXECUTE FUNCTION public.grade_source_authority_phase_a_v1();

-- Explicit ownership/ACLs; trigger functions cannot be called as public RPCs.
DO $acl$
DECLARE sig text;
BEGIN
  FOREACH sig IN ARRAY ARRAY[
    'public.submission_actor_active_v1()','public.submission_course_scope_v1(uuid)',
    'public.submission_read_scope_v1(uuid,boolean,boolean)','public.assignment_grade_write_scope_phase_a_v1(uuid,uuid)',
    'public.submission_owned_key_v1(text)','public.submission_file_staff_read_v1(text)','public.quiz_start_scope_phase_a_v1(uuid,text)','public.quiz_attempt_read_scope_v1(uuid)',
    'public.submission_authority_phase_a_v1()','public.generate_habit_signals_from_submission_v1()',
    'public.submission_habit_authority_phase_a_v1()','public.quiz_attempt_authority_phase_a_v1()',
    'public.grade_source_authority_phase_a_v1()','public.record_quiz_attempt_grade_v1(uuid)'
  ] LOOP
    EXECUTE 'ALTER FUNCTION '||sig||' OWNER TO postgres';
    EXECUTE 'REVOKE ALL ON FUNCTION '||sig||' FROM PUBLIC,anon,authenticated,service_role';
  END LOOP;
END; $acl$;
GRANT EXECUTE ON FUNCTION public.submission_actor_active_v1(),public.submission_course_scope_v1(uuid),
  public.submission_read_scope_v1(uuid,boolean,boolean),public.assignment_grade_write_scope_phase_a_v1(uuid,uuid),
  public.submission_owned_key_v1(text),public.submission_file_staff_read_v1(text),public.quiz_start_scope_phase_a_v1(uuid,text),
  public.quiz_attempt_read_scope_v1(uuid),public.record_quiz_attempt_grade_v1(uuid) TO authenticated;

DO $postconditions$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('public.submissions','trg_habit_signals_on_submission','public.generate_habit_signals_from_submission_v1()',5),
    ('public.submissions','trg_submission_authority_phase_a_v1','public.submission_authority_phase_a_v1()',31),
    ('public.habit_logs','trg_submission_habit_authority_phase_a_v1','public.submission_habit_authority_phase_a_v1()',31),
    ('public.quiz_attempts','trg_quiz_attempt_authority_phase_a_v1','public.quiz_attempt_authority_phase_a_v1()',31),
    ('public.grades','trg_grade_source_authority_phase_a_v1','public.grade_source_authority_phase_a_v1()',31)
  ) x(relation_name,trigger_name,function_signature,type_bits) LOOP
    IF (SELECT count(*) FROM pg_trigger WHERE tgrelid=to_regclass(r.relation_name) AND tgname=r.trigger_name AND tgfoid=to_regprocedure(r.function_signature)
      AND tgtype=r.type_bits AND tgenabled='O' AND NOT tgisinternal AND tgnargs=0 AND tgqual IS NULL AND tgoldtable IS NULL AND tgnewtable IS NULL)<>1 THEN
      RAISE EXCEPTION 'Phase A trigger postcondition failed: %.%',r.relation_name,r.trigger_name;
    END IF;
  END LOOP;
  IF EXISTS(SELECT 1 FROM pg_policy WHERE polrelid IN ('public.submissions'::regclass,'public.quiz_attempts'::regclass) AND polcmd IN ('*','w','d')) OR
     EXISTS(SELECT 1 FROM pg_policy WHERE polrelid='public.grades'::regclass AND polcmd IN ('*','d')) OR
     EXISTS(SELECT 1 FROM pg_policy WHERE polrelid='public.deadline_extensions'::regclass AND polcmd<>'r') THEN
    RAISE EXCEPTION 'Unexpected surviving broad academic writer';
  END IF;
  IF has_function_privilege('anon','public.record_quiz_attempt_grade_v1(uuid)','EXECUTE') OR has_function_privilege('service_role','public.record_quiz_attempt_grade_v1(uuid)','EXECUTE') THEN
    RAISE EXCEPTION 'Non-user quiz receipt RPC grant remains';
  END IF;
END; $postconditions$;
COMMIT;
