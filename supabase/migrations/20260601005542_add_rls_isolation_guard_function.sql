-- Defense-in-depth: a runtime guard that detects RLS policies which gate on
-- role (auth_user_role) but fail to tie rows to the caller's identity
-- (auth.uid) or institution (auth_institution_id / institution_id). Such
-- policies leak data across tenants.
--
-- Genuinely platform-wide tables (no tenant key: institution_id / student_id /
-- actor_id) are allowlisted because they cannot be institution-scoped.
--
-- Returns one row per violating (table, policy). Empty result = healthy.
CREATE OR REPLACE FUNCTION public.rls_isolation_violations()
  RETURNS TABLE(table_name text, policy_name text, cmd text, reason text)
  LANGUAGE sql
  STABLE
  SET search_path TO ''
AS $function$
  WITH platform_allowlist(tbl) AS (
    VALUES ('audit_findings'), ('audit_runs'), ('blocked_ips'), ('rate_limit_events')
  ),
  pol AS (
    SELECT
      c.relname AS tbl,
      p.polname,
      CASE p.polcmd
        WHEN 'r' THEN 'SELECT' WHEN 'a' THEN 'INSERT'
        WHEN 'w' THEN 'UPDATE' WHEN 'd' THEN 'DELETE' ELSE 'ALL'
      END AS cmd,
      COALESCE(pg_get_expr(p.polqual, p.polrelid), '') AS using_expr,
      COALESCE(pg_get_expr(p.polwithcheck, p.polrelid), '') AS check_expr
    FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
  )
  SELECT
    pol.tbl,
    pol.polname,
    pol.cmd,
    'role-gated policy without uid/institution scoping' AS reason
  FROM pol
  WHERE pol.tbl NOT IN (SELECT tbl FROM platform_allowlist)
    AND (pol.using_expr ILIKE '%auth_user_role%' OR pol.check_expr ILIKE '%auth_user_role%')
    -- A policy is safe if EITHER expression ties to uid or institution.
    AND NOT (
      pol.using_expr ILIKE '%auth.uid%' OR pol.using_expr ILIKE '%auth_institution_id%'
      OR pol.using_expr ILIKE '%institution_id%'
      OR pol.check_expr ILIKE '%auth.uid%' OR pol.check_expr ILIKE '%auth_institution_id%'
      OR pol.check_expr ILIKE '%institution_id%'
    )
  ORDER BY pol.tbl, pol.polname;
$function$;

-- Lock it down: this is an introspection helper, not a public API.
REVOKE ALL ON FUNCTION public.rls_isolation_violations() FROM PUBLIC, anon, authenticated;;
