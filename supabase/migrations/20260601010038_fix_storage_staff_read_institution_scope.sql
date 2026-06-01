-- Storage isolation: the 'submissions' and 'session-evidence' buckets store
-- every object under a first folder equal to the uploader's auth.uid() (enforced
-- by their INSERT policies). The staff-read policies gated on role only, letting
-- staff in one institution read another institution's files. Scope them to
-- objects owned by students in the caller's institution via a TEXT join to
-- profiles (text comparison avoids any UUID-cast failure on non-uuid paths).
--
-- NOTE: course-materials and accreditation-reports buckets are NOT fixed here:
-- their objects carry no uid/institution path key, so institution scoping needs
-- a path-convention change in the upload code. Tracked as a follow-up.

DROP POLICY IF EXISTS "submissions_teacher_read" ON storage.objects;
CREATE POLICY "submissions_teacher_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'submissions'
    AND (SELECT public.auth_user_role()) IN ('teacher','admin','coordinator')
    AND (storage.foldername(name))[1] IN (
      SELECT p.id::text FROM public.profiles p
      WHERE p.institution_id = (SELECT public.auth_institution_id())
    )
  );

DROP POLICY IF EXISTS "teacher_read_course_evidence" ON storage.objects;
CREATE POLICY "teacher_read_course_evidence" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'session-evidence'
    AND (SELECT public.auth_user_role()) = 'teacher'
    AND (storage.foldername(name))[1] IN (
      SELECT p.id::text FROM public.profiles p
      WHERE p.institution_id = (SELECT public.auth_institution_id())
    )
  );;
