# Platform Audit Fixes — Bugfix Design

## Overview

The Edeviser platform audit uncovered 17 defects across type safety, data integrity, performance, security, UX, and observability. These bugs collectively degrade compile-time safety (25+ files casting to `any`), cause silent data staleness (ad-hoc query keys), display incorrect dashboard values (column name mismatches), degrade performance at scale (N+1 queries, unbounded fetches), leave compliance gaps (missing audit logs), and leave error monitoring uninitialized.

The fix strategy groups defects into six categories and applies targeted, minimal changes:
1. **Type Safety** (1.1): Regenerate `database.ts` types, remove `any` casts
2. **Data Correctness** (1.2–1.4, 1.13, 1.16): Fix query keys, column names, XP constants, course name display
3. **Performance** (1.5–1.7): Batch queries, batch reorder, add pagination
4. **Compliance & Resilience** (1.8–1.10, 1.14, 1.15): Add audit logging, ErrorBoundary, Sentry, realtime resilience, shimmer loading
5. **Security** (1.11–1.12, 1.17): Edge function permissions, filter sanitization, server-side rate limiting
6. **UX** (1.9, 1.15, 1.16): ErrorBoundary, shimmer loading, course name display

## Glossary

- **Bug_Condition (C)**: The set of conditions under which any of the 17 defects manifests — e.g., a dashboard hook using wrong column names, a list hook fetching unbounded data, or an edge function accepting unauthorized requests
- **Property (P)**: The desired correct behavior for each defect — e.g., compile-time type checking, correct column reads, paginated fetches, audit-logged mutations
- **Preservation**: Existing correct behaviors that must remain unchanged — e.g., `institutions` table type inference, existing `queryKeys` usage, existing audit logging in user/program/course hooks, streak/XP processing logic, toast notifications
- **`database.ts`**: Auto-generated Supabase type file providing compile-time column/type checking
- **`queryKeys` factory**: Centralized query key generator in `src/lib/queryKeys.ts` ensuring consistent cache invalidation
- **`logAuditEvent`**: Audit logger in `src/lib/auditLogger.ts` for compliance-critical mutation tracking
- **PostgREST filter**: Supabase's `.or()` filter syntax that accepts string expressions — vulnerable to injection if unsanitized

## Bug Details

### Fault Condition

The platform exhibits 17 distinct fault conditions grouped into six categories. The compound bug condition is:

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type PlatformOperation
  OUTPUT: boolean

  // Category 1: Type Safety
  typeSafety := input.hook queries any table other than 'institutions'
                AND uses `as unknown as { from: ... }` cast

  // Category 2: Data Correctness
  queryKeyMismatch := input.hook IN [useAdminKPIs, useRecentAuditLogs, useTeacherKPIs,
    useTeacherCLOAttainment, useStudentKPIs, useCoordinatorKPIs, useParentKPIs, useSendNudge,
    useUpcomingDeadlines, useLinkedChildren]
    AND input.hook uses ad-hoc string array query key instead of queryKeys factory

  columnMismatch := (input.hook = useStudentKPIs
    AND input.readsColumn IN ['current_streak', 'current_level', 'score_percent']
    AND input.readsScope = 'CLO')

  xpMismatch := input.usesXPSchedule
    AND input.source IN ['submission', 'grade', 'streak_milestone', 'first_attempt_bonus']
    AND input.xpAmount != domainSpec[input.source]

  courseNameMissing := input.hook = useUpcomingDeadlines
    AND input.displaysCourseName = truncatedUUID

  // Category 3: Performance
  nPlusOne := input.hook = useLinkedChildren AND input.childCount > 0
  sequentialReorder := input.hook IN [useReorderCLOs, useReorderPLOs, useReorderILOs]
  unboundedFetch := input.hook IN listHooks AND input.pagination = none

  // Category 4: Compliance & Resilience
  missingAudit := input.mutation IN [createCLO, updateCLO, deleteCLO, createAssignment,
    updateAssignment, deleteAssignment, createRubric, updateRubric, deleteRubric,
    enrollStudent, unenrollStudent, createGrade, createSubmission]
  missingErrorBoundary := input.componentThrowsError AND noErrorBoundaryExists
  missingRealtime := input.hook = useLeaderboardRealtime AND (noReconnection OR noFallback)
  missingSentry := input.appStarts AND Sentry.init() NOT called
  fullPageSpinner := input.routeLoading AND LoadingFallback uses min-h-screen

  // Category 5: Security
  noPermissionCheck := input.edgeFunction = 'award-xp' AND input.callerRole != validated
  filterInjection := input.hook uses .or() with unsanitized user search string
  clientOnlyRateLimit := input.loginAttempt AND rateLimitStorage = localStorage

  RETURN typeSafety OR queryKeyMismatch OR columnMismatch OR xpMismatch
         OR courseNameMissing OR nPlusOne OR sequentialReorder OR unboundedFetch
         OR missingAudit OR missingErrorBoundary OR missingRealtime OR missingSentry
         OR fullPageSpinner OR noPermissionCheck OR filterInjection OR clientOnlyRateLimit
