-- Fix: challenge_participants SELECT queries return 500 due to the
-- `participant_read_progress` policy timing out on the free tier.
--
-- Root cause: the policy evaluates 3 OR-ed EXISTS subqueries per row,
-- including a `team_members` join that is irrelevant for student-type
-- participants. On a cold free-tier shared instance under load, this
-- exceeds the 8s statement_timeout.
--
-- Fix: guard the `team_members` subquery behind `participant_type = 'team'`
-- so it short-circuits for the common case (student participants or
-- course-enrolled students). Also reorder clauses cheapest-first.
--
-- Replay-safety: the `challenge_participants` table is created in
-- 20260720000003; this migration predates it in filename order.
-- On a fresh replay the DO-block is a no-op (table not yet created);
-- on production the table exists so the policy is replaced.

DO $$ BEGIN
  IF to_regclass('public.challenge_participants') IS NOT NULL THEN
    EXECUTE '
      DROP POLICY IF EXISTS "participant_read_progress" ON public.challenge_participants;
      CREATE POLICY "participant_read_progress" ON public.challenge_participants
        FOR SELECT TO authenticated
        USING (
          participant_id = (select auth.uid())
          OR EXISTS (
            SELECT 1 FROM public.social_challenges sc
            JOIN public.student_courses stc ON stc.course_id = sc.course_id
            WHERE sc.id = challenge_participants.challenge_id
              AND stc.student_id = (select auth.uid())
          )
          OR (
            participant_type = ''team''
            AND EXISTS (
              SELECT 1 FROM public.team_members tm
              WHERE tm.team_id = challenge_participants.participant_id
                AND tm.student_id = (select auth.uid())
            )
          )
        );
    ';
  END IF;
END $$;
