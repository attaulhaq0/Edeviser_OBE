# Live-data integrity audit — Noor golden graph

Audit date: 2026-08-02  
Project: `cdlgtbvxlxjpcddjazzx`  
Scope: production source and checked-in Supabase contracts. Remote MCP read-only verification is now complete; authenticated account impersonation and mutations remain pending.

Remote verification: Supabase project status is `ACTIVE_HEALTHY` on Postgres 17.6.1. Noor International School has exactly 68 profiles (40 students, 20 parents, 4 teachers, 3 coordinators, 1 admin), 4 courses, 160 active enrollments, 17 assignments, 552 submissions, 550 grades, 277 activity events, and 11 active marketplace items. Aarav has XP 2059, level 11, streak 4, four active courses, and weakest outcome “Evaluate arguments and solutions in English” at 78.83% (`evaluating`). David has one active course, four sections, and 40 students. Noor PLO attainment values are 74.5, 75.2, 74.1, and 76.1. The remote migration ledger contains 365 entries and matches the 365 checked-in migration files through `20260823000022_final_analytics_and_rls_corrections.sql`.

## Route-to-contract map

| Role / route                                  | Current component                                                   | Prototype reference                                                              | Primary data contract                                   | Integrity status                                                              |
| --------------------------------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Student `/student`                            | `StudentDashboard`                                                  | `prototype/dashboard.html`                                                       | `get_student_dashboard`, `useStudentDashboardAggregate` | mixed; remote Noor verification pending                                       |
| Student Learn / Courses                       | `StudentCoursesNew`                                                 | `prototype/learn.html`                                                           | `useStudentCourses`, `useStudentAssignments`            | corrected: no sample task/course fallback                                     |
| Student Progress                              | `StudentProgressNew`                                                | `prototype/progress.html`                                                        | `useStudentProgress`, `useStudentAcademicSummary`       | corrected: no synthetic outcomes, deadlines, rank, or trend                   |
| Student Today                                 | `TodayViewPage`                                                     | `prototype/focus.html`                                                           | planner, study sessions, canonical habits               | remote mutation verification pending                                          |
| Student Leaderboard / Team                    | `LeaderboardPage`, `StudentTeamPage`                                | `prototype/leaderboard.html`, `prototype/team.html`                              | leaderboard/team hooks                                  | remote Noor seed verification pending                                         |
| Student Marketplace                           | `MarketplacePage`                                                   | `prototype/marketplace.html`                                                     | `process_marketplace_purchase`                          | RPC exists; authenticated mutation verification pending                       |
| Parent dashboard / progress / support         | `ParentDashboard`, `ParentProgressPage`, `ParentSupportPage`        | `prototype/parent-dashboard.html`, `parent-progress.html`, `parent-support.html` | parent dashboard RPC and parent hooks                   | remote relationship and mutation verification pending                         |
| Teacher Dashboard                             | `TeacherDashboard`                                                  | `prototype/teacher-dashboard.html`                                               | `get_teacher_dashboard`, `useTeacherKPIs`               | null activity no longer becomes Inactive; RPC parity pending                  |
| Teacher Students / Handoffs                   | `TeacherStudentsPage`, `TeacherHandoffPage`                         | `prototype/teacher-students.html`, `teacher-handoffs.html`                       | teacher dashboard, handoff hooks                        | remote live-value verification pending                                        |
| Teacher Gradebook / Attendance                | `GradebookView`, `AttendanceReport`                                 | `prototype/teacher-gradebook.html`, `teacher-attendance.html`                    | gradebook and attendance hooks                          | propagation test pending                                                      |
| Coordinator Dashboard                         | `CoordinatorDashboardScreen`                                        | `prototype/coordinator-dashboard.html`                                           | `get_coordinator_dashboard`                             | RPC exists; James Noor values pending                                         |
| Coordinator Outcomes / Matrix                 | `PLOListPage`, `CurriculumMatrixPage`                               | `prototype/coordinator-outcomes.html`, `coordinator-curriculum.html`             | outcome/mapping hooks                                   | mapping-direction and coverage verification pending                           |
| Coordinator CQI / Accreditation / Team Health | `CQIManager`, `CoordinatorAccreditationNew`, `TeamHealthReportPage` | corresponding coordinator prototype files                                        | CQI, accreditation, team-health hooks                   | lifecycle and readiness verification pending                                  |
| Admin Analytics                               | `AdminAnalyticsPage`                                                | `prototype/admin-analytics.html`                                                 | `get_admin_analytics`, `useAdminAnalytics`              | corrected fallback path: activity-log driven, no fabricated ratios/PLO scores |
| Admin Structure / Fees / Reports / Security   | respective admin pages                                              | corresponding `prototype/admin-*.html` files                                     | admin hooks/RPCs                                        | remote field/RLS verification pending                                         |