END FUNCTION
```

### Examples

- **1.1 Type Safety**: `useStudentKPIs` casts `supabase as unknown as { from: (table: string) => any }` — querying `student_gamification` with column `current_level` compiles fine even though the actual column is `level`, causing silent runtime failure
- **1.3 Column Mismatch**: `useStudentKPIs` reads `current_streak` from `student_gamification`, but `process-streak` writes to `streak_count` — dashboard always shows streak = 0
- **1.4 Column Mismatch**: `useStudentKPIs` reads `score_percent` with `scope: 'CLO'` from `outcome_attainment`, but `calculate-attainment-rollup` writes `attainment_percent` with `scope: 'student_course'` — attainment always shows 0%
- **1.5 N+1**: Parent with 5 linked children triggers 10 extra queries (2 per child) instead of 2 batch queries
- **1.11 Security**: Any authenticated user can call `award-xp` with `{ student_id: "victim", xp_amount: 99999, source: "login" }` — no permission check
- **1.12 Injection**: Searching users with `name.ilike.%admin%,role.eq.admin` in the search box injects additional filter conditions into the PostgREST `.or()` expression
- **1.13 XP Mismatch**: `XP_SCHEDULE.submission = 50` but domain spec says 25; `grade = 25` but spec says 15; `streak_milestone = 100` but spec says 50; `first_attempt_bonus = 25` but spec says 10
- **1.16 UUID Display**: Student sees "Course a1b2c3d4" instead of "Introduction to Programming" in upcoming deadlines

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- `institutions` table queries continue to have full type inference (Req 3.1)
- Hooks already using `queryKeys` factory (useUsers, useCourses, usePrograms, useILOs, usePLOs, etc.) continue with same key structure (Req 3.2)
- Hooks already logging audit events (useUsers, usePrograms, useCourses, usePLOs, useILOs, useBonusEvents, useBulkImport) continue with same format (Req 3.3)
- `process-streak` edge function continues to correctly increment `streak_count`, apply freezes, award milestone XP (Req 3.4)
- `award-xp` edge function continues to insert XP transactions, calculate levels, trigger level-up notifications for valid authorized requests (Req 3.5)
- Leaderboard continues to respect anonymous opt-out, display correct XP/levels, maintain ranking (Req 3.6)
- Sonner toasts continue in `top-right` position with `richColors` (Req 3.7)
- `calculate-attainment-rollup` continues correct CLO → PLO → ILO cascade (Req 3.8)
- Unaffected XP sources (login: 10, journal: 20, perfect_day: 50, badge_earned: variable, perfect_rubric: 75) remain unchanged (Req 3.9)
- Existing providers (Toaster, AuthProvider, QueryClientProvider, NuqsAdapter) continue functioning with Sentry/ErrorBoundary additions (Req 3.10)

**Scope:**
All operations that do NOT match the 17 fault conditions should be completely unaffected. This includes:
- All existing CRUD operations on properly-typed tables
- All existing mutation hooks with audit logging
- All edge functions with proper permission checks
- All non-search filter operations (exact match filters, date filters, etc.)

## Hypothesized Root Cause

Based on the audit analysis, the root causes are:

1. **Incomplete Type Generation (1.1)**: The `database.ts` file was generated with only the `institutions` table typed. All other hooks work around this by casting to `any`, which cascades into column name mismatches (1.3, 1.4) going undetected at compile time.

2. **Inconsistent Query Key Adoption (1.2)**: The `queryKeys` factory was added after initial dashboard hooks were written. Dashboard hooks were never migrated to use it, creating a split between factory-based keys (CRUD hooks) and ad-hoc keys (dashboard hooks).

3. **Schema Drift Between Read/Write Paths (1.3, 1.4)**: Edge functions were updated to use correct column names (`streak_count`, `level`, `attainment_percent`) but the client-side hooks were not updated in sync, and the `any` cast prevented compile-time detection.

4. **Naive Data Fetching Patterns (1.5, 1.6, 1.7)**: Initial implementation used simple loop-based fetching without considering scale. The parent dashboard iterates children sequentially, reorder hooks update rows one-by-one, and list hooks fetch all rows without pagination.

5. **Incomplete Audit Coverage (1.8)**: Audit logging was implemented for the first batch of CRUD hooks (users, programs, courses) but not extended to subsequently-added hooks (CLOs, assignments, rubrics, enrollments, grades, submissions).

6. **Missing Infrastructure Components (1.9, 1.10, 1.14, 1.15)**: ErrorBoundary, Sentry initialization, realtime resilience, and design-system-compliant loading were planned but never implemented. The `ErrorBoundary.tsx` file doesn't exist, `Sentry.init()` is never called, and `LoadingFallback` uses a full-page spinner.

7. **Missing Server-Side Validation (1.11, 1.12, 1.17)**: The `award-xp` edge function validates payload structure but not caller permissions. Search filters interpolate user input directly into PostgREST expressions. Rate limiting is client-side only.

8. **Stale Constants (1.13)**: XP schedule values were set during initial development and never reconciled with the finalized domain specification.

9. **Missing Join (1.16)**: `useUpcomingDeadlines` queries `assignments` without joining to `courses`, falling back to a truncated UUID for display.

## Correctness Properties

Property 1: Fault Condition — Type-Safe Supabase Queries

_For any_ hook that queries a Supabase table, the query SHALL use the generated `Database` type (via `supabase.from('table')`) with full compile-time checking of column names, return types, and filter types, with zero `any` casts.

**Validates: Requirements 2.1**

Property 2: Fault Condition — Centralized Query Keys

_For any_ dashboard hook that registers a query key, the hook SHALL use the `queryKeys` factory so that `queryClient.invalidateQueries` correctly invalidates all related cached data.

**Validates: Requirements 2.2**

Property 3: Fault Condition — Correct Column Names (Gamification)

_For any_ query to `student_gamification`, the hook SHALL read `streak_count` and `level` (matching edge function write columns), so dashboard values are accurate.

**Validates: Requirements 2.3**

Property 4: Fault Condition — Correct Column Names (Attainment)

_For any_ query to `outcome_attainment`, the hook SHALL read `attainment_percent` with the correct scope value matching `calculate-attainment-rollup`, so attainment displays accurately.

**Validates: Requirements 2.4**

Property 5: Fault Condition — Batch Parent Dashboard Queries

_For any_ parent with N linked children, `useLinkedChildren` SHALL fetch gamification and enrollment data in at most 2 batch queries (using `.in()`) instead of 2N sequential queries.

**Validates: Requirements 2.5**

Property 6: Fault Condition — Batch Reorder Operations

_For any_ reorder operation on CLOs, PLOs, or ILOs, the hook SHALL update all `sort_order` values in a single database call instead of N sequential updates.

**Validates: Requirements 2.6**

Property 7: Fault Condition — Paginated List Fetches

_For any_ list hook, the hook SHALL implement pagination with configurable page size, preventing unbounded result sets.

**Validates: Requirements 2.7**

Property 8: Fault Condition — Complete Audit Logging

_For any_ admin mutation in CLO, assignment, rubric, enrollment, grade, or submission hooks, the hook SHALL call `logAuditEvent` with appropriate action, entity_type, entity_id, and changes.

**Validates: Requirements 2.8**

Property 9: Fault Condition — ErrorBoundary Exists

_For any_ unhandled React component error, the application SHALL catch it via an `ErrorBoundary` and display a graceful fallback UI with retry, instead of a white screen crash.

**Validates: Requirements 2.9**

Property 10: Fault Condition — Resilient Realtime Subscriptions

_For any_ realtime subscription, the system SHALL use a shared subscription manager with reconnection fallback (30s polling), exponential backoff, a "Live updates paused" banner, and proper cleanup on unmount.

**Validates: Requirements 2.10**

Property 11: Fault Condition — Edge Function Permission Validation

_For any_ request to the `award-xp` edge function, the system SHALL validate caller permissions (service role or self-triggered) before awarding XP.

**Validates: Requirements 2.11**

Property 12: Fault Condition — Sanitized PostgREST Filters

_For any_ `.or()` filter constructed with user-provided search strings, the system SHALL escape special PostgREST characters to prevent filter injection.

**Validates: Requirements 2.12**

Property 13: Fault Condition — Correct XP Schedule Constants

_For any_ XP award using the schedule constants, the system SHALL use `submission: 25`, `grade: 15`, `streak_milestone: 50`, `first_attempt_bonus: 10`, matching the domain specification.

**Validates: Requirements 2.13**

Property 14: Fault Condition — Sentry Initialization

_For any_ application startup, the system SHALL call `Sentry.init()` with the project DSN, wrap the app in Sentry's ErrorBoundary, and configure breadcrumb tracking.

**Validates: Requirements 2.14**

Property 15: Fault Condition — Component-Level Loading

_For any_ route loading via `React.lazy`, the `LoadingFallback` SHALL render a component-level shimmer placeholder instead of a full-page spinner.

**Validates: Requirements 2.15**

Property 16: Fault Condition — Course Name Display

_For any_ upcoming deadline display, the system SHALL join to the `courses` table and show the actual course name instead of a truncated UUID.

**Validates: Requirements 2.16**

Property 17: Fault Condition — Server-Side Rate Limiting

_For any_ login attempt rate limiting, the system SHALL enforce limits server-side (via Edge Function or RLS) so they cannot be bypassed by clearing client storage.

**Validates: Requirements 2.17**

Property 18: Preservation — Existing Typed Queries

_For any_ query to the `institutions` table, the system SHALL produce the same type inference and behavior as before the fix.

**Validates: Requirements 3.1**

Property 19: Preservation — Existing Query Key Usage

_For any_ hook already using the `queryKeys` factory, the system SHALL produce the same key structure and invalidation behavior.

**Validates: Requirements 3.2**

Property 20: Preservation — Existing Audit Logging

_For any_ hook already logging audit events (useUsers, usePrograms, useCourses, usePLOs, useILOs, useBonusEvents, useBulkImport), the system SHALL continue logging with the same format.

**Validates: Requirements 3.3**

Property 21: Preservation — XP and Streak Processing

_For any_ valid authorized XP award or streak processing, the edge functions SHALL continue to correctly insert transactions, calculate levels, apply freezes, and trigger notifications.

**Validates: Requirements 3.4, 3.5, 3.9**

Property 22: Preservation — UI Continuity

_For any_ existing UI behavior (leaderboard display, toast notifications, provider wrapping), the system SHALL continue functioning identically after the fixes.

**Validates: Requirements 3.6, 3.7, 3.10**


## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

### Category 1: Type Safety (Bug 1.1)

**File**: `src/types/database.ts`

**Action**: Regenerate with `npx supabase gen types --linked` to include all tables.

**Files**: All 25+ hook files in `src/hooks/` that use the `any` cast pattern

**Specific Changes**:
1. **Remove `any` cast**: Delete `const db = supabase as unknown as { from: (table: string) => any }` from every hook file
2. **Import typed client**: Use `import { supabase } from '@/lib/supabase'` directly — the client is already typed with `Database` generic
3. **Remove manual type assertions**: Replace `(data as Array<{ ... }>)` casts with inferred types from the generated `Database` type
4. **Remove eslint-disable comments**: Delete all `// eslint-disable-next-line @typescript-eslint/no-explicit-any` that were needed for the cast

