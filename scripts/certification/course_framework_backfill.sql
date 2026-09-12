-- =============================================================================
-- Course Framework Backfill — Certification Remediation (P0-3)
-- Run this against the live Supabase DB via MCP or SQL Editor.
-- Assigns framework_id, curriculum_code, key_stage to courses based on
-- their institution's framework configuration.
-- =============================================================================

-- Step 1: Backfill courses at institutions with their own frameworks
UPDATE public.courses c
SET 
  framework_id = subquery.framework_id,
  curriculum_code = CASE 
    WHEN cf.name ILIKE '%MYP%' THEN 'MYP'
    WHEN cf.name ILIKE '%IGCSE%' THEN 'IGCSE'
    WHEN cf.name ILIKE '%MoEHE%' THEN 'MoEHE'
    WHEN cf.name ILIKE '%IB%' THEN 'IB'
    ELSE 'GENERIC'
  END,
  key_stage = CASE 
    WHEN c.name ILIKE '%6%' THEN 'MYP1'
    WHEN c.name ILIKE '%7%' THEN 'MYP2'
    WHEN c.name ILIKE '%8%' THEN 'MYP3'
    WHEN c.name ILIKE '%9%' THEN 'MYP4'
    WHEN c.name ILIKE '%10%' THEN 'MYP5'
    ELSE NULL
  END,
  grade_scale_id = (
    SELECT gs.id FROM public.grade_scales gs 
    WHERE gs.institution_id = p.institution_id 
    ORDER BY gs.created_at LIMIT 1
  )
FROM public.programs p
JOIN public.competency_frameworks cf ON cf.institution_id = p.institution_id AND cf.is_active = true
WHERE c.program_id = p.id
  AND c.framework_id IS NULL;

-- Step 2: Backfill from institution_framework_assignments (for multi-track schools)
UPDATE public.courses c
SET 
  framework_id = subquery.framework_id,
  curriculum_code = subquery.curriculum_code,
  key_stage = CASE 
    WHEN c.name ILIKE '%6%' THEN 'MYP1'
    WHEN c.name ILIKE '%7%' THEN 'MYP2'
    WHEN c.name ILIKE '%8%' THEN 'MYP3'
    ELSE NULL
  END,
  grade_scale_id = subquery.grade_scale_id
FROM public.programs p
CROSS JOIN LATERAL (
  SELECT 
    ifa.framework_id,
    CASE 
      WHEN cf.name ILIKE '%MYP%' THEN 'MYP'
      WHEN cf.name ILIKE '%IGCSE%' THEN 'IGCSE'
      WHEN cf.name ILIKE '%MoEHE%' THEN 'MoEHE'
      WHEN cf.name ILIKE '%IB%' THEN 'IB'
      ELSE 'GENERIC'
    END as curriculum_code,
    (SELECT gs.id FROM public.grade_scales gs 
     WHERE gs.institution_id = p.institution_id 
     ORDER BY gs.created_at LIMIT 1) as grade_scale_id
  FROM public.institution_framework_assignments ifa
  JOIN public.competency_frameworks cf ON cf.id = ifa.framework_id
  WHERE ifa.institution_id = p.institution_id 
    AND ifa.is_active = true
  ORDER BY ifa.created_at LIMIT 1
) subquery
WHERE c.program_id = p.id
  AND c.framework_id IS NULL
  AND subquery.framework_id IS NOT NULL;

-- Step 3: Verify
SELECT c.id, c.name, c.framework_id, c.curriculum_code, c.key_stage, 
       c.assessment_model, i.name as institution
FROM courses c 
JOIN programs p ON p.id = c.program_id 
JOIN institutions i ON i.id = p.institution_id
ORDER BY i.name, c.name;