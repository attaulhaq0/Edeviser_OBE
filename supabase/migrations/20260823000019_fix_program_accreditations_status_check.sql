-- ============================================================
-- 20260823000019_fix_program_accreditations_status_check.sql
-- Relax status check constraint on program_accreditations
-- ============================================================

ALTER TABLE public.program_accreditations DROP CONSTRAINT IF EXISTS program_accreditations_status_check;
ALTER TABLE public.program_accreditations ADD CONSTRAINT program_accreditations_status_check 
  CHECK (status IN ('draft', 'in_progress', 'under_review', 'submitted', 'approved', 'active', 'completed'));