### Category 2: Data Correctness (Bugs 1.2, 1.3, 1.4, 1.13, 1.16)

**File**: `src/hooks/useAdminDashboard.ts`
- Replace `['admin', 'kpis']` with `queryKeys.adminDashboard.list({})` (add `adminDashboard` to factory)
- Replace `['admin', 'recentAuditLogs', limit]` with `queryKeys.auditLogs.list({ limit })`

**File**: `src/hooks/useTeacherDashboard.ts`
- Replace ad-hoc keys with `queryKeys.teacherDashboard.list({})`

**File**: `src/hooks/useStudentDashboard.ts`
- Replace `['student', 'kpis', studentId]` with `queryKeys.studentGamification.detail(studentId)`
- Replace `['student', 'upcomingDeadlines', studentId, limit]` with `queryKeys.assignments.list({ studentId, upcoming: true, limit })`
- Fix `current_streak` → `streak_count`, `current_level` → `level` in gamification query
- Fix `score_percent` → `attainment_percent` and `scope: 'CLO'` → correct scope in attainment query
- Join `assignments` to `courses` table: `.select('id, title, course_id, due_date, courses(name)')` to get actual course name

**File**: `src/hooks/useCoordinatorDashboard.ts`
- Replace ad-hoc keys with `queryKeys` factory

