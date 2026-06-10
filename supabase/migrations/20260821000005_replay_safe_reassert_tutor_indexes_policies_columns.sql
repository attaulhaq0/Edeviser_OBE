-- =============================================================================
-- Corrective migration: replay-safe re-assertion of CLASS D/E/F final state
-- =============================================================================
--
-- WHY THIS MIGRATION EXISTS
-- -------------------------
-- Several historical migrations referenced tutor/teacher tables (FK indexes,
-- RLS SELECT policies, columns, realtime publication membership) BEFORE the
-- migrations that actually CREATE those tables (the tables are created in the
-- 20260820* batch). On the incrementally-built production database this was
-- invisible, but on a from-scratch replay (Supabase Preview / clean rebuild /
-- DR restore) those early statements abort with 42P01 (relation does not exist).
--
-- The companion fix guards each of those early statements with a
-- `DO $$ ... to_regclass(...) IS NOT NULL ... $$;` block so they NO-OP on a
-- fresh replay (the table does not exist yet) and still apply on production
-- (the table exists). But guarding ALONE means the object is NEVER created on a
-- fresh replay -- the guarded block simply does nothing because the table is
-- absent at that point in replay order.
--
-- This migration runs AFTER every referenced table has been created
-- (timestamp strictly after 20260821000004) and idempotently RE-ASSERTS the
-- correct final state, so a clean rebuild / DR restore is not missing the FK
-- indexes, RLS policies, columns, or realtime publication membership that
-- production has.
--
-- IDEMPOTENCY / REPLAY-SAFETY
-- ---------------------------
-- Every statement here is idempotent and replay-safe. On production each is a
-- no-op (object already exists) or a same-definition rewrite. On a fresh replay
-- each creates the object for the first time, now that the referenced tables
-- exist.
--
-- This file is organized into clearly-labeled sections:
--   CLASS D -- FK indexes        (re-asserted below)
--   CLASS E -- RLS SELECT policies (appended by a later task)
--   CLASS F -- columns + publication membership (appended by a later task)
-- =============================================================================


-- -----------------------------------------------------------------------------
-- CLASS D -- FK indexes
-- -----------------------------------------------------------------------------
-- Re-assert the 7 foreign-key indexes originally declared too early in
-- 20260504033325_add_missing_fk_indexes.sql that target the later-created tutor
-- tables (teacher_handoff_requests, tutor_llm_logs, tutor_plan_updates, all
-- created in the 20260820* batch). Exact index names and definitions are copied
-- verbatim from the original migration. `CREATE INDEX IF NOT EXISTS` is a no-op
-- on production (indexes already exist) and creates them on a fresh replay.
--
-- NOTE: the blooms_progression / review_schedules indexes from the same original
-- migration are intentionally NOT re-asserted here -- those tables exist early in
-- the chain and were never too-early, so they are unaffected by the replay defect.
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_teacher_handoff_requests_conversation_id ON public.teacher_handoff_requests (conversation_id);
CREATE INDEX IF NOT EXISTS idx_teacher_handoff_requests_course_id ON public.teacher_handoff_requests (course_id);
CREATE INDEX IF NOT EXISTS idx_teacher_handoff_requests_institution_id ON public.teacher_handoff_requests (institution_id);
CREATE INDEX IF NOT EXISTS idx_tutor_llm_logs_student_id ON public.tutor_llm_logs (student_id);
CREATE INDEX IF NOT EXISTS idx_tutor_plan_updates_conversation_id ON public.tutor_plan_updates (conversation_id);
CREATE INDEX IF NOT EXISTS idx_tutor_plan_updates_course_id ON public.tutor_plan_updates (course_id);
CREATE INDEX IF NOT EXISTS idx_tutor_plan_updates_institution_id ON public.tutor_plan_updates (institution_id);


-- -----------------------------------------------------------------------------
-- CLASS E -- RLS SELECT policies
-- -----------------------------------------------------------------------------
-- Re-assert the RLS SELECT policies that were originally declared too early in
-- 20260520063920 / 20260520063937 / 20260602103939 against the later-created
-- tutor/teacher tables (tutor_conversations, tutor_messages, tutor_usage_limits,
-- tutor_llm_logs, tutor_plan_updates, teacher_handoff_requests, all created in
-- the 20260820* batch) and course_material_embeddings.
--
-- Each policy is re-asserted in its FINAL last-writer form so a fresh replay
-- reaches the correct final policy state once the tables exist:
--   * The six tutor/teacher policies use the initplan-wrapped `(select auth.uid())`
--     definitions copied VERBATIM from the last-writer migration
--     20260602103939_task12_rls_initplan_wrap_tutor_content_donations.sql.
--   * course_material_embeddings is NOT touched by 20260602103939, so its SELECT
--     policy ("authenticated_read_embeddings") is copied verbatim from its
--     authoritative source 20260520063937_add_missing_select_rls_policies_batch2.sql.
--
-- `DROP POLICY IF EXISTS` + `CREATE POLICY` is idempotent and replay-safe: on
-- production it is a no-op same-definition rewrite; on a fresh replay it creates
-- the policy for the first time now that the table exists.
--
-- NOTE: the content/donation policies from 20260602103939 (challenge_progress,
-- student_content, student_quest_progress, class_donations,
-- class_donation_contributions) are intentionally NOT re-asserted here -- those
-- tables are not part of the too-early CLASS E set.
-- -----------------------------------------------------------------------------

