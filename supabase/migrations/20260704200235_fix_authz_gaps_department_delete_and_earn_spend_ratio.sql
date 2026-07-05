-- ============================================================
-- Migration: Fix 2 SECURITY DEFINER authorization gaps
-- Found by: .kiro/specs/rls-consolidation-and-infra-health/
--
-- Gap 1: delete_department_if_no_programs(uuid) had NO authorization check
--   at all — any authenticated user (any role, any institution) could call
--   this RPC directly and delete any department with zero programs attached.
-- Gap 2: get_earn_spend_ratio(uuid) had NO institution-match check — any
--   authenticated user could pass another institution's id and read that
--   institution's XP-economy rollup (total earned/spent/ratio/status).
--
-- Both fixes add the same institution/role guard pattern already used
-- correctly by the sibling functions get_wellness_aggregate_stats and
-- get_leaderboard_page in this codebase. Signatures, return shapes, and
-- SECURITY DEFINER/search_path settings are preserved exactly — this is a
-- narrowing (adds a check), not a behavior change for any legitimate caller.
-- Neither function currently has a frontend or edge-function caller
-- (confirmed via repo search), so this closes a latent exposure rather than
-- fixing an observed incident.
--
-- Verified live via rolled-back execute_sql probes:
--   - non-admin caller -> delete_department_if_no_programs: 42501 rejection
--   - legitimate admin caller: unaffected (returns false for a non-existent
--     department, same as before the fix)
--   - cross-institution caller -> get_earn_spend_ratio: rejection
--   - same-institution caller: unaffected (returns real data)
-- ============================================================

-- ── Gap 1: delete_department_if_no_programs ────────────────────────────────
CREATE OR REPLACE FUNCTION public.delete_department_if_no_programs(dept_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  deleted_id uuid;
BEGIN
  -- Authorization: caller must be an institution admin, and the target
  -- department must belong to the caller's own institution.
  IF (select public.auth_user_role()) <> 'admin' THEN
    RAISE EXCEPTION 'unauthorized: admin role required' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.departments
  WHERE id = dept_id
    AND institution_id = (select public.auth_institution_id())
    AND NOT EXISTS (
      SELECT 1 FROM public.programs WHERE department_id = dept_id
    )
  RETURNING id INTO deleted_id;

  RETURN deleted_id IS NOT NULL;
END;
$function$;

-- ── Gap 2: get_earn_spend_ratio ─────────────────────────────────────────────
-- Converted from `sql` to `plpgsql` (required for a procedural RAISE
-- EXCEPTION guard) to mirror get_wellness_aggregate_stats' pattern exactly.
CREATE OR REPLACE FUNCTION public.get_earn_spend_ratio(p_institution_id uuid)
 RETURNS TABLE(total_earned bigint, total_spent bigint, ratio numeric, status text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF public.auth_institution_id() != p_institution_id THEN
    RAISE EXCEPTION 'unauthorized: institution mismatch';
  END IF;

  RETURN QUERY
  WITH earned AS (
    SELECT COALESCE(SUM(xt.xp_amount), 0) AS total
    FROM xp_transactions xt
    JOIN profiles p ON p.id = xt.student_id
    WHERE p.institution_id = p_institution_id
  ),
  spent AS (
    SELECT COALESCE(SUM(xp.xp_cost), 0) AS total
    FROM xp_purchases xp
    JOIN marketplace_items mi ON mi.id = xp.item_id
    WHERE mi.institution_id = p_institution_id AND xp.status != 'refunded'
  )
  SELECT
    earned.total AS total_earned,
    spent.total AS total_spent,
    CASE WHEN spent.total > 0 THEN ROUND(earned.total::NUMERIC / spent.total, 2) ELSE NULL END AS ratio,
    CASE
      WHEN spent.total = 0 THEN 'no_spending'
      WHEN earned.total::NUMERIC / spent.total > 5 THEN 'inflationary'
      WHEN earned.total::NUMERIC / spent.total < 2 THEN 'deflationary'
      ELSE 'healthy'
    END AS status
  FROM earned, spent;
END;
$function$;

-- ── Hygiene: narrow the anon grant on the two dashboard RPCs ────────────────
-- Both get_student_dashboard/get_teacher_dashboard already fail closed to an
-- empty/zero payload for a mismatched or anonymous caller (confirmed via live
-- pg_get_functiondef), so this is functionally a no-op — it only removes a
-- needless anon-exposure line from future security-advisor scans.
--
-- Guarded per migration-replay-integrity: this migration's timestamp
-- (20260704) sorts BEFORE the migrations that CREATE these two functions
-- (get_student_dashboard at 20260821000006, get_teacher_dashboard at
-- 20260821000011 — both were added after this authz-gap fix was written
-- against a database where they already existed). An unguarded REVOKE here
-- would abort a fresh replay with 42883 (function does not exist) even
-- though production is unaffected (the functions already exist there). Each
-- REVOKE is therefore a no-op on a fresh replay (function doesn't exist yet
-- at this point in history) and applies normally on production.
DO $$ BEGIN
  IF to_regprocedure('public.get_student_dashboard(uuid)') IS NOT NULL THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.get_student_dashboard(uuid) FROM anon';
  END IF;
  IF to_regprocedure('public.get_teacher_dashboard(uuid)') IS NOT NULL THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.get_teacher_dashboard(uuid) FROM anon';
  END IF;
END $$;
