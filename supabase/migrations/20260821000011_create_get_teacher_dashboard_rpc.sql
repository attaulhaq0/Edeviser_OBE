-- ─────────────────────────────────────────────────────────────────────────────
-- get_teacher_dashboard(p_teacher_id uuid) → jsonb
--
-- Spec: dashboard-and-ux-performance — Phase 8 Task 33 (aggregate-RPC rollout,
-- teacher = worst fan-out). Collapses the teacher dashboard's always-on serial /
-- fan-out hooks (useTeacherKPIs ≈ 7 round-trips, useTeacherBloomsDistribution ≈ 2
-- → ~9 round-trips) into ONE jsonb payload. The client
-- (useTeacherDashboardAggregate) hydrates the existing section caches so the
-- section hooks become cache hits; on absence/failure they fall back to their
-- own fetches (fully reversible). Mirrors the proven get_student_dashboard pattern.
--
-- SECURITY DEFINER + fail-closed guard: a teacher only ever reads data scoped to
-- THEIR OWN active courses. The guard neutralizes p_teacher_id to a non-matching
-- id unless it equals the caller (auth.uid()), so a mismatched/anon caller gets the
-- same empty/zero payload RLS would have produced — no cross-teacher leakage, no
-- error. Bypassing the layered permissive policies (only for the legitimate
-- self-call) is the documented Supabase perf pattern for read-only aggregates.
--
-- NOT folded here (intentional, kept as their own hooks): the course-SELECTED
-- charts (CLO attainment, performance heatmap — they refetch when the teacher
-- picks a course), the at-risk STUDENT LIST (useAtRiskStudents — its risk-reason
-- strings + sort stay client-side), and the single-query grading queue
-- (usePendingSubmissions). atRiskCount IS included (a simple set size). Recovery
-- alerts are NOT folded (not rendered on the dashboard).
--
-- Replay-safe: CREATE OR REPLACE, no forward refs, search_path='' +
-- public.-qualified (auth.uid() is auth-qualified; pg_catalog aggregates resolve
-- implicitly).
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.get_teacher_dashboard(p_teacher_id uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  v_tid uuid := p_teacher_id;
  v_week_ago timestamptz := now() - interval '7 days';
begin
  -- Fail-closed guard (see header). SECURITY DEFINER bypasses RLS, so the function
  -- must guarantee a caller only ever reads their own teaching data.
  if v_tid is distinct from (select auth.uid()) then
    v_tid := null;  -- neutralize → every read below returns empty/zero
  end if;

  return jsonb_build_object(
    -- KPI block — mirrors useTeacherKPIs exactly.
    'kpis', (
      with course_ids as (
        select id from public.courses
        where teacher_id = v_tid and is_active = true
      ),
      enrolled as (
        select distinct sc.student_id
        from public.student_courses sc
        where sc.course_id in (select id from course_ids)
      ),
      low_clo as (
        select oa.student_id
        from public.outcome_attainment oa
        where oa.course_id in (select id from course_ids)
          and oa.scope = 'student_course'
          and oa.attainment_percent < 50
        group by oa.student_id
        having count(*) >= 2
      ),
      inactive as (
        select e.student_id
        from enrolled e
        join public.profiles p on p.id = e.student_id
        where p.last_seen_at is null or p.last_seen_at < v_week_ago
      ),
      at_risk as (
        select student_id from inactive
        union
        select student_id from low_clo
      )
      select jsonb_build_object(
        'pendingSubmissions', (
          select count(*)
          from public.submissions sub
          join public.assignments a on a.id = sub.assignment_id
          where a.course_id in (select id from course_ids)
            and not exists (
              select 1 from public.grades g where g.submission_id = sub.id
            )
        ),
        'gradedThisWeek', (
          select count(*)
          from public.grades g
          where g.graded_by = v_tid and g.graded_at >= v_week_ago
        ),
        'avgAttainment', coalesce((
          select round(avg(oa.attainment_percent))
          from public.outcome_attainment oa
          where oa.scope = 'student_course'
            and oa.course_id in (select id from course_ids)
        ), 0),
        'atRiskCount', (select count(*) from at_risk),
        'totalStudents', (
          select count(*)
          from public.student_courses sc
          where sc.course_id in (select id from course_ids)
        )
      )
    ),
    -- Bloom's distribution — mirrors useTeacherBloomsDistribution (ordered
    -- remembering→creating, only levels with count > 0).
    'bloomsDistribution', coalesce((
      select jsonb_agg(
        jsonb_build_object('level', lvl.level, 'count', lvl.cnt)
        order by lvl.ord
      )
      from (
        select bl.level, bl.ord, count(lo.id) as cnt
        from (values
          ('remembering', 1), ('understanding', 2), ('applying', 3),
          ('analyzing', 4), ('evaluating', 5), ('creating', 6)
        ) as bl(level, ord)
        left join public.learning_outcomes lo
          on lo.blooms_level = bl.level
          and lo.type = 'CLO'
          and lo.course_id in (
            select id from public.courses
            where teacher_id = v_tid and is_active = true
          )
        group by bl.level, bl.ord
        having count(lo.id) > 0
      ) lvl
    ), '[]'::jsonb)
  );
end;
$$;

comment on function public.get_teacher_dashboard(uuid) is
  'Aggregates the teacher dashboard always-on sections (KPIs + Bloom''s distribution) '
  'into one jsonb payload to collapse the per-section fan-out. SECURITY DEFINER with a '
  'fail-closed auth.uid() guard: returns only the calling teacher''s own data. See spec '
  'dashboard-and-ux-performance Phase 8 Task 33.';

revoke all on function public.get_teacher_dashboard(uuid) from public;
grant execute on function public.get_teacher_dashboard(uuid) to authenticated;

-- Rollback (manual): drop function public.get_teacher_dashboard(uuid);
