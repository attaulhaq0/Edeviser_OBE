# Implementation Plan

- [x] 1. Write bug condition exploration tests (BEFORE implementing fixes)
  - **Property 1: Fault Condition** — Platform Audit Defects (17 Bugs)
  - **CRITICAL**: These tests MUST FAIL on unfixed code — failure confirms the bugs exist
  - **DO NOT attempt to fix the tests or the code when they fail**
  - **NOTE**: These tests encode the expected behavior — they will validate the fixes when they pass after implementation
  - **GOAL**: Surface counterexamples that demonstrate each bug category exists
  - **Scoped PBT Approach**: Each sub-property targets a specific defect category with concrete failing cases
  - Test file: `src/__tests__/properties/platformAuditFaults.property.test.ts`
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests FAIL (this is correct — it proves the bugs exist)
  - Document counterexamples found to understand root causes
  - Mark task complete when tests are written, run, and failures are documented

  - [x] 1.1 XP Schedule fault condition test
    - **Property 1a: Fault Condition** — XP Schedule Mismatch
    - Generate random XP source types from `['submission', 'grade', 'streak_milestone', 'first_attempt_bonus']`
    - Assert `XP_SCHEDULE[source]` matches domain spec: `submission: 25`, `grade: 15`, `streak_milestone: 50`, `first_attempt_bonus: 10`
    - Will FAIL on unfixed code (currently `submission: 50`, `grade: 25`, `streak_milestone: 100`, `first_attempt_bonus: 25`)
    - _Requirements: 2.13_

  - [x] 1.2 Query key consistency fault condition test
    - **Property 1b: Fault Condition** — Ad-Hoc Query Keys
    - Import dashboard hooks (useAdminDashboard, useStudentDashboard, useTeacherDashboard, useCoordinatorDashboard, useParentDashboard)
    - Verify each hook's query key uses the `queryKeys` factory (not ad-hoc string arrays)
    - Mock TanStack Query's `useQuery` and inspect the `queryKey` argument
    - Will FAIL on unfixed code (dashboard hooks use ad-hoc keys like `['admin', 'kpis']`)
    - _Requirements: 2.2_

  - [x] 1.3 Column name fault condition test
    - **Property 1c: Fault Condition** — Column Name Mismatches
    - Verify `useStudentDashboard` reads `streak_count` (not `current_streak`) from `student_gamification`
    - Verify `useStudentDashboard` reads `level` (not `current_level`) from `student_gamification`
    - Verify `useStudentDashboard` reads `attainment_percent` (not `score_percent`) from `outcome_attainment`
    - Will FAIL on unfixed code (reads wrong column names)
    - _Requirements: 2.3, 2.4_

  - [x] 1.4 PostgREST filter sanitization fault condition test
    - **Property 1d: Fault Condition** — Filter Injection
    - Generate random strings containing PostgREST special characters (`.`, `,`, `(`, `)`, `%`, `*`)
    - Assert `sanitizePostgrestValue(input)` escapes all special characters
    - Will FAIL on unfixed code (function does not exist yet)
    - _Requirements: 2.12_

  - [x] 1.5 Audit logging coverage fault condition test
    - **Property 1e: Fault Condition** — Missing Audit Logs
    - For each mutation hook: useCreateCLO, useUpdateCLO, useDeleteCLO, useCreateAssignment, useUpdateAssignment, useDeleteAssignment, useCreateRubric, useUpdateRubric, useDeleteRubric, useEnrollStudent, useUnenrollStudent, useCreateGrade, useCreateSubmission
    - Mock `logAuditEvent` and call mutation, verify `logAuditEvent` is called with correct `entity_type`
    - Will FAIL on unfixed code (no audit logging in these hooks)
    - _Requirements: 2.8_

  - [x] 1.6 Course name display fault condition test
    - **Property 1f: Fault Condition** — Truncated UUID Course Name
    - Verify `useUpcomingDeadlines` query includes a join to `courses` table for course name
    - Will FAIL on unfixed code (uses `Course ${course_id.slice(0, 8)}`)
    - _Requirements: 2.16_

  - [x] 1.7 Edge function permission fault condition test
    - **Property 1g: Fault Condition** — award-xp No Permission Check
    - Verify `award-xp` edge function rejects requests from non-service-role callers awarding XP to other students
    - Will FAIL on unfixed code (no permission validation)
    - _Requirements: 2.11_