**File**: `src/hooks/useParentDashboard.ts`
- Replace `['parent', 'linkedChildren', parentId]` with `queryKeys.parentStudentLinks.list({ parentId })`
- Replace `['parent', 'kpis', parentId]` with `queryKeys.parentStudentLinks.detail(parentId)`
- Fix `current_streak` → `streak_count`, `current_level` → `level` in gamification reads

**File**: `src/lib/xpSchedule.ts`
- Change `submission: 50` → `submission: 25`
- Change `grade: 25` → `grade: 15`
- Change `streak_milestone: 100` → `streak_milestone: 50`
- Change `first_attempt_bonus: 25` → `first_attempt_bonus: 10`

**File**: `src/lib/queryKeys.ts`
- Add missing dashboard-specific keys: `adminDashboard`, `coordinatorDashboard`, `studentDashboard`, `parentDashboard`

### Category 3: Performance (Bugs 1.5, 1.6, 1.7)

**File**: `src/hooks/useParentDashboard.ts`
- Replace per-child loop with batch queries:
  ```
  // Instead of: for (child of children) { query gamification; query enrollment; }
  // Use: .in('student_id', studentIds) for both gamification and enrollment count
  ```

**File**: `src/hooks/useCLOs.ts`, `src/hooks/usePLOs.ts`, `src/hooks/useILOs.ts`
- Replace sequential `for` loop reorder with a single RPC call or batch upsert:
  ```
  // Instead of: for (item of items) { await db.from('clos').update({ sort_order }).eq('id', item.id) }
  // Use: await supabase.rpc('batch_update_sort_order', { items: JSON.stringify(updates) })
  // Or: await supabase.from('clos').upsert(updates, { onConflict: 'id' })
  ```

