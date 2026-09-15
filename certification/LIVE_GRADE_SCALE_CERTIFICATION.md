# LIVE GRADE SCALE CERTIFICATION
**Date:** 2026-09-13 | **Live Supabase:** `cdlgtbvxlxjpcddjazzx`

## VERDICT: GRADE SCALES CONFIGURED BUT NOT VERIFIED TO AFFECT LIVE RUNTIME

9 grade scales exist across institutions. However, the assessment strategy engine is not wired to the DB trigger — all evidence processing uses percent mode regardless of the configured scale model. Changing a grade scale has no verified runtime effect.

---

## GRADE SCALE INVENTORY (LIVE)

| # | Scale | Institution | Model | Bands | Runtime Effect? |
|---|-------|-------------|-------|-------|----------------|
| 1 | IB MYP 1-7 | IB MYP Academy | criterion | 7 bands (1-7) | **NOT VERIFIED** — no courses |
| 2 | IB MYP 1-7 | Noor International | criterion | 7 bands (1-7) | **NOT VERIFIED** — trigger uses percent |
| 3 | IGCSE A*-G (9-1) | IGCSE British School | band_grade | 9 bands (9/A* to 1/G) | **NOT VERIFIED** — no courses |
| 4 | IGCSE A*-G (9-1) | Multi-Track Academy | band_grade | 9 bands (9/A* to 1/G) | **NOT VERIFIED** — no courses |
| 5 | QNSA Percentage (0-100) | Qatar National School | percent | 5 bands (A-F) | **NOT VERIFIED** — no courses |
| 6 | QNSA Percentage (0-100) | Gulf Academy | percent | 5 bands (A-F) | **NOT VERIFIED** — no courses |
| 7 | Default percent (A-F) | Demo University | percent | 5 bands (A-F) | Used for all evidence |
| 8 | Default percent (A-F) | Noor International | percent | 5 bands (A-F) | Used for all evidence |
| 9 | Default percent (A-F) | Gulf Academy | percent | 5 bands (A-F) | **NOT VERIFIED** — no courses |

## GRADE SCALE CHANGE TEST — CANNOT EXECUTE

The certification requires: admin changes percent → criterion, then teacher UI changes, teacher submits, backend behavior changes. This cannot be tested because:
1. Only Noor has courses, and they all use criterion model but trigger uses percent
2. Changing the configuration has no runtime effect — the trigger ignores it

**GRADE SCALE CERTIFICATION: ❌ FAILED — Scales exist in configuration but do not control live runtime behavior.**