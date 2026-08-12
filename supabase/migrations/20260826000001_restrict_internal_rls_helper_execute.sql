-- H1: Internal RLS helpers are SECURITY DEFINER implementation details, not
-- anonymous PostgREST RPCs. Authenticated callers retain EXECUTE because RLS
-- policies invoke these helpers during ordinary application queries.

REVOKE EXECUTE ON FUNCTION public.auth_institution_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.auth_user_role() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.auth_user_status() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_student_in_my_institution(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.student_enrolled_in_team_course(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.team_i_captain(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.team_i_captain_student_formed_active(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.team_in_course_i_teach(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.team_in_course_i_teach_active(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.team_in_my_institution(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.auth_institution_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.auth_user_role() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.auth_user_status() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_student_in_my_institution(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.student_enrolled_in_team_course(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.team_i_captain(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.team_i_captain_student_formed_active(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.team_in_course_i_teach(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.team_in_course_i_teach_active(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.team_in_my_institution(uuid) TO authenticated, service_role;

-- `auth_user_is_thread_participant(uuid)` is already anon-revoked in
-- Production; leave its existing authenticated/service grants unchanged.
