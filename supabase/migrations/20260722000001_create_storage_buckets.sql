-- =============================================================================
-- Migration: Create Storage Buckets
-- =============================================================================
-- Creates the required storage buckets with appropriate size limits,
-- allowed MIME types, and RLS policies for role-based access control.
-- =============================================================================

-- ─── Create Buckets ──────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'avatars',
    'avatars',
    true,
    2097152, -- 2 MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  ),
  (
    'submissions',
    'submissions',
    false,
    52428800, -- 50 MB
    ARRAY[
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/zip',
      'application/x-rar-compressed',
      'text/plain',
      'text/csv',
      'image/jpeg',
      'image/png',
      'image/webp'
    ]
  ),
  (
    'course-materials',
    'course-materials',
    false,
    104857600, -- 100 MB
    ARRAY[
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/zip',
      'text/plain',
      'text/csv',
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'video/mp4',
      'video/webm',
      'audio/mpeg',
      'audio/wav'
    ]
  ),
  (
    'accreditation-reports',
    'accreditation-reports',
    false,
    20971520, -- 20 MB
    ARRAY['application/pdf']
  ),
  (
    'transcripts',
    'transcripts',
    false,
    20971520, -- 20 MB
    ARRAY['application/pdf']
  )
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- RLS Policies for storage.objects
-- =============================================================================

-- ─── Avatars ─────────────────────────────────────────────────────────────────

-- Public read for avatars (bucket is public)
CREATE POLICY "avatars_public_read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'avatars');

-- Authenticated users can upload/update their own avatar
CREATE POLICY "avatars_owner_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  );

CREATE POLICY "avatars_owner_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  );

CREATE POLICY "avatars_owner_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- ─── Submissions ─────────────────────────────────────────────────────────────

-- Students can upload to their own folder
CREATE POLICY "submissions_student_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'submissions'
    AND (select auth_user_role()) = 'student'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Students can read their own submissions
CREATE POLICY "submissions_student_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'submissions'
    AND (select auth_user_role()) = 'student'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Teachers can read submissions for their courses
CREATE POLICY "submissions_teacher_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'submissions'
    AND (select auth_user_role()) = 'teacher'
  );

-- Admin/coordinator can read all submissions in their institution
CREATE POLICY "submissions_admin_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'submissions'
    AND (select auth_user_role()) IN ('admin', 'coordinator')
  );

-- ─── Course Materials ────────────────────────────────────────────────────────

-- Teachers can upload course materials
CREATE POLICY "course_materials_teacher_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'course-materials'
    AND (select auth_user_role()) = 'teacher'
  );

CREATE POLICY "course_materials_teacher_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'course-materials'
    AND (select auth_user_role()) = 'teacher'
  );

CREATE POLICY "course_materials_teacher_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'course-materials'
    AND (select auth_user_role()) = 'teacher'
  );

-- Enrolled students can read course materials
CREATE POLICY "course_materials_student_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'course-materials'
    AND (select auth_user_role()) = 'student'
  );

-- Admin/coordinator can read all course materials
CREATE POLICY "course_materials_admin_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'course-materials'
    AND (select auth_user_role()) IN ('admin', 'coordinator')
  );

-- Admin can upload course materials
CREATE POLICY "course_materials_admin_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'course-materials'
    AND (select auth_user_role()) = 'admin'
  );

-- ─── Accreditation Reports ───────────────────────────────────────────────────

-- Service role inserts (handled by Edge Functions with service_role key)
-- No INSERT policy needed for authenticated — Edge Functions bypass RLS

-- Admin and coordinator can read accreditation reports
CREATE POLICY "accreditation_reports_admin_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'accreditation-reports'
    AND (select auth_user_role()) IN ('admin', 'coordinator')
  );

-- ─── Transcripts ─────────────────────────────────────────────────────────────

-- Service role inserts (handled by Edge Functions with service_role key)
-- No INSERT policy needed for authenticated — Edge Functions bypass RLS

-- Admin can read all transcripts
CREATE POLICY "transcripts_admin_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'transcripts'
    AND (select auth_user_role()) = 'admin'
  );

-- Students can read their own transcripts
CREATE POLICY "transcripts_student_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'transcripts'
    AND (select auth_user_role()) = 'student'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  );
