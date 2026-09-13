# MASTER RUNTIME TRUTH MATRIX — LIVE SUPABASE VERIFIED
**Date:** 2026-09-12 | **Source:** Live Supabase + Codebase

## INSTITUTIONS (7 FOUND — Phase 15 only knew of 1!)

| # | ID | Name | Type | Courses | Grade Scales | Frameworks | Status |
|---|----|------|------|---------|-------------|------------|--------|
| 1 | `...000001` | Demo University | Higher Ed | 0 | Default A-F | MYP, IGCSE, MoEHE | **ROADMAP — NOT QATAR K-12** |
| 2 | `9fb3...` | Gulf Academy of Excellence | Qatar K-12 | 0 | Default A-F + QNSA Percent | None assigned | **PARTIAL — needs courses/framework** |
| 3 | `9cec...` | IB MYP Academy | Qatar K-12 (IB) | 0 | IB MYP 1-7 | None assigned | **PARTIAL — needs courses** |
| 4 | `9055...` | IGCSE British School | Qatar K-12 (British) | 0 | IGCSE A*-G 9-1 | None assigned | **PARTIAL — needs courses** |
| 5 | `6736...` | Multi-Track Academy | Qatar K-12 (Multi) | 0 | IGCSE A*-G 9-1 | None assigned | **PARTIAL — needs courses per track** |
| 6 | `4de6...` | Noor International | Qatar K-12 (IB MYP) | 4 (all criterion!) | IB MYP 1-7 + Default A-F | MYP 2026 + IGCSE | **OPERATIONAL — config nearly complete** |
| 7 | `fb24...` | Qatar National School | Qatar K-12 (MoEHE) | 0 | QNSA Percent 0-100 | None assigned | **PARTIAL — needs courses** |

## CRITICAL CORRECTION: ASSESSMENT MODEL IS LIVE

**Phase 15/20 finding "Noor has assessment_model = 'percent'" is NOW INCORRECT.**

All 4 courses on Noor have `assessment_model = 'criterion'`:
- Science 8 (criterion)
- Social Studies 7 (criterion)
- English Language Arts 7 (criterion)
- Mathematics 6 (criterion)

**Grade scales are institution-specific and functional:**
- IB MYP Academy → IB MYP 1-7 (model: criterion)
- IGCSE British School → IGCSE A*-G 9-1 (model: band_grade)
- Qatar National School → QNSA Percentage 0-100 (model: percent)
- Noor → BOTH IB MYP 1-7 AND Default A-F (dual)

## LIVE DATA VERIFICATION

| Table | Rows | Status |
|-------|------|--------|
| grades | 550 | ✅ Active |
| submissions | 552 | ✅ Active |
| evidence | 1650 | ✅ Active (3× grades — per-CLO) |
| outcome_attainment | 1113 | ✅ Active |
| student_learning_states | 41 | ✅ Active (41 students) |
| agent_runs | 2400 | ✅ Active |
| agent_tool_attempts | 11088 | ✅ Active |
| proactive_agent_jobs | 845 | ✅ Active |
| xp_transactions | 2510 | ✅ Active |
| habit_tracking | 1737 | ✅ Active |
| attendance_records | 4830 | ✅ Active |
| parent_student_links | 21 | ✅ Active |
| notifications | 1666 | ✅ Active |
| badges | 16 | ✅ Active |
| learning_interventions | 3 | ✅ Limited data |
| intervention_measurements | 0 | ❌ Missing |
| agent_conversations | 0 | ❌ AI not used |
| agent_messages | 0 | ❌ AI not used |
| grade_scales | 9 | ✅ Active — institution-specific |
| criterion_boundaries | 7 | ✅ Active |
| grade_boundaries | 10 | ✅ Active |
| institution_framework_assignments | 2 | ✅ Active |
| assessment_blueprints | 0 | ❌ Not used |
| baseline_attainment | 0 | ❌ Not used |
| learning_path_nodes | 0 | ❌ Not used |
| learning_state_events | 0 | ❌ Not used |

## REVISED VERDICTS ON PREVIOUS PHASE FINDINGS

| Phase 15 Finding | Previous Status | Live Status | Correction |
|-----------------|----------------|-------------|------------|
| "Assessment model metadata-only" | CONTRACT ONLY | **FIXED** — All 4 courses use criterion | Phase 15 was WRONG |
| "Grade scales not consumed" | PARTIAL | **FUNCTIONAL** — 9 scales, institution-specific with model field | Phase 15 understated |
| "1/6 institutions operational" | PARTIAL | **6/7 Qatar K-12 have configs**, 1 operational with live data | Phase 15 understated |
| "5 shell institutions" | SHELL | **6 institutions have configuration**, data concentrated in Noor | Phase 15 over-pessimistic |
| "BJ Fogg not implemented" | NOT IMPLEMENTED | **Engine built (Phase 17)**, not yet live in DB | Correct — still not live |
| "AI not activated" | GATED | **0 agent conversations/messages** — still not used | Correct |
| "E2E navigation-only" | NAVIGATION | **Unchanged** — requires browser testing | Correct |

## OVERALL STATUS: SIGNIFICANTLY BETTER THAN PREVIOUS AUDITS STATED

The platform has:
- 7 institutions (not 1 or 4)
- 4 courses with correct assessment_model = 'criterion'
- 9 institution-specific grade scales with model classification
- 550 real grades → 1650 evidence rows → 1113 attainment rows
- 2400 real agent runs
- 41 students with learning states
- 21 parent links
- Framework assignments, criterion boundaries, grade boundaries operational

Missing:
- AI activation (0 conversations/messages)
- Intervention measurement (0 rows)
- Habit signals in DB (JSON blob still, Phase 17 model not deployed)
- assessmentStrategyEngine.ts NOT wired to DB trigger (engine built, not integrated)