- [x] 2. Write preservation property tests (BEFORE implementing fixes)
  - **Property 2: Preservation** — Existing Behavior Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy inputs
  - Write property-based tests capturing observed behavior patterns
  - Test file: `src/__tests__/properties/platformAuditPreservation.property.test.ts`
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code

  - [x] 2.1 Existing query key factory preservation test
    - **Property 2a: Preservation** — Existing queryKeys Usage
    - Observe: hooks already using `queryKeys` factory (useUsers, useCourses, usePrograms, useILOs, usePLOs) produce specific key structures
    - Generate random filter objects and verify `queryKeys.users.list(filters)` produces `['users', 'list', filters]`
    - Generate random IDs and verify `queryKeys.users.detail(id)` produces `['users', 'detail', id]`
    - Verify for all entity types: users, courses, programs, ilos, plos, clos, assignments, enrollments, submissions
    - Tests PASS on unfixed code (factory already works correctly)
    - _Requirements: 3.2_

  - [x] 2.2 Existing audit logging preservation test
    - **Property 2b: Preservation** — Existing Audit Log Format
    - Observe: useCreateUser, useCreateProgram, useCreateCourse call `logAuditEvent` with `{ action, entity_type, entity_id, changes }`
    - Mock `logAuditEvent` and verify existing hooks continue to call it with correct format
    - Tests PASS on unfixed code (existing hooks already log correctly)
    - _Requirements: 3.3_

  - [x] 2.3 Unaffected XP sources preservation test
    - **Property 2c: Preservation** — Unaffected XP Schedule Values
    - Observe: `XP_SCHEDULE.login = 10`, `XP_SCHEDULE.journal = 20`, `XP_SCHEDULE.perfect_day = 50`, `XP_SCHEDULE.perfect_rubric = 75`
    - Generate random source from `['login', 'journal', 'perfect_day', 'perfect_rubric']`
    - Assert values match observed amounts
    - Tests PASS on unfixed code (these values are already correct)
    - _Requirements: 3.9_

  - [x] 2.4 UI continuity preservation test
    - **Property 2d: Preservation** — Toast and Provider Behavior
    - Observe: Sonner Toaster configured with `position="top-right"` and `richColors`
    - Verify App.tsx wraps with AuthProvider, QueryClientProvider, NuqsAdapter
    - Tests PASS on unfixed code (providers already configured correctly)
    - _Requirements: 3.7, 3.10_

- [ ] 3. Category 1 — Type Safety Fix (Bug 1.1)

  - [ ] 3.1 Regenerate `src/types/database.ts` with full schema types
    - Run `npx supabase gen types --linked > src/types/database.ts` to include all tables
    - Verify the generated file includes types for all tables used by hooks (student_gamification, outcome_attainment, audit_logs, etc.)
    - _Bug_Condition: hook queries table other than 'institutions' AND uses `as unknown as { from: ... }` cast_
    - _Expected_Behavior: all column names, return types, and filter types checked at compile time_
    - _Preservation: institutions table queries continue with full type inference (Req 3.1)_
    - _Requirements: 2.1, 3.1_

  - [ ] 3.2 Remove `any` casts from all hook files
    - Remove `const db = supabase as unknown as { from: (table: string) => any }` from 25+ hook files
    - Use `import { supabase } from '@/lib/supabase'` directly (already typed with `Database` generic)
    - Remove manual type assertions `(data as Array<{ ... }>)` — use inferred types
    - Remove associated `// eslint-disable-next-line @typescript-eslint/no-explicit-any` comments
    - Files: useAdminDashboard, useStudentDashboard, useTeacherDashboard, useCoordinatorDashboard, useParentDashboard, useCLOs, useAssignments, useRubrics, useEnrollments, useSubmissions, useAuditLogs, and all other hooks with the cast pattern
    - _Bug_Condition: hook uses `as unknown as { from: (table: string) => any }` cast_
    - _Expected_Behavior: zero `any` casts, full compile-time type checking_
    - _Preservation: existing query logic unchanged, only type annotations removed_
    - _Requirements: 2.1_

