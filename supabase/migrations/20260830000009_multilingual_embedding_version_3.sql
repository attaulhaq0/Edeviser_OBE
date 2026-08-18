-- Introduce a non-destructive multilingual dense-vector contract.
-- Version 1 (legacy 1536) and version 2 (Supabase gte-small 384) remain
-- readable. Version 3 is self-hosted BGE-M3 (1024, multilingual) and is not
-- enabled by default; no Production backfill is performed here.

ALTER TABLE public.course_material_embeddings
  ADD COLUMN IF NOT EXISTS embedding_v3 vector(1024);

ALTER TABLE public.course_material_embeddings
  DROP CONSTRAINT IF EXISTS course_material_embeddings_vector_version_check;

ALTER TABLE public.course_material_embeddings
  ADD CONSTRAINT course_material_embeddings_vector_version_check CHECK (
    (
      embedding_version = 1
      AND embedding IS NOT NULL
      AND embedding_v2 IS NULL
      AND embedding_v3 IS NULL
      AND embedding_dimensions = 1536
      AND embedding_provider = 'legacy_import'
    )
    OR
    (
      embedding_version = 2
      AND embedding IS NULL
      AND embedding_v2 IS NOT NULL
      AND embedding_v3 IS NULL
      AND embedding_dimensions = 384
      AND embedding_provider = 'supabase_edge_runtime'
      AND embedding_model = 'gte-small'
    )
    OR
    (
      embedding_version = 3
      AND embedding IS NULL
      AND embedding_v2 IS NULL
      AND embedding_v3 IS NOT NULL
      AND embedding_dimensions = 1024
      AND embedding_provider = 'self_hosted_http'
      AND embedding_model = 'BAAI/bge-m3'
    )
    OR
    (
      indexing_status = 'indexing_failed'
      AND embedding IS NULL
      AND embedding_v2 IS NULL
      AND embedding_v3 IS NULL
      AND embedding_version IN (2, 3)
      AND (
        (embedding_version = 2
          AND embedding_dimensions = 384
          AND embedding_provider = 'supabase_edge_runtime'
          AND embedding_model = 'gte-small')
        OR
        (embedding_version = 3
          AND embedding_dimensions = 1024
          AND embedding_provider = 'self_hosted_http'
          AND embedding_model = 'BAAI/bge-m3')
      )
    )
  ) NOT VALID;

ALTER TABLE public.course_material_embeddings
  VALIDATE CONSTRAINT course_material_embeddings_vector_version_check;

CREATE INDEX IF NOT EXISTS idx_embeddings_v3_hnsw
  ON public.course_material_embeddings
  USING hnsw (embedding_v3 vector_cosine_ops)
  WITH (m = 16, ef_construction = 64)
  WHERE embedding_version = 3 AND embedding_v3 IS NOT NULL;

