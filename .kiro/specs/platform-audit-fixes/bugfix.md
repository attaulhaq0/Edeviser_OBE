# Bugfix Requirements Document

## Introduction

A comprehensive platform audit of the Edeviser education platform revealed 13 categories of defects spanning type safety, data integrity, performance, security, and UX consistency. These issues collectively degrade compile-time safety (50+ eslint-disable comments from missing types), cause silent cache invalidation failures (ad-hoc query keys), risk data corruption (column name mismatches between read/write paths), degrade performance at scale (N+1 queries, unbounded fetches), leave audit gaps for compliance-critical mutations, and leave error monitoring and resilience infrastructure uninitialized.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN any hook queries a table other than `institutions` THEN the system casts the Supabase client to `any` via `as unknown as { from: (table: string) => any }`, bypassing all compile-time type checking for column names, return types, and filter types across 25+ files.

1.2 WHEN dashboard hooks (useAdminKPIs, useRecentAuditLogs, useTeacherKPIs, useTeacherCLOAttainment, useStudentKPIs, useCoordinatorKPIs, useParentKPIs, useSendNudge) register query keys THEN the system uses ad-hoc string arrays (e.g., `['admin', 'kpis']`, `['student', 'kpis', studentId]`) instead of the centralized `queryKeys` factory, causing `queryClient.invalidateQueries` to silently fail to invalidate stale dashboard data.

1.3 WHEN `useStudentDashboard` reads from `student_gamification` THEN the system queries columns `current_streak` and `current_level`, but the `process-streak` edge function writes to `streak_count` and the `award-xp` edge function writes to `level`, causing the dashboard to always display default/zero values for streak and level.

1.4 WHEN `useStudentDashboard` reads from `outcome_attainment` THEN the system queries column `score_percent` with `scope: 'CLO'`, but the `calculate-attainment-rollup` edge function writes to column `attainment_percent` with `scope: 'student_course'`, causing average attainment to always display as 0%.

1.5 WHEN `useLinkedChildren` (parent dashboard) fetches data for linked children THEN the system makes 2 separate queries per child in a loop (gamification + enrollment count), creating an N+1 query pattern that degrades linearly with the number of linked children.

1.6 WHEN `useReorderCLOs`, `useReorderPLOs`, or `useReorderILOs` reorders items THEN the system updates `sort_order` one row at a time in a sequential loop instead of a batch operation.

1.7 WHEN any list hook (useUsers, useCourses, useAssignments, useSubmissions, useAuditLogs, etc.) fetches data THEN the system retrieves all rows unbounded with no pagination, risking timeouts and excessive memory usage as data grows.

1.8 WHEN admin mutations occur in useCreateCLO, useUpdateCLO, useDeleteCLO, useCreateAssignment, useUpdateAssignment, useDeleteAssignment, useCreateRubric, useUpdateRubric, useDeleteRubric, useEnrollStudent, useUnenrollStudent, useCreateGrade, or useCreateSubmission THEN the system does not log to `audit_logs`, violating the project convention that all admin mutations must be audit-logged.

1.9 WHEN a React component throws an unhandled error THEN the system has no ErrorBoundary component (the file does not exist in `src/components/shared/`), causing the entire application to crash with a white screen instead of showing a graceful fallback UI.

1.10 WHEN `useLeaderboardRealtime` subscribes to realtime changes THEN the system creates a per-component subscription with no reconnection fallback, no exponential backoff, no "Live updates paused" banner, and no shared subscription manager, violating the centralized realtime architecture pattern.

1.11 WHEN the `award-xp` edge function receives a request THEN the system does not validate caller permissions, allowing any authenticated user to award arbitrary XP to any student.

1.12 WHEN the system uses string interpolation in `.or()` filters (useUsers, usePrograms, useCourses, useAuditLogs) THEN user-provided search strings are interpolated directly into PostgREST filter expressions (e.g., `` `full_name.ilike.%${filters.search}%` ``), creating a potential filter injection vector.

1.13 WHEN the XP schedule constants are used THEN the system awards `submission: 50`, `grade: 25`, `streak_milestone: 100`, and `first_attempt_bonus: 25` XP, which contradicts the domain specification of `submission: 25`, `grade: 15`, `streak_milestone: 50`, and `first_attempt_bonus: 10`.

1.14 WHEN `@sentry/react` is listed as a dependency THEN the system never calls `Sentry.init()`, never wraps components in Sentry's ErrorBoundary, and never tracks breadcrumbs, leaving error monitoring completely non-functional.

1.15 WHEN the application is loading a route via React.lazy THEN the `LoadingFallback` component renders a full-page centered spinner (`min-h-screen`), violating the design system rule of component-level shimmer loading.

1.16 WHEN `useUpcomingDeadlines` displays assignment deadlines THEN the system shows a truncated UUID as the course name (`` `Course ${a.course_id.slice(0, 8)}` ``) instead of joining to the courses table to fetch the actual course name.

1.17 WHEN the login attempt tracker rate-limits login attempts THEN the system stores attempt counts in `localStorage` only, which can be trivially bypassed by clearing browser storage or using a different browser/device.

### Expected Behavior (Correct)

2.1 WHEN any hook queries a Supabase table THEN the system SHALL use a fully generated `database.ts` type file (via `npx supabase gen types --linked`) so that all column names, return types, and filter types are checked at compile time, eliminating the need for `any` casts.

