-- ─────────────────────────────────────────────────────────────────────────────
-- Restrict mv_historical_evidence from the auto-exposed API + serve it via an
-- admin-gated RPC (spec: production-bug-fixes, Req 10 / materialized_view_in_api).
--
-- `mv_historical_evidence` is an institution-AGNOSTIC aggregate (semester ×
-- outcome_type × bloom) with no RLS (matviews can't have RLS), yet it was
-- SELECT-able by every `authenticated` user through PostgREST — so any signed-in
-- user could read platform-wide attainment aggregates. The Admin Historical
-- Evidence dashboard is the only legitimate consumer.
--
-- Fix: a SECURITY DEFINER RPC that returns the rollup ONLY to institution admins
-- (the dashboard's audience), then REVOKE the direct API SELECT. The RPC
-- preserves the existing dashboard output (same rows/filters/order); true
-- per-institution scoping would require re-modelling the MV (it has no
-- institution dimension) and is intentionally out of scope for this hardening.
--
-- Replay-safe (migration-replay-integrity): the MV + auth_user_role() are
-- created by earlier migrations; the function is hardened at its CREATE site
-- (SET search_path = '', public.-qualified) and the REVOKE on the MV is guarded
-- with to_regclass(...).
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.get_historical_evidence(
  p_outcome_type text default null,
  p_blooms_level text default null
)
returns table (
  semester_id uuid,
  semester_name text,
  start_date date,
  outcome_type text,
  blooms_level text,
  evidence_count bigint,
  avg_score numeric,
  excellent_count bigint,
  satisfactory_count bigint,
  developing_count bigint,
  not_yet_count bigint
)
language plpgsql
security definer
set search_path = ''
stable
as $$
begin
  -- Only institution admins may read the historical-evidence rollup (it is no
  -- longer directly selectable from the API). Non-admins get zero rows.
  if public.auth_user_role() <> 'admin' then
    return;
  end if;

  return query
    select
      mv.semester_id,
      mv.semester_name,
      mv.start_date,
      mv.outcome_type::text,
      mv.blooms_level::text,
      mv.evidence_count,
      mv.avg_score,
      mv.excellent_count,
      mv.satisfactory_count,
      mv.developing_count,
      mv.not_yet_count
    from public.mv_historical_evidence mv
    where (p_outcome_type is null or mv.outcome_type::text = p_outcome_type)
      and (p_blooms_level is null or mv.blooms_level::text = p_blooms_level)
    order by mv.start_date asc;
end;
$$;

comment on function public.get_historical_evidence(text, text) is
  'Admin-only accessor for the historical-evidence rollup. Replaces direct '
  'SELECT on mv_historical_evidence (revoked from the API) so platform-wide '
  'aggregates are not readable by non-admin authenticated users (Req 10).';

revoke all on function public.get_historical_evidence(text, text) from public, anon;
grant execute on function public.get_historical_evidence(text, text) to authenticated;

-- Remove the materialized view from the auto-exposed PostgREST API. Guarded so a
-- fresh replay (where the MV is created by an earlier migration) and production
-- both apply cleanly.
do $$
begin
  if to_regclass('public.mv_historical_evidence') is not null then
    execute 'revoke select on public.mv_historical_evidence from anon, authenticated';
  end if;
end $$;

-- Rollback (manual):
--   grant select on public.mv_historical_evidence to anon, authenticated;
--   drop function if exists public.get_historical_evidence(text, text);
