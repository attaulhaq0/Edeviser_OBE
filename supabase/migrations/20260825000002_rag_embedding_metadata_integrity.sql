-- Keep the denormalized embedding metadata consistent for every writer,
-- including service_role and future server-side jobs.

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
  BEFORE INSERT OR UPDATE OF institution_id, course_id, clo_ids
  ON public.course_material_embeddings
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_course_material_embedding_metadata();

-- Fail the migration rather than installing a guard over already-invalid rows.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM public.course_material_embeddings AS e
      LEFT JOIN public.courses AS c ON c.id = e.course_id
      LEFT JOIN public.programs AS p ON p.id = c.program_id
     WHERE p.institution_id IS NULL
        OR e.institution_id IS DISTINCT FROM p.institution_id
        OR EXISTS (
          SELECT 1
            FROM unnest(COALESCE(e.clo_ids, ARRAY[]::uuid[])) AS requested(clo_id)
            LEFT JOIN public.learning_outcomes AS lo ON lo.id = requested.clo_id
           WHERE lo.id IS NULL
              OR lo.type <> 'CLO'
              OR lo.course_id IS DISTINCT FROM e.course_id
              OR lo.institution_id IS DISTINCT FROM e.institution_id
        )
  ) THEN
    RAISE EXCEPTION 'Existing course_material_embeddings metadata is inconsistent';
  END IF;
END;
$$;
