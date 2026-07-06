-- =============================================================================
-- Optimize habit_logs RLS policies (Option J, Phase 1b)
-- =============================================================================
--
-- Two behavior-preserving changes to the `habit_logs` policies:
--
-- 1. Wrap the bare `auth_user_role()` / `auth_institution_id()` calls in a
--    scalar sub-select `(select ...)`. Per Supabase's "Auth RLS InitPlan" lint
--    (supabase.github.io/splinter/0003_auth_rls_initplan), wrapping a STABLE
--    auth helper in a sub-select lets Postgres evaluate it ONCE per statement
--    (an InitPlan) instead of potentially per row. `habit_logs` is a hot,
--    high-write student table, so the per-row cost of the previous bare calls
--    is the worst offender among the app's RLS policies. The boolean result is
--    identical — `(select f())` returns exactly what `f()` returns.
--
-- 2. Drop `student_select_own`. Its predicate
--       auth_user_role() = 'student' AND student_id = auth.uid()
--    is a strict subset of the still-present `users_read_own_habit_logs`
--       student_id = auth.uid()
--    Because permissive SELECT policies are OR-combined, the union of the two
--    already equals `student_id = auth.uid()`, so removing the narrower policy
--    does not change which rows any role can read. This is the redundant
--    student-own SELECT pair flagged in the RLS census.
--
-- `users_read_own_habit_logs` is intentionally left untouched: it already uses
-- `(select auth.uid())` and has no bare helper call to optimize.
--
-- Replay-safe: `auth_user_role()`, `auth_institution_id()`, `public.profiles`,
-- and `public.parent_student_links` are all created by earlier migrations, so a
-- from-scratch replay resolves every reference here.
-- =============================================================================

-- Drop the five policies with bare helper calls, plus the redundant student-own
-- SELECT policy (consolidated into users_read_own_habit_logs).
drop policy if exists "admin_all" on public.habit_logs;
drop policy if exists "student_insert_own" on public.habit_logs;
drop policy if exists "parent_select_linked" on public.habit_logs;
drop policy if exists "staff_select" on public.habit_logs;
drop policy if exists "student_update_own" on public.habit_logs;
drop policy if exists "student_select_own" on public.habit_logs;

-- Admin: full access to habit_logs of students within their institution.
create policy "admin_all" on public.habit_logs
  for all to authenticated
  using (
    (select auth_user_role()) = 'admin'
    and student_id in (
      select p.id from public.profiles p
      where p.institution_id = (select auth_institution_id())
    )
  );

-- Student: may insert only their own habit_logs.
create policy "student_insert_own" on public.habit_logs
  for insert to authenticated
  with check (
    (select auth_user_role()) = 'student'
    and student_id = (select auth.uid())
  );

-- Student: may update only their own habit_logs.
create policy "student_update_own" on public.habit_logs
  for update to authenticated
  using (
    (select auth_user_role()) = 'student'
    and student_id = (select auth.uid())
  )
  with check (
    (select auth_user_role()) = 'student'
    and student_id = (select auth.uid())
  );

-- Parent: may read habit_logs of their verified-linked children.
create policy "parent_select_linked" on public.habit_logs
  for select to authenticated
  using (
    (select auth_user_role()) = 'parent'
    and student_id in (
      select psl.student_id from public.parent_student_links psl
      where psl.parent_id = (select auth.uid())
        and psl.verified = true
    )
  );

-- Teacher / coordinator: may read habit_logs of students within their institution.
create policy "staff_select" on public.habit_logs
  for select to authenticated
  using (
    (select auth_user_role()) = any (array['teacher', 'coordinator'])
    and student_id in (
      select p.id from public.profiles p
      where p.institution_id = (select auth_institution_id())
    )
  );