**Files**: All list hooks (`useUsers`, `useCourses`, `useAssignments`, `useSubmissions`, `useAuditLogs`, etc.)
- Add pagination parameters: `page: number`, `pageSize: number` (default 25)
- Apply `.range(from, to)` to all list queries
- Return `{ data, count, page, pageSize }` instead of raw array

### Category 4: Compliance & Resilience (Bugs 1.8, 1.9, 1.10, 1.14, 1.15)

**File**: `src/hooks/useCLOs.ts` (useCreateCLO, useUpdateCLO, useDeleteCLO)
- Add `logAuditEvent({ action: 'create'|'update'|'delete', entity_type: 'clo', entity_id, changes })` in `onSuccess` or after mutation

**File**: `src/hooks/useAssignments.ts` (useCreateAssignment, useUpdateAssignment, useDeleteAssignment)
- Add `logAuditEvent` calls matching existing pattern

**File**: `src/hooks/useRubrics.ts` (useCreateRubric, useUpdateRubric, useDeleteRubric)
- Add `logAuditEvent` calls

**File**: `src/hooks/useEnrollments.ts` (useEnrollStudent, useUnenrollStudent)
- Add `logAuditEvent` calls

**File**: `src/hooks/useSubmissions.ts` (useCreateGrade, useCreateSubmission)
- Add `logAuditEvent` calls

