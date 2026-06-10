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

-- Replay-safe guards: the tutor_* tables below are CREATEd by later migrations (20260820*),
-- so on a fresh from-scratch replay these CREATE POLICY statements must no-op (the table does
-- not exist yet). The corrective migration 20260821000005 re-asserts the final initplan-wrapped
-- policy forms after the tables exist. On production the tables already exist, so the guard
-- predicate is true and the original CREATE POLICY runs unchanged.

-- 3. tutor_conversations: user reads own conversations
DO $$ BEGIN
  IF to_regclass('public.tutor_conversations') IS NOT NULL THEN
    EXECUTE 'CREATE POLICY "users_read_own_tutor_conversations" ON public.tutor_conversations
  FOR SELECT TO authenticated
  USING (student_id = auth.uid())';
  END IF;
END $$;

-- 4. tutor_messages: user reads messages from own conversations
DO $$ BEGIN
  IF to_regclass('public.tutor_messages') IS NOT NULL THEN
    EXECUTE 'CREATE POLICY "users_read_own_tutor_messages" ON public.tutor_messages
  FOR SELECT TO authenticated
  USING (
    conversation_id IN (
      SELECT id FROM public.tutor_conversations WHERE student_id = auth.uid()
    )
  )';
  END IF;
END $$;

-- 5. tutor_usage_limits: user reads own usage
DO $$ BEGIN
  IF to_regclass('public.tutor_usage_limits') IS NOT NULL THEN
    EXECUTE 'CREATE POLICY "users_read_own_tutor_usage" ON public.tutor_usage_limits
  FOR SELECT TO authenticated
  USING (student_id = auth.uid())';
  END IF;
END $$;
