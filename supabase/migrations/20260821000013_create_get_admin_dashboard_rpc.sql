-- ─────────────────────────────────────────────────────────────────────────────
-- get_admin_dashboard() → jsonb
--
-- Spec: dashboard-and-ux-performance — Phase 8 Task 35 (aggregate-RPC rollout,
-- admin). Collapses useAdminKPIs — which today runs 5 PARALLEL round-trips
-- (profiles count → active-profiles count → programs count → courses count →
-- active-profiles role list grouped client-side) — into ONE jsonb payload. The
-- client (useAdminDashboardAggregate) hydrates the existing KPI cache so the
-- section hook becomes a cache hit; on absence/failure it falls back to its own
-- fetch (fully reversible).
--
-- SECURITY INVOKER (NOT definer): the admin dashboard is INSTITUTION-scoped, and
-- every read here is already RLS-scoped to the caller's institution (the staff-
-- read policies on profiles / programs / courses). Running as the caller means
-- the function inherits that scoping automatically and can return nothing the
-- admin could not already read — so, like the coordinator RPC and unlike the
-- id-scoped student/teacher RPCs, it needs no auth.uid() guard and carries no
-- cross-tenant-leak surface. (A SECURITY DEFINER variant would have to re-
-- implement institution scoping on every table by hand: more code + a leak risk.)
--
-- Mirrors useAdminKPIs EXACTLY: all counts are exact (not estimated, matching the
-- hook's count:'exact'); usersByRole groups ACTIVE profiles by role (the hook
-- filters .eq('is_active', true) before grouping).
--
-- Replay-safe: CREATE OR REPLACE, no forward refs, search_path='' +
-- public.-qualified (pg_catalog aggregates resolve implicitly).
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.get_admin_dashboard()
returns jsonb
language sql
security invoker
stable
set search_path = ''
as $$
  with users_by_role as (
    select role, count(*)::int as n
    from public.profiles
    where is_active = true
    group by role
  )
  select jsonb_build_object(
    'totalUsers', (select count(*) from public.profiles),
    'activeUsers', (select count(*) from public.profiles where is_active = true),
    'totalPrograms', (select count(*) from public.programs),
    'totalCourses', (select count(*) from public.courses),
    'usersByRole', coalesce(
      (select jsonb_object_agg(role, n) from users_by_role),
      '{}'::jsonb)
  );
$$;

comment on function public.get_admin_dashboard() is
  'Aggregates the admin dashboard KPI block (total/active users, program & course '
  'counts, active users grouped by role) into one jsonb payload, collapsing '
  'useAdminKPIs'' 5 parallel round-trips. SECURITY INVOKER: every read is RLS-scoped '
  'to the caller''s institution. See spec dashboard-and-ux-performance Phase 8 Task 35.';

revoke all on function public.get_admin_dashboard() from public;
grant execute on function public.get_admin_dashboard() to authenticated;

-- Rollback (manual): drop function public.get_admin_dashboard();
