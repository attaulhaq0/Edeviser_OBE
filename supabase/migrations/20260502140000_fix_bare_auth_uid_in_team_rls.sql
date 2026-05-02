-- Fix bare auth.uid() calls in team-challenges RLS policies
-- The audit test requires (select auth.uid()) for performance optimization.
-- This migration drops and recreates all affected policies.

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. Fix policies from 20260502104347 (replace_permissive_team_rls)
-- ═══════════════════════════════════════════════════════════════════════════

-- teams: student select
DROP POLICY IF EXISTS "student_select_enrolled_teams" ON teams;
CREATE POLICY "student_select_enrolled_teams" ON teams
  FOR SELECT TO authenticated
  USING (
    auth_user_role() = 'student'
    AND institution_id = auth_institution_id()
    AND course_id IN (
      SELECT sc.course_id FROM student_courses sc
      WHERE sc.student_id = (select auth.uid())
    )
  );

-- team_members: student select
DROP POLICY IF EXISTS "student_select_enrolled_team_members" ON team_members;
CREATE POLICY "student_select_enrolled_team_members" ON team_members
  FOR SELECT TO authenticated
  USING (
    auth_user_role() = 'student'
    AND team_id IN (
      SELECT t.id FROM teams t
      JOIN student_courses sc ON sc.course_id = t.course_id
      WHERE sc.student_id = (select auth.uid())
        AND t.deleted_at IS NULL
    )
  );

-- team_members: teacher select
DROP POLICY IF EXISTS "teacher_select_team_members" ON team_members;
CREATE POLICY "teacher_select_team_members" ON team_members
  FOR SELECT TO authenticated
  USING (
    auth_user_role() = 'teacher'
    AND team_id IN (
      SELECT t.id FROM teams t
      JOIN courses c ON c.id = t.course_id
      WHERE c.teacher_id = (select auth.uid())
    )
  );

-- team_members: admin select
DROP POLICY IF EXISTS "admin_select_team_members" ON team_members;
CREATE POLICY "admin_select_team_members" ON team_members
  FOR SELECT TO authenticated
  USING (
    auth_user_role() = 'admin'
    AND team_id IN (
      SELECT id FROM teams WHERE institution_id = auth_institution_id()
    )
  );

-- social_challenges: student select
DROP POLICY IF EXISTS "student_select_enrolled_challenges" ON social_challenges;
CREATE POLICY "student_select_enrolled_challenges" ON social_challenges
  FOR SELECT TO authenticated
  USING (
    auth_user_role() = 'student'
    AND institution_id = auth_institution_id()
    AND status IN ('active', 'ended')
    AND course_id IN (
      SELECT sc.course_id FROM student_courses sc
      WHERE sc.student_id = (select auth.uid())
    )
  );

