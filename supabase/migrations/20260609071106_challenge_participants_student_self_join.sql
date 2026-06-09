DROP POLICY IF EXISTS "student_self_join_challenge" ON public.challenge_participants;
CREATE POLICY "student_self_join_challenge" ON public.challenge_participants
  FOR INSERT TO authenticated
  WITH CHECK (
    (select auth_user_role()) = 'student'
    AND participant_type = 'student'
    AND participant_id = (select auth.uid())
  );;
