-- =============================================================================
-- Add an institution-scoped coordinator write policy for public.timetable_slots.
--
-- Root cause (verified in the coordinator HAR): inserting a timetable slot from
-- the coordinator's TimetableManager (/coordinator/timetable) returned HTTP 403
-- with SQLSTATE 42501 "new row violates row-level security policy for table
-- timetable_slots". The table only had:
--   - timetable_slots_read         (SELECT, institution-scoped)
--   - timetable_slots_admin_write  (ALL, admin only, institution-scoped)
-- There was no write policy for coordinators, yet the coordinator role owns the
-- TimetableManager surface (teachers/students get the read-only TimetableView).
--
-- Fix: add a coordinator ALL-policy that mirrors the admin one but gates on the
-- coordinator role, and is scoped to sections whose course's program belongs to
-- the coordinator's institution (so a coordinator can only manage slots within
-- their own institution). The helper subqueries are wrapped in (SELECT …) so the
-- planner evaluates them once per statement (initplan), matching the optimized
-- RLS pattern already used across the schema.
--
-- A FOR ALL policy with no explicit WITH CHECK reuses its USING expression as the
-- INSERT/UPDATE check (same convention as timetable_slots_admin_write), so this
-- governs INSERT, UPDATE and DELETE. auth_user_role() / auth_institution_id() are
-- pre-existing SECURITY DEFINER helpers (created in much earlier migrations), so
-- this migration is replay-safe.
-- =============================================================================

DROP POLICY IF EXISTS "timetable_slots_coordinator_write" ON public.timetable_slots;

CREATE POLICY "timetable_slots_coordinator_write" ON public.timetable_slots
  FOR ALL
  TO authenticated
  USING (
    (SELECT public.auth_user_role()) = 'coordinator'
    AND EXISTS (
      SELECT 1
      FROM public.course_sections cs
      JOIN public.courses c ON c.id = cs.course_id
      JOIN public.programs p ON p.id = c.program_id
      WHERE cs.id = timetable_slots.section_id
        AND p.institution_id = (SELECT public.auth_institution_id())
    )
  )
  WITH CHECK (
    (SELECT public.auth_user_role()) = 'coordinator'
    AND EXISTS (
      SELECT 1
      FROM public.course_sections cs
      JOIN public.courses c ON c.id = cs.course_id
      JOIN public.programs p ON p.id = c.program_id
      WHERE cs.id = timetable_slots.section_id
        AND p.institution_id = (SELECT public.auth_institution_id())
    )
  );
