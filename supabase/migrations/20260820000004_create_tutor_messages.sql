-- ============================================================
-- Migration: Create tutor_messages table
-- Feature: AI Chat Tutor with RAG Engine — Chat Messages
-- ============================================================

CREATE TABLE IF NOT EXISTS tutor_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES tutor_conversations(id) ON DELETE CASCADE,
  role VARCHAR(10) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  source_citations JSONB DEFAULT '[]',
  image_urls TEXT[] DEFAULT '{}',
  document_url TEXT,
  token_count INTEGER NOT NULL DEFAULT 0,
  satisfaction_rating VARCHAR(15) CHECK (satisfaction_rating IN ('thumbs_up', 'thumbs_down')),
  flagged_integrity BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for loading conversation messages in chronological order
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON tutor_messages (conversation_id, created_at);

-- Index for integrity-flagged messages (institutional review)
CREATE INDEX IF NOT EXISTS idx_messages_flagged ON tutor_messages (flagged_integrity) WHERE flagged_integrity = true;

-- Trigger: keep tutor_conversations.message_count in sync with inserts/deletes
DROP TRIGGER IF EXISTS trg_sync_conversation_stats ON tutor_messages;
CREATE TRIGGER trg_sync_conversation_stats
  AFTER INSERT OR UPDATE OR DELETE ON tutor_messages
  FOR EACH ROW EXECUTE FUNCTION sync_tutor_conversation_stats();
