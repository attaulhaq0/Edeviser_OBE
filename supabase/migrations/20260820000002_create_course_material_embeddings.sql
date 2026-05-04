-- ============================================================
-- Migration: Create course_material_embeddings table
-- Feature: AI Chat Tutor with RAG Engine — Vector Store
-- ============================================================

CREATE TABLE IF NOT EXISTS course_material_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  chunk_text TEXT NOT NULL,
  embedding vector(1536) NOT NULL,
  source_filename VARCHAR(500) NOT NULL,
  material_type VARCHAR(50) NOT NULL CHECK (material_type IN (
    'lecture_notes', 'slides', 'assignment_description', 'rubric_criteria', 'other'
  )),
  clo_ids UUID[] DEFAULT '{}',
  bloom_level VARCHAR(20),
  chunk_index INTEGER NOT NULL,
  token_count INTEGER NOT NULL,
  source_material_id UUID REFERENCES course_materials(id) ON DELETE SET NULL,
  indexing_status VARCHAR(20) NOT NULL DEFAULT 'indexed' CHECK (indexing_status IN (
    'pending', 'indexed', 'indexing_failed'
  )),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- HNSW index for fast cosine similarity search (sub-200ms at 100K chunks)
CREATE INDEX IF NOT EXISTS idx_embeddings_hnsw ON course_material_embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
-- Composite index for filtered searches by course
CREATE INDEX IF NOT EXISTS idx_embeddings_course ON course_material_embeddings (course_id, indexing_status);
-- Index for institution-scoped queries
CREATE INDEX IF NOT EXISTS idx_embeddings_institution ON course_material_embeddings (institution_id);
-- Index for source material lookups (re-indexing)
CREATE INDEX IF NOT EXISTS idx_embeddings_source_material ON course_material_embeddings (source_material_id);
