# FRONTEND DEFECT REGISTER — Phase 19
**Date:** 2026-09-12 | **Method:** Code-level audit
`[LIVE]` = requires browser to verify | `[CODE]` = confirmed from code patterns

## P0 — BROKEN WORKFLOWS

| ID | Role | Route | Defect | Root Cause | Fix |
|----|------|-------|--------|------------|-----|
| T1 | Teacher | `/teacher/gradebook` | Final grade frontend-only — no DB canonical [CODE] | `gradebookCalc.ts` computes client-side; two frontend versions could disagree | Add DB RPC `compute_final_weighted_grade_v1` |
| T2 | Teacher | `/teacher/grading/:id` | Grade → attainment UI never refreshes [CODE] | `useCreateGrade.onSuccess` invalidates `queryKeys.grades.*` but not `queryKeys.outcomeAttainment` | Add attainment invalidation in onSuccess |
| T3 | Teacher | `/teacher/grading/:id` | Grade XP badge check may not fire from client [LIVE] | Trigger owns XP insert; badge check needs client call | Verify `check-badges` fires; add if missing |
| S1 | Student | `/student/assignments/:id` | Submission → habit write fails silently [CODE] | `useCreateSubmission` catches habit error with only `console.error` | Surface as toast warning |
| C1 | Coordinator | `/coordinator/unit-close` | Proposal → approval → UI not connected [LIVE] | `useCreateInterventionProposal` invalidates proposals but inbox may not refetch | Verify inbox query key coverage |
| A1 | Admin | `/admin/settings` | Changing assessment_model doesn't change runtime [CODE] | `assessmentStrategyEngine.ts` built (Phase 16) but not wired to settings save | Wire strategy resolution on save |
| X1 | All | All grading | Assessment strategy metadata-only [CODE] | Strategy engine built but DB trigger + grading UI not integrated | Wire Phase 16 engine |
| X2 | All | All attainment | Grade scales not consumed [CODE] | `grade_scales.definition` exists but classification uses hardcoded 85/70/50 | Wire `canonicalPolicyResolver.ts` |
| X3 | All | Gradebook + attainment | Frontend-only calculations [CODE] | `gradebookCalc.ts`, `attainmentClassifier.ts`, `letterGradeMapper.ts` all client-side | Create DB RPCs as canonical sources |
## P1 — DEGRADED

| ID | Role | Route | Defect | Fix |
|----|------|-------|--------|-----|
| T4 | Teacher | `/teacher/grading/queue` | No empty state for zero submissions [CODE] | Add `<NoSubmissions />` |
| T5 | Teacher | `/teacher/gradebook` | Hardcoded color thresholds duplicate attainmentClassifier [CODE] | Reuse `getAttainmentColor()` |
| T6 | Teacher | `/teacher/clos` | CLO attainment may use 30s staleTime [LIVE] | Reduce after grading |
| S2 | Student | `/student/dashboard` | AI Tutor button may render when AI is disabled [LIVE] | Gate behind `isCapabilityEnabled` |
| S3 | Student | `/student/progress` | CLO progress may show stale data [LIVE] | Add refetch trigger after submission |
| S4 | Student | `/student/habits` | Heatmap may read from duplicate tables [LIVE] | Confirm single-source read |
| S5 | Student | `/student/tutor` | Persona selector visible before AI gate [CODE] | Gate behind `isCapabilityEnabled` |
| C2 | Coordinator | `/coordinator/gap-analysis` | Uses frontend gapAnalysis.ts (duplicate of DB RPC) [CODE] | Use DB RPC as primary |
| C3 | Coordinator | `/coordinator/cqi` | AI section may show dead message [LIVE] | Add "AI Disabled" guidance |
| C4 | Coordinator | `/coordinator/curriculum-matrix` | Duplicate pages [CODE] | Consolidate to one |
| A2 | Admin | `/admin/governance` | No cost tracking data in dashboard [LIVE] | Wire `getSessionCostSummary()` |
| A3 | Admin | `/admin/users` | Bulk import errors not user-friendly [CODE] | Map Supabase errors |
| PA1 | Parent | `/parent/dashboard` | Child selector may show stale list [LIVE] | Reduce staleTime |
| PA2 | Parent | `/parent/progress` | Wrong data if no child selected [CODE] | Add "Select child" guard |
| X4 | All | All AI | `isAiSurfaceEnabled()` still global [CODE] | Replace with `isCapabilityEnabled()` |
| X5 | All | Dashboards | 30s staleTime hides fresh mutations [LIVE] | Reduce or force refetch |
| X6 | All | Lists | Unbounded queries on useUsers/useCourses [CODE] | Add pagination |

## P2 — UX QUALITY

| ID | Role | Route | Defect | Fix |
|----|------|-------|--------|-----|
| P2-1 | Teacher | ModuleManager | Reorder no confirmation toast [LIVE] | Add toast |
| P2-2 | Student | FocusMode | Timer may not persist across navigation [LIVE] | Use localStorage |
| P2-3 | Student | Marketplace | No loading state during purchase [CODE] | Show `isPending` spinner |
| P2-4 | Coordinator | PLOs | Empty Sankey shows blank not "No data" [CODE] | Add empty state |
| P2-5 | Admin | ILOList | Reorder no save confirmation [LIVE] | Add toast |
| P2-6 | Admin | Badges | Image upload fails silently [CODE] | Toast on failure |
| P2-7 | Parent | Support | Empty saved actions list no guidance [CODE] | Add empty state |
| P2-8 | All | Mutations | `isPending` not always rendered [CODE] | Audit all consumers |
| P2-9 | All | Any | Error boundaries show generic fallback [CODE] | Enhance with typed errors |
| P2-10 | All | Any | No offline indicator [CODE] | Show OfflineBanner |
| P2-11 | Coordinator | Cohort comparison | Filter may retain stale param [LIVE] | Verify refetch |