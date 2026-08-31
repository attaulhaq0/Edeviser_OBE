-- ============================================================================
-- announcement_attachment_storage_policies
--
-- Live incident (postgres_logs, 2026-08-30 20:56Z): teacher attachment upload
-- to the private `announcement-attachments` Storage bucket failed with
-- "new row violates row-level security policy for table \"objects\"" — the
-- bucket had NO storage.objects policies at all.
--
-- Client contract (src/lib/fileUpload.ts::uploadAnnouncementAttachmentFile):
--   path = "{announcementId}/{uuid}-{safeName}"
--
-- Fix: author-only INSERT (uploader must be the parent announcement's
-- author_id), and read access for the author plus actively-enrolled students
-- of the parent announcement's course. Matches the announcement_attachments
-- table RLS contract (migration 20260604140311).
-- ============================================================================

create policy announcement_attachments_upload
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'announcement-attachments'
    and exists (
      select 1
      from public.announcements a
      where a.id::text = (storage.foldername(name))[1]
        and a.author_id = auth.uid()
    )
  );

create policy announcement_attachments_read
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'announcement-attachments'
    and exists (
      select 1
      from public.announcements a
      where a.id::text = (storage.foldername(name))[1]
        and (
          a.author_id = auth.uid()
          or exists (
            select 1
            from public.student_courses sc
            where sc.course_id = a.course_id
              and sc.student_id = auth.uid()
              and sc.status = 'active'
          )
        )
    )
  );
