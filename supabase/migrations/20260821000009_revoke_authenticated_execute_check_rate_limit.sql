-- ─────────────────────────────────────────────────────────────────────────────
-- Least-privilege hardening for the internal rate-limit helper (spec:
-- production-bug-fixes, Req 7 / authenticated_security_definer_function_executable).
--
-- `check_rate_limit_approaching(inet, text, integer, integer)` is an internal
-- helper. Prior migrations (20260520065337, 20260520065540) already revoked
-- anon/PUBLIC EXECUTE on it; the advisor still flags `authenticated`. It has:
--   - NO client `rpc()` caller (grep of src/ → only the generated types),
--   - NO edge-function caller,
--   - NO use inside any RLS policy.
-- It is invoked only internally, so revoking the remaining `authenticated`
-- EXECUTE removes it from the reachable API surface with zero functional impact.
--
-- The other advisor-flagged SECURITY DEFINER functions are intentionally KEPT
-- (verified to have a legitimate caller / role):
--   • RLS helpers (auth_user_role, auth_institution_id, parent_has_verified_link,
--     course_material_institution, is_portfolio_publicly_accessible) — must stay
--     executable by the querying role or RLS breaks.
--   • Public-flow (consume_invitation, get_invitation_by_token,
--     portfolio_public_access) — back the anon invite / public-portfolio flows.
--   • Legit client RPCs (get_leaderboard_page, delete_department_if_no_programs,
--     fan_out_announcement_notifications, send_teacher_nudge) — have client callers.
--   • Guarded data fn (get_wellness_aggregate_stats) — enforces its own
--     institution scope internally (RAISE on mismatch).
--
-- Replay-safe (migration-replay-integrity): guarded with to_regprocedure(...);
-- the function is created by an earlier migration.
-- ─────────────────────────────────────────────────────────────────────────────

do $$
begin
  if to_regprocedure(
       'public.check_rate_limit_approaching(inet, text, integer, integer)'
     ) is not null then
    execute 'revoke execute on function '
         || 'public.check_rate_limit_approaching(inet, text, integer, integer) '
         || 'from authenticated';
  end if;
end $$;

-- Rollback (manual):
--   grant execute on function
--     public.check_rate_limit_approaching(inet, text, integer, integer)
--     to authenticated;
