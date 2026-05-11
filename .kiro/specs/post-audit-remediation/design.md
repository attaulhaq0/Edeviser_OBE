# Post-Audit Remediation Bugfix Design

## Overview

This bugfix addresses four categories of defects identified by the pre-deployment audit that remain unresolved after the initial platform-audit-fixes and supabase-audit-remediation specs:

1. **B2 — Missing `habit_logs` table**: 8 files reference a table that doesn't exist, causing runtime Supabase errors for academic habit tracking (login, submit, journal, read).
2. **W3 — EXECUTE not revoked from `authenticated`**: The previous migration revoked from `public` for internal functions but then explicitly re-granted to `authenticated` for functions that should be internal-only (`increment_team_xp`, `recalculate_dynamic_prices`, `recalculate_league_tiers`). Additionally, `expire_stale_recovery_sessions` was never addressed.
3. **W4 — Console statements in production**: No `esbuild.drop` config in `vite.config.ts` means 68+ console calls ship to production bundles.
4. **W7 — Inline queryKey arrays**: 30+ hooks bypass the centralized `queryKeys` factory, risking stale cache and broken invalidation.

The fix strategy is additive (new migration, config addition, import changes) with minimal risk to existing behavior.

## Glossary

- **Bug_Condition (C)**: The set of conditions that trigger each defect — missing table queries, unauthorized RPC calls, console in prod builds, inline queryKey mismatches
- **Property (P)**: The desired behavior — successful table queries, rejected RPC calls, stripped console output, centralized cache keys
- **Preservation**: Existing behavior that must remain unchanged — wellness_habit_logs, user-callable functions, dev server console output, already-migrated queryKeys
- **habit_logs**: New table for academic daily habits (login, submit, journal, read) — distinct from `wellness_habit_logs` (meditation, hydration, exercise, sleep)
- **SECURITY DEFINER**: PostgreSQL function attribute that executes with the privileges of the function owner (postgres), not the calling user
- **queryKeys factory**: Centralized key factory in `src/lib/queryKeys.ts` that ensures consistent cache key shapes across all hooks

## Bug Details

### Bug Condition

The bug manifests across four independent conditions. Any one of these being true constitutes a defect.

**Formal Specification:**

```
FUNCTION isBugCondition(input)
  INPUT: input of type SystemOperation
  OUTPUT: boolean

  // B2: habit_logs table missing
  LET b2 = input.type == 'database_query'
            AND input.table == 'habit_logs'
            AND NOT tableExists('habit_logs')

  // W3: authenticated user calling internal-only function
  LET w3 = input.type == 'rpc_call'
            AND input.callerRole == 'authenticated'
            AND input.functionName IN [
              'badge_auto_archive', 'badge_spotlight_auto_rotate',
              'rls_auto_enable', 'trigger_attainment_rollup',
              'is_pgcron_available', 'recalculate_dynamic_prices',
              'recalculate_league_tiers', 'increment_team_xp',
              'expire_stale_recovery_sessions'
            ]
            AND executeGranted(input.functionName, 'authenticated')

  // W4: console statements in production build
  LET w4 = input.type == 'production_build'
            AND input.buildConfig.esbuild?.drop NOT CONTAINS 'console'

  // W7: inline queryKey instead of factory
  LET w7 = input.type == 'hook_query'
            AND input.queryKey IS inline_array
            AND NOT usesQueryKeysFactory(input.queryKey)

  RETURN b2 OR w3 OR w4 OR w7
END FUNCTION
```

### Examples

- **B2**: `useTodayView` queries `supabase.from("habit_logs" as never)` → Supabase returns `{error: {message: "relation 'habit_logs' does not exist"}}` because the table was never created
- **B2**: `check-badges` edge function queries `habit_logs` for perfect_week badge → fails silently, badge never awarded
- **W3**: Authenticated user calls `supabase.rpc('recalculate_dynamic_prices', {p_institution_id: '...'})` → function executes because the previous migration explicitly granted EXECUTE to authenticated after revoking from public
- **W3**: `expire_stale_recovery_sessions` was never included in any REVOKE migration — both anon and authenticated can call it
- **W4**: Production bundle contains `console.error("[useTodayView] habit_logs query failed:", error.message)` visible in end-user browser devtools
- **W7**: `useCalendarEvents` uses `queryKey: ['calendarEvents', month, year, user?.id]` while `queryKeys.calendarEvents` factory exists but is unused — invalidation via `queryKeys.calendarEvents.lists()` misses this cache entry
- **W7**: `useCompetencyFrameworks` uses `queryKey: ['competencyFrameworks', institutionId]` inline, and mutations invalidate `['competencyFrameworks']` inline — works today but diverges from the factory pattern used everywhere else

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**

