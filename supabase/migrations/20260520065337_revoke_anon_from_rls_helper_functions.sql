-- Fix remaining anon-callable SECURITY DEFINER functions
-- auth_institution_id and auth_user_role are used in RLS policies (called implicitly by postgres)
-- They do NOT need to be callable via PostgREST RPC by anon users
REVOKE EXECUTE ON FUNCTION public.auth_institution_id() FROM anon;
REVOKE EXECUTE ON FUNCTION public.auth_user_role() FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_rate_limit_approaching(inet, text, integer, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.consume_invitation(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_invitation_by_token(text) FROM anon;;
