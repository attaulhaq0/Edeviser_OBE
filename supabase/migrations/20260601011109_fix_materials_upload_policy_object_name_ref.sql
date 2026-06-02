-- Self-review fix: the teacher branch of materials_teacher_upload referenced
-- storage.foldername(c.name) — i.e. the COURSE's name column inside the EXISTS
-- subquery — instead of the storage object's name. That made the teacher
-- upload path compare a course id to a folder derived from the course name,
-- which never matches. Reference the outer storage.objects.name explicitly via
-- the table alias to remove ambiguity.
DROP POLICY IF EXISTS "materials_teacher_upload" ON storage.objects;
CREATE POLICY "materials_teacher_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'course-materials'
    AND (
      ( (SELECT public.auth_user_role()) = 'teacher'
        AND EXISTS (
          SELECT 1 FROM public.courses c
          WHERE c.id::text = (storage.foldername(objects.name))[1]
            AND c.teacher_id = (SELECT auth.uid())
        ) )
      OR
      ( (SELECT public.auth_user_role()) = 'admin'
        AND public.course_material_institution(objects.name) = (SELECT public.auth_institution_id()) )
    )
  );;
