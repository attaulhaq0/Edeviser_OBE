-- ============================================================
-- 20260823000016_add_program_accreditation_columns.sql
-- Add missing columns to program_accreditations
-- ============================================================

ALTER TABLE public.program_accreditations ADD COLUMN IF NOT EXISTS current_stage VARCHAR(50) DEFAULT 'self_study';
ALTER TABLE public.program_accreditations ADD COLUMN IF NOT EXISTS framework VARCHAR(50) DEFAULT 'ABET';
ALTER TABLE public.program_accreditations ADD COLUMN IF NOT EXISTS accreditation_body VARCHAR(100) DEFAULT 'Accreditation Board for Engineering and Technology';
ALTER TABLE public.program_accreditations ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES public.profiles(id);
