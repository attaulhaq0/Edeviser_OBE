-- The accreditation report Edge Function writes generated PDFs to the `reports`
-- bucket (created at runtime) and serves them via a service-role signed URL
-- (which bypasses RLS). The bucket had NO policies, so any direct SELECT was
-- default-denied AND there was no tenant scoping defined. The function now
-- writes objects under an institution-id path prefix ({institution_id}/...), so
-- we can scope direct reads to admins/coordinators in the owning institution.
--
-- accreditation-reports bucket has no writers in the codebase, but its
-- reports_admin_read policy was role-only (cross-institution if it ever
-- received objects). Scope it the same way defensively.

-- reports bucket: admin/coordinator read within their own institution
DROP POLICY IF EXISTS "reports_institution_read" ON storage.objects;
CREATE POLICY "reports_institution_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'reports'
    AND (SELECT public.auth_user_role()) IN ('admin','coordinator')
    AND (storage.foldername(name))[1] = (SELECT public.auth_institution_id())::text
  );

-- accreditation-reports bucket: same scoping (defensive; currently no writers)
DROP POLICY IF EXISTS "reports_admin_read" ON storage.objects;
CREATE POLICY "reports_admin_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'accreditation-reports'
    AND (SELECT public.auth_user_role()) IN ('admin','coordinator')
    AND (storage.foldername(name))[1] = (SELECT public.auth_institution_id())::text
  );;
