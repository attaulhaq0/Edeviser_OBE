-- Add indexes for all 12 unindexed foreign keys
CREATE INDEX IF NOT EXISTS idx_blooms_progression_course_id ON public.blooms_progression (course_id);
CREATE INDEX IF NOT EXISTS idx_blooms_progression_institution_id ON public.blooms_progression (institution_id);
CREATE INDEX IF NOT EXISTS idx_review_schedules_course_id ON public.review_schedules (course_id);
CREATE INDEX IF NOT EXISTS idx_review_schedules_review_session_id ON public.review_schedules (review_session_id);
CREATE INDEX IF NOT EXISTS idx_review_schedules_source_session_id ON public.review_schedules (source_session_id);

-- Replay-safe guard: the tutor tables below are CREATEd by later migrations (20260820*),
-- so on a fresh from-scratch replay these indexes must no-op (the table does not exist yet).
-- The corrective migration 20260821000005 re-asserts them after the tables exist.
-- On production the tables already exist, so the guarded CREATE INDEX IF NOT EXISTS runs normally.
DO $$ BEGIN
  IF to_regclass('public.teacher_handoff_requests') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_teacher_handoff_requests_conversation_id ON public.teacher_handoff_requests (conversation_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_teacher_handoff_requests_course_id ON public.teacher_handoff_requests (course_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_teacher_handoff_requests_institution_id ON public.teacher_handoff_requests (institution_id)';
  END IF;
END $$;

DO $$ BEGIN
  IF to_regclass('public.tutor_llm_logs') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_tutor_llm_logs_student_id ON public.tutor_llm_logs (student_id)';
  END IF;
END $$;

DO $$ BEGIN
  IF to_regclass('public.tutor_plan_updates') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_tutor_plan_updates_conversation_id ON public.tutor_plan_updates (conversation_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_tutor_plan_updates_course_id ON public.tutor_plan_updates (course_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_tutor_plan_updates_institution_id ON public.tutor_plan_updates (institution_id)';
  END IF;
END $$;
