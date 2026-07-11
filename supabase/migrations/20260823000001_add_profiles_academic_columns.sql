-- =============================================================================
-- Add staff academic-profile columns to public.profiles
-- =============================================================================
--
-- Powers the coordinator "Me" page "Profile & Academic Information" section
-- (department / designation / academic rank / highest degree / years of
-- experience). These are optional, self-service profile attributes edited by
-- the user themselves; existing rows are unaffected and render a "not set"
-- placeholder in the UI until edited.
--
-- Authorization: no new RLS is required. profiles already enforces row-level
-- security, and self-service edits go through the existing `profiles` UPDATE
-- policy that scopes a user to their own row (id = auth.uid()) — the same path
-- the notification-preferences settings already use. No column carries
-- sensitive data and none participates in authorization decisions.
--
-- Replay-safe: `ADD COLUMN IF NOT EXISTS` is idempotent and has no forward
-- references (no functions, tables, or policies are referenced before they are
-- created). Passes scripts/check-migration-replay-order.mjs.
-- =============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS department text,
  ADD COLUMN IF NOT EXISTS designation text,
  ADD COLUMN IF NOT EXISTS academic_rank text,
  ADD COLUMN IF NOT EXISTS highest_degree text,
  ADD COLUMN IF NOT EXISTS years_experience integer;

COMMENT ON COLUMN public.profiles.department IS 'Staff academic department (free text, self-edited on the profile page).';
COMMENT ON COLUMN public.profiles.designation IS 'Staff job designation / title (free text, self-edited).';
COMMENT ON COLUMN public.profiles.academic_rank IS 'Academic rank, e.g. Assistant Professor (free text, self-edited).';
COMMENT ON COLUMN public.profiles.highest_degree IS 'Highest academic degree earned (free text, self-edited).';
COMMENT ON COLUMN public.profiles.years_experience IS 'Years of professional/teaching experience (self-edited).';
