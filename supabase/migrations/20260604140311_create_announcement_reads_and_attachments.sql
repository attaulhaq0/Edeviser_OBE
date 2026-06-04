-- Feature: qa-partner-review-remediation — Req 15 (P11)
-- Task 25.1: Announcement read receipts + attachments (optional, "WHERE supported").
--
-- Adds two NEW tables referencing only pre-existing tables (public.announcements,
-- public.profiles, public.student_courses) plus a private Storage bucket for
-- attachment files (accessed via signed URLs). RLS is enabled on both tables.
--
-- Replay integrity (migration-replay-integrity.md): all objects are NEW and
-- reference only pre-existing tables/columns; no functions, no out-of-order
-- references. storage.buckets exists on a fresh preview DB (storage extension),
-- and the INSERT is guarded with ON CONFLICT DO NOTHING.

-- ── Read receipts ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.announcement_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (announcement_id, student_id)
);
ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;

-- Student records/reads their own receipts.
CREATE POLICY "announcement_reads_student_own" ON public.announcement_reads
  FOR ALL TO authenticated
  USING (student_id = (select auth.uid()))
  WITH CHECK (student_id = (select auth.uid()));

-- Teacher reads receipts for announcements they authored.
CREATE POLICY "announcement_reads_teacher_read" ON public.announcement_reads
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.announcements a
    WHERE a.id = announcement_reads.announcement_id
      AND a.author_id = (select auth.uid())
  ));

-- ── Attachments ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.announcement_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  content_type text,
  size_bytes integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.announcement_attachments ENABLE ROW LEVEL SECURITY;

-- Author manages attachment metadata for announcements they authored.
CREATE POLICY "announcement_attachments_author_manage" ON public.announcement_attachments
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.announcements a
    WHERE a.id = announcement_attachments.announcement_id
      AND a.author_id = (select auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.announcements a
    WHERE a.id = announcement_attachments.announcement_id
      AND a.author_id = (select auth.uid())
  ));

-- Enrolled (active) students read attachment metadata for their course's announcements.
CREATE POLICY "announcement_attachments_enrolled_read" ON public.announcement_attachments
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.announcements a
    JOIN public.student_courses sc ON sc.course_id = a.course_id
    WHERE a.id = announcement_attachments.announcement_id
      AND sc.student_id = (select auth.uid())
      AND sc.status = 'active'
  ));

-- ── Private Storage bucket for attachment files (signed-URL access) ──────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('announcement-attachments', 'announcement-attachments', false)
ON CONFLICT (id) DO NOTHING;