-- challenge_progress: student select
DROP POLICY IF EXISTS "student_select_own_challenge_progress" ON challenge_progress;
CREATE POLICY "student_select_own_challenge_progress" ON challenge_progress
  FOR SELECT TO authenticated
  USING (
    auth_user_role() = 'student'
    AND (
      (participant_type = 'individual' AND participant_id = (select auth.uid()))
      OR
      (participant_type = 'team' AND participant_id IN (
        SELECT tm.team_id FROM team_members tm
        WHERE tm.student_id = (select auth.uid()) AND tm.left_at IS NULL
      ))
    )
    AND challenge_id IN (
      SELECT sc.id FROM social_challenges sc
      JOIN student_courses scr ON scr.course_id = sc.course_id
      WHERE scr.student_id = (select auth.uid())
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. Fix policies from 20260415071619 (team_rls_policies_comprehensive)
-- ═══════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "teacher_all_teams" ON teams;
CREATE POLICY "teacher_all_teams" ON teams FOR ALL TO authenticated
  USING (auth_user_role() = 'teacher' AND course_id IN (SELECT id FROM courses WHERE teacher_id = (select auth.uid())) AND institution_id = auth_institution_id());

DROP POLICY IF EXISTS "student_create_team" ON teams;
CREATE POLICY "student_create_team" ON teams FOR INSERT TO authenticated
  WITH CHECK (auth_user_role() = 'student' AND institution_id = auth_institution_id() AND course_id IN (
    SELECT c.id FROM courses c JOIN student_courses sc ON sc.course_id = c.id WHERE sc.student_id = (select auth.uid()) AND c.team_formation_mode = 'student_formed'
  ));

DROP POLICY IF EXISTS "captain_manage_members" ON team_members;
CREATE POLICY "captain_manage_members" ON team_members FOR ALL TO authenticated
  USING (auth_user_role() = 'student' AND team_id IN (
    SELECT t.id FROM teams t JOIN courses c ON t.course_id = c.id WHERE t.captain_id = (select auth.uid()) AND c.team_formation_mode = 'student_formed' AND t.deleted_at IS NULL
  ));

DROP POLICY IF EXISTS "teacher_manage_members" ON team_members;
CREATE POLICY "teacher_manage_members" ON team_members FOR ALL TO authenticated
  USING (auth_user_role() = 'teacher' AND team_id IN (
    SELECT t.id FROM teams t JOIN courses c ON t.course_id = c.id WHERE c.teacher_id = (select auth.uid()) AND t.deleted_at IS NULL
  ));

DROP POLICY IF EXISTS "parent_select_members" ON team_members;
CREATE POLICY "parent_select_members" ON team_members FOR SELECT TO authenticated
  USING (auth_user_role() = 'parent' AND student_id IN (
    SELECT student_id FROM parent_student_links WHERE parent_id = (select auth.uid()) AND verified = true
  ));

DROP POLICY IF EXISTS "teacher_all_challenges" ON social_challenges;
CREATE POLICY "teacher_all_challenges" ON social_challenges FOR ALL TO authenticated
  USING (auth_user_role() = 'teacher' AND course_id IN (SELECT id FROM courses WHERE teacher_id = (select auth.uid())) AND institution_id = auth_institution_id());

DROP POLICY IF EXISTS "teacher_select_progress" ON challenge_progress;
CREATE POLICY "teacher_select_progress" ON challenge_progress FOR SELECT TO authenticated
  USING (auth_user_role() = 'teacher' AND challenge_id IN (
    SELECT sc.id FROM social_challenges sc JOIN courses c ON sc.course_id = c.id WHERE c.teacher_id = (select auth.uid())
  ));

DROP POLICY IF EXISTS "parent_select_progress" ON challenge_progress;
CREATE POLICY "parent_select_progress" ON challenge_progress FOR SELECT TO authenticated
  USING (auth_user_role() = 'parent' AND participant_type = 'individual' AND participant_id IN (
    SELECT student_id FROM parent_student_links WHERE parent_id = (select auth.uid()) AND verified = true
  ));

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. Fix policies from 20260415071655 (add_rls_new_team_tables)
-- ═══════════════════════════════════════════════════════════════════════════

-- team_invitations
DROP POLICY IF EXISTS "student_select_own_invitations" ON team_invitations;
CREATE POLICY "student_select_own_invitations" ON team_invitations FOR SELECT TO authenticated
  USING (auth_user_role() = 'student' AND invited_student_id = (select auth.uid()));

DROP POLICY IF EXISTS "captain_insert_invitations" ON team_invitations;
CREATE POLICY "captain_insert_invitations" ON team_invitations FOR INSERT TO authenticated
  WITH CHECK (auth_user_role() = 'student' AND invited_by = (select auth.uid()) AND team_id IN (
    SELECT id FROM teams WHERE captain_id = (select auth.uid()) AND deleted_at IS NULL
  ));

DROP POLICY IF EXISTS "student_respond_invitation" ON team_invitations;
CREATE POLICY "student_respond_invitation" ON team_invitations FOR UPDATE TO authenticated
  USING (auth_user_role() = 'student' AND invited_student_id = (select auth.uid()) AND status = 'pending');

DROP POLICY IF EXISTS "teacher_select_invitations" ON team_invitations;
CREATE POLICY "teacher_select_invitations" ON team_invitations FOR SELECT TO authenticated
  USING (auth_user_role() = 'teacher' AND team_id IN (
    SELECT t.id FROM teams t JOIN courses c ON t.course_id = c.id WHERE c.teacher_id = (select auth.uid())
  ));

-- peer_teaching_moments
DROP POLICY IF EXISTS "team_select_teaching_moments" ON peer_teaching_moments;
CREATE POLICY "team_select_teaching_moments" ON peer_teaching_moments FOR SELECT TO authenticated
  USING (team_id IN (SELECT tm.team_id FROM team_members tm WHERE tm.student_id = (select auth.uid()) AND tm.left_at IS NULL));

DROP POLICY IF EXISTS "author_insert_teaching_moment" ON peer_teaching_moments;
CREATE POLICY "author_insert_teaching_moment" ON peer_teaching_moments FOR INSERT TO authenticated
  WITH CHECK (auth_user_role() = 'student' AND author_id = (select auth.uid()) AND team_id IN (
    SELECT tm.team_id FROM team_members tm WHERE tm.student_id = (select auth.uid()) AND tm.left_at IS NULL
  ));

DROP POLICY IF EXISTS "author_update_teaching_moment" ON peer_teaching_moments;
CREATE POLICY "author_update_teaching_moment" ON peer_teaching_moments FOR UPDATE TO authenticated
  USING (author_id = (select auth.uid()));

DROP POLICY IF EXISTS "teacher_select_teaching_moments" ON peer_teaching_moments;
CREATE POLICY "teacher_select_teaching_moments" ON peer_teaching_moments FOR SELECT TO authenticated
  USING (auth_user_role() = 'teacher' AND team_id IN (
    SELECT t.id FROM teams t JOIN courses c ON t.course_id = c.id WHERE c.teacher_id = (select auth.uid())
  ));

-- teaching_moment_views
DROP POLICY IF EXISTS "viewer_insert_view" ON teaching_moment_views;
CREATE POLICY "viewer_insert_view" ON teaching_moment_views FOR INSERT TO authenticated
  WITH CHECK (viewer_id = (select auth.uid()));

DROP POLICY IF EXISTS "team_select_views" ON teaching_moment_views;
CREATE POLICY "team_select_views" ON teaching_moment_views FOR SELECT TO authenticated
  USING (teaching_moment_id IN (
    SELECT ptm.id FROM peer_teaching_moments ptm WHERE ptm.team_id IN (
      SELECT tm.team_id FROM team_members tm WHERE tm.student_id = (select auth.uid()) AND tm.left_at IS NULL
    )
  ));

-- teaching_moment_ratings
DROP POLICY IF EXISTS "viewer_insert_rating" ON teaching_moment_ratings;
CREATE POLICY "viewer_insert_rating" ON teaching_moment_ratings FOR INSERT TO authenticated
  WITH CHECK (viewer_id = (select auth.uid()));

DROP POLICY IF EXISTS "team_select_ratings" ON teaching_moment_ratings;
CREATE POLICY "team_select_ratings" ON teaching_moment_ratings FOR SELECT TO authenticated
  USING (teaching_moment_id IN (
    SELECT ptm.id FROM peer_teaching_moments ptm WHERE ptm.team_id IN (
      SELECT tm.team_id FROM team_members tm WHERE tm.student_id = (select auth.uid()) AND tm.left_at IS NULL
    )
  ));

DROP POLICY IF EXISTS "teacher_select_ratings" ON teaching_moment_ratings;
CREATE POLICY "teacher_select_ratings" ON teaching_moment_ratings FOR SELECT TO authenticated
  USING (auth_user_role() = 'teacher' AND teaching_moment_id IN (
    SELECT ptm.id FROM peer_teaching_moments ptm JOIN teams t ON ptm.team_id = t.id JOIN courses c ON t.course_id = c.id WHERE c.teacher_id = (select auth.uid())
  ));

-- team_health_snapshots
DROP POLICY IF EXISTS "teacher_select_health_snapshots" ON team_health_snapshots;
CREATE POLICY "teacher_select_health_snapshots" ON team_health_snapshots FOR SELECT TO authenticated
  USING (auth_user_role() = 'teacher' AND team_id IN (
    SELECT t.id FROM teams t JOIN courses c ON t.course_id = c.id WHERE c.teacher_id = (select auth.uid())
  ));

-- replacement_votes
DROP POLICY IF EXISTS "member_select_votes" ON replacement_votes;
CREATE POLICY "member_select_votes" ON replacement_votes FOR SELECT TO authenticated
  USING (team_id IN (SELECT tm.team_id FROM team_members tm WHERE tm.student_id = (select auth.uid()) AND tm.left_at IS NULL));

DROP POLICY IF EXISTS "captain_insert_vote" ON replacement_votes;
CREATE POLICY "captain_insert_vote" ON replacement_votes FOR INSERT TO authenticated
  WITH CHECK (initiated_by = (select auth.uid()) AND team_id IN (SELECT id FROM teams WHERE captain_id = (select auth.uid()) AND deleted_at IS NULL));

DROP POLICY IF EXISTS "member_cast_vote" ON replacement_votes;
CREATE POLICY "member_cast_vote" ON replacement_votes FOR UPDATE TO authenticated
  USING (status = 'open' AND team_id IN (SELECT tm.team_id FROM team_members tm WHERE tm.student_id = (select auth.uid()) AND tm.left_at IS NULL));

DROP POLICY IF EXISTS "teacher_manage_votes" ON replacement_votes;
CREATE POLICY "teacher_manage_votes" ON replacement_votes FOR ALL TO authenticated
  USING (auth_user_role() = 'teacher' AND team_id IN (
    SELECT t.id FROM teams t JOIN courses c ON t.course_id = c.id WHERE c.teacher_id = (select auth.uid())
  ));
