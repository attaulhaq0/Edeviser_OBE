-- team_invitations RLS
CREATE POLICY "student_select_own_invitations" ON team_invitations FOR SELECT TO authenticated
  USING (auth_user_role() = 'student' AND invited_student_id = (select auth.uid()));

CREATE POLICY "captain_insert_invitations" ON team_invitations FOR INSERT TO authenticated
  WITH CHECK (auth_user_role() = 'student' AND invited_by = (select auth.uid()) AND team_id IN (
    SELECT id FROM teams WHERE captain_id = (select auth.uid()) AND deleted_at IS NULL
  ));

CREATE POLICY "student_respond_invitation" ON team_invitations FOR UPDATE TO authenticated
  USING (auth_user_role() = 'student' AND invited_student_id = (select auth.uid()) AND status = 'pending');

CREATE POLICY "teacher_select_invitations" ON team_invitations FOR SELECT TO authenticated
  USING (auth_user_role() = 'teacher' AND team_id IN (
    SELECT t.id FROM teams t JOIN courses c ON t.course_id = c.id WHERE c.teacher_id = (select auth.uid())
  ));

-- team_badges RLS
CREATE POLICY "select_team_badges" ON team_badges FOR SELECT TO authenticated
  USING (team_id IN (SELECT id FROM teams WHERE institution_id = auth_institution_id()));

-- peer_teaching_moments RLS
CREATE POLICY "team_select_teaching_moments" ON peer_teaching_moments FOR SELECT TO authenticated
  USING (team_id IN (SELECT tm.team_id FROM team_members tm WHERE tm.student_id = (select auth.uid()) AND tm.left_at IS NULL));

CREATE POLICY "author_insert_teaching_moment" ON peer_teaching_moments FOR INSERT TO authenticated
  WITH CHECK (auth_user_role() = 'student' AND author_id = (select auth.uid()) AND team_id IN (
    SELECT tm.team_id FROM team_members tm WHERE tm.student_id = (select auth.uid()) AND tm.left_at IS NULL
  ));

CREATE POLICY "author_update_teaching_moment" ON peer_teaching_moments FOR UPDATE TO authenticated
  USING (author_id = (select auth.uid()));

CREATE POLICY "teacher_select_teaching_moments" ON peer_teaching_moments FOR SELECT TO authenticated
  USING (auth_user_role() = 'teacher' AND team_id IN (
    SELECT t.id FROM teams t JOIN courses c ON t.course_id = c.id WHERE c.teacher_id = (select auth.uid())
  ));

-- teaching_moment_views RLS
CREATE POLICY "viewer_insert_view" ON teaching_moment_views FOR INSERT TO authenticated
  WITH CHECK (viewer_id = (select auth.uid()));

CREATE POLICY "team_select_views" ON teaching_moment_views FOR SELECT TO authenticated
  USING (teaching_moment_id IN (
    SELECT ptm.id FROM peer_teaching_moments ptm WHERE ptm.team_id IN (
      SELECT tm.team_id FROM team_members tm WHERE tm.student_id = (select auth.uid()) AND tm.left_at IS NULL
    )
  ));

-- teaching_moment_ratings RLS
CREATE POLICY "viewer_insert_rating" ON teaching_moment_ratings FOR INSERT TO authenticated
  WITH CHECK (viewer_id = (select auth.uid()));

CREATE POLICY "team_select_ratings" ON teaching_moment_ratings FOR SELECT TO authenticated
  USING (teaching_moment_id IN (
    SELECT ptm.id FROM peer_teaching_moments ptm WHERE ptm.team_id IN (
      SELECT tm.team_id FROM team_members tm WHERE tm.student_id = (select auth.uid()) AND tm.left_at IS NULL
    )
  ));

CREATE POLICY "teacher_select_ratings" ON teaching_moment_ratings FOR SELECT TO authenticated
  USING (auth_user_role() = 'teacher' AND teaching_moment_id IN (
    SELECT ptm.id FROM peer_teaching_moments ptm JOIN teams t ON ptm.team_id = t.id JOIN courses c ON t.course_id = c.id WHERE c.teacher_id = (select auth.uid())
  ));

-- team_health_snapshots RLS
CREATE POLICY "teacher_select_health_snapshots" ON team_health_snapshots FOR SELECT TO authenticated
  USING (auth_user_role() = 'teacher' AND team_id IN (
    SELECT t.id FROM teams t JOIN courses c ON t.course_id = c.id WHERE c.teacher_id = (select auth.uid())
  ));

CREATE POLICY "admin_select_health_snapshots" ON team_health_snapshots FOR SELECT TO authenticated
  USING (auth_user_role() = 'admin' AND team_id IN (SELECT id FROM teams WHERE institution_id = auth_institution_id()));

-- replacement_votes RLS
CREATE POLICY "member_select_votes" ON replacement_votes FOR SELECT TO authenticated
  USING (team_id IN (SELECT tm.team_id FROM team_members tm WHERE tm.student_id = (select auth.uid()) AND tm.left_at IS NULL));

CREATE POLICY "captain_insert_vote" ON replacement_votes FOR INSERT TO authenticated
  WITH CHECK (initiated_by = (select auth.uid()) AND team_id IN (SELECT id FROM teams WHERE captain_id = (select auth.uid()) AND deleted_at IS NULL));

CREATE POLICY "member_cast_vote" ON replacement_votes FOR UPDATE TO authenticated
  USING (status = 'open' AND team_id IN (SELECT tm.team_id FROM team_members tm WHERE tm.student_id = (select auth.uid()) AND tm.left_at IS NULL));

CREATE POLICY "teacher_manage_votes" ON replacement_votes FOR ALL TO authenticated
  USING (auth_user_role() = 'teacher' AND team_id IN (
    SELECT t.id FROM teams t JOIN courses c ON t.course_id = c.id WHERE c.teacher_id = (select auth.uid())
  ));
