-- 6. tutor_llm_logs: only service_role should read (internal), but allow admin
-- REPLAY-ONLY GUARD: tutor_llm_logs is CREATEd later (20260820000006). No-op on a fresh
-- replay (table absent); runs normally on live where the table exists.
DO $$ BEGIN
  IF to_regclass('public.tutor_llm_logs') IS NOT NULL THEN
    EXECUTE $stmt$ CREATE POLICY "admins_read_tutor_llm_logs" ON public.tutor_llm_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  ) $stmt$;
  END IF;
END $$;

-- 7. tutor_plan_updates: student reads own plan updates
-- REPLAY-ONLY GUARD: tutor_plan_updates is CREATEd later (20260820100002).
DO $$ BEGIN
  IF to_regclass('public.tutor_plan_updates') IS NOT NULL THEN
    EXECUTE $stmt$ CREATE POLICY "users_read_own_plan_updates" ON public.tutor_plan_updates
  FOR SELECT TO authenticated
  USING (student_id = auth.uid()) $stmt$;
  END IF;
END $$;

-- 8. teacher_handoff_requests: teacher reads own handoffs
-- REPLAY-ONLY GUARD: teacher_handoff_requests is CREATEd later (20260820100003).
DO $$ BEGIN
  IF to_regclass('public.teacher_handoff_requests') IS NOT NULL THEN
    EXECUTE $stmt$ CREATE POLICY "teachers_read_own_handoffs" ON public.teacher_handoff_requests
  FOR SELECT TO authenticated
  USING (teacher_id = auth.uid()) $stmt$;
  END IF;
END $$;

-- 9. course_material_embeddings: anyone enrolled can read (for RAG search)
-- REPLAY-ONLY GUARD: course_material_embeddings is CREATEd later (20260820000002).
DO $$ BEGIN
  IF to_regclass('public.course_material_embeddings') IS NOT NULL THEN
    EXECUTE $stmt$ CREATE POLICY "authenticated_read_embeddings" ON public.course_material_embeddings
  FOR SELECT TO authenticated
  USING (true) $stmt$;
  END IF;
END $$;

-- 10. habit_logs: student reads own habit logs
CREATE POLICY "users_read_own_habit_logs" ON public.habit_logs
  FOR SELECT TO authenticated
  USING (student_id = auth.uid());;