**New File**: `src/components/shared/ErrorBoundary.tsx`
- Create React error boundary with fallback UI showing error message and retry button
- Style consistent with design system (Card with shadow, gradient header)

**File**: `src/App.tsx`
- Wrap `<AppRouter />` with `<ErrorBoundary>`
- Add `Sentry.init()` call before component tree
- Wrap with `Sentry.ErrorBoundary` as outer boundary

**New File**: `src/lib/sentry.ts`
- Initialize Sentry with DSN from `VITE_SENTRY_DSN` env var
- Configure breadcrumbs for navigation and API calls
- Set up performance monitoring

**File**: `src/router/AppRouter.tsx`
- Replace `LoadingFallback` full-page spinner with component-level shimmer:
  ```tsx
  const LoadingFallback = () => (
    <div className="p-6 space-y-4">
      <div className="h-8 w-48 rounded-lg animate-shimmer" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-24 rounded-xl animate-shimmer" />)}
      </div>
      <div className="h-64 rounded-xl animate-shimmer" />
    </div>
  );
  ```

**New File**: `src/hooks/useRealtime.ts`
- Create shared subscription manager with:
  - Channel deduplication (one channel per table+filter combo)
  - Reconnection with exponential backoff (1s, 2s, 4s, 8s, max 30s)
  - Fallback to polling (30s `refetchInterval`) on connection failure
  - "Live updates paused" state exposed to consumers
  - Cleanup on unmount

**File**: `src/pages/student/leaderboard/LeaderboardPage.tsx`
- Replace direct `supabase.channel()` subscription with `useRealtime` hook

### Category 5: Security (Bugs 1.11, 1.12, 1.17)

**File**: `supabase/functions/award-xp/index.ts`
- Add permission validation after payload validation:
  ```
  // Extract JWT from Authorization header
  // Verify caller is either:
  //   a) Using service_role key (server-to-server calls from other edge functions)
  //   b) The student themselves (student_id matches auth.uid()) for self-triggered sources
  // Reject with 403 if neither condition is met
  ```

**New File**: `src/lib/sanitizeFilter.ts`
- Create utility to escape PostgREST special characters in user search input:
  ```typescript
  export function sanitizePostgrestValue(input: string): string {
    return input.replace(/[.,()%\\*]/g, (char) => `\\${char}`);
  }
  ```

**Files**: `src/hooks/useUsers.ts`, `src/hooks/usePrograms.ts`, `src/hooks/useCourses.ts`, `src/hooks/useAuditLogs.ts`
- Apply `sanitizePostgrestValue()` to all user-provided search strings before interpolation into `.or()` filters

**New File**: `supabase/functions/check-login-rate/index.ts`
- Create edge function for server-side rate limiting:
  - Track attempts in a `login_attempts` table (email, attempt_count, locked_until)
  - Check/increment on each login attempt
  - Return lock status and remaining time

**File**: `src/lib/loginAttemptTracker.ts`
- Keep client-side tracking as UX layer (immediate feedback)
- Add server-side check before calling `supabase.auth.signInWithPassword()`

**New Migration**: `supabase/migrations/XXXXXX_create_login_attempts_table.sql`
- Create `login_attempts` table with columns: `email`, `attempt_count`, `locked_until`, `updated_at`
- Add RLS policy: service_role only (no client access)

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bugs on unfixed code, then verify the fixes work correctly and preserve existing behavior.

### Exploratory Fault Condition Checking

**Goal**: Surface counterexamples that demonstrate the bugs BEFORE implementing fixes. Confirm or refute the root cause analysis.

**Test Plan**: Write tests that exercise each defect category and assert the expected behavior. Run on UNFIXED code to observe failures.

