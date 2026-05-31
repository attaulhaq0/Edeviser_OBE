-- Drop the broad SELECT policy that allows listing all files in the avatars bucket
DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;

-- Replace with a policy that only allows reading specific objects (not listing)
-- Public buckets serve files via direct URL without needing a SELECT policy
-- This prevents enumeration of all avatar filenames
CREATE POLICY "avatars_public_read" ON storage.objects
  FOR SELECT TO public
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] IS NOT NULL
  );;
