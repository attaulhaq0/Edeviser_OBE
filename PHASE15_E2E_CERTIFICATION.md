# PHASE15 — E2E CERTIFICATION
**Date:** 2026-09-12

## 1. E2E TEST INVENTORY

### Legacy Suite (`e2e/` — 10 files)
| File | Type | Classification |
|------|------|---------------|
| `login.spec.ts` | Smoke | URL/navigation |
| `full-smoke.spec.ts` | Smoke | Cross-role smoke |
| `pre-deploy.spec.ts` | Smoke | Pre-deployment check |
| `xp-level-badge.spec.ts` | UI | Gamification |
| `assignment-pipeline.spec.ts` | Integration | Partial DB (submission flow) |
| `enrollment.spec.ts` | Integration | Student enrollment |
| `intelligence-chain.spec.ts` | Smoke | Agent UI |
| `intelligence-chain-obe.spec.ts` | Smoke | OBE UI |
| `responsive-screenshots.spec.ts` | Visual | Screenshots |
| `continuous-verification-chains.spec.ts` | Smoke | Verification |

### Audit Suite (`tests/e2e/` — 32 files)
| Role | Files | Type |
|------|-------|------|
| Admin | 4 (a11y, audit-log, critical-path, ilo-crud) | Mixed: UI + accessibility |
| Coordinator | 4 (a11y, cqi, critical-path, curriculum-matrix, plo-mapping) | Mixed: UI + integration |
| Teacher | 4 (a11y, assignment-create, clo-bloom, critical-path, grade-release) | Mixed: UI + integration |
| Student | 5 (a11y, critical-path, leaderboard-opt-out, learning-path, submit-assignment, xp-and-streak) | Mixed: UI |
| Parent | 4 (a11y, critical-path, linked-child, unlinked-denied) | Mixed: UI |
| Cross-role | 5 (admin-bonus-xp, coordinator-to-teacher, phase12-closed-loop, student-to-parent, teacher-to-student) | Integration |
| RTL | 1 (layout) | UI |
| Perf | 1 (tti) | Performance |

## 2. CLASSIFICATION AUDIT

| Classification | Count | Examples |
|---------------|-------|----------|
| **Smoke** (URL loads) | 15 | Most `critical-path.spec.ts` files verify navigation |
| **UI** (element visibility) | 20 | A11y specs check buttons, labels, headings |
| **Integration** (cross-page flow) | 8 | phase12-closed-loop, teacher-to-student, cross-role specs |
| **DB-backed** (verifies DB state) | 2 | assignment-pipeline.spec.ts, enrollment.spec.ts |
| **True customer journey** (end-to-end workflow) | 0 | No spec verifies teacher→assessment→evidence→attainment→report chain |

## 3. MISSING E2E TESTS (Phase 15 requirements)

| Test | Status | Priority |
|------|--------|----------|
| Qatar percent assessment → evidence → attainment | NOT EXISTS | P0 |
| IB MYP criterion assessment → evidence → attainment | NOT EXISTS | P0 |
| IGCSE band/component → evidence → attainment | NOT EXISTS | P0 |
| Intervention full cycle (proposal→execute→measure→evaluate) | NOT EXISTS | P0 |
| Frontend mutation→UI reflection (grade→UI update) | NOT EXISTS | P0 |
| AI tutor session (requires AI_ENABLED) | NOT EXISTS | P1 |
| Agent recommendation → human approval → execution | NOT EXISTS | P1 |
| Parent full workflow (login→child→progress→settings) | PARTIAL (smoke only) | P1 |
| RLS cross-tenant isolation | NOT EXISTS | P1 |

## 4. QUALITY ASSESSMENT

| Metric | Score |
|--------|-------|
| Test count | 42 spec files (reasonable) |
| Framework coverage | All 5 roles + cross-role + RTL + perf |
| **True E2E coverage** | **5%** (only 2 of 42 verify DB state) |
| Navigation-only tests | **70%** (29 of 42 are URL/navigation assertions) |
| Accessibility testing | ✅ Strong (6 a11y specs across roles) |
| Performance testing | ✅ 1 spec (tti) |
| DB-verified workflow | ❌ Nearly absent |

## 5. VERDICT

**E2E SUITE: NAVIGATION-STRONG, DATA-WEAK**

The suite has good breadth (42 specs, all 5 roles, cross-role, RTL, perf) but 70% are URL/navigation tests that don't verify data correctness. Only 2 of 42 verify database state. No spec proves that assessment→evidence→attainment works end-to-end. This is the biggest quality gap preventing "VERIFIED" certification.