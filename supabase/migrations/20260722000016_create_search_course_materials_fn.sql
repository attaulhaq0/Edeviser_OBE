-- ============================================================
-- search_course_materials — pgvector cosine similarity search
-- ============================================================
CREATE OR REPLACE FUNCTION search_course_materials(
  query_embedding vector(1536),
  match_course_ids UUID[],
  match_clo_ids UUID[] DEFAULT NULL,
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  chunk_text TEXT,
  source_filename VARCHAR,
  material_type VARCHAR,
  clo_ids UUID[],
  bloom_level VARCHAR,
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cme.id,
    cme.chunk_text,
    cme.source_filename,
    cme.material_type,
    cme.clo_ids,
    cme.bloom_level,
    (1 - (cme.embedding <=> query_embedding))::FLOAT AS similarity
  FROM course_material_embeddings cme
  WHERE cme.course_id = ANY(match_course_ids)
    AND cme.indexing_status = 'indexed'
    AND (match_clo_ids IS NULL OR cme.clo_ids && match_clo_ids)
    AND (1 - (cme.embedding <=> query_embedding)) >= match_threshold
  ORDER BY cme.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
