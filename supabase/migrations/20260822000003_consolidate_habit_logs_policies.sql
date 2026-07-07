-- =============================================================================
-- Consolidate habit_logs RLS policies: one permissive policy per command
-- (RLS multiple-permissive-policy merge, first table)
-- =============================================================================
--
-- WHY
-- ---
-- `habit_logs` currently has 6 permissive policies, which the planner must
-- OR-combine per command:
--     SELECT : users_read_own_habit_logs + staff_select + parent_select_linked
--              + admin_all (FOR ALL)                                   -> 4
--     INSERT : student_insert_own + admin_all                          -> 2
--     UPDATE : student_update_own + admin_all                          -> 2
--     DELETE : admin_all                                               -> 1
--
-- Two of those SELECT branches (staff / admin) filter with an inline subquery
-- over `public.profiles`:
--     student_id IN (SELECT id FROM profiles WHERE institution_id = auth_institution_id())
-- Because `profiles` itself has RLS enabled (with several permissive policies,
-- which in turn reference courses -> programs -> student_courses), that inline
-- subquery makes the planner expand every referenced table's policy set. A
-- plain "read my own habit logs" SELECT measured on production expanded into a
-- ~237-node plan costing ~51 ms JUST TO PLAN (execution was ~3 ms). Because the
-- shared pooler runs in transaction mode (no prepared-statement reuse), that
-- planning cost is paid again on every cold request -- a real CPU-contention
-- and cold-start tax on the Nano compute tier.
--
-- WHAT
-- ----
-- Collapse to exactly ONE permissive policy per command, and replace the inline
-- profiles subquery with a SECURITY DEFINER helper so the planner sees an opaque
-- function call instead of a nested RLS-expanded subquery. This is the same
-- pattern already used by `public.parent_has_verified_link(uuid)` (added by an
-- earlier migration for the parent branch), extended to the institution check.
--
-- BEHAVIOR IS PRESERVED EXACTLY (this is a performance/structure change, not a
-- permissions change). Permissive policies are OR-combined, so merging N
-- branches into one policy with the same predicates yields identical row
-- visibility, and the definer helper returns the same boolean the inline
-- subquery did:
--     student            : read / insert / update ONLY own rows (no delete)
--     teacher/coordinator : read any student in their institution (no writes)
--     admin               : read / insert / update / delete any student in their institution
--     parent              : read verified-linked children only (no writes)
--
-- REPLAY-SAFE
-- -----------
-- `public.is_student_in_my_institution(uuid)` is CREATEd below BEFORE the
-- policies that reference it. `public.auth_user_role()`,
-- `public.auth_institution_id()` and `public.parent_has_verified_link(uuid)`
-- are all created by earlier migrations (<= 20260821000031), so a from-scratch
-- replay in filename order resolves every reference here. All object references
-- are public-qualified and the helper pins `search_path = ''`.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Institution-membership helper (SECURITY DEFINER, flattens nested RLS).
--
--    Returns true when p_student_id belongs to a profile in the CALLER's own
--    institution. Being SECURITY DEFINER, its read of `public.profiles` does
--    NOT re-trigger the profiles RLS policy set (which is what caused the
--    237-node planner explosion). It can only ever compare against the caller's
--    OWN institution (via public.auth_institution_id()), so it reveals no more
--    than the inline subquery it replaces.
-- ---------------------------------------------------------------------------
create or replace function public.is_student_in_my_institution(p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.profiles p
    where p.id = p_student_id
      and p.institution_id = public.auth_institution_id()
  );
$function$;

-- Lock down execute: RLS evaluates policies as the querying role, so only
-- `authenticated` needs to call this. Deny PUBLIC/anon explicitly.
revoke execute on function public.is_student_in_my_institution(uuid) from public;
grant execute on function public.is_student_in_my_institution(uuid) to authenticated;

comment on function public.is_student_in_my_institution(uuid) is
  'True when the given student belongs to the caller''s institution. '
  'SECURITY DEFINER so RLS policies can institution-scope without re-expanding '
  'the profiles policy set (planner-cost flattening). Compares only against the '
  'caller''s own institution via auth_institution_id().';

-- ---------------------------------------------------------------------------
-- 2. Drop the 6 existing permissive policies.
-- ---------------------------------------------------------------------------
drop policy if exists "users_read_own_habit_logs" on public.habit_logs;
drop policy if exists "staff_select"              on public.habit_logs;
drop policy if exists "parent_select_linked"      on public.habit_logs;
drop policy if exists "admin_all"                 on public.habit_logs;
drop policy if exists "student_insert_own"        on public.habit_logs;
drop policy if exists "student_update_own"        on public.habit_logs;

-- ---------------------------------------------------------------------------
-- 3. One consolidated permissive policy per command.
-- ---------------------------------------------------------------------------

-- SELECT: own (student) OR institution (teacher/coordinator/admin) OR verified
-- parent link. Cheapest branch (own row) is listed first.
create policy "habit_logs_select" on public.habit_logs
  as permissive for select to authenticated
  using (
    student_id = (select auth.uid())
    or (
      (select public.auth_user_role()) = any (array['teacher', 'coordinator', 'admin'])
      and public.is_student_in_my_institution(student_id)
    )
    or (
      (select public.auth_user_role()) = 'parent'
      and public.parent_has_verified_link(student_id)
    )
  );

-- INSERT: student may insert only their own; admin may insert for any student
-- in their institution.
create policy "habit_logs_insert" on public.habit_logs
  as permissive for insert to authenticated
  with check (
    (
      (select public.auth_user_role()) = 'student'
      and student_id = (select auth.uid())
    )
    or (
      (select public.auth_user_role()) = 'admin'
      and public.is_student_in_my_institution(student_id)
    )
  );

-- UPDATE: same principals as INSERT (student own / admin institution), enforced
-- on both the existing row (USING) and the new row (WITH CHECK).
create policy "habit_logs_update" on public.habit_logs
  as permissive for update to authenticated
  using (
    (
      (select public.auth_user_role()) = 'student'
      and student_id = (select auth.uid())
    )
    or (
      (select public.auth_user_role()) = 'admin'
      and public.is_student_in_my_institution(student_id)
    )
  )
  with check (
    (
      (select public.auth_user_role()) = 'student'
      and student_id = (select auth.uid())
    )
    or (
      (select public.auth_user_role()) = 'admin'
      and public.is_student_in_my_institution(student_id)
    )
  );

-- DELETE: admin only, scoped to their institution (matches the prior admin_all;
-- students/teachers/coordinators/parents retain no delete access).
create policy "habit_logs_delete" on public.habit_logs
  as permissive for delete to authenticated
  using (
    (select public.auth_user_role()) = 'admin'
    and public.is_student_in_my_institution(student_id)
  );
