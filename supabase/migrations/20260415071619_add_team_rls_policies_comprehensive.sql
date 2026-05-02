-- Enhanced RLS for teams: teacher full CRUD, student create in student_formed mode, admin, coordinator
CREATE POLICY "teacher_all_teams" ON teams FOR ALL TO authenticated
  USING (auth_user_role() = 'teacher' AND course_id IN (SELECT id FROM courses WHERE teacher_id = auth.uid()) AND institution_id = auth_institution_id());

CREATE POLICY "student_create_team" ON teams FOR INSERT TO authenticated
  WITH CHECK (auth_user_role() = 'student' AND institution_id = auth_institution_id() AND course_id IN (
    SELECT c.id FROM courses c JOIN student_courses sc ON sc.course_id = c.id WHERE sc.student_id = auth.uid() AND c.team_formation_mode = 'student_formed'
  ));

CREATE POLICY "admin_all_teams" ON teams FOR ALL TO authenticated
  USING (auth_user_role() = 'admin' AND institution_id = auth_institution_id());

CREATE POLICY "coordinator_select_teams" ON teams FOR SELECT TO authenticated
  USING (auth_user_role() = 'coordinator' AND institution_id = auth_institution_id());

-- Enhanced team_members: captain manage, teacher manage, parent read
CREATE POLICY "captain_manage_members" ON team_members FOR ALL TO authenticated
  USING (auth_user_role() = 'student' AND team_id IN (
    SELECT t.id FROM teams t JOIN courses c ON t.course_id = c.id WHERE t.captain_id = auth.uid() AND c.team_formation_mode = 'student_formed' AND t.deleted_at IS NULL
  ));

CREATE POLICY "teacher_manage_members" ON team_members FOR ALL TO authenticated
  USING (auth_user_role() = 'teacher' AND team_id IN (
    SELECT t.id FROM teams t JOIN courses c ON t.course_id = c.id WHERE c.teacher_id = auth.uid() AND t.deleted_at IS NULL
  ));

CREATE POLICY "parent_select_members" ON team_members FOR SELECT TO authenticated
  USING (auth_user_role() = 'parent' AND student_id IN (
    SELECT student_id FROM parent_student_links WHERE parent_id = auth.uid() AND verified = true
  ));

-- Enhanced social_challenges: admin select
CREATE POLICY "admin_select_challenges" ON social_challenges FOR SELECT TO authenticated
  USING (auth_user_role() = 'admin' AND institution_id = auth_institution_id());

CREATE POLICY "teacher_all_challenges" ON social_challenges FOR ALL TO authenticated
  USING (auth_user_role() = 'teacher' AND course_id IN (SELECT id FROM courses WHERE teacher_id = auth.uid()) AND institution_id = auth_institution_id());

-- Enhanced challenge_progress: teacher select, parent select
CREATE POLICY "teacher_select_progress" ON challenge_progress FOR SELECT TO authenticated
  USING (auth_user_role() = 'teacher' AND challenge_id IN (
    SELECT sc.id FROM social_challenges sc JOIN courses c ON sc.course_id = c.id WHERE c.teacher_id = auth.uid()
  ));

CREATE POLICY "parent_select_progress" ON challenge_progress FOR SELECT TO authenticated
  USING (auth_user_role() = 'parent' AND participant_type = 'individual' AND participant_id IN (
    SELECT student_id FROM parent_student_links WHERE parent_id = auth.uid() AND verified = true
  ));;