- `wellness_habit_logs` table and all wellness-related hooks/edge functions continue to read/write meditation, hydration, exercise, sleep data without any schema or behavior change
- `habit_tracking` table continues to function as before (separate concept from `habit_logs`)
- User-callable SECURITY DEFINER functions (`get_leaderboard`, `get_wellness_aggregate_stats`, `delete_department_if_no_programs`, `get_badge_spotlight`, `get_earn_spend_ratio`, `get_effective_price`, `get_xp_balance`, `process_marketplace_purchase`, `auth_user_role`, `auth_institution_id`) remain callable by authenticated users
- Development server (`vite dev`) continues to show all console output in browser devtools
- All hooks already using the `queryKeys` factory (useUsers, useCourses, usePrograms, useILOs, usePLOs, useCLOs, all dashboard hooks, etc.) continue using identical key structures
- Existing RLS policies on all tables remain unchanged — the new `habit_logs` table gets its own policies without altering others
- Edge functions (check-badges, process-streak, perfect-day-prompt, etc.) continue using the same query patterns against `habit_logs` — only the table existence is being fixed

**Scope:**
All operations that do NOT involve the four bug conditions should be completely unaffected. This includes:

- All existing database tables and their RLS policies
- All existing SECURITY DEFINER functions not listed in the internal-only set
- Development builds and test runs
- Hooks that already use the queryKeys factory

## Hypothesized Root Cause

Based on the bug description and code analysis, the root causes are:

1. **B2 — Missing migration**: The `habit_logs` table was referenced in code (useTodayView, useSessionCompletion, check-badges, process-streak, perfect-day-prompt, update-challenge-progress, export-student-data, compute-habit-correlations) but the corresponding `CREATE TABLE` migration was never written. The `as never` type casts in frontend code were used as a workaround to suppress TypeScript errors, masking the missing table.

2. **W3 — Incomplete REVOKE + explicit re-GRANT**: Migration `20260504033048` correctly revoked from `public` for internal functions, but then explicitly re-granted to `authenticated` for `increment_team_xp`, `recalculate_dynamic_prices`, and `recalculate_league_tiers` — treating them as user-callable when they are actually internal-only (called by cron jobs and edge functions via service_role). Additionally, `expire_stale_recovery_sessions` was omitted from all REVOKE migrations entirely.

3. **W4 — Missing build config**: The `vite.config.ts` `build` section configures `rollupOptions` for chunk splitting but has no `esbuild` section. Vite supports `esbuild: { drop: ['console', 'debugger'] }` to strip these at build time, but it was never added.

4. **W7 — Incremental development without migration**: As new features were added (visualization, fees, competency frameworks, graduate attributes, calendar, adaptive XP, etc.), developers used inline `queryKey: ['entityName', ...]` arrays instead of adding factories to `queryKeys.ts` first. Some factories were later added to `queryKeys.ts` (e.g., `competencyFrameworks`, `graduateAttributes`, `calendarEvents`) but the hooks were never updated to import and use them.

## Correctness Properties

Property 1: Bug Condition — habit_logs Table Exists and Is Queryable

_For any_ database query targeting the `habit_logs` table with valid student_id, habit_type, and date parameters, the fixed system SHALL successfully execute the query (SELECT, INSERT, UPSERT) without returning a "relation does not exist" error, and the table SHALL enforce the UNIQUE constraint on (student_id, habit_type, date).

**Validates: Requirements 2.1**

Property 2: Bug Condition — Internal Functions Reject Authenticated Callers

_For any_ RPC call from an `authenticated` role user to any of the internal-only functions (badge_auto_archive, badge_spotlight_auto_rotate, rls_auto_enable, trigger_attainment_rollup, is_pgcron_available, recalculate_dynamic_prices, recalculate_league_tiers, increment_team_xp, expire_stale_recovery_sessions), the fixed system SHALL reject the call with a permission denied error.

**Validates: Requirements 2.2**

Property 3: Bug Condition — Production Build Strips Console Statements

_For any_ production build created via `vite build`, the output JavaScript bundle SHALL NOT contain any `console.log`, `console.warn`, `console.error`, `console.info`, `console.debug`, or `debugger` statements.

**Validates: Requirements 2.3**

Property 4: Bug Condition — All Hooks Use Centralized queryKeys Factory

_For any_ hook in the affected set (useVisualizationData, useFees, useCompetencyFrameworks, useGraduateAttributes, useCalendar, useExplanationConfidence, useLeaderboardCosmetics, useSaleEvents, usePurchase, useOnboarding, useAcademicCalendar, useAdaptiveXP), the fixed code SHALL import and use the `queryKeys` factory from `src/lib/queryKeys.ts` for all queryKey definitions and invalidation calls, with no inline string array queryKeys remaining.

**Validates: Requirements 2.4**

