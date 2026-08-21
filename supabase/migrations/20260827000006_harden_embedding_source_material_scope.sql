-- Extend the privileged-writer metadata guard to the source material link.
-- A service-role writer must not attach content from one course to another.

CREATE OR REPLACE FUNCTION public.validate_course_material_embedding_metadata()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  course_institution_id uuid;
BEGIN
  SELECT p.institution_id
    INTO course_institution_id
    FROM public.courses AS c
    JOIN public.programs AS p ON p.id = c.program_id
   WHERE c.id = NEW.course_id;

  IF course_institution_id IS NULL THEN
    RAISE EXCEPTION 'Embedding course_id % does not resolve to a program institution', NEW.course_id
      USING ERRCODE = '23514';
  END IF;

  IF NEW.institution_id IS DISTINCT FROM course_institution_id THEN
    RAISE EXCEPTION 'Embedding institution_id must match the course institution'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.source_material_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
      FROM public.course_materials AS material
      JOIN public.course_modules AS module ON module.id = material.module_id
     WHERE material.id = NEW.source_material_id
       AND module.course_id = NEW.course_id
  ) THEN
    RAISE EXCEPTION 'Embedding source_material_id must reference material from the same course'
      USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM unnest(COALESCE(NEW.clo_ids, ARRAY[]::uuid[])) AS requested(clo_id)
      LEFT JOIN public.learning_outcomes AS lo ON lo.id = requested.clo_id
     WHERE lo.id IS NULL
        OR lo.type <> 'CLO'
        OR lo.course_id IS DISTINCT FROM NEW.course_id
        OR lo.institution_id IS DISTINCT FROM NEW.institution_id
  ) THEN
    RAISE EXCEPTION 'Embedding clo_ids must reference CLOs from the same course and institution'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_course_material_embedding_metadata()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_validate_course_material_embedding_metadata
  ON public.course_material_embeddings;

CREATE TRIGGER trg_validate_course_material_embedding_metadata
  BEFORE INSERT OR UPDATE OF institution_id, course_id, source_material_id, clo_ids
  ON public.course_material_embeddings
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_course_material_embedding_metadata();

-- Refuse to install the stricter trigger over inconsistent legacy metadata.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM public.course_material_embeddings AS embedding
      LEFT JOIN public.course_materials AS material
        ON material.id = embedding.source_material_id
      LEFT JOIN public.course_modules AS module
        ON module.id = material.module_id
     WHERE embedding.source_material_id IS NOT NULL
       AND (
         material.id IS NULL
         OR module.course_id IS DISTINCT FROM embedding.course_id
       )
  ) THEN
    RAISE EXCEPTION 'Existing embedding source material scope is inconsistent';
  END IF;
END;
$$;

COMMENT ON FUNCTION public.validate_course_material_embedding_metadata()
  IS 'Enforces course, tenant, source-material, and CLO scope for every privileged embedding writer.';
