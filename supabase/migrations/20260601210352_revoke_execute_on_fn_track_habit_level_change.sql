-- Harden the newly-created trigger function: it is only ever invoked by
-- trg_track_habit_level_change. Trigger firing does NOT require EXECUTE on the
-- function, so revoking the default PUBLIC grant is safe and removes the
-- anon/authenticated SECURITY DEFINER REST-RPC exposure introduced by the deploy.
-- Mirrors the existing project convention (revoke_anon_from_new_trigger_functions).
REVOKE EXECUTE ON FUNCTION public.fn_track_habit_level_change() FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_track_habit_level_change() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_track_habit_level_change() FROM public;
;