Property 5: Preservation — Wellness Habits and User-Callable Functions Unchanged

_For any_ operation that does NOT involve the bug conditions (wellness habit queries, user-callable function RPC calls, dev server console output, hooks already using queryKeys factory), the fixed system SHALL produce exactly the same behavior as the original system, preserving all existing functionality.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**B2 — Create `habit_logs` table**

**File**: New Supabase migration

**Specific Changes**:

1. **CREATE TABLE**: `habit_logs` with columns: `id` (uuid PK, default gen_random_uuid()), `student_id` (uuid FK to profiles ON DELETE CASCADE), `habit_type` (text CHECK in ('login','submit','journal','read')), `date` (date), `completed_at` (timestamptz default now()), `created_at` (timestamptz default now())
2. **UNIQUE constraint**: On `(student_id, habit_type, date)` for upsert support
3. **Indexes**: `idx_habit_logs_student_date` on `(student_id, date)`, `idx_habit_logs_student_type_date` on `(student_id, habit_type, date)`
4. **RLS policies**: Enable RLS; students SELECT/INSERT/UPDATE own rows (`student_id = auth.uid()`); parents SELECT linked student rows (via `parent_student_links`); admin full access within institution
5. **Remove `as never` casts**: In `useTodayView.ts` (line using `"habit_logs" as never`) and `useSessionCompletion.ts` (line using `"habit_logs" as never`) — after types are regenerated, these casts become unnecessary

**Design Decision**: Use `text CHECK` constraint for `habit_type` instead of an enum type. The existing `wellness_habit_logs` uses `wellness_habit_type` enum, but `habit_logs` is a different domain (academic habits). A CHECK constraint is simpler, avoids enum migration complexity, and is sufficient for 4 fixed values.

---

**W3 — REVOKE EXECUTE on internal functions from authenticated**

**File**: New Supabase migration

**Specific Changes**:

1. **REVOKE from authenticated**: For `increment_team_xp(uuid, integer)`, `recalculate_dynamic_prices(uuid)`, `recalculate_league_tiers(uuid)` — these were incorrectly re-granted in the previous migration
2. **REVOKE from authenticated and anon**: For `expire_stale_recovery_sessions()` — never addressed in any previous migration
3. **REVOKE from anon**: For `badge_auto_archive()`, `badge_spotlight_auto_rotate()`, `rls_auto_enable()`, `trigger_attainment_rollup()`, `is_pgcron_available()` — ensure anon is also revoked (some may already be revoked, but REVOKE is idempotent)
4. **Do NOT revoke**: `get_leaderboard`, `get_wellness_aggregate_stats`, `delete_department_if_no_programs`, `get_badge_spotlight`, `get_earn_spend_ratio`, `get_effective_price`, `get_xp_balance`, `process_marketplace_purchase`, `auth_user_role`, `auth_institution_id` — these are user-callable

---

**W4 — Add esbuild drop config**

**File**: `vite.config.ts`

**Specific Changes**:

1. **Add esbuild config**: Inside the `build` section, add `esbuild: { drop: ['console', 'debugger'] }` — this strips all console.\* calls and debugger statements from production builds only (dev server is unaffected because esbuild.drop only applies during `vite build`)

---

**W7 — Migrate inline queryKeys to factory**

**File**: `src/lib/queryKeys.ts` — add missing key factories

**New factories needed**:

1. `studentFees` — for `useStudentFees`
2. `explanationConfidence` — for `useExplanationConfidence` (distinct from `verifiedExplanations`)
3. `leaderboardCosmetics` — for `useLeaderboardCosmetics`
4. `assignmentDifficultyBonus` — for `useAssignmentDifficultyBonus` in useAdaptiveXP
5. `academicCalendar` — alias or use existing `academicCalendarEvents`

**Factories that already exist but hooks don't use them** (just need hook updates):

- `queryKeys.sankeyData` — exists, `useSankeyData` uses inline `['sankeyData', programId]`
- `queryKeys.gapAnalysisData` — exists, `useGapAnalysis` uses inline `['gapAnalysis', programId]`
- `queryKeys.coverageHeatmapData` — exists, `useCoverageHeatmap` uses inline `['coverageHeatmap', programId]`
- `queryKeys.feeStructures` — exists, `useFeeStructures` uses inline `['feeStructures', programId]`
- `queryKeys.feePayments` — exists, `useFeePayments` uses inline `['feePayments', feeStructureId]`
- `queryKeys.competencyFrameworks` — exists, hooks use inline `['competencyFrameworks', ...]`
- `queryKeys.competencyItems` — exists, hooks use inline `['competencyItems', ...]`
- `queryKeys.competencyOutcomeMappings` — exists, hooks use inline `['competencyOutcomeMappings', ...]`
- `queryKeys.graduateAttributes` — exists, hooks use inline `['graduateAttributes', ...]`
- `queryKeys.graduateAttributeMappings` — exists, hooks use inline `['graduateAttributeMappings', ...]`
- `queryKeys.graduateAttributeAttainment` — exists, hooks use inline `['graduateAttributeAttainment', ...]`
- `queryKeys.calendarEvents` — exists, `useCalendarEvents` uses inline `['calendarEvents', ...]`
- `queryKeys.academicCalendarEvents` — exists, `useAcademicCalendarEvents` uses inline `['academicCalendarEvents']`

