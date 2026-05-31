-- 6. tutor_llm_logs: only service_role should read (internal), but allow admin
CREATE POLICY "admins_read_tutor_llm_logs" ON public.tutor_llm_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

-- 7. tutor_plan_updates: student reads own plan updates
CREATE POLICY "users_read_own_plan_updates" ON public.tutor_plan_updates
  FOR SELECT TO authenticated
  USING (student_id = (select auth.uid()));

-- 8. teacher_handoff_requests: teacher reads own handoffs
CREATE POLICY "teachers_read_own_handoffs" ON public.teacher_handoff_requests
  FOR SELECT TO authenticated
  USING (teacher_id = (select auth.uid()));

-- 9. course_material_embeddings: anyone enrolled can read (for RAG search)
CREATE POLICY "authenticated_read_embeddings" ON public.course_material_embeddings
  FOR SELECT TO authenticated
  USING (true);

-- 10. habit_logs: student reads own habit logs
CREATE POLICY "users_read_own_habit_logs" ON public.habit_logs
  FOR SELECT TO authenticated
  USING (student_id = (select auth.uid()));;
