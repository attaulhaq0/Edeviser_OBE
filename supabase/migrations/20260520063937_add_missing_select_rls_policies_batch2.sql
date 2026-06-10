-- Replay-safe guards: the tutor_*/teacher_handoff/course_material tables below are CREATEd by
-- later migrations (20260820*), so on a fresh from-scratch replay these CREATE POLICY statements
-- must no-op (the table does not exist yet). The corrective migration 20260821000005 re-asserts
-- the final initplan-wrapped policy forms after the tables exist. On production the tables already
-- exist, so the guard predicate is true and the original CREATE POLICY runs unchanged.

-- 6. tutor_llm_logs: only service_role should read (internal), but allow admin
DO $$ BEGIN
  IF to_regclass('public.tutor_llm_logs') IS NOT NULL THEN
    EXECUTE 'CREATE POLICY "admins_read_tutor_llm_logs" ON public.tutor_llm_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = ''admin''
    )
  )';
  END IF;
END $$;

-- 7. tutor_plan_updates: student reads own plan updates
DO $$ BEGIN
  IF to_regclass('public.tutor_plan_updates') IS NOT NULL THEN
    EXECUTE 'CREATE POLICY "users_read_own_plan_updates" ON public.tutor_plan_updates
  FOR SELECT TO authenticated
  USING (student_id = auth.uid())';
  END IF;
END $$;

-- 8. teacher_handoff_requests: teacher reads own handoffs
DO $$ BEGIN
  IF to_regclass('public.teacher_handoff_requests') IS NOT NULL THEN
    EXECUTE 'CREATE POLICY "teachers_read_own_handoffs" ON public.teacher_handoff_requests
  FOR SELECT TO authenticated
  USING (teacher_id = auth.uid())';
  END IF;
END $$;

-- 9. course_material_embeddings: anyone enrolled can read (for RAG search)
DO $$ BEGIN
  IF to_regclass('public.course_material_embeddings') IS NOT NULL THEN
    EXECUTE 'CREATE POLICY "authenticated_read_embeddings" ON public.course_material_embeddings
  FOR SELECT TO authenticated
  USING (true)';
  END IF;
END $$;

-- 10. habit_logs: student reads own habit logs
CREATE POLICY "users_read_own_habit_logs" ON public.habit_logs
  FOR SELECT TO authenticated
  USING (student_id = auth.uid());;
