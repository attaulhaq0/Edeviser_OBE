# LIVE ASSESSMENT CERTIFICATION
**Date:** 2026-09-13 | **Live Supabase:** `cdlgtbvxlxjpcddjazzx`

## VERDICT: ASSESSMENT ENGINE EXISTS, NOT WIRED TO LIVE TRIGGER

The assessment strategy engine (`assessmentStrategyEngine.ts`) and registry (`assessmentStrategyRegistry.ts`) exist in source code. However, the DB trigger that creates evidence rows does NOT consult the assessment strategy — it always applies percent-based processing. All 4 live courses use `criterion` model but the evidence trigger processes them as `percent`.

---

## LIVE COURSE ASSESSMENT CONFIGURATION

| Course | Institution | Assessment Model | Grade Scale | Actual Trigger Behavior | Mismatch? |
|--------|-------------|-----------------|-------------|------------------------|-----------|
| English Language Arts 7 (ENG701) | Noor International | criterion | Default A-F | percent-based | **YES** |
| Mathematics 6 (MATH601) | Noor International | criterion | Default A-F | percent-based | **YES** |
| Science 8 (SCI8) | Noor International | criterion | Default A-F | percent-based | **YES** |
| Social Studies 7 (SOC7) | Noor International | criterion | Default A-F | percent-based | **YES** |

## ASSESSMENT MODEL CHANGE TEST — NOT POSSIBLE

The certification specification requires testing: percent → criterion → band_grade → component model changes with live UI verification. This cannot be executed because:
1. Only one institution has live data
2. The trigger doesn't consult the assessment strategy
3. Changing the assessment model in settings has no runtime effect on evidence generation

## GRADE SCALE CERTIFICATION

| Scale | Institution | Model | Active? | Runtime Effect? |
|-------|-------------|-------|---------|----------------|
| IB MYP 1-7 | IB MYP Academy, Noor Intl. | criterion | Yes | **NOT VERIFIED** — trigger ignores model |
| IGCSE A*-G (9-1) | IGCSE British, Multi-Track | band_grade | Yes | **NOT VERIFIED** — no data in these institutions |
| QNSA Percentage (0-100) | Qatar National, Gulf Academy | percent | Yes | **NOT VERIFIED** — no data in these institutions |
| Default percent (A-F) | Demo, Noor, Gulf | percent | Yes | Used for all evidence processing |

**GRADE SCALE CERTIFICATION: FAILED** — Changing a scale does not have a verified runtime effect because assessment strategy is disconnected.