**Hook files to update** (import `queryKeys` and replace inline arrays):

- `src/hooks/useVisualizationData.ts` — useSankeyData, useGapAnalysis, useCoverageHeatmap
- `src/hooks/useFees.ts` — useFeeStructures, useFeePayments, useStudentFees, mutations
- `src/hooks/useCompetencyFrameworks.ts` — all hooks and mutations
- `src/hooks/useGraduateAttributes.ts` — all hooks and mutations
- `src/hooks/useCalendar.ts` — useCalendarEvents
- `src/hooks/useExplanationConfidence.ts` — useExplanationConfidence
- `src/hooks/useLeaderboardCosmetics.ts` — useLeaderboardCosmetics
- `src/hooks/useSaleEvents.ts` — inline marketplace invalidation calls
- `src/hooks/usePurchase.ts` — inline marketplace invalidation calls
- `src/hooks/useOnboarding.ts` — inline profiles invalidation
- `src/hooks/useAcademicCalendar.ts` — all hooks and mutations
- `src/hooks/useAdaptiveXP.ts` — useAssignmentDifficultyBonus

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bugs on unfixed code, then verify the fixes work correctly and preserve existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bugs BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests that verify each bug condition exists in the current codebase. Run these tests on the UNFIXED code to observe failures and understand the root cause.

**Test Cases**:

1. **B2 — habit_logs query test**: Mock supabase to verify that `useTodayView` queries `habit_logs` and receives an error (will fail on unfixed code because table doesn't exist)
2. **W3 — authenticated RPC test**: Verify that the migration SQL does not contain REVOKE for `increment_team_xp` from `authenticated` (will show the gap on unfixed code)
3. **W4 — vite config test**: Parse `vite.config.ts` and assert `esbuild.drop` contains `'console'` (will fail on unfixed code)
4. **W7 — inline queryKey test**: Scan hook files for inline `queryKey: ['string']` patterns not using `queryKeys.` import (will find matches on unfixed code)

**Expected Counterexamples**:

- B2: Supabase error "relation 'habit_logs' does not exist"
- W3: `increment_team_xp`, `recalculate_dynamic_prices`, `recalculate_league_tiers` have EXECUTE granted to authenticated
- W4: `vite.config.ts` has no `esbuild` key in build section
- W7: 15+ hooks use inline queryKey arrays

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**

```
FOR ALL input WHERE isBugCondition(input) DO
  result := fixedSystem(input)
  ASSERT expectedBehavior(result)
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**

```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT originalSystem(input) = fixedSystem(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:

- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for non-bug operations, then write property-based tests capturing that behavior.

**Test Cases**:

1. **Wellness habit preservation**: Verify `wellness_habit_logs` queries continue to work identically
2. **User-callable function preservation**: Verify `get_leaderboard`, `get_badge_spotlight`, etc. remain callable by authenticated
3. **Dev server console preservation**: Verify dev builds retain console statements
4. **Existing queryKeys preservation**: Verify hooks already using factory continue with same key shapes

### Unit Tests

- B2: Test that the migration SQL creates `habit_logs` with correct columns, constraints, indexes, and RLS policies
- W3: Test that the migration SQL revokes EXECUTE from authenticated for all 9 internal functions
- W4: Test that `vite.config.ts` build.esbuild.drop includes 'console' and 'debugger'
- W7: Test that each migrated hook imports `queryKeys` and uses factory methods (static analysis / snapshot tests)
- W7: Test that `queryKeys.ts` exports all required key factories

### Property-Based Tests

- Generate random habit_type values and verify CHECK constraint accepts only valid types ('login', 'submit', 'journal', 'read')
- Generate random (student_id, habit_type, date) tuples and verify UNIQUE constraint prevents duplicates
- Generate random queryKey factory calls and verify they produce arrays starting with the entity name
- Generate random hook configurations and verify all queryKey definitions use the factory pattern

### Integration Tests

- B2: End-to-end test of habit logging flow (useTodayView → habit_logs query → successful response)
- W3: Verify authenticated user gets permission denied when calling internal functions via RPC
- W4: Run `vite build` and verify output bundle does not contain console.log strings
- W7: Verify cache invalidation works correctly across hooks using the same queryKeys factory
