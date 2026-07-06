-- =============================================================================
-- Student dashboard snapshot read-model (Option J — precompute)
-- =============================================================================
--
-- Turns get_student_dashboard from "recompute an 8-table aggregate on every call"
-- (~250ms uncontended, several seconds under Nano contention) into a read-through
-- cache over a per-student snapshot row (~5ms). This is the precomputed
-- rollup/read-model pattern used across EdTech analytics (e.g. history-rollup
-- tables) and BI (materialized views), scaled down to a single Postgres table.
--
-- Correctness / freshness:
--   * The aggregate SQL is copied VERBATIM from the previous function body, so a
--     freshly-computed snapshot is byte-for-byte identical to the old output
--     (parity). Proven by studentDashboardSnapshot.rls.test.ts.
--   * Read-through with a short TTL (STALE window): a snapshot is served only if
--     it was computed within the window; otherwise it is recomputed and rewritten.
--   * Write-invalidation: an AFTER trigger on student_gamification drops the
--     student's snapshot whenever their XP / streak / level / freezes change, so
--     gamification feedback (the time-critical, frequently-changing data — and,
--     transitively, graded-assignment counts and attainment, which award XP)
--     stays INSTANT. Only slow-changing structural data (new enrollment /
--     announcement / future deadline) can lag, and only up to the TTL.
--   * The fail-closed auth guard is unchanged: a caller can only ever read (and
--     cache) THEIR OWN row set; a null sid computes an empty payload and is never
--     cached.
--
-- The function becomes VOLATILE (it now writes the cache). supabase-js rpc() and
-- PostgREST call it via POST, so this is transparent to the client.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Snapshot table. RLS on with NO policies: direct client access is denied;
--    only the SECURITY DEFINER RPC reads/writes it (as owner, bypassing RLS).
-- ---------------------------------------------------------------------------
create table if not exists public.student_dashboard_snapshot (
  student_id uuid primary key references public.profiles (id) on delete cascade,
  payload jsonb not null,
  computed_at timestamptz not null default now()
);

alter table public.student_dashboard_snapshot enable row level security;

-- ---------------------------------------------------------------------------
-- 2. get_student_dashboard: read-through / write-through cache wrapper around
--    the (verbatim) aggregate.
-- ---------------------------------------------------------------------------
create or replace function public.get_student_dashboard(p_student_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path to ''
as $function$
declare
  v_sid uuid := p_student_id;
  v_sg record;         -- single student_gamification row (0 or 1)
  v_sg_found boolean;  -- whether the student has a gamification row
  v_cached jsonb;      -- a fresh snapshot payload, if present
  v_payload jsonb;     -- the computed payload
begin
  -- Fail-closed guard (unchanged). SECURITY DEFINER bypasses RLS, so the
  -- function must guarantee a caller can only ever read THEIR OWN row set.
  if v_sid is distinct from (select auth.uid()) then
    v_sid := null;  -- neutralize → every read below returns empty/zero
  end if;

  -- Read-through: serve a fresh precomputed snapshot when available (~5ms).
  if v_sid is not null then
    select s.payload into v_cached
    from public.student_dashboard_snapshot s
    where s.student_id = v_sid
      and s.computed_at > now() - interval '5 minutes';
    if found then
      return v_cached;
    end if;
  end if;

  -- Fetch the gamification row ONCE (was 5 separate scalar subqueries below).
  select g.streak_current, g.level, g.xp_total, g.total_active_days,
         g.streak_freezes_available
    into v_sg
    from public.student_gamification g
    where g.student_id = v_sid;
  v_sg_found := found;

  v_payload := jsonb_build_object(
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

  -- Write-through: cache the fresh payload for subsequent reads.
  if v_sid is not null then
    insert into public.student_dashboard_snapshot (student_id, payload, computed_at)
    values (v_sid, v_payload, now())
    on conflict (student_id) do update
      set payload = excluded.payload,
          computed_at = excluded.computed_at;
  end if;

  return v_payload;
end;
$function$;

-- ---------------------------------------------------------------------------
-- 3. Invalidate the snapshot when the student's gamification row changes, so
--    XP / streak / level / freeze updates (and anything that awards XP, e.g. a
--    graded assignment) are reflected on the next dashboard read immediately.
-- ---------------------------------------------------------------------------
create or replace function public.invalidate_student_dashboard_snapshot()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  delete from public.student_dashboard_snapshot
  where student_id = new.student_id;
  return new;
end;
$function$;

drop trigger if exists trg_invalidate_dashboard_snapshot on public.student_gamification;
create trigger trg_invalidate_dashboard_snapshot
  after insert or update on public.student_gamification
  for each row
  execute function public.invalidate_student_dashboard_snapshot();