2.2 WHEN dashboard hooks register query keys THEN the system SHALL use the centralized `queryKeys` factory (e.g., `queryKeys.users.list({})`) so that `queryClient.invalidateQueries` correctly invalidates all related cached data.

2.3 WHEN `useStudentDashboard` reads from `student_gamification` THEN the system SHALL query the correct column names (`streak_count` and `level`) that match what the edge functions write, so the dashboard displays accurate streak and level values.

2.4 WHEN `useStudentDashboard` reads from `outcome_attainment` THEN the system SHALL query the correct column name (`attainment_percent`) and use the correct scope value that matches what `calculate-attainment-rollup` writes, so average attainment displays accurately.

2.5 WHEN `useLinkedChildren` fetches data for linked children THEN the system SHALL batch-fetch gamification and enrollment data for all children in a single query (using `.in()` filter) instead of querying per child, eliminating the N+1 pattern.

2.6 WHEN reorder hooks update `sort_order` THEN the system SHALL batch-update all rows in a single database call (e.g., using an RPC or a single upsert) instead of sequential individual updates.

2.7 WHEN list hooks fetch data THEN the system SHALL implement cursor-based or offset pagination with configurable page size, preventing unbounded result sets.

2.8 WHEN admin mutations occur in CLO, assignment, rubric, enrollment, grade, and submission hooks THEN the system SHALL call `logAuditEvent` with the appropriate action, entity_type, entity_id, and changes, consistent with the existing audit logging pattern in useUsers, usePrograms, useCourses, etc.

2.9 WHEN a React component throws an unhandled error THEN the system SHALL catch it via an ErrorBoundary component in `src/components/shared/ErrorBoundary.tsx` and display a graceful fallback UI with a retry option, instead of crashing the entire application.

2.10 WHEN the leaderboard subscribes to realtime changes THEN the system SHALL use a centralized shared subscription manager with reconnection fallback (polling at 30s), exponential backoff for reconnection attempts, a "Live updates paused" banner in polling mode, and proper cleanup on unmount.

2.11 WHEN the `award-xp` edge function receives a request THEN the system SHALL validate that the caller has appropriate permissions (service role or the student themselves for self-triggered actions) before awarding XP.

2.12 WHEN `.or()` filters are constructed with user-provided search strings THEN the system SHALL sanitize the input by escaping special PostgREST characters (`.`, `,`, `(`, `)`, `%`) or use parameterized filter construction to prevent filter injection.

2.13 WHEN the XP schedule constants are used THEN the system SHALL award `submission: 25`, `grade: 15`, `streak_milestone: 50`, and `first_attempt_bonus: 10` XP, matching the domain specification.

2.14 WHEN the application starts THEN the system SHALL call `Sentry.init()` with the project DSN, wrap the app in Sentry's ErrorBoundary, and configure breadcrumb tracking for navigation and API calls.

2.15 WHEN the application is loading a route THEN the `LoadingFallback` SHALL render a component-level shimmer placeholder instead of a full-page spinner, consistent with the design system.

2.16 WHEN `useUpcomingDeadlines` displays assignment deadlines THEN the system SHALL join to the `courses` table to fetch and display the actual course name instead of a truncated UUID.

2.17 WHEN the login attempt tracker rate-limits login attempts THEN the system SHALL implement server-side rate limiting (e.g., via Supabase Edge Function or RLS policy) so that rate limits cannot be bypassed by clearing client-side storage.

### Unchanged Behavior (Regression Prevention)

3.1 WHEN hooks query the `institutions` table (the only currently typed table) THEN the system SHALL CONTINUE TO provide full type inference for that table without any changes to existing query patterns.

3.2 WHEN hooks that already use the `queryKeys` factory (useUsers, useCourses, usePrograms, useILOs, usePLOs, etc.) register query keys THEN the system SHALL CONTINUE TO use the same key structure and invalidation behavior.

3.3 WHEN hooks that already have audit logging (useUsers, usePrograms, useCourses, usePLOs, useILOs, useBonusEvents, useBulkImport) perform mutations THEN the system SHALL CONTINUE TO log audit events with the same action, entity_type, and changes format.

3.4 WHEN the `process-streak` edge function processes a daily login THEN the system SHALL CONTINUE TO correctly increment `streak_count`, apply streak freezes, award milestone XP, and notify peers at milestones 7, 30, and 100.

3.5 WHEN the `award-xp` edge function awards XP for valid authorized requests THEN the system SHALL CONTINUE TO insert XP transactions, update totals, calculate levels, and trigger level-up notifications.

3.6 WHEN the leaderboard displays entries THEN the system SHALL CONTINUE TO respect anonymous opt-out, display correct XP totals and levels, and maintain proper ranking order.

3.7 WHEN Sonner toast notifications are triggered for success/error states THEN the system SHALL CONTINUE TO display them in the `top-right` position with `richColors` enabled.

3.8 WHEN the `calculate-attainment-rollup` edge function computes attainment THEN the system SHALL CONTINUE TO correctly cascade CLO → PLO → ILO attainment using weighted averages from `outcome_mappings`.

3.9 WHEN XP sources not affected by the schedule correction (login: 10, journal: 20, perfect_day: 50, badge_earned: variable, perfect_rubric: 75) are awarded THEN the system SHALL CONTINUE TO use their current XP amounts unchanged.

3.10 WHEN the existing `Toaster`, `AuthProvider`, `QueryClientProvider`, and `NuqsAdapter` providers wrap the application in `App.tsx` THEN the system SHALL CONTINUE TO function identically with the addition of Sentry and ErrorBoundary wrappers.
