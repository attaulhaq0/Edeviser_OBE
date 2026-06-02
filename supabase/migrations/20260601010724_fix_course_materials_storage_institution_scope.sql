-- course-materials objects are pathed as {courseId}/{timestamp}_{file} (see
-- uploadMaterialFile in src/hooks/useCourseModules.ts). The first path folder is
-- the course id, which chains to an institution via courses -> programs.
-- institution_id. We use that to scope both read and upload.
--
-- Prior state (both leaks):
--   materials_read: USING (bucket_id='course-materials') -> ANY authenticated
--     user, including students in OTHER institutions, could read every file.
--   materials_teacher_upload: role-only -> a teacher could upload into ANY
--     course in ANY institution.
--
-- Reusable helper: resolve the institution that owns a course-materials object
-- from its path. SECURITY DEFINER so it can read courses/programs regardless of
-- the caller's RLS, STABLE, empty search_path, fully qualified.
CREATE OR REPLACE FUNCTION public.course_material_institution(p_object_name text)
  RETURNS uuid
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
AS $function$
  SELECT pr.institution_id
  FROM public.courses c
  JOIN public.programs pr ON pr.id = c.program_id
  WHERE c.id = NULLIF((storage.foldername(p_object_name))[1], '')::uuid
$function$;
REVOKE ALL ON FUNCTION public.course_material_institution(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.course_material_institution(text) TO authenticated;

-- READ: enrolled students, plus staff in the course's institution.
DROP POLICY IF EXISTS "materials_read" ON storage.objects;
CREATE POLICY "materials_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'course-materials'
    AND (
      -- staff in the same institution as the owning course
      ( (SELECT public.auth_user_role()) IN ('teacher','coordinator','admin')
        AND public.course_material_institution(name) = (SELECT public.auth_institution_id()) )
      OR
      -- students enrolled in the owning course
      EXISTS (
        SELECT 1 FROM public.student_courses sc
        WHERE sc.student_id = (SELECT auth.uid())
          AND sc.course_id::text = (storage.foldername(name))[1]
      )
    )
  );

-- UPLOAD: teacher into own course, or admin into own institution's course.
DROP POLICY IF EXISTS "materials_teacher_upload" ON storage.objects;
CREATE POLICY "materials_teacher_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'course-materials'
    AND (
      ( (SELECT public.auth_user_role()) = 'teacher'
        AND EXISTS (
          SELECT 1 FROM public.courses c
          WHERE c.id::text = (storage.foldername(name))[1]
            AND c.teacher_id = (SELECT auth.uid())
        ) )
      OR
      ( (SELECT public.auth_user_role()) = 'admin'
        AND public.course_material_institution(name) = (SELECT public.auth_institution_id()) )
    )
  );;
