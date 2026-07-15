-- Guard capture_active_semester_snapshots (audit finding H-1, security).
--
-- capture_active_semester_snapshots() is a SECURITY DEFINER function with no
-- parameters that aggregates outcome_attainment across ALL institutions and
-- upserts into outcome_attainment_snapshots. It is invoked exclusively by the
-- pg_cron job "capture-outcome-attainment-snapshots" (schedule: 0 3 1 * *,
-- i.e. monthly). It was never intended to be called by end users, but
-- PostgreSQL grants EXECUTE on newly created functions to PUBLIC by default,
-- which reaches anon and authenticated — confirmed live via
-- information_schema.routine_privileges and the Supabase security advisor
-- (anon_security_definer_function_executable /
-- authenticated_security_definer_function_executable).
--
-- Because the function aggregates cross-institution data and has no
-- parameter to scope by, there is no meaningful "institution mismatch" guard
-- to add inside the function body (Option B in the supabase-patterns steering
-- doc). The correct fix is Option A: revoke the public/anon/authenticated
-- grants entirely and leave EXECUTE only for the roles that legitimately run
-- it (postgres, which is what pg_cron executes jobs as on this project, and
-- service_role for any future internal/Edge Function caller).
--
-- This does not change the function's behavior for its only real caller
-- (pg_cron) and closes the "any authenticated user can trigger a
-- cross-institution aggregate write" exposure.

REVOKE ALL ON FUNCTION public.capture_active_semester_snapshots() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.capture_active_semester_snapshots() FROM anon;
REVOKE ALL ON FUNCTION public.capture_active_semester_snapshots() FROM authenticated;

GRANT EXECUTE ON FUNCTION public.capture_active_semester_snapshots() TO postgres;
GRANT EXECUTE ON FUNCTION public.capture_active_semester_snapshots() TO service_role;
