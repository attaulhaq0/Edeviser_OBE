-- Revoke PUBLIC execute on RLS helper functions
-- These are used internally by RLS policies (evaluated as postgres), not by users directly
REVOKE EXECUTE ON FUNCTION public.auth_user_role() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.auth_institution_id() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_rate_limit_approaching(inet, text, integer, integer) FROM PUBLIC;

-- Re-grant to authenticated (needed for RLS evaluation context)
-- Actually RLS runs as the table owner (postgres) via SECURITY DEFINER,
-- but PostgREST evaluates as the user's role. The function needs to be
-- callable by authenticated for RLS to work in PostgREST context.
GRANT EXECUTE ON FUNCTION public.auth_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_institution_id() TO authenticated;

-- consume_invitation and get_invitation_by_token need anon access
-- (they're called during the signup/invitation flow before the user is authenticated)
-- So we keep them accessible to anon but note the risk is acceptable
-- REVOKE already done for these from anon - but PUBLIC overrides it
REVOKE EXECUTE ON FUNCTION public.consume_invitation(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_invitation_by_token(text) FROM PUBLIC;
-- Re-grant to anon since these ARE needed pre-auth
GRANT EXECUTE ON FUNCTION public.consume_invitation(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_invitation_by_token(text) TO anon;
GRANT EXECUTE ON FUNCTION public.consume_invitation(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_invitation_by_token(text) TO authenticated;;
