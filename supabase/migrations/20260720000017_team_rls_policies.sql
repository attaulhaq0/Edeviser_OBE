-- Task 1.8: RLS policies for all new tables (teams, team_members, team_invitations,
-- social_challenges, challenge_progress, team_badges)

-- ═══════════════════════════════════════════════════════════════════════════════
-- teams RLS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE POLICY "teacher_all_teams" ON teams
  FOR ALL TO authenticated
  USING (
    auth_user_role() = 'teacher'
    AND course_id IN (SELECT id FROM courses WHERE teacher_id = auth.uid())
    AND institution_id = auth_institution_id()
  );

CREATE POLICY "student_select_teams" ON teams
  FOR SELECT TO authenticated
  USING (
    auth_user_role() = 'student'
    AND course_id IN (SELECT course_id FROM student_courses WHERE student_id = auth.uid())
    AND institution_id = auth_institution_id()
  );

CREATE POLICY "student_create_team" ON teams
  FOR INSERT TO authenticated
  WITH CHECK (
    auth_user_role() = 'student'
    AND institution_id = auth_institution_id()
    AND course_id IN (
      SELECT c.id FROM courses c
      JOIN student_courses sc ON sc.course_id = c.id
      WHERE sc.student_id = auth.uid() AND c.team_formation_mode = 'student_formed'
    )
  );

CREATE POLICY "admin_all_teams" ON teams
  FOR ALL TO authenticated
  USING (auth_user_role() = 'admin' AND institution_id = auth_institution_id());

CREATE POLICY "coordinator_select_teams" ON teams
  FOR SELECT TO authenticated
  USING (
    auth_user_role() = 'coordinator'
    AND institution_id = auth_institution_id()
    AND course_id IN (
      SELECT c.id FROM courses c
      JOIN programs p ON c.program_id = p.id
      WHERE p.coordinator_id = auth.uid()
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════════
-- team_members RLS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE POLICY "student_select_members" ON team_members
  FOR SELECT TO authenticated
  USING (
    auth_user_role() IN ('student', 'teacher', 'coordinator', 'admin')
    AND team_id IN (
      SELECT id FROM teams
      WHERE institution_id = auth_institution_id() AND deleted_at IS NULL
    )
  );

CREATE POLICY "captain_manage_members" ON team_members
  FOR ALL TO authenticated
  USING (
    auth_user_role() = 'student'
    AND team_id IN (
      SELECT t.id FROM teams t
      JOIN courses c ON t.course_id = c.id
      WHERE t.captain_id = auth.uid()
        AND c.team_formation_mode = 'student_formed'
        AND t.deleted_at IS NULL
    )
  );

CREATE POLICY "teacher_manage_members" ON team_members
  FOR ALL TO authenticated
  USING (
    auth_user_role() = 'teacher'
    AND team_id IN (
      SELECT t.id FROM teams t
      JOIN courses c ON t.course_id = c.id
      WHERE c.teacher_id = auth.uid() AND t.deleted_at IS NULL
    )
  );

CREATE POLICY "parent_select_members" ON team_members
  FOR SELECT TO authenticated
  USING (
    auth_user_role() = 'parent'
    AND student_id IN (
      SELECT student_id FROM parent_student_links
      WHERE parent_id = auth.uid() AND verified = true
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════════
-- team_invitations RLS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE POLICY "student_select_own_invitations" ON team_invitations
  FOR SELECT TO authenticated
  USING (
    auth_user_role() = 'student'
    AND invited_student_id = auth.uid()
  );

CREATE POLICY "captain_insert_invitations" ON team_invitations
  FOR INSERT TO authenticated
  WITH CHECK (
    auth_user_role() = 'student'
    AND invited_by = auth.uid()
    AND team_id IN (
      SELECT id FROM teams WHERE captain_id = auth.uid() AND deleted_at IS NULL
    )
  );

CREATE POLICY "student_respond_invitation" ON team_invitations
  FOR UPDATE TO authenticated
  USING (
    auth_user_role() = 'student'
    AND invited_student_id = auth.uid()
    AND status = 'pending'
  );

CREATE POLICY "teacher_select_invitations" ON team_invitations
  FOR SELECT TO authenticated
  USING (
    auth_user_role() = 'teacher'
    AND team_id IN (
      SELECT t.id FROM teams t
      JOIN courses c ON t.course_id = c.id
      WHERE c.teacher_id = auth.uid()
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════════
-- social_challenges RLS (supplement existing policies)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Drop existing policies if they conflict, then recreate per design spec
DO $$ BEGIN
  DROP POLICY IF EXISTS "student_select_challenges_v2" ON social_challenges;
  DROP POLICY IF EXISTS "teacher_all_challenges_v2" ON social_challenges;
  DROP POLICY IF EXISTS "admin_select_challenges_v2" ON social_challenges;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "student_select_challenges_v2" ON social_challenges
  FOR SELECT TO authenticated
  USING (
    auth_user_role() = 'student'
    AND status IN ('active', 'ended')
    AND course_id IN (SELECT course_id FROM student_courses WHERE student_id = auth.uid())
    AND institution_id = auth_institution_id()
  );

CREATE POLICY "teacher_all_challenges_v2" ON social_challenges
  FOR ALL TO authenticated
  USING (
    auth_user_role() = 'teacher'
    AND course_id IN (SELECT id FROM courses WHERE teacher_id = auth.uid())
    AND institution_id = auth_institution_id()
  );

CREATE POLICY "admin_select_challenges_v2" ON social_challenges
  FOR SELECT TO authenticated
  USING (auth_user_role() = 'admin' AND institution_id = auth_institution_id());

-- ═══════════════════════════════════════════════════════════════════════════════
-- challenge_progress RLS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE POLICY "student_select_progress" ON challenge_progress
  FOR SELECT TO authenticated
  USING (
    challenge_id IN (
      SELECT id FROM social_challenges
      WHERE course_id IN (SELECT course_id FROM student_courses WHERE student_id = auth.uid())
        AND institution_id = auth_institution_id()
    )
  );

CREATE POLICY "teacher_select_progress" ON challenge_progress
  FOR SELECT TO authenticated
  USING (
    auth_user_role() = 'teacher'
    AND challenge_id IN (
      SELECT sc.id FROM social_challenges sc
      JOIN courses c ON sc.course_id = c.id
      WHERE c.teacher_id = auth.uid()
    )
  );

CREATE POLICY "parent_select_progress" ON challenge_progress
  FOR SELECT TO authenticated
  USING (
    auth_user_role() = 'parent'
    AND participant_type = 'individual'
    AND participant_id IN (
      SELECT student_id FROM parent_student_links
      WHERE parent_id = auth.uid() AND verified = true
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════════
-- team_badges RLS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE POLICY "select_team_badges" ON team_badges
  FOR SELECT TO authenticated
  USING (
    team_id IN (
      SELECT id FROM teams WHERE institution_id = auth_institution_id()
    )
  );
-- INSERT/UPDATE via service role key only (Edge Functions)
