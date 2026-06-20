-- ─────────────────────────────────────────────────────────────────────────────
-- get_coordinator_dashboard() → jsonb
--
-- Spec: dashboard-and-ux-performance — Phase 8 Task 34 (aggregate-RPC rollout,
-- coordinator). Collapses useCoordinatorKPIs — which today runs ~6 SEQUENTIAL
-- round-trips (PLO count → course count → PLO ids → outcome_mappings →
-- outcome_attainment → CLO course ids) — into ONE jsonb payload. The client
-- (useCoordinatorDashboardAggregate) hydrates the existing KPI cache so the
-- section hook becomes a cache hit; on absence/failure it falls back to its own
-- fetch (fully reversible).
--
-- SECURITY INVOKER (NOT definer): the coordinator dashboard is INSTITUTION-scoped,
-- and every table read here is already RLS-scoped to the caller's institution
-- (learning_outcomes / courses / outcome_mappings / outcome_attainment via the
-- staff-read policies). Running as the caller means the function inherits that
-- scoping automatically and can return nothing the coordinator could not already
-- read — so, unlike the id-scoped student/teacher RPCs, it needs no auth.uid()
-- guard and carries no cross-tenant-leak surface. (A SECURITY DEFINER variant
-- would have to re-implement institution scoping on every table by hand, which is
-- both more code and a leak risk; INVOKER is the correct, safe choice here.)
--
-- Mirrors useCoordinatorKPIs EXACTLY (incl. the existing coverage semantics that
-- count PLOs appearing as `outcome_mappings.source_outcome_id`, and at-risk =
-- distinct students whose MEAN student_course attainment < 50).
--
-- Replay-safe: CREATE OR REPLACE, no forward refs, search_path='' +
-- public.-qualified (pg_catalog aggregates resolve implicitly).
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.get_coordinator_dashboard()
returns jsonb
language sql
security invoker
stable
set search_path = ''
as $$
  with plos as (
    select id from public.learning_outcomes where type = 'PLO'
  ),
  plo_count as (select count(*) as n from plos),
  course_count as (select count(*) as n from public.courses),
  covered as (
    select count(distinct m.source_outcome_id) as n
    from public.outcome_mappings m
    where m.source_outcome_id in (select id from plos)
  ),
  att as (
    select oa.student_id, oa.attainment_percent
    from public.outcome_attainment oa
    where oa.scope = 'student_course'
      and oa.attainment_percent is not null
  ),
  per_student as (
    select student_id, avg(attainment_percent) as mean_att
    from att
    where student_id is not null
    group by student_id
  ),
  clo_courses as (
    select count(distinct course_id) as n
    from public.learning_outcomes
    where type = 'CLO' and course_id is not null
  )
  select jsonb_build_object(
    'totalPLOs', (select n from plo_count),
    'totalCourses', (select n from course_count),
    'cloCoveragePercent', case
      when (select n from plo_count) > 0
      then round(((select n from covered)::numeric / (select n from plo_count)) * 100)
      else 0 end,
    'avgAttainmentPercent', coalesce(
      (select round(avg(attainment_percent)) from att), 0),
    'atRiskStudents', (select count(*) from per_student where mean_att < 50),
    'teacherCompliancePercent', case
      when (select n from course_count) > 0
      then round(((select n from clo_courses)::numeric / (select n from course_count)) * 100)
      else 0 end
  );
$$;

comment on function public.get_coordinator_dashboard() is
  'Aggregates the coordinator dashboard KPI block (PLO/course counts, CLO coverage, '
  'mean attainment, at-risk students, teacher compliance) into one jsonb payload, '
  'collapsing useCoordinatorKPIs'' ~6 sequential round-trips. SECURITY INVOKER: every '
  'read is RLS-scoped to the caller''s institution. See spec dashboard-and-ux-'
  'performance Phase 8 Task 34.';

revoke all on function public.get_coordinator_dashboard() from public;
grant execute on function public.get_coordinator_dashboard() to authenticated;

-- Rollback (manual): drop function public.get_coordinator_dashboard();
