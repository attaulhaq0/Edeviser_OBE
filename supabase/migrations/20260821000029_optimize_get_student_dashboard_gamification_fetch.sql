-- ============================================================================
-- perf: get_student_dashboard — fetch student_gamification ONCE
--
-- The prior definition read public.student_gamification in FIVE separate scalar
-- subqueries (currentStreak, currentLevel, totalXP, totalActiveDays, and the
-- streakFreeze object). student_gamification has a UNIQUE index on student_id,
-- so every one of those probes returns the same single row. This replaces them
-- with ONE `SELECT ... INTO` and reads the fields from a record variable.
--
-- Output is byte-identical:
--   * KPI fields use the same coalesce(..., default) as before.
--   * streakFreeze preserves the original NULL-when-no-row semantics via the
--     FOUND flag (the old scalar subquery yielded NULL when the student had no
--     gamification row; `case when v_sg_found ... else null end` matches that).
--
-- Rationale: under concurrency on shared-core (Nano) compute, per-call CPU is
-- what drives contention. Cutting 5 index probes to 1 shaves CPU off every
-- dashboard load with zero behavioral change. Parity verified by diffing the
-- old vs new data logic across every student row (0 differences) before ship.
--
-- Replay-safe: get_student_dashboard was CREATEd in
-- 20260821000006_create_get_student_dashboard_rpc.sql (earlier in replay order),
-- so this CREATE OR REPLACE only ever runs after the function exists.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_student_dashboard(p_student_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_sid uuid := p_student_id;
  v_sg record;         -- single student_gamification row (0 or 1)
  v_sg_found boolean;  -- whether the student has a gamification row
begin
  -- Fail-closed guard (unchanged). SECURITY DEFINER bypasses RLS, so the
  -- function must guarantee a caller can only ever read THEIR OWN row set.
  if v_sid is distinct from (select auth.uid()) then
    v_sid := null;  -- neutralize → every read below returns empty/zero
  end if;

  -- Fetch the gamification row ONCE (was 5 separate scalar subqueries below).
  select g.streak_current, g.level, g.xp_total, g.total_active_days,
         g.streak_freezes_available
    into v_sg
    from public.student_gamification g
    where g.student_id = v_sid;
  v_sg_found := found;

  return jsonb_build_object(
    'kpis', jsonb_build_object(
      'enrolledCourses', (
        select count(*)
        from public.student_courses sc
        where sc.student_id = v_sid
      ),
      'completedAssignments', (
        select count(*)
        from public.submissions sub
        where sub.student_id = v_sid
          and sub.status = 'graded'
      ),
      'avgAttainment', coalesce((
        select round(avg(oa.attainment_percent))
        from public.outcome_attainment oa
        where oa.student_id = v_sid
          and oa.scope = 'student_course'
      ), 0),
      'currentStreak', coalesce(v_sg.streak_current, 0),
      'currentLevel', coalesce(v_sg.level, 1),
      'totalXP', coalesce(v_sg.xp_total, 0),
      'totalActiveDays', coalesce(v_sg.total_active_days, 0)
    ),
    -- (A) Spendable XP, identical formula to public.get_xp_balance(uuid).
    'availableXP', greatest(0,
      coalesce((
        select sum(xt.xp_amount)
        from public.xp_transactions xt
        where xt.student_id = v_sid
      ), 0)
      - coalesce((
        select sum(xp.xp_cost)
        from public.xp_purchases xp
        where xp.student_id = v_sid
          and xp.status <> 'refunded'
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
            where sc.student_id = v_sid
          )
          and a.due_date >= now()
        order by a.due_date asc
        limit 5
      ) d
    ), '[]'::jsonb)
  , 'streakFreeze', (
      case when v_sg_found then
        jsonb_build_object(
          'freezes', coalesce(v_sg.streak_freezes_available, 0),
          'xpTotal', coalesce(v_sg.xp_total, 0))
      else null end
    )
  , 'profileCompleteness', jsonb_build_object(
      'profile_completeness', coalesce(
        (select sp.profile_completeness from public.student_profiles sp where sp.student_id = v_sid order by sp.assessment_version desc limit 1),
        (select op.profile_completeness from public.onboarding_progress op where op.student_id = v_sid), 0),
      'day1_completed', coalesce((select op.day1_completed from public.onboarding_progress op where op.student_id = v_sid), false)
    )
  , 'announcements', coalesce((
      select jsonb_agg(sub.a order by sub.is_pinned desc, sub.created_at desc)
      from (
        select jsonb_build_object('id', an.id, 'course_id', an.course_id, 'author_id', an.author_id,
                 'title', an.title, 'content', an.content, 'is_pinned', an.is_pinned,
                 'created_at', an.created_at, 'updated_at', an.updated_at) as a,
               an.is_pinned, an.created_at
        from public.announcements an
        where an.course_id in (select sc.course_id from public.student_courses sc where sc.student_id = v_sid and sc.status = 'active')
        order by an.is_pinned desc, an.created_at desc limit 5
      ) sub
    ), '[]'::jsonb)
  -- (C) Set-based attendance roll-up (unchanged).
  , 'attendance', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'courseId', a.course_id,
          'courseName', a.course_name,
          'totalSessions', a.total,
          'attended', a.attended,
          'attendancePercent', case when a.total = 0 then 100 else round((a.attended::numeric / a.total) * 100) end)
        order by a.course_name)
      from (
        select
          sc.course_id,
          c.name as course_name,
          count(distinct cs.id) as total,
          count(distinct ar.session_id) filter (where ar.status in ('present','late')) as attended
        from public.student_courses sc
        join public.courses c on c.id = sc.course_id
        left join public.course_sections csec on csec.course_id = sc.course_id
        left join public.class_sessions cs on cs.section_id = csec.id
        left join public.attendance_records ar on ar.session_id = cs.id and ar.student_id = v_sid
        where sc.student_id = v_sid and sc.status = 'active'
        group by sc.course_id, c.name
      ) a
    ), '[]'::jsonb)
  );
end;
$function$;
