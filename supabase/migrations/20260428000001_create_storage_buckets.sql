-- ============================================================
-- Storage Buckets Migration
-- Creates 4 storage buckets with appropriate size limits,
-- MIME type restrictions, and RLS policies.
-- Validates: Requirements 1.2, 2.2
-- ============================================================

-- ─── 1. Create Storage Buckets ──────────────────────────────────────────────

-- avatars: public bucket for user profile pictures
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152, -- 2MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

-- submissions: private bucket for student assignment submissions
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'submissions',
  'submissions',
  false,
  52428800, -- 50MB
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
    'application/gzip',
    'text/plain',
    'text/csv',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
);

-- course-materials: private bucket for teacher-uploaded course content
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'course-materials',
  'course-materials',
  false,
  104857600, -- 100MB
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/zip',
    'application/gzip',
    'text/plain',
    'text/csv',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/svg+xml',
    'video/mp4',
    'video/webm',
    'audio/mpeg',
    'audio/wav',
    'audio/ogg'
  ]
);

-- accreditation-reports: private bucket for generated accreditation PDFs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'accreditation-reports',
  'accreditation-reports',
  false,
  20971520, -- 20MB
  ARRAY['application/pdf']
);

-- ─── 2. RLS Policies for storage.objects ────────────────────────────────────

-- ─── 2.1 Avatars Policies ───────────────────────────────────────────────────

-- Authenticated users can upload avatars to their own folder
CREATE POLICY "avatars_authenticated_upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = (select auth.uid())::text
);

-- Authenticated users can update their own avatars
CREATE POLICY "avatars_authenticated_update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = (select auth.uid())::text
)
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = (select auth.uid())::text
);

-- Public read access for avatars (bucket is public, but explicit policy)
CREATE POLICY "avatars_public_read"
ON storage.objects FOR SELECT TO public
USING (
  bucket_id = 'avatars'
);

-- ─── 2.2 Submissions Policies ───────────────────────────────────────────────

-- Students can upload submissions to their own folder
CREATE POLICY "submissions_student_upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'submissions'
  AND (select auth_user_role()) = 'student'
  AND (storage.foldername(name))[1] = (select auth.uid())::text
);

-- Students can read their own submissions
CREATE POLICY "submissions_student_read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'submissions'
  AND (select auth_user_role()) = 'student'
  AND (storage.foldername(name))[1] = (select auth.uid())::text
);

-- Teachers can read submissions for their courses
CREATE POLICY "submissions_teacher_read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'submissions'
  AND (select auth_user_role()) = 'teacher'
  AND (storage.foldername(name))[1] IN (
    SELECT sc.student_id::text
    FROM student_courses sc
    JOIN courses c ON c.id = sc.course_id
    WHERE c.teacher_id = (select auth.uid())
  )
);

-- Admin can read all submissions within their institution
CREATE POLICY "submissions_admin_read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'submissions'
  AND (select auth_user_role()) IN ('admin', 'coordinator')
  AND (storage.foldername(name))[1] IN (
    SELECT p.id::text
    FROM profiles p
    WHERE p.institution_id = (select auth_institution_id())
  )
);

-- ─── 2.3 Course Materials Policies ──────────────────────────────────────────

-- Teachers can upload course materials for their courses
CREATE POLICY "course_materials_teacher_upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'course-materials'
  AND (select auth_user_role()) = 'teacher'
  AND (storage.foldername(name))[1] IN (
    SELECT c.id::text
    FROM courses c
    WHERE c.teacher_id = (select auth.uid())
  )
);

-- Teachers can update their own course materials
CREATE POLICY "course_materials_teacher_update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'course-materials'
  AND (select auth_user_role()) = 'teacher'
  AND (storage.foldername(name))[1] IN (
    SELECT c.id::text
    FROM courses c
    WHERE c.teacher_id = (select auth.uid())
  )
)
WITH CHECK (
  bucket_id = 'course-materials'
  AND (select auth_user_role()) = 'teacher'
  AND (storage.foldername(name))[1] IN (
    SELECT c.id::text
    FROM courses c
    WHERE c.teacher_id = (select auth.uid())
  )
);

-- Teachers can read their own course materials
CREATE POLICY "course_materials_teacher_read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'course-materials'
  AND (select auth_user_role()) = 'teacher'
  AND (storage.foldername(name))[1] IN (
    SELECT c.id::text
    FROM courses c
    WHERE c.teacher_id = (select auth.uid())
  )
);

-- Enrolled students can read course materials for their courses
CREATE POLICY "course_materials_student_read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'course-materials'
  AND (select auth_user_role()) = 'student'
  AND (storage.foldername(name))[1] IN (
    SELECT sc.course_id::text
    FROM student_courses sc
    WHERE sc.student_id = (select auth.uid())
  )
);

-- Admin/coordinator can read all course materials in their institution
CREATE POLICY "course_materials_admin_read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'course-materials'
  AND (select auth_user_role()) IN ('admin', 'coordinator')
  AND (storage.foldername(name))[1] IN (
    SELECT c.id::text
    FROM courses c
    JOIN programs p ON p.id = c.program_id
    WHERE p.institution_id = (select auth_institution_id())
  )
);

-- ─── 2.4 Accreditation Reports Policies ─────────────────────────────────────

-- Service role can insert accreditation reports (Edge Function uses service_role key)
-- Note: service_role bypasses RLS, so no explicit INSERT policy needed.
-- This policy allows the service role to insert via RLS if needed.
CREATE POLICY "accreditation_reports_service_insert"
ON storage.objects FOR INSERT TO service_role
WITH CHECK (
  bucket_id = 'accreditation-reports'
);

-- Admin and coordinator can read accreditation reports for their institution
CREATE POLICY "accreditation_reports_admin_read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'accreditation-reports'
  AND (select auth_user_role()) IN ('admin', 'coordinator')
  AND (storage.foldername(name))[1] IN (
    SELECT i.id::text
    FROM institutions i
    WHERE i.id = (select auth_institution_id())
  )
);
