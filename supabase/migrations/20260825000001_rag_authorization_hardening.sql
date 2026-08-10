-- Remove the historical authenticated-wide embedding policy and make every
-- read path depend on the caller's role plus server-side course scope.

ALTER TABLE public.course_material_embeddings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_read_embeddings"
  ON public.course_material_embeddings;
DROP POLICY IF EXISTS "embeddings_student_read"
  ON public.course_material_embeddings;
DROP POLICY IF EXISTS "embeddings_teacher_all"
  ON public.course_material_embeddings;
DROP POLICY IF EXISTS "embeddings_coordinator_read"
  ON public.course_material_embeddings;
DROP POLICY IF EXISTS "embeddings_admin_all"
  ON public.course_material_embeddings;

CREATE POLICY "embeddings_student_read"
ON public.course_material_embeddings FOR SELECT TO authenticated
USING (
  (SELECT public.auth_user_role()) = 'student'
  AND EXISTS (
    SELECT 1
    FROM public.student_courses AS sc
    JOIN public.courses AS c ON c.id = sc.course_id
    JOIN public.programs AS p ON p.id = c.program_id
    WHERE sc.student_id = (SELECT auth.uid())
      AND sc.course_id = course_material_embeddings.course_id
      AND sc.status = 'active'
      AND p.institution_id = (SELECT public.auth_institution_id())
  )
);

CREATE POLICY "embeddings_teacher_read"
ON public.course_material_embeddings FOR SELECT TO authenticated
USING (
  (SELECT public.auth_user_role()) = 'teacher'
  AND EXISTS (
    SELECT 1
    FROM public.courses AS c
    JOIN public.programs AS p ON p.id = c.program_id
    WHERE c.id = course_material_embeddings.course_id
      AND c.teacher_id = (SELECT auth.uid())
      AND p.institution_id = (SELECT public.auth_institution_id())
  )
);

CREATE POLICY "embeddings_coordinator_read"
ON public.course_material_embeddings FOR SELECT TO authenticated
USING (
  (SELECT public.auth_user_role()) = 'coordinator'
  AND EXISTS (
    SELECT 1
    FROM public.courses AS c
    JOIN public.programs AS p ON p.id = c.program_id
    WHERE c.id = course_material_embeddings.course_id
      AND p.coordinator_id = (SELECT auth.uid())
      AND p.institution_id = (SELECT public.auth_institution_id())
  )
);

CREATE POLICY "embeddings_admin_read"
ON public.course_material_embeddings FOR SELECT TO authenticated
USING (
  (SELECT public.auth_user_role()) = 'admin'
  AND institution_id = (SELECT public.auth_institution_id())
);

-- Embeddings are written by the server-side embedding function. Public table
-- access is read-only for scoped authenticated callers; anonymous clients and
-- browser-side writes cannot reach this table.
REVOKE ALL ON TABLE public.course_material_embeddings
  FROM anon, authenticated;
GRANT SELECT ON TABLE public.course_material_embeddings TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public.course_material_embeddings TO service_role;

-- The RPC is SECURITY INVOKER, so its SELECT is constrained by the policies
-- above. Do not expose it to anonymous callers or PUBLIC implicitly.
REVOKE EXECUTE ON FUNCTION public.search_course_materials(
  vector, uuid[], uuid[], double precision, integer
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_course_materials(
  vector, uuid[], uuid[], double precision, integer
) TO authenticated, service_role;
