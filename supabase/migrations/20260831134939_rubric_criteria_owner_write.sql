-- ============================================================================
-- rubric_criteria_owner_write
--
-- Live incident (postgres_logs, 2026-08-30 20:55Z): INSERT into
-- public.rubric_criteria failed with "new row violates row-level security
-- policy for table \"rubric_criteria\"". Root cause: the ONLY write policy was
-- `rubric_criteria_teacher_write` (teacher AND rubrics.created_by = auth.uid()).
-- All rubrics are created by coordinators in production, so no principal could
-- ever manage criteria — not even the rubric's creator.
--
-- Fix: grant full CRUD on criteria rows to the owning rubric's creator.
-- Scope is intentionally narrow (creator-scoped, authenticated role only);
-- RLS remains enabled and no other role gains access.
-- ============================================================================

create policy rubric_criteria_owner_write
  on public.rubric_criteria
  for all
  to authenticated
  using (
    rubric_id in (
      select r.id
      from public.rubrics r
      where r.created_by = auth.uid()
    )
  )
  with check (
    rubric_id in (
      select r.id
      from public.rubrics r
      where r.created_by = auth.uid()
    )
  );