## Production hard-coded content removed in this pass

- Student Courses: `Database Assignment 3`, `Web Dev Quiz`, `AI Research Essay`, `SE Project Milestone`, `DB Assignment 2`, `Web Dev Lab 4`, `AI Quiz 1`, synthetic course cards, synthetic grade rows, and fixed due-time copy.
- Student Progress: `Database Normalization (CLO3)`, `REST APIs (CLO5)`, synthetic four-course list, synthetic mastery/evidence values, fixed rank/percentile/trend values.
- Student assignment data now includes released grade rows (`score_percent`, `graded_at`) and the Recently Graded section is derived from those rows.
- Admin Analytics direct-query fallback no longer derives active learners from enrolments, fabricates weekly ratios, fabricates retention percentages, assigns a fixed department mastery value, or invents PLO attainment when evidence is absent.
- Teacher risk queries no longer classify a null `last_seen_at` as inactive.
- Student Today now surfaces `habit_logs` query errors instead of silently converting a backend failure into an empty/zero habit state.

Test-only fixtures and Supabase Edge Function randomness were not removed; those are not production sample content for these screens.

## Canonical backend contracts found in the repository

- `get_student_dashboard(uuid)`
- `get_teacher_dashboard(uuid)`
- `get_coordinator_dashboard()`
- `get_admin_dashboard()`
- `get_admin_analytics(date, date)`
- `get_coordinator_accreditation_readiness()`
- `process_marketplace_purchase(uuid, uuid, uuid)`

The repository contains multiple historical migrations that redefine some RPCs. A remote migration-head check and `pg_get_functiondef` comparison are required before declaring the contract canonical.

The deployed analytics and coordinator workspace replacements were applied through Supabase MCP and verified with SQL. They are not new local migration files because this repository explicitly treats `supabase/migrations/` as managed by Supabase MCP.

Storage verification found nine buckets: eight private buckets and the public `avatars` bucket. Only six objects currently exist across four buckets (`avatars`, `course-materials`, `reports`, and `submissions`). The security advisor still reports the pre-existing `communication_thread_participants` RLS-no-policy finding. A broad institution-wide `ALL` policy was not applied because it would grant every signed-in user read/write/delete access to all participant rows; a narrower participant-membership policy requires an explicit communications authorization decision.

## Required remote completion evidence

The following items remain intentionally unclaimed because they require the connected Supabase project and authenticated browser accounts:

- Authenticated proof that no profile/institution creation occurred during workflow seeding.
- Authenticated live values for the verified Parent of Aarav and Admin.
- RLS denial across institutions, storage checks, and mutation-failure paths.
- Real workflow seed records for habits, sessions, weekly XP, teams, marketplace purchase, parent communications/payments, tutor conversations, CQI, material indexing, and question analytics.
- Five-role Quick Login screenshots, Playwright report, propagation checks, refresh persistence, cache clearing, and seed rerun diff.

## Local verification

- `npx tsc --noEmit` — passed.
- `npm run lint` — passed with zero warnings.
- `npm test` — 6,095 of 6,096 tests passed; the remaining failure is `plannerConsolidation.test.tsx` expecting a suggested-session element. The suite also emitted external-network `EACCES` errors from tests that attempt live connections.
- Remote Supabase MCP read-only verification — passed. Authenticated RPC execution and browser Quick Login flows remain pending because SQL execution does not impersonate the five app accounts.

This report is an audit artifact, not a deployment-readiness claim.
