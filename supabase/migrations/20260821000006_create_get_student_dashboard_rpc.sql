-- ─────────────────────────────────────────────────────────────────────────────
-- get_student_dashboard(p_student_id uuid) → jsonb
--
-- Dashboard data-fetch consolidation (spec: dashboard-and-ux-performance, Req 2).
-- Collapses the student dashboard's critical above-the-fold fan-out (useStudentKPIs'
-- 4 batched queries + useUpcomingDeadlines) into ONE round-trip returning a single
-- jsonb payload. The client (useStudentDashboardAggregate) hydrates the existing
-- section query caches from this result, so section components are unchanged and the
-- per-section hooks become cache hits. If this RPC is absent/fails, the section hooks
-- fall back to their own fetches (fully reversible).
--
-- SECURITY INVOKER: RLS is evaluated as the calling user, so this function can return
-- nothing the caller could not already SELECT. It adds NO new data visibility. A
-- student calling it with another student's id receives only rows their own RLS
-- permits (i.e. none for another student), so there is no cross-user leakage.
--
-- search_path = '' + public.-qualified everything, per migration-replay-integrity.
-- CREATE OR REPLACE with no forward references → replay-safe from scratch.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.get_student_dashboard(p_student_id uuid)
returns jsonb
language sql
security invoker
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'kpis', jsonb_build_object(
      'enrolledCourses', (
        select count(*)
        from public.student_courses sc
        where sc.student_id = p_student_id
      ),
      'completedAssignments', (
        select count(*)
        from public.submissions sub
        where sub.student_id = p_student_id
          and sub.status = 'graded'
      ),
      'avgAttainment', coalesce((
        select round(avg(oa.attainment_percent))
        from public.outcome_attainment oa
        where oa.student_id = p_student_id
          and oa.scope = 'student_course'
      ), 0),
      'currentStreak', coalesce((
        select g.streak_current
        from public.student_gamification g
        where g.student_id = p_student_id
      ), 0),
      'currentLevel', coalesce((
        select g.level
        from public.student_gamification g
        where g.student_id = p_student_id
      ), 1),
      'totalXP', coalesce((
        select g.xp_total
        from public.student_gamification g
        where g.student_id = p_student_id
      ), 0),
      'totalActiveDays', coalesce((
        select g.total_active_days
        from public.student_gamification g
        where g.student_id = p_student_id
      ), 0)
    ),
    'deadlines', coalesce((
      select jsonb_agg(d.payload order by d.due_date asc)
      from (
        select
          jsonb_build_object(
            'id', a.id,
            'title', a.title,
            'course_name', coalesce(c.name, a.course_id::text),
            'due_date', a.due_date
          ) as payload,
          a.due_date
        from public.assignments a
        join public.courses c on c.id = a.course_id
        where a.course_id in (
            select sc.course_id
            from public.student_courses sc
            where sc.student_id = p_student_id
          )
          and a.due_date >= now()
        order by a.due_date asc
        limit 5
      ) d
    ), '[]'::jsonb)
  , 'streakFreeze', (
      select jsonb_build_object(
        'freezes', coalesce(g.streak_freezes_available, 0),
        'xpTotal', coalesce(g.xp_total, 0))
      from public.student_gamification g where g.student_id = p_student_id
    )
  , 'profileCompleteness', jsonb_build_object(
      'profile_completeness', coalesce(
        (select sp.profile_completeness from public.student_profiles sp where sp.student_id = p_student_id order by sp.assessment_version desc limit 1),
        (select op.profile_completeness from public.onboarding_progress op where op.student_id = p_student_id), 0),
      'day1_completed', coalesce((select op.day1_completed from public.onboarding_progress op where op.student_id = p_student_id), false)
    )
  , 'announcements', coalesce((
      select jsonb_agg(sub.a order by sub.is_pinned desc, sub.created_at desc)
      from (
        select jsonb_build_object('id', an.id, 'course_id', an.course_id, 'author_id', an.author_id,
                 'title', an.title, 'content', an.content, 'is_pinned', an.is_pinned,
                 'created_at', an.created_at, 'updated_at', an.updated_at) as a,
               an.is_pinned, an.created_at
        from public.announcements an
        where an.course_id in (select sc.course_id from public.student_courses sc where sc.student_id = p_student_id and sc.status = 'active')
        order by an.is_pinned desc, an.created_at desc limit 5
      ) sub
    ), '[]'::jsonb)
  , 'attendance', coalesce((
      select jsonb_agg(jsonb_build_object(
        'courseId', c.id, 'courseName', c.name,
        'totalSessions', stats.total, 'attended', stats.attended,
        'attendancePercent', case when stats.total = 0 then 100 else round((stats.attended::numeric / stats.total) * 100) end))
      from public.student_courses sc
      join public.courses c on c.id = sc.course_id
      cross join lateral (
        select count(distinct cs.id) as total,
               count(distinct ar.session_id) filter (where ar.status in ('present','late')) as attended
        from public.course_sections csec
        join public.class_sessions cs on cs.section_id = csec.id
        left join public.attendance_records ar on ar.session_id = cs.id and ar.student_id = sc.student_id
        where csec.course_id = sc.course_id
      ) stats
      where sc.student_id = p_student_id and sc.status = 'active'
    ), '[]'::jsonb)
  );
$$;

comment on function public.get_student_dashboard(uuid) is
  'Aggregates the student dashboard critical block (KPIs + upcoming deadlines) into one '
  'jsonb payload to collapse the per-section query fan-out. SECURITY INVOKER: RLS applies '
  'as the caller. See spec dashboard-and-ux-performance Req 2.';

-- EXECUTE grant: authenticated students call this via supabase.rpc(); anon does not.
revoke all on function public.get_student_dashboard(uuid) from public;
grant execute on function public.get_student_dashboard(uuid) to authenticated;

-- Rollback (manual): drop function public.get_student_dashboard(uuid);
