-- Remove searchable chunks before a course material row is deleted.  The
-- historical foreign key uses ON DELETE SET NULL, which otherwise leaves the
-- old material discoverable with no authoritative source identity.

CREATE OR REPLACE FUNCTION public.delete_course_material_embeddings_on_material_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  DELETE FROM public.course_material_embeddings
  WHERE source_material_id = OLD.id;
  RETURN OLD;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_course_material_embeddings_on_material_delete()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_delete_course_material_embeddings
  ON public.course_materials;

CREATE TRIGGER trg_delete_course_material_embeddings
  BEFORE DELETE ON public.course_materials
  FOR EACH ROW
  EXECUTE FUNCTION public.delete_course_material_embeddings_on_material_delete();

COMMENT ON FUNCTION public.delete_course_material_embeddings_on_material_delete() IS
  'Deletes material-owned RAG chunks before ON DELETE SET NULL can orphan their source identity.';
