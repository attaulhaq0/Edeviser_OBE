-- Add indexes for all 12 unindexed foreign keys
CREATE INDEX IF NOT EXISTS idx_blooms_progression_course_id ON public.blooms_progression (course_id);
CREATE INDEX IF NOT EXISTS idx_blooms_progression_institution_id ON public.blooms_progression (institution_id);
CREATE INDEX IF NOT EXISTS idx_review_schedules_course_id ON public.review_schedules (course_id);
CREATE INDEX IF NOT EXISTS idx_review_schedules_review_session_id ON public.review_schedules (review_session_id);
CREATE INDEX IF NOT EXISTS idx_review_schedules_source_session_id ON public.review_schedules (source_session_id);
-- REPLAY-ONLY GUARD: teacher_handoff_requests / tutor_llm_logs / tutor_plan_updates are
-- CREATEd much later (the 20260820* batch). On a fresh replay these indexes would abort
-- with 42P01; on live the tables already exist so the guarded EXECUTE runs normally.
DO $$ BEGIN
  IF to_regclass('public.teacher_handoff_requests') IS NOT NULL THEN
    EXECUTE $stmt$ CREATE INDEX IF NOT EXISTS idx_teacher_handoff_requests_conversation_id ON public.teacher_handoff_requests (conversation_id) $stmt$;
    EXECUTE $stmt$ CREATE INDEX IF NOT EXISTS idx_teacher_handoff_requests_course_id ON public.teacher_handoff_requests (course_id) $stmt$;
    EXECUTE $stmt$ CREATE INDEX IF NOT EXISTS idx_teacher_handoff_requests_institution_id ON public.teacher_handoff_requests (institution_id) $stmt$;
  END IF;
END $$;

DO $$ BEGIN
  IF to_regclass('public.tutor_llm_logs') IS NOT NULL THEN
    EXECUTE $stmt$ CREATE INDEX IF NOT EXISTS idx_tutor_llm_logs_student_id ON public.tutor_llm_logs (student_id) $stmt$;
  END IF;
END $$;

DO $$ BEGIN
  IF to_regclass('public.tutor_plan_updates') IS NOT NULL THEN
    EXECUTE $stmt$ CREATE INDEX IF NOT EXISTS idx_tutor_plan_updates_conversation_id ON public.tutor_plan_updates (conversation_id) $stmt$;
    EXECUTE $stmt$ CREATE INDEX IF NOT EXISTS idx_tutor_plan_updates_course_id ON public.tutor_plan_updates (course_id) $stmt$;
    EXECUTE $stmt$ CREATE INDEX IF NOT EXISTS idx_tutor_plan_updates_institution_id ON public.tutor_plan_updates (institution_id) $stmt$;
  END IF;
END $$;
