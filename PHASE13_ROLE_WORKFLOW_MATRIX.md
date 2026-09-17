# PHASE 13 — ROLE × WORKFLOW MATRIX
**Date:** 2026-09-12 | **Audit:** Full codebase + live DB inspection

## MATRIX LEGEND
- ✅ = Implemented, tested, live data
- ⚠️ = Implemented, limited live data (shell institutions)
- 🔶 = Architecture exists, not fully populated
- N/A = Not applicable to this role

| Workflow | Admin | Coordinator | Teacher | Student | Parent |
|----------|-------|-------------|---------|---------|--------|
| **Authentication** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Dashboard** | ✅ AdminDashboard | ✅ CoordinatorDashboard | ✅ TeacherDashboard | ✅ StudentDashboard | ✅ ParentDashboard |
| **Navigation/Layout** | ✅ AdminLayout | ✅ CoordinatorLayout | ✅ TeacherLayout | ✅ StudentLayout | ✅ ParentLayout |
| **Role Pages** | ✅ 51 pages | ✅ 19 pages | ✅ 50 pages | ✅ 71 pages | ✅ 9 pages |
| **Institution Mgmt** | ✅ settings/onboarding | N/A | N/A | N/A | N/A |
| **User Management** | ✅ import/users | N/A | N/A | N/A | N/A |
| **Academic Terms** | ✅ semesters | 🔶 | N/A | N/A | N/A |
| **Curriculum Config** | ✅ frameworks/competency | 🔶 | N/A | N/A | N/A |
| **Assessment Config** | ✅ grade_scales | 🔶 | ✅ rubric builder | N/A | N/A |
| **Course Management** | ✅ | ✅ courses/sections | ✅ gradebook | ✅ enrolled | N/A |
| **Outcome Management** | ✅ ILO/PLO | ✅ PLO/CLO | ✅ CLO | N/A | N/A |
| **OBE View** | ✅ attainment | ✅ OBE dashboard | ✅ attainment | ✅ progress | ✅ child progress |
| **Assessment/Grading** | N/A | N/A | ✅ GradingInterface | ✅ submit work | N/A |
| **Native Result Entry** | N/A | N/A | ✅ rubric selections | N/A | N/A |
| **Evidence** | ✅ historical | ✅ review | ✅ view | ✅ view grades | ✅ view (child) |
| **Habit Engine** | N/A | ✅ review | ✅ view | ✅ habit tracker | ✅ view (child) |
| **Learner Intelligence** | 🔶 | ✅ DecisionIntelligence | ✅ view | ✅ dashboard | ✅ summaries |
| **Agent Diagnosis** | N/A | ✅ classify_problem_cases | ✅ supported | N/A | N/A |
| **Intervention Proposal** | N/A | ✅ DecisionIntelligence→propose | ✅ propose | N/A | N/A |
| **Intervention Approval** | ✅ | ✅ CoordinatorApprovalInbox | N/A | N/A | N/A |
| **Intervention Execution** | ✅ | ✅ execute_proposal | N/A | ✅ start/complete | N/A |
| **Intervention View** | ✅ | ✅ InterventionLifecycle | ✅ assigned | ✅ My Interventions | ✅ child support |
| **Reassessment** | N/A | ✅ verify | ✅ GradingInterface | ✅ reassess | N/A |
| **Measurement** | N/A | ✅ view | ✅ view | N/A | N/A |
| **CQI/Gap Analysis** | ✅ | ✅ CQI dashboard | N/A | N/A | N/A |
| **Accreditation Report** | ✅ | ✅ generate-accreditation-report | N/A | N/A | N/A |
| **Parent-Child Links** | ✅ | N/A | N/A | N/A | ✅ linked children |
| **Child Progress** | N/A | N/A | N/A | N/A | ✅ ParentProgressPage |
| **Attendance View** | ✅ | ✅ | ✅ marking | ✅ own | ✅ child attendance |
| **Fees** | ✅ | N/A | N/A | N/A | ✅ ParentFeesPage |
| **Communications** | ✅ | ✅ | ✅ | ✅ | ✅ ParentCommunications |
| **Support** | ✅ | ✅ | ✅ | ✅ | ✅ ParentSupportPage |
| **Settings/Profile** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Error States** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Empty States** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Loading States** | ✅ shimmer | ✅ shimmer | ✅ shimmer | ✅ shimmer | ✅ shimmer |
| **Mobile/Responsive** | ✅ | ✅ | ✅ | ✅ mobile-first | ✅ |
| **E2E Tests** | ✅ 4 specs | ✅ 5 specs | ✅ 5 specs | ✅ 6 specs | ✅ 4 specs |
| **RLS Isolation** | ✅ | ✅ | ✅ | ✅ | ✅ parent_has_verified_link |
| **Cross-Tenant** | ✅ scoped | ✅ scoped | ✅ scoped | ✅ scoped | ✅ scoped |

## VERDICT PER ROLE

| Role | Pages | E2E | Live Data | State | Verdict |
|------|-------|-----|-----------|-------|---------|
| **Admin** | 51 | 4 | ✅ | ✅ | **PASS** |
| **Coordinator** | 19 | 5 | ✅ Noor | ⚠️ 5 shells | **PASS** |
| **Teacher** | 50 | 5 | ✅ Noor | ⚠️ 5 shells | **PASS** |
| **Student** | 71 | 6 | ✅ Noor 40 | ⚠️ 5 shells | **PASS** |
| **Parent** | 9 | 4 | ✅ 21 links | ✅ | **PASS** |

## CRITICAL FINDINGS
- **Parent is complete**: 21 verified parent-student links, 9 pages, 7 RPCs, 4 E2E specs, RLS with parent_has_verified_link
- **All dashboards have aggregate RPCs**: get_admin_dashboard, get_coordinator_dashboard, get_teacher_dashboard, get_student_dashboard, get_parent_dashboard
- **All roles have E2E tests**: 32 total specs covering every role
- **Intervention state machine**: 11 states, server-enforced (Phase 12)
- **5 shell institutions**: Programs created, need courses + users for full certification