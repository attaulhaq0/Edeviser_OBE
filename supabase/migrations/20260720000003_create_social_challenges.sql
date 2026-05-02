-- Task 134.1: Social Challenges tables

CREATE TABLE IF NOT EXISTS social_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  challenge_type text NOT NULL CHECK (challenge_type IN ('team', 'course_wide')),
  course_id uuid NOT NULL REFERENCES courses(id),
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  goal_metric text NOT NULL CHECK (goal_metric IN ('total_xp', 'habits_completed', 'assignments_submitted', 'quiz_score_avg')),
  goal_target integer NOT NULL CHECK (goal_target > 0),
  reward_type text NOT NULL CHECK (reward_type IN ('xp_bonus', 'badge')),
  reward_value integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
  notification_sent_90 boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_date > start_date)
);

CREATE TABLE IF NOT EXISTS challenge_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES social_challenges(id) ON DELETE CASCADE,
  participant_id uuid NOT NULL,
  participant_type text NOT NULL CHECK (participant_type IN ('team', 'student')),
  current_progress integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (challenge_id, participant_id)
);

ALTER TABLE social_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_participants ENABLE ROW LEVEL SECURITY;

-- Teacher manages challenges for their courses
DROP POLICY IF EXISTS "teacher_manage_challenges" ON social_challenges;
CREATE POLICY "teacher_manage_challenges" ON social_challenges
  FOR ALL TO authenticated
  USING (created_by = (select auth.uid()) OR EXISTS (
    SELECT 1 FROM courses c WHERE c.id = course_id AND c.teacher_id = (select auth.uid())
  ));

-- Students can read active challenges for their courses
DROP POLICY IF EXISTS "student_read_challenges" ON social_challenges;
CREATE POLICY "student_read_challenges" ON social_challenges
  FOR SELECT TO authenticated
  USING (status IN ('active', 'completed') AND EXISTS (
    SELECT 1 FROM student_courses sc WHERE sc.course_id = social_challenges.course_id AND sc.student_id = (select auth.uid())
  ));

-- Participants can read their own progress
DROP POLICY IF EXISTS "participant_read_progress" ON challenge_participants;
CREATE POLICY "participant_read_progress" ON challenge_participants
  FOR SELECT TO authenticated
  USING (participant_id = (select auth.uid()) OR EXISTS (
    SELECT 1 FROM team_members tm WHERE tm.team_id = participant_id AND tm.student_id = (select auth.uid())
  ) OR EXISTS (
    SELECT 1 FROM social_challenges sc
    JOIN student_courses stc ON stc.course_id = sc.course_id
    WHERE sc.id = challenge_id AND stc.student_id = (select auth.uid())
  ));

-- Teachers manage participants for challenges in their courses
DROP POLICY IF EXISTS "teacher_manage_participants" ON challenge_participants;
CREATE POLICY "teacher_manage_participants" ON challenge_participants
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM social_challenges sc
    JOIN courses c ON c.id = sc.course_id
    WHERE sc.id = challenge_id AND c.teacher_id = (select auth.uid())
  ));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_social_challenges_course ON social_challenges (course_id, status);
CREATE INDEX IF NOT EXISTS idx_challenge_participants_challenge ON challenge_participants (challenge_id);

-- Trigger: max 3 active course-wide challenges per course
CREATE OR REPLACE FUNCTION enforce_max_active_challenges()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'active' AND NEW.challenge_type = 'course_wide' THEN
    IF (SELECT COUNT(*) FROM social_challenges
        WHERE course_id = NEW.course_id AND status = 'active' AND challenge_type = 'course_wide' AND id != NEW.id) >= 3 THEN
      RAISE EXCEPTION 'Maximum 3 active course-wide challenges per course';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_max_active_challenges ON social_challenges;
CREATE TRIGGER trg_enforce_max_active_challenges
  BEFORE INSERT OR UPDATE ON social_challenges
  FOR EACH ROW EXECUTE FUNCTION enforce_max_active_challenges();
