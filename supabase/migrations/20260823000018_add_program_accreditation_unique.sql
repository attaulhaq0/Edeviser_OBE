-- ============================================================
-- 20260823000018_add_program_accreditation_unique.sql
-- Add UNIQUE constraint on program_id for program_accreditations
-- ============================================================

ALTER TABLE public.program_accreditations DROP CONSTRAINT IF EXISTS program_accreditations_program_id_key;
ALTER TABLE public.program_accreditations ADD CONSTRAINT program_accreditations_program_id_key UNIQUE (program_id);
