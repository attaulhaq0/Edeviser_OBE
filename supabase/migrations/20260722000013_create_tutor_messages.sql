-- ============================================================
-- tutor_messages — Individual chat messages
-- ============================================================
CREATE TABLE tutor_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES tutor_conversations(id) ON DELETE CASCADE,
  role VARCHAR(10) NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  source_citations JSONB DEFAULT '[]',
  image_urls TEXT[] DEFAULT '{}',
  document_url TEXT,
  token_count INTEGER NOT NULL DEFAULT 0,
  satisfaction_rating VARCHAR(15) CHECK (satisfaction_rating IN ('thumbs_up', 'thumbs_down')),
  flagged_integrity BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_conversation ON tutor_messages (conversation_id, created_at);