**Test Cases**:
1. **Type Safety Test**: Import a hook and verify the Supabase client type includes column-level type checking (will fail — `any` cast removes types)
2. **Query Key Test**: Call `useStudentKPIs` and verify the query key matches `queryKeys.studentGamification.detail(id)` (will fail — uses ad-hoc key)
3. **Column Name Test**: Mock `student_gamification` with `streak_count` column and verify `useStudentKPIs` reads it (will fail — reads `current_streak`)
4. **XP Schedule Test**: Assert `XP_SCHEDULE.submission === 25` (will fail — currently 50)
5. **N+1 Test**: Mock `useLinkedChildren` with 5 children and count Supabase calls (will fail — makes 10+ calls)
6. **Audit Log Test**: Call `useCreateCLO.mutate()` and verify `logAuditEvent` was called (will fail — no audit logging)
7. **Permission Test**: Call `award-xp` with a non-service-role token for a different student (will succeed — should fail with 403)
8. **Filter Injection Test**: Pass `name.ilike.%admin%,role.eq.admin` as search and verify it's escaped (will fail — raw interpolation)

**Expected Counterexamples**:
- Column reads return `undefined`/`null` instead of actual values
- Query invalidation silently fails to refresh dashboard data
- XP amounts are 2x the domain specification
- N+1 queries scale linearly with child count

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed functions produce the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := fixedFunction(input)
  ASSERT expectedBehavior(result)
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed functions produce the same result as the original functions.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT originalFunction(input) = fixedFunction(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for non-bug inputs, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Institutions Query Preservation**: Verify `institutions` table queries continue to have full type inference after `database.ts` regeneration
2. **Existing Query Key Preservation**: Verify hooks already using `queryKeys` factory produce identical keys after dashboard hooks are migrated
3. **Existing Audit Log Preservation**: Verify `useCreateUser`, `useCreateProgram`, `useCreateCourse` continue to call `logAuditEvent` with same format
4. **Streak Processing Preservation**: Verify `process-streak` continues to correctly increment `streak_count` and apply freezes
5. **XP Award Preservation**: Verify `award-xp` continues to work for valid authorized requests (service role, self-triggered)
6. **Unaffected XP Sources Preservation**: Verify `login: 10`, `journal: 20`, `perfect_day: 50` remain unchanged
7. **Toast Notification Preservation**: Verify Sonner toasts continue in `top-right` with `richColors`

### Unit Tests

- Test `sanitizePostgrestValue` escapes all special characters correctly
- Test `ErrorBoundary` renders fallback UI on child error and retry resets state
- Test `LoadingFallback` renders shimmer elements (no `min-h-screen`)
- Test corrected XP schedule values match domain spec
- Test corrected column names in student dashboard queries
- Test audit logging is called for each newly-covered mutation
- Test `award-xp` rejects unauthorized callers with 403
- Test `useLinkedChildren` makes exactly 2 batch queries regardless of child count
- Test pagination parameters are applied to list queries

### Property-Based Tests

- Generate random search strings (including PostgREST special chars) and verify `sanitizePostgrestValue` produces safe output that round-trips correctly
- Generate random XP source types and verify schedule amounts match domain spec for all sources
- Generate random student IDs and verify `useStudentKPIs` query key matches `queryKeys` factory output
- Generate random child counts (1–50) and verify `useLinkedChildren` query count is constant (not proportional to N)
- Generate random mutation payloads for CLO/assignment/rubric hooks and verify `logAuditEvent` is called with correct entity_type

### Integration Tests

- Test full student dashboard flow: login → dashboard loads → streak, level, attainment display correct values
- Test parent dashboard flow: login → linked children load in single batch → gamification data displays correctly
- Test admin mutation flow: create CLO → audit log entry appears → invalidate queries refreshes list
- Test leaderboard realtime: subscribe → disconnect → fallback to polling → reconnect → resume realtime
- Test login rate limiting: 5 failed attempts → server-side lock → clearing localStorage doesn't bypass lock
- Test Sentry integration: app starts → `Sentry.init()` called → error boundary catches error → Sentry captures event
