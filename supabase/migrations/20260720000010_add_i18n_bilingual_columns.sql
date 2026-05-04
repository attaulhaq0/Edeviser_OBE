-- i18n & RTL Support: Database migrations for bilingual Arabic/English support
-- Tasks 1.1–1.4 from the i18n-rtl-support spec

-- ============================================================================
-- Task 1.3: Add default_language column to institution_settings
-- (Placed before 1.2 so the backfill query can reference it)
-- ============================================================================
ALTER TABLE institution_settings
  ADD COLUMN IF NOT EXISTS default_language VARCHAR(5) NOT NULL DEFAULT 'en';
ALTER TABLE institution_settings
  ADD CONSTRAINT chk_default_language
  CHECK (default_language IN ('en', 'ar'))
  NOT VALID;
ALTER TABLE institution_settings
  VALIDATE CONSTRAINT chk_default_language;
-- ============================================================================
-- Task 1.1: Add preferred_language column to profiles
-- ============================================================================
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(5) DEFAULT 'en';
-- Add CHECK constraint (NOT VALID + VALIDATE avoids full table lock on large tables)
ALTER TABLE profiles
  ADD CONSTRAINT chk_preferred_language
  CHECK (preferred_language IN ('en', 'ar'))
  NOT VALID;
ALTER TABLE profiles
  VALIDATE CONSTRAINT chk_preferred_language;
-- ============================================================================
-- Task 1.2: Backfill existing profiles with preferred_language
-- Uses institution default_language from institution_settings if available,
-- otherwise keeps the column default of 'en'.
-- Only updates rows whose institution has a non-'en' default_language set.
-- ============================================================================
UPDATE profiles p
SET preferred_language = ist.default_language
FROM institution_settings ist
WHERE ist.institution_id = p.institution_id
  AND ist.default_language <> 'en';
-- ============================================================================
-- Task 1.4: Add bilingual columns to learning_outcomes, courses, and programs
-- ============================================================================

-- learning_outcomes is a unified table for ILOs, PLOs, and CLOs (discriminated by type column)
ALTER TABLE learning_outcomes
  ADD COLUMN IF NOT EXISTS title_ar TEXT;
-- courses: Arabic name
ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS name_ar TEXT;
-- programs: Arabic name
ALTER TABLE programs
  ADD COLUMN IF NOT EXISTS name_ar TEXT;
-- Note: No new RLS policies needed. Existing RLS policies on profiles, institution_settings,
-- learning_outcomes, courses, and programs already cover these new columns.;
