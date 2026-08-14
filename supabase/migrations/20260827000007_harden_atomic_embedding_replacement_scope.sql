-- Replace the already-previewed atomic embedding RPC through a forward
-- migration. Matching by filename as well as an available material id removes
-- legacy v2 chunks created before source_material_id became authoritative.

CREATE OR REPLACE FUNCTION public.replace_course_material_embeddings_v2(
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
    WHERE item->>'embedding_provider' <> 'supabase_edge_runtime'
      OR item->>'embedding_model' <> 'gte-small'
      OR (item->>'embedding_dimensions')::integer <> 384
      OR (item->>'embedding_version')::integer <> 2
      OR item->>'indexing_status' <> 'indexed'
  ) THEN
    RAISE EXCEPTION 'replacement rows must use the canonical version-2 embedding metadata';
  END IF;

  DELETE FROM public.course_material_embeddings
  WHERE course_id = p_course_id
    AND institution_id = p_institution_id
    AND (
      source_filename = p_source_filename
      OR (
        p_source_material_id IS NOT NULL
        AND source_material_id = p_source_material_id
      )
    );

  INSERT INTO public.course_material_embeddings (
    institution_id,
    course_id,
    chunk_text,
    embedding_v2,
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
    row.embedding_v2::public.vector,
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
    embedding_v2 text,
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

REVOKE ALL ON FUNCTION public.replace_course_material_embeddings_v2(
  uuid, uuid, uuid, text, jsonb
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.replace_course_material_embeddings_v2(
  uuid, uuid, uuid, text, jsonb
) TO service_role;

COMMENT ON FUNCTION public.replace_course_material_embeddings_v2(
  uuid, uuid, uuid, text, jsonb
) IS 'Service-only atomic replacement that removes filename- and material-id-matched Supabase-native embedding chunks.';
