-- ─────────────────────────────────────────────────────────────────────────────
-- Optimize get_student_dashboard(p_student_id uuid) → jsonb
--
-- Spec: dashboard-and-ux-performance — Appendix A (Fixes A, C, D), Phase 6.
-- Live root-cause (project cdlgtbvxlxjpcddjazzx): the SQL is ~18 ms warm but real
-- calls spike to 6–7 s against the authenticated 8 s statement_timeout, dominated
-- by free-tier shared-CPU contention + the layered permissive-policy evaluation.
-- This migration makes three surgical, behavior-preserving improvements:
--
--   (A) availableXP — fold the student's spendable XP (earned − spent) into the
--       single dashboard payload so the persistent sidebar XP badge stops firing a
--       separate get_xp_balance RPC on every page mount. Value is byte-identical to
--       get_xp_balance: GREATEST(0, SUM(xp_transactions.xp_amount) − SUM(
--       xp_purchases.xp_cost WHERE status <> 'refunded')).
--
--   (C) attendance — replace the per-course `cross join lateral` (one nested
--       aggregation per enrolled course) with ONE set-based grouped join. Same
--       inputs, same per-course numbers; far smaller buffer footprint.
--
--   (D) SECURITY DEFINER + fail-closed guard — run the read-only aggregate as the
--       owner so its internal reads bypass the multiple-permissive-policy evaluation
--       on every table it touches (Supabase-documented perf pattern). Security is
--       preserved by neutralizing p_student_id to a non-matching id unless it equals
--       the caller (auth.uid()); a mismatched/anonymous caller therefore receives the
--       SAME empty/zero payload RLS would have produced under the prior SECURITY
--       INVOKER form — no cross-student leakage, no error. Staff impersonation is
--       intentionally NOT granted here (the only caller passes the student's own id);
--       add an explicit staff branch later if a staff "view-as-student" need arises.
--
-- Replay-safe: CREATE OR REPLACE of an already-existing function, no forward refs,
-- search_path = '' with public.-qualified objects (auth.uid() is auth-qualified;
-- pg_catalog aggregates resolve implicitly).
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.get_student_dashboard(p_student_id uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  v_sid uuid := p_student_id;
begin
  -- Fail-closed guard (see header (D)). SECURITY DEFINER bypasses RLS, so the
  -- function must guarantee a caller can only ever read THEIR OWN row set.
  if v_sid is distinct from (select auth.uid()) then
    v_sid := null;  -- neutralize → every read below returns empty/zero
  end if;

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
      'currentStreak', coalesce((
        select g.streak_current
        from public.student_gamification g
        where g.student_id = v_sid
      ), 0),
      'currentLevel', coalesce((
        select g.level
        from public.student_gamification g
        where g.student_id = v_sid
      ), 1),
      'totalXP', coalesce((
        select g.xp_total
        from public.student_gamification g
        where g.student_id = v_sid
      ), 0),
      'totalActiveDays', coalesce((
        select g.total_active_days
        from public.student_gamification g
        where g.student_id = v_sid
      ), 0)
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
      select jsonb_build_object(
        'freezes', coalesce(g.streak_freezes_available, 0),
        'xpTotal', coalesce(g.xp_total, 0))
      from public.student_gamification g where g.student_id = v_sid
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
  -- (C) Set-based attendance roll-up (replaces the per-course cross join lateral).
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
$$;

comment on function public.get_student_dashboard(uuid) is
  'Aggregates the student dashboard (KPIs + availableXP + deadlines + streakFreeze + '
  'profileCompleteness + announcements + attendance) into one jsonb payload. '
  'SECURITY DEFINER with a fail-closed auth.uid() guard: returns only the calling '
  'student''s own data (a mismatched/anon caller gets an empty payload), bypassing the '
  'layered permissive RLS for the legitimate self-call. See spec dashboard-and-ux-'
  'performance Appendix A.';

-- EXECUTE grant: authenticated students call this via supabase.rpc(); anon does not.
revoke all on function public.get_student_dashboard(uuid) from public;
grant execute on function public.get_student_dashboard(uuid) to authenticated;

-- Rollback (manual): restore the prior SECURITY INVOKER definition from
-- 20260821000006_create_get_student_dashboard_rpc.sql.