CREATE OR REPLACE FUNCTION public.search_course_materials_v3(
  query_embedding vector(1024),
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
    (1 - (cme.embedding_v3 OPERATOR(public.<=>) query_embedding))::double precision,
    cme.embedding_provider,
    cme.embedding_model,
    cme.embedding_version
  FROM public.course_material_embeddings AS cme
  WHERE cme.embedding_version = 3
    AND cme.embedding_v3 IS NOT NULL
    AND cme.course_id = ANY(match_course_ids)
    AND cme.indexing_status = 'indexed'
    AND (match_clo_ids IS NULL OR cme.clo_ids && match_clo_ids)
    AND (1 - (cme.embedding_v3 OPERATOR(public.<=>) query_embedding)) >= match_threshold
  ORDER BY cme.embedding_v3 OPERATOR(public.<=>) query_embedding
  LIMIT LEAST(GREATEST(match_count, 1), 20)
$$;

REVOKE ALL ON FUNCTION public.search_course_materials_v3(
  vector, uuid[], uuid[], double precision, integer
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_course_materials_v3(
  vector, uuid[], uuid[], double precision, integer
) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.replace_course_material_embeddings_v3(
  p_institution_id uuid,
  p_course_id uuid,
  p_source_material_id uuid,
  p_source_filename text,
  p_rows jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  inserted_count integer;
BEGIN
  IF p_rows IS NULL
    OR jsonb_typeof(p_rows) <> 'array'
    OR jsonb_array_length(p_rows) = 0
    OR jsonb_array_length(p_rows) > 5000
  THEN
    RAISE EXCEPTION 'replacement rows must be a non-empty array of at most 5000 items';
  END IF;

  IF p_source_filename IS NULL OR length(trim(p_source_filename)) = 0 THEN
    RAISE EXCEPTION 'source filename is required';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.courses AS c
    JOIN public.programs AS p ON p.id = c.program_id
    WHERE c.id = p_course_id
      AND p.institution_id = p_institution_id
  ) THEN
    RAISE EXCEPTION 'course is outside the requested institution';
  END IF;

  IF p_source_material_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.course_materials AS material
    JOIN public.course_modules AS module ON module.id = material.module_id
    WHERE material.id = p_source_material_id
      AND module.course_id = p_course_id
  ) THEN
    RAISE EXCEPTION 'source material is outside the requested course';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_rows) AS item
    WHERE item->>'embedding_provider' <> 'self_hosted_http'
      OR item->>'embedding_model' <> 'BAAI/bge-m3'
      OR (item->>'embedding_dimensions')::integer <> 1024
      OR (item->>'embedding_version')::integer <> 3
      OR item->>'indexing_status' <> 'indexed'
      OR item->>'chunk_text' IS NULL
      OR length(trim(item->>'chunk_text')) = 0
      OR item->>'embedding_v3' IS NULL
      OR length(trim(item->>'embedding_v3')) = 0
      OR item->>'chunk_index' !~ '^[0-9]+$'
      OR (item->>'token_count') !~ '^[0-9]+$'
  ) THEN
    RAISE EXCEPTION 'replacement rows must use the canonical version-3 chunk contract';
  END IF;

  IF (
    SELECT count(DISTINCT (item->>'chunk_index')::integer)
    FROM jsonb_array_elements(p_rows) AS item
  ) <> jsonb_array_length(p_rows) THEN
    RAISE EXCEPTION 'replacement rows must have unique chunk indexes';
  END IF;

  IF (
    SELECT min((item->>'chunk_index')::integer)
    FROM jsonb_array_elements(p_rows) AS item
  ) <> 0
  OR (
    SELECT max((item->>'chunk_index')::integer)
    FROM jsonb_array_elements(p_rows) AS item
  ) <> jsonb_array_length(p_rows) - 1 THEN
    RAISE EXCEPTION 'replacement rows must have contiguous chunk indexes starting at zero';
  END IF;

  -- A material id is the authoritative identity.  Filename fallback is only
  -- for legacy callers that have no material row; otherwise two materials in
  -- the same course may legitimately share a filename.
  IF p_source_material_id IS NOT NULL THEN
    DELETE FROM public.course_material_embeddings
    WHERE course_id = p_course_id
      AND institution_id = p_institution_id
      AND source_material_id = p_source_material_id;
  ELSE
    DELETE FROM public.course_material_embeddings
    WHERE course_id = p_course_id
      AND institution_id = p_institution_id
      AND source_filename = p_source_filename;
  END IF;

  INSERT INTO public.course_material_embeddings (
    institution_id,
    course_id,
    chunk_text,
    embedding_v3,
    embedding_provider,
    embedding_model,
    embedding_dimensions,
    embedding_version,
    source_filename,
    material_type,
    clo_ids,
    bloom_level,
    chunk_index,
    token_count,
    source_material_id,
    indexing_status
  )
  SELECT
    p_institution_id,
    p_course_id,
    row.chunk_text,
    row.embedding_v3::public.vector,
    row.embedding_provider,
    row.embedding_model,
    row.embedding_dimensions,
    row.embedding_version,
    p_source_filename,
    row.material_type,
    COALESCE(row.clo_ids, '{}'::uuid[]),
    row.bloom_level,
    row.chunk_index,
    row.token_count,
    p_source_material_id,
    row.indexing_status
  FROM jsonb_to_recordset(p_rows) AS row (
    chunk_text text,
    embedding_v3 text,
    embedding_provider text,
    embedding_model text,
    embedding_dimensions integer,
    embedding_version integer,
    material_type text,
    clo_ids uuid[],
    bloom_level text,
    chunk_index integer,
    token_count integer,
    indexing_status text
  );

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  IF inserted_count <> jsonb_array_length(p_rows) THEN
    RAISE EXCEPTION 'embedding replacement row count mismatch';
  END IF;
  RETURN inserted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.replace_course_material_embeddings_v3(
  uuid, uuid, uuid, text, jsonb
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.replace_course_material_embeddings_v3(
  uuid, uuid, uuid, text, jsonb
) TO service_role;

COMMENT ON COLUMN public.course_material_embeddings.embedding_v3 IS
  '1024-dimensional normalized BAAI/bge-m3 multilingual vector; isolated from legacy and gte-small contracts.';
