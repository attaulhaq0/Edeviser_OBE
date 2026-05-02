-- Create storage bucket for session evidence
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'session-evidence',
  'session-evidence',
  false,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
) ON CONFLICT (id) DO NOTHING;

-- Student can upload to their own folder
CREATE POLICY "student_upload_own_evidence" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'session-evidence'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Student can read their own files
CREATE POLICY "student_read_own_evidence" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'session-evidence'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Teacher can read course student files
CREATE POLICY "teacher_read_course_evidence" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'session-evidence'
    AND auth_user_role() = 'teacher'
  );;
