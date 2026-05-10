-- Tighten avatars bucket storage policies (ADR-04, ADR-15)
--
-- Purpose:
--   1. Ensure every write operation (INSERT/UPDATE/DELETE) on objects in the
--      `avatars` bucket is scoped to the calling user's own folder
--      (`storage.foldername(name)[1] = auth.uid()::text`). This enforces the
--      principle of least privilege and prevents one authenticated user from
--      mutating another user's avatar file.
--   2. Add a matching WITH CHECK clause on UPDATE so a row cannot be moved
--      out of the user's own folder during an update.
--   3. Add a DELETE policy so users can remove their own old avatars when
--      rotating (the previous migration set only had INSERT + UPDATE).
--   4. Re-assert bucket-level defense in depth (ADR-04) by pinning the
--      `avatars` bucket to 2 MB file size limit and the image mime types
--      accepted by the client-side Zod schema
--      (`image/png`, `image/jpeg`, `image/webp`) — removing `image/gif`
--      which is not supported by the Avatar upload flow.
--
-- Note on SELECT: the existing `avatars_public_read` policy created by
-- `20260504033018_restrict_avatars_bucket_listing.sql` (authenticated + own
-- folder only) is intentionally preserved and NOT dropped here.

BEGIN;

-- 1. Drop any prior permissive write policies (idempotent).
DROP POLICY IF EXISTS "avatars_auth_upload" ON storage.objects;
DROP POLICY IF EXISTS "avatars_auth_update" ON storage.objects;
DROP POLICY IF EXISTS "avatars_auth_delete" ON storage.objects;

-- 2. Folder-scoped INSERT: users may only upload into their own folder.
CREATE POLICY "avatars_auth_upload"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- 3. Folder-scoped UPDATE with matching USING + WITH CHECK so the row cannot
--    be relocated to a different user's folder during an update.
CREATE POLICY "avatars_auth_update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- 4. Folder-scoped DELETE: users may only delete objects in their own folder.
CREATE POLICY "avatars_auth_delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- 5. Tighten bucket-level defense in depth to match the client Zod schema
--    (`src/lib/schemas/avatarUpload.ts`): 2 MB cap, png/jpeg/webp only.
UPDATE storage.buckets
   SET file_size_limit = 2097152,
       allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp']
 WHERE id = 'avatars';

COMMIT;
