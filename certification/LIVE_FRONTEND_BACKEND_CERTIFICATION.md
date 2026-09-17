# LIVE FRONTEND-BACKEND CERTIFICATION
**Date:** 2026-09-13 | **Live Supabase:** `cdlgtbvxlxjpcddjazzx`

## VERDICT: CRITICAL FRONTEND-AUTHORITATIVE CALCULATIONS REMAIN

---

## P0 REGRESSION — GRADEBOOK

| Test | Description | Status |
|------|-------------|--------|
| T1 | Server-authoritative final grade | ❌ FAILED — `gradebookCalc.ts` is frontend-only, no DB RPC |
| T2 | Grade → immediate attainment UI update | ✅ VERIFIED — `useCreateGrade.onSuccess` invalidates evidence + attainment |
| X3 | No duplicate authoritative frontend academic calculations | ❌ FAILED — `gapAnalysis.ts` duplicates `detect_systemic_attainment_gaps_v1` |

## FRONTEND/BACKEND TRUTH MATRIX

| Calculation | Canonical Location | Frontend Duplicate? | Risk |
|-------------|-------------------|---------------------|------|
| Final weighted grade | `gradebookCalc.ts` (frontend) | N/A — NO DB canonical | **HIGH** |
| Letter grade | `letterGradeMapper.ts` (frontend) | N/A — NO DB canonical | MEDIUM |
| Evidence creation | DB trigger | None | LOW |
| CLO attainment | DB trigger `trigger_attainment_rollup` | None | LOW |
| Gap analysis | `detect_systemic_attainment_gaps_v1` (DB RPC) | `gapAnalysis.ts` (frontend) | MEDIUM |
| Habit signals | `habitSignalEngine.ts` (code-only) | N/A | **HIGH — not deployed** |

## EMPTY/ERROR/LOADING TESTS — CANNOT VERIFY

Most screens cannot be tested with empty/error/loading states because only 1 institution (Noor) has data. Other institutions are empty shells — their screens would show empty states, but this is not a designed test, it's a data absence.

## REFRESH TEST

After mutations at Noor International:
- `useCreateGrade.onSuccess` invalidates evidence + attainment queries — confirmed in code
- No live browser testing performed

**FRONTEND-BACKEND CERTIFICATION: ❌ FAILED — Gradebook final grade has no DB canonical. Gap analysis has parallel frontend implementation.**