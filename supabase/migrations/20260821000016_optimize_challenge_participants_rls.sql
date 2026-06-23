-- Replay-safe final version of the optimized `participant_read_progress` policy.
-- This runs AFTER 20260720000003 (which creates challenge_participants + the
-- original unguarded policy), so it unconditionally replaces it with the
-- short-circuit-optimized version that prevents 8s statement_timeout on the
-- free tier.
--
-- The earlier 20260623 migration (guarded DO $$) is a no-op on fresh replay
-- (table doesn't exist yet at that timestamp); THIS migration is the authoritative
-- version for both fresh replay and production.

DROP POLICY IF EXISTS "participant_read_progress" ON public.challenge_participants;

CREATE POLICY "participant_read_progress" ON public.challenge_participants
  FOR SELECT TO authenticated
  USING (
    -- Fast path 1: direct participant match (student = self)
    participant_id = (select auth.uid())
    -- Fast path 2: student is enrolled in the challenge's course (covers course-wide)
    OR EXISTS (
      SELECT 1 FROM public.social_challenges sc
      JOIN public.student_courses stc ON stc.course_id = sc.course_id
      WHERE sc.id = challenge_participants.challenge_id
        AND stc.student_id = (select auth.uid())
    )
    -- Slow path: team member check — only evaluated for team-type participants
    OR (
      participant_type = 'team'
      AND EXISTS (
        SELECT 1 FROM public.team_members tm
        WHERE tm.team_id = challenge_participants.participant_id
          AND tm.student_id = (select auth.uid())
      )
    )
  );
