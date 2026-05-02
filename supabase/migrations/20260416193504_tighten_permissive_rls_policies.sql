-- Tighten overly permissive RLS policies that use USING(true) or WITH CHECK(true)
-- These bypass RLS for any authenticated user

-- 1. competency_frameworks: restrict to admin role within institution
DROP POLICY IF EXISTS cf_admin ON competency_frameworks;
CREATE POLICY cf_admin ON competency_frameworks
  FOR ALL TO authenticated
  USING ((select auth_user_role()) = 'admin' AND institution_id = (select auth_institution_id()))
  WITH CHECK ((select auth_user_role()) = 'admin' AND institution_id = (select auth_institution_id()));

-- 2. competency_items: restrict to admin role
DROP POLICY IF EXISTS ci_admin ON competency_items;
CREATE POLICY ci_admin ON competency_items
  FOR ALL TO authenticated
  USING ((select auth_user_role()) = 'admin' AND framework_id IN (
    SELECT id FROM competency_frameworks WHERE institution_id = (select auth_institution_id())
  ))
  WITH CHECK ((select auth_user_role()) = 'admin' AND framework_id IN (
    SELECT id FROM competency_frameworks WHERE institution_id = (select auth_institution_id())
  ));

-- 3. competency_outcome_mappings: restrict to admin role
DROP POLICY IF EXISTS com_admin ON competency_outcome_mappings;
CREATE POLICY com_admin ON competency_outcome_mappings
  FOR ALL TO authenticated
  USING ((select auth_user_role()) = 'admin' AND competency_item_id IN (
    SELECT ci.id FROM competency_items ci
    JOIN competency_frameworks cf ON cf.id = ci.framework_id
    WHERE cf.institution_id = (select auth_institution_id())
  ))
  WITH CHECK ((select auth_user_role()) = 'admin');

-- 4. graduate_attributes: restrict to admin role within institution
DROP POLICY IF EXISTS ga_admin ON graduate_attributes;
CREATE POLICY ga_admin ON graduate_attributes
  FOR ALL TO authenticated
  USING ((select auth_user_role()) = 'admin' AND institution_id = (select auth_institution_id()))
  WITH CHECK ((select auth_user_role()) = 'admin' AND institution_id = (select auth_institution_id()));

-- 5. graduate_attribute_mappings: restrict to admin role
DROP POLICY IF EXISTS ga_map_admin ON graduate_attribute_mappings;
CREATE POLICY ga_map_admin ON graduate_attribute_mappings
  FOR ALL TO authenticated
  USING ((select auth_user_role()) = 'admin' AND graduate_attribute_id IN (
    SELECT id FROM graduate_attributes WHERE institution_id = (select auth_institution_id())
  ))
  WITH CHECK ((select auth_user_role()) = 'admin');

-- 6. sub_clos: restrict to teacher/admin/coordinator
DROP POLICY IF EXISTS sub_clos_manage ON sub_clos;
CREATE POLICY sub_clos_manage ON sub_clos
  FOR ALL TO authenticated
  USING ((select auth_user_role()) IN ('admin', 'coordinator', 'teacher'))
  WITH CHECK ((select auth_user_role()) IN ('admin', 'coordinator', 'teacher'));

-- 7. challenge_progress INSERT: restrict to own participant
DROP POLICY IF EXISTS challenge_progress_upsert ON challenge_progress;
CREATE POLICY challenge_progress_upsert ON challenge_progress
  FOR INSERT TO authenticated
  WITH CHECK (participant_id = (select auth.uid()));

-- 8. social_challenges INSERT: restrict to teacher role
DROP POLICY IF EXISTS social_challenges_insert ON social_challenges;
CREATE POLICY social_challenges_insert ON social_challenges
  FOR INSERT TO authenticated
  WITH CHECK ((select auth_user_role()) IN ('admin', 'teacher') AND created_by = (select auth.uid()));

-- 9. team_members INSERT: restrict to team captain or teacher
DROP POLICY IF EXISTS team_members_insert ON team_members;
CREATE POLICY team_members_insert ON team_members
  FOR INSERT TO authenticated
  WITH CHECK (
    (select auth_user_role()) = 'teacher'
    OR team_id IN (SELECT id FROM teams WHERE captain_id = (select auth.uid()))
    OR student_id = (select auth.uid())
  );

-- 10. teams INSERT: restrict to teacher or student creating own team
DROP POLICY IF EXISTS teams_insert ON teams;
CREATE POLICY teams_insert ON teams
  FOR INSERT TO authenticated
  WITH CHECK (
    (select auth_user_role()) IN ('admin', 'teacher')
    OR (created_by = (select auth.uid()) AND (select auth_user_role()) = 'student')
  );;
