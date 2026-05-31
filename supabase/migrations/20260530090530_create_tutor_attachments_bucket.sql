-- Create the private `tutor-attachments` Storage bucket for the AI Tutor chat
-- attachment upload path (Requirement 4.5 of student-experience-remediation).
--
-- Purpose:
--   1. Provide a private bucket that the `useTutorAttachmentUpload` hook writes
--      to under a per-user folder (`<auth.uid()>/<uuid>-<filename>`) and then
--      reads back via a short-lived signed URL.
--   2. Enforce path-prefixed RLS so a student can only write/read/update/delete
--      objects under their own folder (`storage.foldername(name)[1] =
--      auth.uid()::text`), following the least-privilege pattern established by
--      the `avatars` and `submissions` buckets.
--   3. Pin bucket-level defense in depth to match the client-side validation in
--      `ChatPanel.tsx` (JPEG/PNG images <= 5 MB, PDF/DOCX documents <= 10 MB):
--      a 10 MB cap and the union of accepted MIME types.
--
-- Idempotent: the bucket insert uses ON CONFLICT DO NOTHING and every policy is
-- dropped-if-exists before creation so the migration can be re-applied safely.

BEGIN;

-- 1. Private bucket with size/MIME constraints matching the upload UI.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tutor-attachments',
  'tutor-attachments',
  false,
  10485760, -- 10 MB (covers the 10 MB document limit; images are capped at 5 MB client-side)
  ARRAY[
    'image/jpeg',
    'image/png',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Drop any prior policies (idempotent re-apply).
DROP POLICY IF EXISTS "tutor_attachments_owner_insert" ON storage.objects;
DROP POLICY IF EXISTS "tutor_attachments_owner_select" ON storage.objects;
DROP POLICY IF EXISTS "tutor_attachments_owner_update" ON storage.objects;
DROP POLICY IF EXISTS "tutor_attachments_owner_delete" ON storage.objects;

-- 3. Folder-scoped INSERT: a user may only upload into their own folder.
CREATE POLICY "tutor_attachments_owner_insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'tutor-attachments'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- 4. Folder-scoped SELECT: required for the hook to create a signed URL for the
--    object it just uploaded, and to read back only its owner's files.
CREATE POLICY "tutor_attachments_owner_select"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'tutor-attachments'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- 5. Folder-scoped UPDATE with matching USING + WITH CHECK so a row cannot be
--    relocated out of the owner's folder during an update.
CREATE POLICY "tutor_attachments_owner_update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'tutor-attachments'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  )
  WITH CHECK (
    bucket_id = 'tutor-attachments'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- 6. Folder-scoped DELETE: a user may only delete objects in their own folder.
CREATE POLICY "tutor_attachments_owner_delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'tutor-attachments'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  );

COMMIT;;
