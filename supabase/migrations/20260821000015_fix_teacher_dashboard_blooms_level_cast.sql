-- ─────────────────────────────────────────────────────────────────────────────
-- Fix: get_teacher_dashboard blooms_level enum vs text comparison (42883)
--
-- Bug: The VALUES clause in the Bloom's distribution block produces text literals
-- but learning_outcomes.blooms_level is a custom enum type (public.blooms_level).
-- PostgreSQL does not implicitly cast text → enum, so the JOIN condition fails:
--   "operator does not exist: public.blooms_level = text"
--
-- Fix: cast the VALUES text to the enum type explicitly.
-- Replay-safe: CREATE OR REPLACE, same signature, same SECURITY DEFINER + guard.
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
  -- Fail-closed guard: SECURITY DEFINER bypasses RLS, so the function must
  -- guarantee a caller only ever reads their own teaching data.
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
    -- FIX: cast text values to public.blooms_level enum for the JOIN.
    'bloomsDistribution', coalesce((
      select jsonb_agg(
        jsonb_build_object('level', lvl.level, 'count', lvl.cnt)
        order by lvl.ord
      )
      from (
        select bl.level::text, bl.ord, count(lo.id) as cnt
        from (values
          ('remembering'::public.blooms_level, 1),
          ('understanding'::public.blooms_level, 2),
          ('applying'::public.blooms_level, 3),
          ('analyzing'::public.blooms_level, 4),
          ('evaluating'::public.blooms_level, 5),
          ('creating'::public.blooms_level, 6)
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
