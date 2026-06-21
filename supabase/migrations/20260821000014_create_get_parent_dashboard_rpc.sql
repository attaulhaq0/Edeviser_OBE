-- ─────────────────────────────────────────────────────────────────────────────
-- get_parent_dashboard() → jsonb
--
-- Spec: dashboard-and-ux-performance — Phase 8 Task 36 (aggregate-RPC rollout,
-- parent). Collapses the parent dashboard's two always-on hooks —
-- `useParentKPIs` (children → active enrollments → attainment → upcoming
-- deadlines) and `useLinkedChildren` (children → profiles + gamification +
-- enrollments + attainment) — into ONE jsonb payload. The client
-- (useParentDashboardAggregate) hydrates BOTH existing caches so each hook
-- resolves as a cache hit; on absence/failure each hook falls back to its own
-- fetch (fully reversible).
--
-- SECURITY INVOKER (NOT definer): every data table the parent reads (profiles,
-- student_gamification, student_courses, outcome_attainment, assignments) already
-- enforces the verified-link restriction in its own SELECT policy, so an INVOKER
-- function inherits that scoping per-statement and can return nothing the parent
-- could not already read. A DEFINER variant would have to re-implement the
-- verified-link guard on every table by hand (more code + leak risk).
--
-- LOAD-BEARING verified-link filter: the `parent_student_links` self-read policy
-- (`parent_id = auth.uid()`) is NOT verified-scoped, so this function keeps the
-- explicit `verified = true` filter exactly as `fetchVerifiedChildIds` does —
-- otherwise unverified links would inflate `linkedChildren` and the child list.
--
-- Parity notes (mirror the hooks EXACTLY — the two differ on purpose):
--   • KPI `totalCourses` = raw count of ACTIVE (`status='active'`) student_courses
--     rows across children (NOT distinct courses).
--   • KPI `avgAttainment` = flat mean of every student_course attainment row
--     across all children (not a mean of per-child means).
--   • KPI `upcomingDeadlines` = assignments in the DISTINCT active course ids with
--     `due_date >= now()`; 0 when there are no active courses.
--   • Per-child `enrolled_courses` = count of ALL student_courses rows for that
--     child (NO status filter — unlike the KPI's active-only count).
--   • Per-child `avg_attainment` = that child's own mean; `current_level` defaults
--     to 1, the gamification numerics default to 0; name falls back to 'Unknown'.
--   • The child list is driven by the children's `profiles` rows (a verified link
--     with no profile row does not appear), ordered by id for determinism.
--
-- Replay-safe: CREATE OR REPLACE, no forward refs, search_path='' +
-- public.-qualified (pg_catalog aggregates resolve implicitly).
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.get_parent_dashboard()
returns jsonb
language sql
security invoker
stable
set search_path = ''
as $$
  with child_ids as (
    select psl.student_id
    from public.parent_student_links psl
    where psl.parent_id = auth.uid()
      and psl.verified = true
  ),
  -- KPI: active enrollments (status='active'); totalCourses is the RAW row count.
  active_enroll as (
    select sc.course_id
    from public.student_courses sc
    where sc.student_id in (select student_id from child_ids)
      and sc.status = 'active'
  ),
  kpi_course_ids as (
    select distinct course_id
    from active_enroll
    where course_id is not null
  ),
  -- KPI: flat mean of every student_course attainment row across all children.
  kpi_att as (
    select oa.attainment_percent
    from public.outcome_attainment oa
    where oa.student_id in (select student_id from child_ids)
      and oa.scope = 'student_course'
      and oa.attainment_percent is not null
  ),
  -- Children list inputs.
  child_profiles as (
    select p.id, p.full_name
    from public.profiles p
    where p.id in (select student_id from child_ids)
  ),
  child_gam as (
    select g.student_id, g.level, g.xp_total, g.streak_current
    from public.student_gamification g
    where g.student_id in (select student_id from child_ids)
  ),
  -- Per-child enrolled_courses = ALL student_courses rows (no status filter).
  child_enroll as (
    select sc.student_id, count(*) as n
    from public.student_courses sc
    where sc.student_id in (select student_id from child_ids)
    group by sc.student_id
  ),
  -- Per-child attainment mean.
  child_att as (
    select oa.student_id, avg(oa.attainment_percent) as avg_att
    from public.outcome_attainment oa
    where oa.student_id in (select student_id from child_ids)
      and oa.scope = 'student_course'
      and oa.attainment_percent is not null
    group by oa.student_id
  ),
  children as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'student_id', cp.id,
          'student_name', coalesce(cp.full_name, 'Unknown'),
          'current_level', coalesce(cg.level, 1),
          'xp_total', coalesce(cg.xp_total, 0),
          'current_streak', coalesce(cg.streak_current, 0),
          'enrolled_courses', coalesce(ce.n, 0),
          'avg_attainment', coalesce(round(ca.avg_att), 0)
        )
        order by cp.id
      ),
      '[]'::jsonb
    ) as arr
    from child_profiles cp
    left join child_gam cg on cg.student_id = cp.id
    left join child_enroll ce on ce.student_id = cp.id
    left join child_att ca on ca.student_id = cp.id
  )
  select jsonb_build_object(
    'kpis', jsonb_build_object(
      'linkedChildren', (select count(*) from child_ids),
      'totalCourses', (select count(*) from active_enroll),
      'avgAttainment', coalesce((select round(avg(attainment_percent)) from kpi_att), 0),
      'upcomingDeadlines', (
        select count(*)
        from public.assignments a
        where a.course_id in (select course_id from kpi_course_ids)
          and a.due_date >= now()
      )
    ),
    'children', (select arr from children)
  );
$$;

comment on function public.get_parent_dashboard() is
  'Aggregates the parent dashboard (KPI block + verified-linked children list) into '
  'one jsonb payload, collapsing useParentKPIs + useLinkedChildren. SECURITY INVOKER: '
  'every read is RLS-scoped to the caller''s verified-linked children; keeps an explicit '
  'parent_student_links.verified = true filter because that table''s self-read policy is '
  'not verified-scoped. See spec dashboard-and-ux-performance Phase 8 Task 36.';

revoke all on function public.get_parent_dashboard() from public;
grant execute on function public.get_parent_dashboard() to authenticated;

-- Rollback (manual): drop function public.get_parent_dashboard();
