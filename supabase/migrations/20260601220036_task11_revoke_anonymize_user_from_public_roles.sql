-- Task 11 (migration-history-reconciliation, Req 9.3): GDPR right-to-erasure must not be
-- callable from the public REST RPC surface. Revoke EXECUTE on anonymize_user(uuid) from the
-- anon and authenticated roles. Verified safe: no RLS policy references this function, no
-- client-side .rpc('anonymize_user') call exists in src/, and no Edge Function invokes it.
-- The server-side GDPR erasure path runs via the service_role, which retains EXECUTE.
REVOKE EXECUTE ON FUNCTION public.anonymize_user(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.anonymize_user(uuid) FROM authenticated;;