- [ ] 4. Category 2 — Data Correctness Fixes (Bugs 1.2, 1.3, 1.4, 1.13, 1.16)

  - [ ] 4.1 Add missing dashboard keys to `queryKeys` factory
    - Add `adminDashboard`, `coordinatorDashboard`, `studentDashboard`, `parentDashboard` to `src/lib/queryKeys.ts`
    - _Requirements: 2.2_

  - [ ] 4.2 Migrate dashboard hooks to use `queryKeys` factory
    - `src/hooks/useAdminDashboard.ts`: Replace `['admin', 'kpis']` → `queryKeys.adminDashboard.list({})`, `['admin', 'recentAuditLogs', limit]` → `queryKeys.auditLogs.list({ limit })`
    - `src/hooks/useTeacherDashboard.ts`: Replace ad-hoc keys → `queryKeys.teacherDashboard.list({})`
    - `src/hooks/useStudentDashboard.ts`: Replace `['student', 'kpis', studentId]` → `queryKeys.studentGamification.detail(studentId)`, `['student', 'upcomingDeadlines', studentId, limit]` → `queryKeys.assignments.list({ studentId, upcoming: true, limit })`
    - `src/hooks/useCoordinatorDashboard.ts`: Replace ad-hoc keys → `queryKeys.coordinatorDashboard.list({})`
    - `src/hooks/useParentDashboard.ts`: Replace `['parent', 'linkedChildren', parentId]` → `queryKeys.parentStudentLinks.list({ parentId })`, `['parent', 'kpis', parentId]` → `queryKeys.parentStudentLinks.detail(parentId)`
    - _Bug_Condition: dashboard hook uses ad-hoc string array query key_
    - _Expected_Behavior: all dashboard hooks use queryKeys factory for correct cache invalidation_
    - _Preservation: hooks already using queryKeys factory unchanged (Req 3.2)_
    - _Requirements: 2.2, 3.2_

  - [ ] 4.3 Fix column name mismatches in student dashboard
    - `src/hooks/useStudentDashboard.ts`: Fix `current_streak` → `streak_count`, `current_level` → `level` in gamification query
    - `src/hooks/useStudentDashboard.ts`: Fix `score_percent` → `attainment_percent` and `scope: 'CLO'` → correct scope in attainment query
    - `src/hooks/useParentDashboard.ts`: Fix `current_streak` → `streak_count`, `current_level` → `level` in gamification reads
    - _Bug_Condition: hook reads wrong column names from student_gamification or outcome_attainment_
    - _Expected_Behavior: reads streak_count, level, attainment_percent with correct scope_
    - _Preservation: edge function write paths unchanged (Req 3.4, 3.8)_
    - _Requirements: 2.3, 2.4_

  - [ ] 4.4 Correct XP schedule constants
    - `src/lib/xpSchedule.ts`: Change `submission: 50` → `25`, `grade: 25` → `15`, `streak_milestone: 100` → `50`, `first_attempt_bonus: 25` → `10`
    - _Bug_Condition: XP_SCHEDULE values don't match domain specification_
    - _Expected_Behavior: submission=25, grade=15, streak_milestone=50, first_attempt_bonus=10_
    - _Preservation: unaffected sources unchanged — login=10, journal=20, perfect_day=50, perfect_rubric=75 (Req 3.9)_
    - _Requirements: 2.13, 3.9_

  - [ ] 4.5 Fix course name display in upcoming deadlines
    - `src/hooks/useStudentDashboard.ts`: Join `assignments` to `courses` table via `.select('id, title, course_id, due_date, courses(name)')` to get actual course name
    - Remove `Course ${a.course_id.slice(0, 8)}` fallback, use `a.courses.name` instead
    - _Bug_Condition: useUpcomingDeadlines displays truncated UUID as course name_
    - _Expected_Behavior: displays actual course name from joined courses table_
    - _Requirements: 2.16_

- [ ] 5. Category 3 — Performance Fixes (Bugs 1.5, 1.6, 1.7)

  - [ ] 5.1 Batch parent dashboard queries
    - `src/hooks/useParentDashboard.ts`: Replace per-child loop with batch queries using `.in('student_id', studentIds)` for gamification and enrollment data
    - Collect all child student IDs first, then make 2 batch queries instead of 2N sequential queries
    - _Bug_Condition: useLinkedChildren makes 2 queries per child in a loop_
    - _Expected_Behavior: at most 2 batch queries regardless of child count_
    - _Requirements: 2.5_

  - [ ] 5.2 Batch reorder operations
    - `src/hooks/useCLOs.ts`: Replace sequential `for` loop in useReorderCLOs with single batch upsert `supabase.from('clos').upsert(updates, { onConflict: 'id' })`
    - `src/hooks/usePLOs.ts`: Replace sequential loop in useReorderPLOs with batch upsert
    - `src/hooks/useILOs.ts`: Replace sequential loop in useReorderILOs with batch upsert
    - _Bug_Condition: reorder hooks update sort_order one row at a time_
    - _Expected_Behavior: single database call for all sort_order updates_
    - _Requirements: 2.6_

  - [ ] 5.3 Add pagination to list hooks
    - Add `page` and `pageSize` parameters (default pageSize=25) to list hooks
    - Apply `.range(from, to)` to queries: `from = (page - 1) * pageSize`, `to = from + pageSize - 1`
    - Add `.select('*', { count: 'exact' })` for total count
    - Return `{ data, count, page, pageSize }` instead of raw array
    - Files: useUsers, useCourses, useAssignments, useSubmissions, useAuditLogs, usePrograms, usePLOs, useCLOs, useILOs, useEnrollments, useRubrics
    - Update DataTable component to support pagination controls
    - _Bug_Condition: list hooks fetch all rows unbounded_
    - _Expected_Behavior: paginated results with configurable page size_
    - _Requirements: 2.7_

