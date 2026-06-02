-- L1-C2 Fix: Add SELECT policies for tables with RLS enabled but no SELECT policy
-- Each user can only read their own rows

-- 1. notifications: user reads own notifications
CREATE POLICY "users_read_own_notifications" ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 2. onboarding_progress: student reads own progress
CREATE POLICY "users_read_own_onboarding" ON public.onboarding_progress
  FOR SELECT TO authenticated
  USING (student_id = auth.uid());

-- 3. tutor_conversations: user reads own conversations
CREATE POLICY "users_read_own_tutor_conversations" ON public.tutor_conversations
  FOR SELECT TO authenticated
  USING (student_id = auth.uid());

-- 4. tutor_messages: user reads messages from own conversations
CREATE POLICY "users_read_own_tutor_messages" ON public.tutor_messages
  FOR SELECT TO authenticated
  USING (
    conversation_id IN (
      SELECT id FROM public.tutor_conversations WHERE student_id = auth.uid()
    )
  );

-- 5. tutor_usage_limits: user reads own usage
CREATE POLICY "users_read_own_tutor_usage" ON public.tutor_usage_limits
  FOR SELECT TO authenticated
  USING (student_id = auth.uid());;
