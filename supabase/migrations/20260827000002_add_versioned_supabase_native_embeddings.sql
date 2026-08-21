-- Prepare Supabase-native gte-small embeddings without destroying or rewriting
-- any existing 1536-dimensional vectors. The legacy column remains readable
-- only for migration/backfill evidence; new executable code uses embedding_v2.

ALTER TABLE public.course_material_embeddings
  ADD COLUMN IF NOT EXISTS embedding_v2 vector(384),
  ADD COLUMN IF NOT EXISTS embedding_provider text NOT NULL DEFAULT 'legacy_import',
  ADD COLUMN IF NOT EXISTS embedding_model text NOT NULL DEFAULT 'legacy_1536',
  ADD COLUMN IF NOT EXISTS embedding_dimensions integer NOT NULL DEFAULT 1536,
  ADD COLUMN IF NOT EXISTS embedding_version integer NOT NULL DEFAULT 1;

ALTER TABLE public.course_material_embeddings
  ALTER COLUMN embedding DROP NOT NULL;

ALTER TABLE public.course_material_embeddings
  ADD CONSTRAINT course_material_embeddings_vector_version_check CHECK (
    (
      embedding_version = 1
      AND embedding IS NOT NULL
      AND embedding_dimensions = 1536
      AND embedding_provider = 'legacy_import'
    )
    OR
    (
      embedding_version = 2
      AND embedding_v2 IS NOT NULL
      AND embedding_dimensions = 384
      AND embedding_provider = 'supabase_edge_runtime'
      AND embedding_model = 'gte-small'
    )
    OR
    (
      embedding_version = 2
      AND indexing_status = 'indexing_failed'
      AND embedding IS NULL
      AND embedding_v2 IS NULL
      AND embedding_dimensions = 384
      AND embedding_provider = 'supabase_edge_runtime'
      AND embedding_model = 'gte-small'
    )
  );

CREATE INDEX IF NOT EXISTS idx_embeddings_v2_hnsw
  ON public.course_material_embeddings
  USING hnsw (embedding_v2 vector_cosine_ops)
  WITH (m = 16, ef_construction = 64)
  WHERE embedding_version = 2 AND embedding_v2 IS NOT NULL;

CREATE OR REPLACE FUNCTION public.search_course_materials_v2(
  query_embedding vector(384),
  match_course_ids uuid[],
  match_clo_ids uuid[] DEFAULT NULL,
  match_threshold double precision DEFAULT 0.7,
  match_count integer DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  chunk_text text,
  source_filename varchar,
  material_type varchar,
  clo_ids uuid[],
  bloom_level varchar,
  similarity double precision,
  embedding_provider text,
  embedding_model text,
  embedding_version integer
)
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
STABLE
AS $$
  SELECT
    cme.id,
    cme.chunk_text,
    cme.source_filename,
    cme.material_type,
    cme.clo_ids,
    cme.bloom_level,
    (1 - (cme.embedding_v2 OPERATOR(public.<=>) query_embedding))::double precision,
    cme.embedding_provider,
    cme.embedding_model,
    cme.embedding_version
  FROM public.course_material_embeddings AS cme
  WHERE cme.embedding_version = 2
    AND cme.embedding_v2 IS NOT NULL
    AND cme.course_id = ANY(match_course_ids)
    AND cme.indexing_status = 'indexed'
    AND (match_clo_ids IS NULL OR cme.clo_ids && match_clo_ids)
    AND (1 - (cme.embedding_v2 OPERATOR(public.<=>) query_embedding)) >= match_threshold
  ORDER BY cme.embedding_v2 OPERATOR(public.<=>) query_embedding
  LIMIT LEAST(GREATEST(match_count, 1), 20)
$$;

REVOKE ALL ON FUNCTION public.search_course_materials_v2(
  vector, uuid[], uuid[], double precision, integer
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_course_materials_v2(
  vector, uuid[], uuid[], double precision, integer
) TO authenticated, service_role;

COMMENT ON COLUMN public.course_material_embeddings.embedding_v2 IS
  '384-dimensional Supabase Edge Runtime gte-small vector; versioned to preserve existing vectors.';
