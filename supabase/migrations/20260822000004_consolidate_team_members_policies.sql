-- =============================================================================
-- Consolidate team_members RLS policies: one permissive policy per command
-- (RLS multiple-permissive-policy merge, table 2 of the effort)
-- =============================================================================
--
-- WHY
-- ---
-- `team_members` currently has 7 permissive policies. Because two of them are
-- `FOR ALL` (captain_manage_members, teacher_manage_members), the planner
-- OR-composes a large set per command:
--     SELECT : 6 effective (captain_manage, teacher_manage, admin_select,
--              parent_select, student_select_enrolled, teacher_select)
--     INSERT : 3 (captain_manage, teacher_manage, team_members_insert)
--     UPDATE : 2 (captain_manage, teacher_manage)
--     DELETE : 2 (captain_manage, teacher_manage)
-- Every branch filters through an inline subquery over `teams` joined to
-- `courses` / `student_courses` — all of which have their own RLS policy sets,
-- so a single `team_members` read expands into a deep nested plan (the same
-- planner-explosion class fixed for habit_logs in 20260822000003).
--
-- WHAT
-- ----
-- Collapse to exactly ONE permissive policy per command, and replace every
-- inline `team_id IN (SELECT ... FROM teams ...)` / `student_id IN (...)`
-- subquery with a SECURITY DEFINER helper so the planner sees an opaque
-- function call instead of a nested RLS-expanded subquery. Same pattern as
-- `parent_has_verified_link` / `is_student_in_my_institution`.
--
-- BEHAVIOR IS PRESERVED EXACTLY (performance/structure change, not a
-- permissions change). Permissive policies are OR-composed, so N branches
-- merged into one policy with the same predicates yields identical access:
--   SELECT  : admin(own institution) OR teacher(teaches team's course) OR
--             student(enrolled in team's course, team not deleted) OR
--             parent(verified-linked to the row's student).
--   INSERT  : any teacher OR the team's captain OR a student adding themselves.
--   UPDATE  : student captain of a student_formed, non-deleted team OR the
--             teacher of the team's course (team not deleted).
--   DELETE  : same principals as UPDATE.
--
-- Subsumption notes (why 7 -> 4 loses nothing):
--   * SELECT: captain_manage's read (student captain of a student_formed team)
--     is a subset of student_select_enrolled (the captain is enrolled in the
--     course), so it folds into the student branch. teacher_manage's read is a
--     subset of teacher_select (teacher of the course); teacher_select had NO
--     `deleted_at` filter, so the merged teacher SELECT branch intentionally
--     omits it too (widest of the two, preserving behavior).
--   * INSERT: captain_manage (student captain, student_formed) ⊆ team_i_captain;
--     teacher_manage (teacher of course) ⊆ "any teacher"; so the merged INSERT
--     equals team_members_insert's original predicate verbatim.
--
-- ⚠ PRE-EXISTING BREADTH PRESERVED (flagged for a separate security review, NOT
-- changed here): the original `team_members_insert` lets ANY user with role
-- 'teacher' insert a membership row — it is not scoped to a course the teacher
-- actually teaches. This consolidation deliberately preserves that exact grant
-- (behavior-preserving). Tightening it to "teacher of the team's course" is a
-- behavior change and should be its own reviewed PR + test.
--
-- REPLAY-SAFE
-- -----------
-- All six helpers are CREATEd below BEFORE the policies that reference them.
-- `public.auth_user_role()`, `public.auth_institution_id()`,
-- `public.parent_has_verified_link(uuid)` are created by earlier migrations
-- (<= 20260822000003). All references are public-qualified; helpers pin
-- `search_path = ''`.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Team-visibility helpers (SECURITY DEFINER — flatten nested teams/courses
--    RLS so team_members policies plan against opaque function calls).
--    Each compares only against the CALLER's own relationships (auth.uid() /
--    auth_institution_id()), so none widens what the inline subqueries exposed.
-- ---------------------------------------------------------------------------

-- Admin SELECT: the team belongs to the caller's institution.
create or replace function public.team_in_my_institution(p_team_id uuid)
returns boolean language sql stable security definer set search_path = '' as $function$
  select exists (
    select 1 from public.teams t
    where t.id = p_team_id
      and t.institution_id = public.auth_institution_id()
  );
$function$;

-- Teacher SELECT: the caller teaches the team's course. No deleted_at filter,
-- matching the original teacher_select_team_members (the wider of the two
-- teacher reads), so a teacher can still see members of a soft-deleted team.
create or replace function public.team_in_course_i_teach(p_team_id uuid)
returns boolean language sql stable security definer set search_path = '' as $function$
  select exists (
    select 1 from public.teams t
    join public.courses c on c.id = t.course_id
    where t.id = p_team_id
      and c.teacher_id = auth.uid()
  );
$function$;

-- Teacher WRITE (update/delete): teaches the team's course AND team not deleted
-- (matches teacher_manage_members' `t.deleted_at IS NULL`).
create or replace function public.team_in_course_i_teach_active(p_team_id uuid)
returns boolean language sql stable security definer set search_path = '' as $function$
  select exists (
    select 1 from public.teams t
    join public.courses c on c.id = t.course_id
    where t.id = p_team_id
      and c.teacher_id = auth.uid()
      and t.deleted_at is null
  );
$function$;

-- Student SELECT: the caller is enrolled in the team's course and the team is
-- not deleted (matches student_select_enrolled_team_members).
create or replace function public.student_enrolled_in_team_course(p_team_id uuid)
returns boolean language sql stable security definer set search_path = '' as $function$
  select exists (
    select 1 from public.teams t
    join public.student_courses sc on sc.course_id = t.course_id
    where t.id = p_team_id
      and sc.student_id = auth.uid()
      and t.deleted_at is null
  );
$function$;

-- Captain INSERT: the caller is the team's captain. Intentionally NO
-- formation-mode / deleted filter, matching the original team_members_insert
-- captain branch (`team_id IN (SELECT id FROM teams WHERE captain_id = uid)`).
create or replace function public.team_i_captain(p_team_id uuid)
returns boolean language sql stable security definer set search_path = '' as $function$
  select exists (
    select 1 from public.teams t
    where t.id = p_team_id
      and t.captain_id = auth.uid()
  );
$function$;

-- Captain WRITE (update/delete): the caller captains a STUDENT_FORMED,
-- non-deleted team (matches captain_manage_members exactly).
create or replace function public.team_i_captain_student_formed_active(p_team_id uuid)
returns boolean language sql stable security definer set search_path = '' as $function$
  select exists (
    select 1 from public.teams t
    join public.courses c on c.id = t.course_id
    where t.id = p_team_id
      and t.captain_id = auth.uid()
      and c.team_formation_mode = 'student_formed'
      and t.deleted_at is null
  );
$function$;

-- Lock down execute for all six (RLS evaluates as the querying role).
revoke execute on function public.team_in_my_institution(uuid) from public;
revoke execute on function public.team_in_course_i_teach(uuid) from public;
revoke execute on function public.team_in_course_i_teach_active(uuid) from public;
revoke execute on function public.student_enrolled_in_team_course(uuid) from public;
revoke execute on function public.team_i_captain(uuid) from public;
revoke execute on function public.team_i_captain_student_formed_active(uuid) from public;

grant execute on function public.team_in_my_institution(uuid) to authenticated;
grant execute on function public.team_in_course_i_teach(uuid) to authenticated;
grant execute on function public.team_in_course_i_teach_active(uuid) to authenticated;
grant execute on function public.student_enrolled_in_team_course(uuid) to authenticated;
grant execute on function public.team_i_captain(uuid) to authenticated;
grant execute on function public.team_i_captain_student_formed_active(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Drop the 7 existing permissive policies.
-- ---------------------------------------------------------------------------
drop policy if exists "captain_manage_members"               on public.team_members;
drop policy if exists "teacher_manage_members"               on public.team_members;
drop policy if exists "team_members_insert"                  on public.team_members;
drop policy if exists "admin_select_team_members"            on public.team_members;
drop policy if exists "parent_select_members"                on public.team_members;
drop policy if exists "student_select_enrolled_team_members" on public.team_members;
drop policy if exists "teacher_select_team_members"          on public.team_members;

-- ---------------------------------------------------------------------------
-- 3. One consolidated permissive policy per command.
-- ---------------------------------------------------------------------------

-- SELECT: admin(institution) OR teacher(teaches course) OR student(enrolled) OR
-- parent(verified-linked to the row's student).
create policy "team_members_select" on public.team_members
  as permissive for select to authenticated
  using (
    ((select public.auth_user_role()) = 'admin'   and public.team_in_my_institution(team_id))
    or ((select public.auth_user_role()) = 'teacher' and public.team_in_course_i_teach(team_id))
    or ((select public.auth_user_role()) = 'student' and public.student_enrolled_in_team_course(team_id))
    or ((select public.auth_user_role()) = 'parent'  and public.parent_has_verified_link(student_id))
  );

-- INSERT: any teacher OR the team's captain OR a student adding themselves
-- (verbatim preservation of the original team_members_insert; see breadth note).
create policy "team_members_insert" on public.team_members
  as permissive for insert to authenticated
  with check (
    (select public.auth_user_role()) = 'teacher'
    or public.team_i_captain(team_id)
    or student_id = (select auth.uid())
  );

-- UPDATE: student captain of a student_formed, non-deleted team OR the teacher
-- of the team's course (team not deleted). Enforced on old and new row.
create policy "team_members_update" on public.team_members
  as permissive for update to authenticated
  using (
    ((select public.auth_user_role()) = 'student' and public.team_i_captain_student_formed_active(team_id))
    or ((select public.auth_user_role()) = 'teacher' and public.team_in_course_i_teach_active(team_id))
  )
  with check (
    ((select public.auth_user_role()) = 'student' and public.team_i_captain_student_formed_active(team_id))
    or ((select public.auth_user_role()) = 'teacher' and public.team_in_course_i_teach_active(team_id))
  );

-- DELETE: same principals as UPDATE.
create policy "team_members_delete" on public.team_members
  as permissive for delete to authenticated
  using (
    ((select public.auth_user_role()) = 'student' and public.team_i_captain_student_formed_active(team_id))
    or ((select public.auth_user_role()) = 'teacher' and public.team_in_course_i_teach_active(team_id))
  );