- [ ] 6. Category 4 — Compliance & Resilience Fixes (Bugs 1.8, 1.9, 1.10, 1.14, 1.15)

  - [ ] 6.1 Add audit logging to uncovered mutation hooks
    - `src/hooks/useCLOs.ts`: Add `logAuditEvent` to useCreateCLO, useUpdateCLO, useDeleteCLO with `entity_type: 'clo'`
    - `src/hooks/useAssignments.ts`: Add `logAuditEvent` to useCreateAssignment, useUpdateAssignment, useDeleteAssignment with `entity_type: 'assignment'`
    - `src/hooks/useRubrics.ts`: Add `logAuditEvent` to useCreateRubric, useUpdateRubric, useDeleteRubric with `entity_type: 'rubric'`
    - `src/hooks/useEnrollments.ts`: Add `logAuditEvent` to useEnrollStudent, useUnenrollStudent with `entity_type: 'enrollment'`
    - `src/hooks/useSubmissions.ts`: Add `logAuditEvent` to useCreateGrade with `entity_type: 'grade'`, useCreateSubmission with `entity_type: 'submission'`
    - Follow existing pattern from useUsers/usePrograms/useCourses: `logAuditEvent({ action, entity_type, entity_id: result.id, changes: data, performed_by: userId })`
    - _Bug_Condition: admin mutations in CLO/assignment/rubric/enrollment/grade/submission hooks don't log to audit_logs_
    - _Expected_Behavior: all mutations call logAuditEvent with correct action, entity_type, entity_id, changes_
    - _Preservation: existing audit logging in useUsers, usePrograms, useCourses, usePLOs, useILOs, useBonusEvents, useBulkImport unchanged (Req 3.3)_
    - _Requirements: 2.8, 3.3_

  - [ ] 6.2 Create ErrorBoundary component
    - Create `src/components/shared/ErrorBoundary.tsx`
    - React class component with `componentDidCatch` and `getDerivedStateFromError`
    - Fallback UI: Card with gradient header, error message, and retry button
    - Retry resets error state and re-renders children
    - Style consistent with design system (Card with `shadow-md rounded-xl overflow-hidden`, gradient header)
    - _Bug_Condition: React component throws unhandled error AND no ErrorBoundary exists_
    - _Expected_Behavior: graceful fallback UI with retry option instead of white screen crash_
    - _Requirements: 2.9_

  - [ ] 6.3 Initialize Sentry and wrap app
    - Create `src/lib/sentry.ts`: Initialize Sentry with DSN from `VITE_SENTRY_DSN`, configure breadcrumbs for navigation and API calls, set up performance monitoring
    - `src/App.tsx`: Import and call `initSentry()` before component tree, wrap `<AppRouter />` with `<Sentry.ErrorBoundary>` as outer boundary and custom `<ErrorBoundary>` as inner boundary
    - _Bug_Condition: @sentry/react dependency exists but Sentry.init() never called_
    - _Expected_Behavior: Sentry initialized on app start, errors captured, breadcrumbs tracked_
    - _Preservation: existing providers (Toaster, AuthProvider, QueryClientProvider, NuqsAdapter) continue functioning (Req 3.10)_
    - _Requirements: 2.14, 3.10_

  - [ ] 6.4 Create shared realtime subscription manager
    - Create `src/hooks/useRealtime.ts`: Shared subscription manager with channel deduplication, reconnection with exponential backoff (1s→2s→4s→8s→max 30s), fallback to polling (30s refetchInterval), "Live updates paused" state, cleanup on unmount
    - `src/pages/student/leaderboard/LeaderboardPage.tsx`: Replace direct `supabase.channel()` subscription with `useRealtime` hook
    - _Bug_Condition: useLeaderboardRealtime creates per-component subscription with no reconnection/fallback_
    - _Expected_Behavior: centralized subscription with reconnection, backoff, polling fallback, and cleanup_
    - _Preservation: leaderboard continues to respect anonymous opt-out, display correct XP/levels (Req 3.6)_
    - _Requirements: 2.10, 3.6_

  - [ ] 6.5 Replace full-page spinner with shimmer loading
    - `src/router/AppRouter.tsx`: Replace `LoadingFallback` full-page spinner (`min-h-screen` centered Loader2) with component-level shimmer placeholder using `animate-shimmer` class
    - Shimmer layout: page title placeholder (h-8 w-48), KPI grid (4 cards h-24), content area (h-64)
    - _Bug_Condition: LoadingFallback uses min-h-screen full-page spinner_
    - _Expected_Behavior: component-level shimmer placeholder consistent with design system_
    - _Requirements: 2.15_

