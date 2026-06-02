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
-- REPLAY-ONLY GUARD: tutor_conversations is CREATEd later (20260820000003). No-op on a
-- fresh replay (table absent); runs normally on live where the table exists.
DO $$ BEGIN
  IF to_regclass('public.tutor_conversations') IS NOT NULL THEN
    EXECUTE $stmt$ CREATE POLICY "users_read_own_tutor_conversations" ON public.tutor_conversations
  FOR SELECT TO authenticated
  USING (student_id = auth.uid()) $stmt$;
  END IF;
END $$;

-- 4. tutor_messages: user reads messages from own conversations
-- REPLAY-ONLY GUARD: tutor_messages is CREATEd later (20260820000004).
DO $$ BEGIN
  IF to_regclass('public.tutor_messages') IS NOT NULL THEN
    EXECUTE $stmt$ CREATE POLICY "users_read_own_tutor_messages" ON public.tutor_messages
  FOR SELECT TO authenticated
  USING (
    conversation_id IN (
      SELECT id FROM public.tutor_conversations WHERE student_id = auth.uid()
    )
  ) $stmt$;
  END IF;
END $$;

-- 5. tutor_usage_limits: user reads own usage
-- REPLAY-ONLY GUARD: tutor_usage_limits is CREATEd later (20260820000005).
DO $$ BEGIN
  IF to_regclass('public.tutor_usage_limits') IS NOT NULL THEN
    EXECUTE $stmt$ CREATE POLICY "users_read_own_tutor_usage" ON public.tutor_usage_limits
  FOR SELECT TO authenticated
  USING (student_id = auth.uid()) $stmt$;
  END IF;
END $$;
