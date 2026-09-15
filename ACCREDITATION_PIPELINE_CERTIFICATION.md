# ACCREDITATION PIPELINE CERTIFICATION

**Date:** 2026-09-12 | **Status:** ⚠️ PARTIAL (deployed, schema drift)

## Supported Templates (Current Qatar K-12)
| Body | Template | Supported in Code | Deployed | Notes |
|------|----------|-------------------|----------|-------|
| QNSA | QNSA | ✅ | ✅ v27 | Qatar National School Accreditation |
| BSO | BSO | ✅ | ✅ v27 | British Schools Overseas (IGCSE) |
| IB | IB | ✅ | ✅ v27 | International Baccalaureate (MYP) |
| CIS | CIS | ✅ | ✅ v27 | Council of International Schools |

## Schema Drift (P1-2)
Deployed v27 queries:
- `outcome_attainment.score_percent` → should be `attainment_percent` ❌
- `scope='PLO'/'ILO'` → should be `scope='program'/'institution'` ❌
- `graduate_attributes.title/code` → should be `name/description` ❌

**Local source IS CORRECT** — needs redeployment.

## Evidence Chain
Reports consume:
1. `outcome_attainment` (scope='program', 'institution') — PLO/ILO attainment
2. `learning_outcomes` — Bloom's taxonomy distribution
3. `cqi_action_plans` — baseline/target/result attainment
4. `graduate_attributes` — GA-to-ILO alignment
5. `competency_frameworks` — indicator alignment matrix

## VERDICT
⚠️ PARTIALLY CERTIFIED — Template coverage is correct for Qatar K-12. Schema drift prevents valid report generation. Fix: redeploy from current source.