- [ ] 7. Category 5 — Security Fixes (Bugs 1.11, 1.12, 1.17)

  - [ ] 7.1 Add permission validation to award-xp edge function
    - `supabase/functions/award-xp/index.ts`: After payload validation, extract JWT from Authorization header
    - Verify caller is either: (a) using service_role key (server-to-server), or (b) the student themselves (student_id matches auth.uid()) for self-triggered sources (login, submission, journal)
    - Reject with 403 Forbidden if neither condition is met
    - _Bug_Condition: award-xp accepts requests from any authenticated user without permission check_
    - _Expected_Behavior: only service_role or self-triggered requests accepted, others rejected with 403_
    - _Preservation: valid authorized requests continue to work (Req 3.5)_
    - _Requirements: 2.11, 3.5_

  - [ ] 7.2 Create PostgREST filter sanitization utility
    - Create `src/lib/sanitizeFilter.ts`: `sanitizePostgrestValue(input: string): string` that escapes `.`, `,`, `(`, `)`, `%`, `*`, `\` characters
    - Apply `sanitizePostgrestValue()` to user search strings in `.or()` filters in: useUsers, usePrograms, useCourses, useAuditLogs
    - _Bug_Condition: user search strings interpolated directly into .or() filter expressions_
    - _Expected_Behavior: all special PostgREST characters escaped before interpolation_
    - _Requirements: 2.12_

  - [ ] 7.3 Implement server-side login rate limiting
    - Create migration `supabase/migrations/XXXXXX_create_login_attempts_table.sql`: table with `email`, `attempt_count`, `locked_until`, `updated_at` columns, RLS policy for service_role only
    - Create `supabase/functions/check-login-rate/index.ts`: Edge function to check/increment attempts, return lock status
    - `src/lib/loginAttemptTracker.ts`: Keep client-side tracking as UX layer, add server-side check before `supabase.auth.signInWithPassword()`
    - _Bug_Condition: rate limiting stored in localStorage only, trivially bypassed_
    - _Expected_Behavior: server-side enforcement that persists across browsers/devices_
    - _Requirements: 2.17_

- [ ] 8. Verify bug condition exploration tests now pass

  - [ ] 8.1 Verify fault condition tests pass after fixes
    - **Property 1: Expected Behavior** — Platform Audit Defects Fixed
    - **IMPORTANT**: Re-run the SAME tests from task 1 — do NOT write new tests
    - The tests from task 1 encode the expected behavior for all 17 defects
    - When these tests pass, it confirms the expected behavior is satisfied
    - Run `src/__tests__/properties/platformAuditFaults.property.test.ts`
    - **EXPECTED OUTCOME**: All tests PASS (confirms all bugs are fixed)
    - _Requirements: 2.1–2.17_

  - [ ] 8.2 Verify preservation tests still pass after fixes
    - **Property 2: Preservation** — Existing Behavior Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run `src/__tests__/properties/platformAuditPreservation.property.test.ts`
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all preservation tests still pass after fixes (no regressions)
    - _Requirements: 3.1–3.10_

- [ ] 9. Checkpoint — Ensure all tests pass
  - Run full test suite: `npm test`
  - Ensure all property-based tests pass (fault condition + preservation)
  - Ensure all existing unit tests pass (no regressions)
  - Ensure TypeScript compilation succeeds with zero `any` casts in hooks
  - Ask the user if questions arise
