# PHASE15 — FRONTEND TRUTH CERTIFICATION
**Date:** 2026-09-12 | **Verdict: CODE-LEVEL ONLY (no live audit)**

## 1. METHODOLOGY

Live frontend audit (Section 22-23) requires:
- Running Edeviser application
- Authenticating as each role
- Performing mutations and verifying UI updates
- Checking React Query cache invalidation

This certification is based on CODE ANALYSIS only — inspecting hooks, components, and mutation patterns for correctness.

## 2. MUTATION-TO-UI AUDIT (CODE-LEVEL)

| Mutation | Hook Pattern | Cache Invalidation | Risk |
|----------|-------------|-------------------|------|
| Submit assignment | useSubmitAssignment → invalidateQueries | queryKeys.assignments | LOW |
| Grade submission | useGradeSubmission → invalidateQueries | queryKeys.grades | LOW |
| Create quiz attempt | useSubmitQuizAttempt → invalidateQueries | queryKeys.quizAttempts | LOW |
| Approve agent proposal | useDecideProposal → invalidateQueries | queryKeys.proposals | LOW |
| Start intervention | useStartIntervention → invalidateQueries | queryKeys.interventions | LOW |
| Create habit log | useCreateHabitLog → invalidateQueries | queryKeys.habits | LOW |
| Update institution settings | useUpdateInstitutionSettings → invalidateQueries | queryKeys.institutionSettings | LOW |
| Award XP | award-xp EF → realtime channel | GamificationFeedbackHost | LOW |
| Record attendance | useRecordAttendance → invalidateQueries | queryKeys.attendance | LOW |
| Gradebook update | useUpdateGrade → invalidateQueries | queryKeys.gradebook | LOW |

## 3. REACT QUERY PATTERNS FOUND

| Pattern | Prevalence | Risk |
|---------|-----------|------|
| `invalidateQueries` after mutation | ~95% of mutations | ✅ Healthy |
| `optimistic update` pattern | ~20% of mutations | ✅ Good UX |
| `refetchOnWindowFocus` | Enabled (default) | ✅ Correct |
| `staleTime` configured | Varies (queryConfig.ts) | ✅ Reasonable |
| Realtime subscription | Used for XP, notifications, challenges | ✅ Good |
| Missing invalidation | None found in inspected mutations | ✅ Clean |

## 4. POTENTIAL UI STALENESS RISKS (IDENTIFIED FROM CODE)

| Risk | Severity | Detail |
|------|----------|--------|
| attainmentClassifier.ts duplicates DB | LOW | Same math, same thresholds — drift risk if DB trigger changes |
| gradebookCalc.ts is frontend-only | MEDIUM | No DB canonical; two frontend versions could disagree |
| letterGradeMapper.ts is frontend-only | LOW | Deterministic mapping, low drift risk |
| Gap analysis has parallel DB + frontend | MEDIUM | gapAnalysis.ts vs detect_systemic_attainment_gaps_v1 |
| Quiz scoring has parallel EF + frontend | LOW | auto-grade-quiz EF is authoritative |
| useOptimisticToggle pattern | LOW | Optimistic updates have rollback |

## 5. PHASE15_FRONTEND_DEFECT_REGISTER

### P0 — Critical (blocking)
| # | Defect | Location | Evidence |
|---|--------|----------|----------|
| P0-1 | Evidence trigger not consuming assessment_model | DB trigger | trigger always uses percent |
| P0-2 | Grade scales not consumed by attainment | DB trigger | hardcoded 85/70/50 |
| P0-3 | No AI surfaces visible without feature flag | App.tsx, TutorPage.tsx | VITE_AI_FEATURE_ENABLED gates everything |

### P1 — High (customer-visible)
| # | Defect | Location | Evidence |
|---|--------|----------|----------|
| P1-1 | Gradebook final grade has no DB canonical | gradebookCalc.ts | Purely frontend computation |
| P1-2 | Gap analysis has parallel implementations | gapAnalysis.ts, DB RPC | Drift risk |
| P1-3 | Learner state habits use JSON blob | student_learning_states.habits | Unstructured, not using new signal engine |
| P1-4 | 5 shell institutions show empty dashboards | Institution pages | No data = dead UI |

### P2 — Medium (UX quality)
| # | Defect | Location | Evidence |
|---|--------|----------|----------|
| P2-1 | No loading skeleton on some dashboard widgets | Multiple pages | Code review pattern |
| P2-2 | Curriculum matrix page has duplicate (New suffix) | CurriculumMatrixPage, CurriculumMatrixPageNew | Old version may exist |
| P2-3 | Assessment model field exists on courses but doesn't change behavior | courses.assessment_model | Metadata-only until Phase 15 engine wired |

## 6. VERDICT

**Frontend Truth: CODE PATTERNS HEALTHY, LIVE AUDIT PENDING**

The React Query patterns are correctly implemented — mutations invalidate caches, optimistic updates have rollbacks, and realtime subscriptions keep live data flowing. The main risks are: (1) gradebookCalc being frontend-only with no DB canonical, (2) parallel gap analysis implementations that could drift, (3) the new Phase 15 engines (assessment, habit, AI cost) are not yet wired to affect the UI. A live audit with real user workflows is required to verify that mutations reflect correctly in the UI.