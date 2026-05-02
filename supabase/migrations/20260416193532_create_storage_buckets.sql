-- Create storage buckets for file uploads

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('avatars', 'avatars', true, 2097152, ARRAY['image/jpeg','image/png','image/webp','image/gif']),
  ('submissions', 'submissions', false, 52428800, ARRAY['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/zip','text/plain','image/jpeg','image/png']),
  ('course-materials', 'course-materials', false, 104857600, ARRAY['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.presentationml.presentation','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/zip','video/mp4','audio/mpeg','image/jpeg','image/png','image/webp']),
  ('accreditation-reports', 'accreditation-reports', false, 20971520, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- RLS policies for avatars bucket (public read, authenticated upload own)
CREATE POLICY "avatars_public_read" ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'avatars');

CREATE POLICY "avatars_auth_upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = (select auth.uid())::text);

CREATE POLICY "avatars_auth_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = (select auth.uid())::text);

-- RLS policies for submissions bucket
CREATE POLICY "submissions_student_upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'submissions' AND (storage.foldername(name))[1] = (select auth.uid())::text AND (select auth_user_role()) = 'student');

CREATE POLICY "submissions_student_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'submissions' AND (storage.foldername(name))[1] = (select auth.uid())::text);

CREATE POLICY "submissions_teacher_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'submissions' AND (select auth_user_role()) IN ('teacher', 'admin', 'coordinator'));

-- RLS policies for course-materials bucket
CREATE POLICY "materials_teacher_upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'course-materials' AND (select auth_user_role()) IN ('teacher', 'admin'));

CREATE POLICY "materials_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'course-materials');

-- RLS policies for accreditation-reports bucket
CREATE POLICY "reports_admin_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'accreditation-reports' AND (select auth_user_role()) IN ('admin', 'coordinator'));;
