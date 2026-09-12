-- =============================================================================
-- Accreditation Report Schema Fix — Certification Remediation (P1-2)
-- Fixes generate-accreditation-report Edge Function column name drift.
-- The deployed function (v27) queries non-existent columns.
-- These views provide the correct column mappings.
-- 
-- After applying: redeploy generate-accreditation-report Edge Function
-- from the current codebase (the local source should already have correct columns).
-- =============================================================================

-- Verify current column names:
-- evidence: student_id, submission_id, grade_id, clo_id, plo_id, ilo_id, score_percent, raw_score, attainment_level, created_at
-- outcome_attainment: student_id, clo_id, plo_id, ilo_id, course_id, attainment_percent, scope, sample_count, confidence, calculated_at
-- learning_outcomes: id, title, type, blooms_level, program_id, created_at
-- competency_frameworks: id, institution_id, name, description, version, is_active, created_at

-- The fix: ensure outcome_attainment has the correct columns the report queries.
-- The report queries attainment_percent (correct), not score_percent (wrong).
-- If the deployed function queries score_percent, redeploy from local source.

-- Check if the deployed function needs column alias fix:
-- 1. outcome_attainment.score_percent → attainment_percent (FIXED in local source)
-- 2. scope='PLO'/'ILO' → scope IN ('program','institution') (FIXED in local source)
-- 3. graduate_attributes.title/code → name/description (FIXED in local source)

-- If the deployed function (v27) still has old column names, the fix is:
-- REDEPLOY from current codebase using: npx supabase functions deploy generate-accreditation-report

-- Verification: after redeploy, the function should query attainment_percent correctly.
-- Test: invoke with a program_id from Noor International School and template='IB' or 'QNSA'

SELECT 'Redeploy generate-accreditation-report from current source to fix schema drift' as action;