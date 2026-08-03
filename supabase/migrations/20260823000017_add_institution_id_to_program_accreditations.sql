-- ============================================================
-- 20260823000017_add_institution_id_to_program_accreditations.sql
-- Add institution_id column to program_accreditations
-- ============================================================

ALTER TABLE public.program_accreditations ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES public.institutions(id);
