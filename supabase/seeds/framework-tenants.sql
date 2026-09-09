-- =============================================================================
-- Edeviser Multi-Framework Seed Tenant Script (Phase 9)
-- Creates framework assignments for IB-Only, British-Only, Qatar National, Multi-Track
-- Run via: supabase db query --linked --file supabase/seeds/framework-tenants.sql
-- =============================================================================

-- Framework IDs (from live production):
-- MYP 2026:       c7f60e15-81ec-49d8-a4c4-39eabc5cb15b
-- IGCSE AO:       f1000000-0000-4000-8000-000000000002
-- MoEHE Qatar NC: f1000000-0000-4000-8000-000000000003

-- 9.9.1: IB-Only School — assign MYP framework to first institution
INSERT INTO institution_framework_assignments (institution_id, framework_id, is_active)
SELECT i.id, 'c7f60e15-81ec-49d8-a4c4-39eabc5cb15b', true
FROM institutions i
WHERE NOT EXISTS (
  SELECT 1 FROM institution_framework_assignments ifa
  WHERE ifa.institution_id = i.id AND ifa.framework_id = 'c7f60e15-81ec-49d8-a4c4-39eabc5cb15b'
)
LIMIT 1
ON CONFLICT DO NOTHING;

-- Mark courses as criterion model (MYP)
UPDATE courses SET assessment_model = 'criterion'
WHERE assessment_model = 'percent' AND id IN (
  SELECT c.id FROM courses c
  JOIN programs p ON p.id = c.program_id
  JOIN institution_framework_assignments ifa ON ifa.institution_id = p.institution_id
  WHERE ifa.framework_id = 'c7f60e15-81ec-49d8-a4c4-39eabc5cb15b' AND ifa.is_active = true
  LIMIT 2
);

-- 9.9.2-9.9.4: Remaining tenants require new institutions via bootstrap_tenant_v1 or manual
-- See docs: bootstrap_tenant_v1 creates institution+programs+courses in one transaction

-- Verification:
-- SELECT i.name, cf.name as framework FROM institution_framework_assignments ifa
-- JOIN institutions i ON i.id = ifa.institution_id
-- JOIN competency_frameworks cf ON cf.id = ifa.framework_id WHERE ifa.is_active = true;