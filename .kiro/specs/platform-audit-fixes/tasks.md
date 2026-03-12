# Implementation Plan

- [ ] 1. Write bug condition exploration test
  - **Property 1: Fault Condition** — Platform Audit Defects (17 Bugs)
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bugs exist
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior — it will validate the fixes when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate each bug category exists
  - **Scoped PBT Approach**: Each sub-property targets a specific defect category with concrete failing cases
  - Test file: `src/__tests__/properties/platformAuditFaults.property.test.ts`
  - Test XP schedule: generate random source from `['submission', 'grade', 'streak_milestone', 'first_attempt_bonus']`, assert `XP_SCHEDULE[source]` matches domain spec (submission=25, grade=15, streak_milestone=50, first_attempt_bonus=10) — will FAIL (currently submission=50, grade=25, streak_milestone=100, first_attempt_bonus=25)
  - Test query keys: import dashboard hooks, verify each uses `queryKeys` factory not ad-hoc string arrays — will FAIL (uses `['admin', 'kpis']` etc.)
  - Test column names: verify `useStudentDashboard` reads `streak_count` not `current_streak`, `level` not `current_level`, `attainment_percent` not `score_percent` — will FAIL
  - Test filter sanitization: generate strings with PostgREST special chars (`.`, `,`, `(`, `)`, `%`, `*`), assert `sanitizePostgrestValue` escapes them — will FAIL (function doesn't exist yet)
  - Test audit logging: mock `logAuditEvent`, call useCreateCLO/useCreateAssignment/useCreateRubric/useEnrollStudent/useCreateGrade/useCreateSubmission mutations, verify `logAuditEvent` called — will FAIL (no audit logging)
  - Test course name: verify `useUpcomingDeadlines` query joins to `courses` table — will FAIL (uses truncated UUID)
  - Test edge function permissions: verify `award-xp` rejects non-service-role callers awarding XP to other students — will FAIL (no permission check)
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests FAIL (this is correct — it proves the bugs exist)
  - Document counterexamples found to understand root causes
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.8, 2.11, 2.12, 2.13, 2.16_

- [ ] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** — Existing Behavior Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Test file: `src/__tests__/properties/platformAuditPreservation.property.test.ts`
  - Observe: hooks already using `queryKeys` factory (useUsers, useCourses, usePrograms, useILOs, usePLOs) produce specific key structures — generate random filter objects and IDs, verify key format `['entity', 'list', filters]` and `['entity', 'detail', id]` for all entity types
  - Observe: useCreateUser, useCreateProgram, useCreateCourse call `logAuditEvent` with `{ action, entity_type, entity_id, changes }` — mock and verify existing hooks continue correct format
  - Observe: `XP_SCHEDULE.login = 10`, `XP_SCHEDULE.journal = 20`, `XP_SCHEDULE.perfect_day = 50`, `XP_SCHEDULE.perfect_rubric = 75` — generate random source from unaffected list, assert values match
  - Observe: Sonner Toaster configured with `position="top-right"` and `richColors`, App.tsx wraps with AuthProvider, QueryClientProvider, NuqsAdapter — verify provider structure
  - Verify tests pass on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.2, 3.3, 3.7, 3.9, 3.10_

- [ ] 3. Fix platform audit defects

  - [ ] 3.1 Regenerate `src/types/database.ts` with full schema types
    - Run `npx supabase gen types --linked > src/types/database.ts` to include all tables
    - Verify generated file includes types for all tables used by hooks (student_gamification, outcome_attainment, audit_logs, etc.)
    - _Bug_Condition: hook queries table other than 'institutions' AND uses `as unknown as { from: ... }` cast_
    - _Expected_Behavior: all column names, return types, and filter types checked at compile time_
    - _Preservation: institutions table queries continue with full type inference (Req 3.1)_
    - _Requirements: 2.1, 3.1_

  - [ ] 3.2 Remove `any` casts from all hook files
    - Remove `const db = supabase as unknown as { from: (table: string) => any }` from 25+ hook files
    - Use `import { supabase } from '@/lib/supabase'` directly (already typed with `Database` generic)
    - Remove manual type assertions `(data as Array<{ ... }>)` and associated eslint-disable comments
    - Files: useAdminDashboard, useStudentDashboard, useTeacherDashboard, useCoordinatorDashboard, useParentDashboard, useCLOs, useAssignments, useRubrics, useEnrollments, useSubmissions, useAuditLogs, and all other hooks with the cast pattern
    - _Bug_Condition: hook uses `as unknown as { from: (table: string) => any }` cast_
    - _Expected_Behavior: zero `any` casts, full compile-time type checking_
    - _Preservation: existing query logic unchanged, only type annotations removed_
    - _Requirements: 2.1_

  - [ ] 3.3 Add missing dashboard keys to `queryKeys` factory and migrate dashboard hooks
    - Add `adminDashboard`, `coordinatorDashboard`, `studentDashboard`, `parentDashboard` to `src/lib/queryKeys.ts`
    - `useAdminDashboard.ts`: Replace `['admin', 'kpis']` → `queryKeys.adminDashboard.list({})`, `['admin', 'recentAuditLogs', limit]` → `queryKeys.auditLogs.list({ limit })`
    - `useTeacherDashboard.ts`: Replace ad-hoc keys → `queryKeys.teacherDashboard.list({})`
    - `useStudentDashboard.ts`: Replace `['student', 'kpis', studentId]` → `queryKeys.studentGamification.detail(studentId)`
    - `useCoordinatorDashboard.ts`: Replace ad-hoc keys → `queryKeys.coordinatorDashboard.list({})`
    - `useParentDashboard.ts`: Replace ad-hoc keys → `queryKeys.parentStudentLinks.list/detail`
    - _Bug_Condition: dashboard hook uses ad-hoc string array query key_
    - _Expected_Behavior: all dashboard hooks use queryKeys factory for correct cache invalidation_
    - _Preservation: hooks already using queryKeys factory unchanged (Req 3.2)_
    - _Requirements: 2.2, 3.2_

  - [ ] 3.4 Fix column name mismatches in student and parent dashboards
    - `useStudentDashboard.ts`: Fix `current_streak` → `streak_count`, `current_level` → `level` in gamification query
    - `useStudentDashboard.ts`: Fix `score_percent` → `attainment_percent` and `scope: 'CLO'` → correct scope in attainment query
    - `useParentDashboard.ts`: Fix `current_streak` → `streak_count`, `current_level` → `level` in gamification reads
    - _Bug_Condition: hook reads wrong column names
    - _Expected_Behavior: reads streak_count, level, attainment_percent with correct scope_
    - _Preservation: edge function write paths unchanged (Req 3.4, 3.8)_
    - _Requirements: 2.3, 2.4_

  - [ ] 3.5 Correct XP schedule constants
    - `src/lib/xpSchedule.ts`: Change `submission: 50` → `25`, `grade: 25` → `15`, `streak_milestone: 100` → `50`, `first_attempt_bonus: 25` → `10`
    - _Bug_Condition: XP_SCHEDULE values don't match domain specification_
    - _Expected_Behavior: submission=25, grade=15, streak_milestone=50, first_attempt_bonus=10_
    - _Preservation: unaffected sources unchanged — login=10, journal=20, perfect_day=50, perfect_rubric=75 (Req 3.9)_
    - _Requirements: 2.13, 3.9_

  - [ ] 3.6 Fix course name display in upcoming deadlines
    - `useStudentDashboard.ts`: Join `assignments` to `courses` table via `.select('id, title, course_id, due_date, courses(name)')`
    - Remove `Course ${a.course_id.slice(0, 8)}` fallback, use `a.courses.name` instead
    - _Bug_Condition: useUpcomingDeadlines displays truncated UUID as course name_
    - _Expected_Behavior: displays actual course name from joined courses table_
    - _Requirements: 2.16_

  - [ ] 3.7 Batch parent dashboard queries
    - `useParentDashboard.ts`: Replace per-child loop with batch queries using `.in('student_id', studentIds)` for gamification and enrollment data
    - Collect all child student IDs first, then make 2 batch queries instead of 2N sequential queries
    - _Bug_Condition: useLinkedChildren makes 2 queries per child in a loop_
    - _Expected_Behavior: at most 2 batch queries regardless of child count_
    - _Requirements: 2.5_

  - [ ] 3.8 Batch reorder operations
    - `useCLOs.ts`: Replace sequential `for` loop in useReorderCLOs with single batch upsert
    - `usePLOs.ts`: Replace sequential loop in useReorderPLOs with batch upsert
    - `useILOs.ts`: Replace sequential loop in useReorderILOs with batch upsert
    - _Bug_Condition: reorder hooks update sort_order one row at a time_
    - _Expected_Behavior: single database call for all sort_order updates_
    - _Requirements: 2.6_

  - [ ] 3.9 Add pagination to list hooks
    - Add `page` and `pageSize` parameters (default pageSize=25) to list hooks
    - Apply `.range(from, to)` and `.select('*', { count: 'exact' })` for total count
    - Return `{ data, count, page, pageSize }` instead of raw array
    - Files: useUsers, useCourses, useAssignments, useSubmissions, useAuditLogs, usePrograms, usePLOs, useCLOs, useILOs, useEnrollments, useRubrics
    - Update DataTable component to support pagination controls
    - _Bug_Condition: list hooks fetch all rows unbounded_
    - _Expected_Behavior: paginated results with configurable page size_
    - _Requirements: 2.7_

  - [ ] 3.10 Add audit logging to uncovered mutation hooks
    - `useCLOs.ts`: Add `logAuditEvent` to useCreateCLO, useUpdateCLO, useDeleteCLO with `entity_type: 'clo'`
    - `useAssignments.ts`: Add to useCreateAssignment, useUpdateAssignment, useDeleteAssignment with `entity_type: 'assignment'`
    - `useRubrics.ts`: Add to useCreateRubric, useUpdateRubric, useDeleteRubric with `entity_type: 'rubric'`
    - `useEnrollments.ts`: Add to useEnrollStudent, useUnenrollStudent with `entity_type: 'enrollment'`
    - `useSubmissions.ts`: Add to useCreateGrade (`entity_type: 'grade'`), useCreateSubmission (`entity_type: 'submission'`)
    - Follow existing pattern: `logAuditEvent({ action, entity_type, entity_id: result.id, changes: data, performed_by: userId })`
    - _Bug_Condition: admin mutations in CLO/assignment/rubric/enrollment/grade/submission hooks don't log_
    - _Expected_Behavior: all mutations call logAuditEvent with correct action, entity_type, entity_id, changes_
    - _Preservation: existing audit logging in useUsers, usePrograms, useCourses, usePLOs, useILOs unchanged (Req 3.3)_
    - _Requirements: 2.8, 3.3_

  - [ ] 3.11 Create ErrorBoundary component
    - Create `src/components/shared/ErrorBoundary.tsx`
    - React class component with `componentDidCatch` and `getDerivedStateFromError`
    - Fallback UI: Card with gradient header, error message, and retry button
    - Style consistent with design system (Card with `shadow-md rounded-xl overflow-hidden`)
    - _Bug_Condition: React component throws unhandled error AND no ErrorBoundary exists_
    - _Expected_Behavior: graceful fallback UI with retry option instead of white screen crash_
    - _Requirements: 2.9_

  - [ ] 3.12 Initialize Sentry and wrap app
    - Create `src/lib/sentry.ts`: Initialize Sentry with DSN from `VITE_SENTRY_DSN`, configure breadcrumbs, performance monitoring
    - `src/App.tsx`: Import and call `initSentry()`, wrap with `<Sentry.ErrorBoundary>` (outer) and custom `<ErrorBoundary>` (inner)
    - _Bug_Condition: @sentry/react dependency exists but Sentry.init() never called_
    - _Expected_Behavior: Sentry initialized on app start, errors captured, breadcrumbs tracked_
    - _Preservation: existing providers continue functioning (Req 3.10)_
    - _Requirements: 2.14, 3.10_

  - [ ] 3.13 Create shared realtime subscription manager
    - Create `src/hooks/useRealtime.ts`: channel deduplication, exponential backoff (1s→2s→4s→8s→max 30s), polling fallback (30s), "Live updates paused" state, cleanup on unmount
    - `LeaderboardPage.tsx`: Replace direct `supabase.channel()` with `useRealtime` hook
    - _Bug_Condition: useLeaderboardRealtime creates per-component subscription with no reconnection/fallback_
    - _Expected_Behavior: centralized subscription with reconnection, backoff, polling fallback, cleanup_
    - _Preservation: leaderboard continues to respect anonymous opt-out, correct XP/levels (Req 3.6)_
    - _Requirements: 2.10, 3.6_

  - [ ] 3.14 Replace full-page spinner with shimmer loading
    - `src/router/AppRouter.tsx`: Replace `LoadingFallback` full-page spinner with component-level shimmer using `animate-shimmer`
    - Shimmer layout: page title placeholder (h-8 w-48), KPI grid (4 cards h-24), content area (h-64)
    - _Bug_Condition: LoadingFallback uses min-h-screen full-page spinner_
    - _Expected_Behavior: component-level shimmer placeholder consistent with design system_
    - _Requirements: 2.15_

  - [ ] 3.15 Add permission validation to award-xp edge function
    - `supabase/functions/award-xp/index.ts`: Extract JWT, verify caller is service_role or student themselves (student_id matches auth.uid()) for self-triggered sources
    - Reject with 403 Forbidden if neither condition met
    - _Bug_Condition: award-xp accepts requests from any authenticated user without permission check_
    - _Expected_Behavior: only service_role or self-triggered requests accepted, others rejected 403_
    - _Preservation: valid authorized requests continue to work (Req 3.5)_
    - _Requirements: 2.11, 3.5_

  - [ ] 3.16 Create PostgREST filter sanitization utility and apply to hooks
    - Create `src/lib/sanitizeFilter.ts`: `sanitizePostgrestValue(input)` escapes `.`, `,`, `(`, `)`, `%`, `*`, `\`
    - Apply to user search strings in `.or()` filters in: useUsers, usePrograms, useCourses, useAuditLogs
    - _Bug_Condition: user search strings interpolated directly into .or() filter expressions_
    - _Expected_Behavior: all special PostgREST characters escaped before interpolation_
    - _Requirements: 2.12_

  - [ ] 3.17 Implement server-side login rate limiting
    - Create migration `supabase/migrations/XXXXXX_create_login_attempts_table.sql`: table with `email`, `attempt_count`, `locked_until`, `updated_at`, RLS for service_role only
    - Create `supabase/functions/check-login-rate/index.ts`: Edge function to check/increment attempts, return lock status
    - `src/lib/loginAttemptTracker.ts`: Keep client-side tracking as UX layer, add server-side check before `signInWithPassword()`
    - _Bug_Condition: rate limiting stored in localStorage only, trivially bypassed_
    - _Expected_Behavior: server-side enforcement that persists across browsers/devices_
    - _Requirements: 2.17_

  - [ ] 3.18 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** — Platform Audit Defects Fixed
    - **IMPORTANT**: Re-run the SAME test from task 1 — do NOT write a new test
    - The test from task 1 encodes the expected behavior for all 17 defects
    - When this test passes, it confirms the expected behavior is satisfied
    - Run `src/__tests__/properties/platformAuditFaults.property.test.ts`
    - **EXPECTED OUTCOME**: Test PASSES (confirms all bugs are fixed)
    - _Requirements: 2.1–2.17_

  - [ ] 3.19 Verify preservation tests still pass
    - **Property 2: Preservation** — Existing Behavior Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run `src/__tests__/properties/platformAuditPreservation.property.test.ts`
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all preservation tests still pass after fixes (no regressions)

- [ ] 4. Checkpoint — Ensure all tests pass
  - Run full test suite: `npm test`
  - Ensure all property-based tests pass (fault condition + preservation)
  - Ensure all existing unit tests pass (no regressions)
  - Ensure TypeScript compilation succeeds with zero `any` casts in hooks
  - Ask the user if questions arise