-- ============================================================
-- Migration: Create tutor_llm_logs table
-- Feature: AI Chat Tutor with RAG Engine — LLM API Monitoring
-- ============================================================

CREATE TABLE IF NOT EXISTS tutor_llm_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id),
  student_id UUID NOT NULL REFERENCES profiles(id),
  conversation_id UUID REFERENCES tutor_conversations(id),
  model_used VARCHAR(100) NOT NULL,
  prompt_tokens INTEGER NOT NULL,
  completion_tokens INTEGER NOT NULL,
  total_tokens INTEGER NOT NULL,
  latency_ms INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'error', 'timeout', 'rate_limited')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Index for institution-scoped monitoring queries
CREATE INDEX IF NOT EXISTS idx_llm_logs_institution ON tutor_llm_logs (institution_id, created_at DESC);
-- Index for per-conversation log lookups
CREATE INDEX IF NOT EXISTS idx_llm_logs_conversation ON tutor_llm_logs (conversation_id);
