-- ─────────────────────────────────────────────────────────────────────────────
-- Index two unindexed foreign keys flagged by the Supabase performance advisor
-- (spec: production-bug-fixes, Req 11 / unindexed_foreign_keys).
--
-- - announcement_attachments.announcement_id has NO covering index at all.
-- - announcement_reads.student_id is only the SECOND column of the unique
--   (announcement_id, student_id) index, so it cannot serve as a leading key for
--   student-scoped lookups / cascade deletes — the advisor flags it as unindexed.
--
-- Both get a dedicated btree index so FK joins and cascade deletes use an index
-- instead of a sequential scan; benefit scales with announcement volume.
--
-- Replay-safe (migration-replay-integrity): plain CREATE INDEX IF NOT EXISTS on
-- tables created in earlier migrations; no forward references. IF NOT EXISTS
-- keeps it idempotent if an equivalent index already exists on a given env.
-- ─────────────────────────────────────────────────────────────────────────────

create index if not exists idx_announcement_attachments_announcement_id
  on public.announcement_attachments (announcement_id);

create index if not exists idx_announcement_reads_student_id
  on public.announcement_reads (student_id);

-- Rollback (manual):
--   drop index if exists public.idx_announcement_attachments_announcement_id;
--   drop index if exists public.idx_announcement_reads_student_id;
