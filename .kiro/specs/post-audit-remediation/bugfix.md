# Bugfix Requirements Document

## Introduction

This bugfix addresses the remaining issues identified by the Claude Opus 4.7 pre-deployment audit. Four categories of defects were verified as still present after the initial platform-audit-fixes and supabase-audit-remediation specs were completed:

- **B2 (Deploy Blocker)**: The `habit_logs` table does not exist in the database, yet 8 files across frontend hooks and edge functions reference it. These files track the 4 daily academic habits (login, submit, journal, read) per student per day — a concept distinct from wellness habits stored in `wellness_habit_logs`.
- **W3 (Security)**: 14 SECURITY DEFINER functions had EXECUTE revoked from `anon` but NOT from `authenticated`, meaning regular logged-in users can still call internal-only functions like `badge_auto_archive`, `rls_auto_enable`, `trigger_attainment_rollup`, and `is_pgcron_available` via PostgREST RPC.
- **W4 (Production hygiene)**: 68+ `console.log` calls ship to production because `vite.config.ts` has no `esbuild.drop` configuration to strip them during builds.
- **W7 (Cache correctness)**: 30+ hooks use inline `queryKey: ['string']` arrays instead of the centralized `queryKeys` factory in `src/lib/queryKeys.ts`, risking stale cache and broken invalidation.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN any code path queries the `habit_logs` table (useTodayView, useSessionCompletion, check-badges, process-streak, perfect-day-prompt, update-challenge-progress, export-student-data, compute-habit-correlations) THEN the system returns a Supabase error because the table does not exist in the database

1.2 WHEN a regular authenticated user calls `badge_auto_archive()`, `badge_spotlight_auto_rotate()`, `rls_auto_enable()`, `trigger_attainment_rollup()`, `is_pgcron_available()`, `recalculate_dynamic_prices(uuid)`, `recalculate_league_tiers(uuid)`, `increment_team_xp(uuid, integer)`, or `expire_stale_recovery_sessions()` via PostgREST RPC THEN the system executes the function because EXECUTE is still granted to the `authenticated` role

1.3 WHEN the production build is created via `vite build` THEN the system includes all `console.log`, `console.warn`, `console.error`, and `debugger` statements in the output bundle because no esbuild drop configuration exists

1.4 WHEN hooks useVisualizationData (useSankeyData, useGapAnalysis, useCoverageHeatmap), useFees (useFeeStructures, useFeePayments, useStudentFees), useCompetencyFrameworks (useCompetencyFrameworks, useCompetencyItems, useCompetencyOutcomeMappings), useGraduateAttributes (useGraduateAttributes, useGraduateAttributeMappings, useGraduateAttributeAttainment), useCalendar, useExplanationConfidence, useLeaderboardCosmetics, useOnboarding (invalidation), useSaleEvents (invalidation), usePurchase (invalidation), useAcademicCalendar, or useAdaptiveXP use inline queryKey string arrays THEN cache invalidation may fail silently because the keys do not match the centralized queryKeys factory patterns used by other hooks

### Expected Behavior (Correct)

2.1 WHEN any code path queries the `habit_logs` table THEN the system SHALL successfully read from and write to a `habit_logs` table that exists in the database with columns: `id` (uuid PK), `student_id` (uuid FK to profiles), `habit_type` (text, one of 'login', 'submit', 'journal', 'read'), `date` (date), `completed_at` (timestamptz, nullable), `created_at` (timestamptz), and a unique constraint on `(student_id, habit_type, date)`

2.2 WHEN a regular authenticated user attempts to call internal-only SECURITY DEFINER functions (`badge_auto_archive`, `badge_spotlight_auto_rotate`, `rls_auto_enable`, `trigger_attainment_rollup`, `is_pgcron_available`, `recalculate_dynamic_prices`, `recalculate_league_tiers`, `increment_team_xp`, `expire_stale_recovery_sessions`) via PostgREST RPC THEN the system SHALL reject the call because EXECUTE has been revoked from the `authenticated` role on these functions

2.3 WHEN the production build is created via `vite build` THEN the system SHALL strip all `console.log`, `console.warn`, `console.error`, `console.info`, `console.debug`, and `debugger` statements from the output bundle via esbuild's `drop` and `pure` configuration

2.4 WHEN hooks useVisualizationData, useFees, useCompetencyFrameworks, useGraduateAttributes, useCalendar, useExplanationConfidence, useLeaderboardCosmetics, useOnboarding, useSaleEvents, usePurchase, useAcademicCalendar, and useAdaptiveXP define query keys THEN the system SHALL use the centralized `queryKeys` factory from `src/lib/queryKeys.ts` for all query key definitions and invalidation calls

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the `wellness_habit_logs` table is queried by wellness-related hooks and edge functions THEN the system SHALL CONTINUE TO read and write wellness habit data (meditation, hydration, exercise, sleep) without any change to schema or behavior

3.2 WHEN the `habit_tracking` table is queried THEN the system SHALL CONTINUE TO function as before, since `habit_tracking` is a separate concept from `habit_logs`

3.3 WHEN intentionally user-callable SECURITY DEFINER functions (`get_leaderboard`, `get_wellness_aggregate_stats`, `delete_department_if_no_programs`, `get_badge_spotlight`, `get_earn_spend_ratio`, `get_effective_price`, `get_xp_balance`, `process_marketplace_purchase`, `auth_user_role`, `auth_institution_id`) are called by authenticated users THEN the system SHALL CONTINUE TO execute them successfully

3.4 WHEN the development server runs via `vite dev` THEN the system SHALL CONTINUE TO show all console output in the browser devtools for debugging purposes (drop only applies to production builds)

3.5 WHEN hooks that already use the `queryKeys` factory (useUsers, useCourses, usePrograms, useILOs, usePLOs, useCLOs, useAdminDashboard, useStudentDashboard, useTeacherDashboard, useCoordinatorDashboard, useParentDashboard, and all other previously migrated hooks) define query keys THEN the system SHALL CONTINUE TO use the same queryKeys factory patterns with identical key structures

3.6 WHEN RLS policies on existing tables are evaluated THEN the system SHALL CONTINUE TO enforce the same access control rules — the `habit_logs` table creation must include proper RLS policies but must not alter any existing table's policies

3.7 WHEN edge functions (check-badges, process-streak, perfect-day-prompt, update-challenge-progress, export-student-data, compute-habit-correlations) query `habit_logs` THEN the system SHALL CONTINUE TO use the same query patterns (select, eq, gte, lte, not) — only the table existence is being fixed, not the query logic
