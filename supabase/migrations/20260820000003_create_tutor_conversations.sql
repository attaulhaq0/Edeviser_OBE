-- ============================================================
-- Migration: Create tutor_conversations table
-- Feature: AI Chat Tutor with RAG Engine — Chat Sessions
-- ============================================================

CREATE TABLE IF NOT EXISTS tutor_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id),
  institution_id UUID NOT NULL REFERENCES institutions(id),
  course_id UUID REFERENCES courses(id),
  persona VARCHAR(30) NOT NULL DEFAULT 'socratic_guide' CHECK (persona IN (
    'socratic_guide', 'step_by_step_coach', 'quick_explainer'
  )),
  title VARCHAR(200),
  clo_scope UUID[] DEFAULT '{}',
  message_count INTEGER NOT NULL DEFAULT 0,
  xp_awarded BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Index for student conversation listing (ordered by recent activity)
CREATE INDEX IF NOT EXISTS idx_conversations_student ON tutor_conversations (student_id, updated_at DESC);
-- Index for course-scoped queries
CREATE INDEX IF NOT EXISTS idx_conversations_course ON tutor_conversations (course_id);
-- Index for institution-scoped analytics
CREATE INDEX IF NOT EXISTS idx_conversations_institution ON tutor_conversations (institution_id, created_at DESC);
-- Trigger: keep updated_at current on every UPDATE so idx_conversations_student ordering is accurate
CREATE OR REPLACE FUNCTION set_tutor_conversations_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_tutor_conversations_updated_at ON tutor_conversations;
CREATE TRIGGER trg_tutor_conversations_updated_at
  BEFORE UPDATE ON tutor_conversations
  FOR EACH ROW EXECUTE FUNCTION set_tutor_conversations_updated_at();
-- Trigger: keep message_count in sync with tutor_messages inserts/deletes
CREATE OR REPLACE FUNCTION sync_tutor_conversation_stats()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.tutor_conversations
    SET message_count = message_count + 1,
        updated_at    = now()
    WHERE id = NEW.conversation_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.tutor_conversations
    SET message_count = GREATEST(message_count - 1, 0),
        updated_at    = now()
    WHERE id = OLD.conversation_id;
  ELSIF TG_OP = 'UPDATE' AND NEW.conversation_id IS DISTINCT FROM OLD.conversation_id THEN
    UPDATE public.tutor_conversations
    SET message_count = GREATEST(message_count - 1, 0),
        updated_at    = now()
    WHERE id = OLD.conversation_id;
    UPDATE public.tutor_conversations
    SET message_count = message_count + 1,
        updated_at    = now()
    WHERE id = NEW.conversation_id;
  END IF;
  RETURN NULL;
END;
$$;
-- NOTE: The trigger trg_sync_conversation_stats is created in 20260820000004_create_tutor_messages.sql
-- because it references the tutor_messages table which doesn't exist yet at this point.;
