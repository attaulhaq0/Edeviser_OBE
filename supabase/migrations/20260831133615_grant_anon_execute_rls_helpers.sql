-- Fixes: `permission denied for function public.auth_user_role` storms on anon requests
-- (24+ PostgREST errors on 2026-08-30; public outcome/portfolio reads broken).
-- Root cause: SECURITY DEFINER helper functions referenced inside RLS policies were
-- granted EXECUTE to `authenticated` only. PostgREST evaluates policies under the
-- calling role, so any anon request reaching a policy that calls one of these helpers
-- failed with 42501 before zero-row filtering could apply.
-- Safety: every helper is STABLE SECURITY DEFINER with a fixed search_path and returns
-- a scalar (text/uuid/boolean) derived from auth.uid()/auth.jwt() — for anon callers
-- auth.uid() is NULL, so results are NULL/false. No data is exposed by the grant.

DO $do$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.oid, p.proname
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'auth_user_role',
        'auth_institution_id',
        'auth_user_status',
        'auth_user_is_thread_participant',
        'is_student_in_my_institution',
        'parent_has_verified_link',
        'student_enrolled_in_team_course',
        'team_i_captain',
        'team_i_captain_student_formed_active',
        'team_in_course_i_teach',
        'team_in_course_i_teach_active',
        'team_in_my_institution'
      )
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon', r.oid::regprocedure);
    RAISE NOTICE 'Granted EXECUTE to anon: %', r.proname;
  END LOOP;
END
$do$;
