-- The trigger is an internal database callback.  It must never be a direct
-- RPC surface: PostgreSQL invokes trigger functions through the trigger, not
-- through caller EXECUTE privileges.  Keep every direct caller fail-closed,
-- including service_role, and retain SECURITY DEFINER only for the controlled
-- state reconciliation work performed during an approved measurement write.
REVOKE ALL ON FUNCTION public.sync_learning_state_measurements_v1()
  FROM PUBLIC, anon, authenticated, service_role;
