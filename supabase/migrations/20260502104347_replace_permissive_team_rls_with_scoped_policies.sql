-- ============================================================================
-- Migration: Replace overly permissive USING(true) RLS policies on team tables
-- with properly scoped policies per Requirement 16.
--
-- Tables affected: teams, team_members, social_challenges, challenge_progress
--
-- Existing policies from 20260415071619 and 20260415071655 are already correct
-- for teacher, admin, coordinator, parent, and captain roles. This migration
-- only replaces the original USING(true) SELECT policies from 20260411221627.
-- ============================================================================

-- ─── 1. TEAMS ────────────────────────────────────────────────────────────────
-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "teams_select" ON teams;

-- Students can SELECT teams within their enrolled courses
CREATE POLICY "student_select_enrolled_teams" ON teams
  FOR SELECT TO authenticated
  USING (
    auth_user_role() = 'student'
    AND institution_id = auth_institution_id()
    AND course_id IN (
      SELECT sc.course_id FROM student_courses sc
      WHERE sc.student_id = auth.uid()
    )
  );

-- ─── 2. TEAM_MEMBERS ─────────────────────────────────────────────────────────
-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "team_members_select" ON team_members;

-- Students can SELECT team members for teams in their enrolled courses
CREATE POLICY "student_select_enrolled_team_members" ON team_members
  FOR SELECT TO authenticated
  USING (
    auth_user_role() = 'student'
    AND team_id IN (
      SELECT t.id FROM teams t
      JOIN student_courses sc ON sc.course_id = t.course_id
      WHERE sc.student_id = auth.uid()
        AND t.deleted_at IS NULL
    )
  );

-- Teachers can SELECT all team members for teams in their courses
CREATE POLICY "teacher_select_team_members" ON team_members
  FOR SELECT TO authenticated
  USING (
    auth_user_role() = 'teacher'
    AND team_id IN (
      SELECT t.id FROM teams t
      JOIN courses c ON c.id = t.course_id
      WHERE c.teacher_id = auth.uid()
    )
  );

-- Admins can SELECT all team members within their institution
CREATE POLICY "admin_select_team_members" ON team_members
  FOR SELECT TO authenticated
  USING (
    auth_user_role() = 'admin'
    AND team_id IN (
      SELECT id FROM teams WHERE institution_id = auth_institution_id()
    )
  );

-- ─── 3. SOCIAL_CHALLENGES ────────────────────────────────────────────────────
-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "social_challenges_select" ON social_challenges;

-- Students can SELECT active and ended challenges for their enrolled courses
CREATE POLICY "student_select_enrolled_challenges" ON social_challenges
  FOR SELECT TO authenticated
  USING (
    auth_user_role() = 'student'
    AND institution_id = auth_institution_id()
    AND status IN ('active', 'ended')
    AND course_id IN (
      SELECT sc.course_id FROM student_courses sc
      WHERE sc.student_id = auth.uid()
    )
  );

-- ─── 4. CHALLENGE_PROGRESS ───────────────────────────────────────────────────
-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "challenge_progress_select" ON challenge_progress;

-- Students can SELECT progress records for challenges they participate in
CREATE POLICY "student_select_own_challenge_progress" ON challenge_progress
  FOR SELECT TO authenticated
  USING (
    auth_user_role() = 'student'
    AND (
      -- Individual participation: student is the participant
      (participant_type = 'individual' AND participant_id = auth.uid())
      OR
      -- Team participation: student is an active member of the participating team
      (participant_type = 'team' AND participant_id IN (
        SELECT tm.team_id FROM team_members tm
        WHERE tm.student_id = auth.uid() AND tm.left_at IS NULL
      ))
    )
    AND challenge_id IN (
      SELECT sc.id FROM social_challenges sc
      JOIN student_courses scr ON scr.course_id = sc.course_id
      WHERE scr.student_id = auth.uid()
    )
  );
;