-- tutor_conversations
DROP POLICY IF EXISTS "users_read_own_tutor_conversations" ON public.tutor_conversations;
CREATE POLICY "users_read_own_tutor_conversations" ON public.tutor_conversations AS PERMISSIVE FOR SELECT TO authenticated USING (student_id = (select auth.uid()));

-- tutor_messages
DROP POLICY IF EXISTS "users_read_own_tutor_messages" ON public.tutor_messages;
CREATE POLICY "users_read_own_tutor_messages" ON public.tutor_messages AS PERMISSIVE FOR SELECT TO authenticated USING (conversation_id IN ( SELECT tutor_conversations.id FROM tutor_conversations WHERE (tutor_conversations.student_id = (select auth.uid()))));

-- tutor_usage_limits
DROP POLICY IF EXISTS "users_read_own_tutor_usage" ON public.tutor_usage_limits;
CREATE POLICY "users_read_own_tutor_usage" ON public.tutor_usage_limits AS PERMISSIVE FOR SELECT TO authenticated USING (student_id = (select auth.uid()));

-- tutor_llm_logs
DROP POLICY IF EXISTS "admins_read_tutor_llm_logs" ON public.tutor_llm_logs;
CREATE POLICY "admins_read_tutor_llm_logs" ON public.tutor_llm_logs AS PERMISSIVE FOR SELECT TO authenticated USING (EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = 'admin'::user_role))));

-- tutor_plan_updates
DROP POLICY IF EXISTS "users_read_own_plan_updates" ON public.tutor_plan_updates;
CREATE POLICY "users_read_own_plan_updates" ON public.tutor_plan_updates AS PERMISSIVE FOR SELECT TO authenticated USING (student_id = (select auth.uid()));

-- teacher_handoff_requests
DROP POLICY IF EXISTS "teachers_read_own_handoffs" ON public.teacher_handoff_requests;
CREATE POLICY "teachers_read_own_handoffs" ON public.teacher_handoff_requests AS PERMISSIVE FOR SELECT TO authenticated USING (teacher_id = (select auth.uid()));

-- course_material_embeddings (authoritative source: 20260520063937; not in 20260602103939)
DROP POLICY IF EXISTS "authenticated_read_embeddings" ON public.course_material_embeddings;
CREATE POLICY "authenticated_read_embeddings" ON public.course_material_embeddings
  FOR SELECT TO authenticated
  USING (true);

-- -----------------------------------------------------------------------------
-- CLASS F -- columns + publication membership
-- -----------------------------------------------------------------------------
-- Re-assert the columns and realtime publication membership that were originally
-- declared too early against later-created tables:
--
--   * recommended_persona (text) on public.tutor_conversations -- originally added
--     in 20260526145520_add_teams_avatar_letter_and_tutor_recommended_persona.sql,
--     but tutor_conversations is not created until the 20260820* batch. This is
--     the CLASS F too-early column: on a fresh replay the original ALTER aborts
--     with 42P01 before the table exists, so the guarded early statement no-ops
--     and the column must be re-asserted here once the table exists.
--
--   * challenge_participants membership in the supabase_realtime publication --
--     originally added in 20260526115420_add_challenge_participants_to_realtime.sql,
--     but challenge_participants is not created until 20260720000003. On a fresh
--     replay the original ALTER PUBLICATION aborts before the table exists, so the
--     membership must be re-asserted here once the table exists.
--
-- teams.avatar_letter (text) is ALSO re-asserted below for completeness, but note
-- the teams table exists EARLY in the chain and was never a too-early target --
-- its re-assertion is a harmless idempotent no-op kept here only to keep the
-- CLASS F column re-assertion coherent with its original source migration. The
-- original backfill (UPDATE teams SET avatar_letter = UPPER(LEFT(name,1))) is NOT
-- repeated here: it is a one-time data backfill, not part of the schema final
-- state this corrective migration is responsible for restoring.
--
-- IDEMPOTENCY / REPLAY-SAFETY
-- ---------------------------
--   * `ADD COLUMN IF NOT EXISTS` is a no-op on production (column already exists)
--     and creates the column on a fresh replay now that the table exists.
--   * The publication membership is added inside a DO-block guarded by BOTH a
--     table-existence check (to_regclass) AND a NOT EXISTS membership check
--     against pg_publication_tables, so it is a no-op on production (already a
--     member) and on a fresh replay only adds the table once it exists and is not
--     yet a member. `ALTER PUBLICATION ... ADD TABLE` has no IF NOT EXISTS form,
--     so the explicit membership guard is what makes this statement idempotent.
-- -----------------------------------------------------------------------------

-- Columns (source: 20260526145520_add_teams_avatar_letter_and_tutor_recommended_persona.sql)
ALTER TABLE public.tutor_conversations ADD COLUMN IF NOT EXISTS recommended_persona text;
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS avatar_letter text;

-- Publication membership (source: 20260526115420_add_challenge_participants_to_realtime.sql)
DO $$ BEGIN
  IF to_regclass('public.challenge_participants') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime'
         AND schemaname = 'public'
         AND tablename = 'challenge_participants'
     ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.challenge_participants;
  END IF;
END $$;
