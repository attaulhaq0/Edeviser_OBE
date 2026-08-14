-- Replace the version constraint through a forward migration because the
-- original v2 migration has already been exercised by Preview. NOT VALID keeps
-- the initial lock short; validation is explicit and independently observable.

ALTER TABLE public.course_material_embeddings
  DROP CONSTRAINT IF EXISTS course_material_embeddings_vector_version_check;

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
  ) NOT VALID;

ALTER TABLE public.course_material_embeddings
  VALIDATE CONSTRAINT course_material_embeddings_vector_version_check;
