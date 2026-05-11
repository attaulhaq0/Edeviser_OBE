# Post-Audit Remediation — Implementation Tasks

## B2: Create habit_logs Table

- [x] 1. Create habit_logs migration and update TypeScript types
  - [x] 1.1 Create Supabase migration `create_habit_logs_table.sql` with: CREATE TABLE habit_logs (id uuid PK default gen_random_uuid(), student_id uuid FK to profiles ON DELETE CASCADE, habit_type text CHECK IN ('login','submit','journal','read'), date date, completed_at timestamptz default now(), created_at timestamptz default now()); UNIQUE (student_id, habit_type, date); indexes idx_habit_logs_student_date and idx_habit_logs_student_type_date; ENABLE RLS; student SELECT/INSERT/UPDATE own rows; parent SELECT linked rows via parent_student_links; admin full access within institution
  - [x] 1.2 Remove `as never` type casts from `src/hooks/useTodayView.ts` (change `"habit_logs" as never` to `"habit_logs"`) and `src/hooks/useSessionCompletion.ts` (change `"habit_logs" as never` to `"habit_logs"` and `as never` on upsert data)
  - [x] 1.3 Write unit test verifying habit_logs migration SQL contains correct CREATE TABLE, CHECK constraint, UNIQUE constraint, indexes, and RLS policies

## W3: REVOKE EXECUTE on Internal Functions

- [x] 2. Create migration to revoke EXECUTE from authenticated on internal-only functions
  - [x] 2.1 Create Supabase migration `revoke_authenticated_execute_internal_functions.sql` that: REVOKE EXECUTE from authenticated on increment_team_xp(uuid, integer), recalculate_dynamic_prices(uuid), recalculate_league_tiers(uuid), expire_stale_recovery_sessions(); REVOKE EXECUTE from anon on expire_stale_recovery_sessions(); also re-revoke from anon on badge_auto_archive(), badge_spotlight_auto_rotate(), rls_auto_enable(), trigger_attainment_rollup(), is_pgcron_available() for safety (idempotent)
  - [x] 2.2 Write unit test verifying migration SQL contains REVOKE statements for all 9 internal functions and does NOT revoke from user-callable functions (get_leaderboard, get_badge_spotlight, etc.)

## W4: Strip Console Statements from Production Builds

- [x] 3. Add esbuild drop config to vite.config.ts
  - [x] 3.1 Add `esbuild: { drop: ['console', 'debugger'] }` to the `build` section of `vite.config.ts`
  - [x] 3.2 Write unit test verifying vite.config.ts build section contains esbuild.drop with 'console' and 'debugger'

## W7: Migrate Inline queryKeys to Factory

- [x] 4. Add missing key factories to queryKeys.ts

  - [x] 4.1 Add to `src/lib/queryKeys.ts`: `studentFees` (createKeys), `explanationConfidence` (createKeys), `leaderboardCosmetics` (createKeys), `assignmentDifficultyBonus` (createKeys); export all in the queryKeys object
  - [x] 4.2 Write unit test verifying queryKeys exports contain all new factories and produce correct key shapes

- [x] 5. Migrate visualization hooks to use queryKeys factory

  - [x] 5.1 Update `src/hooks/useVisualizationData.ts`: import queryKeys; replace `['sankeyData', programId]` with `queryKeys.sankeyData.list({ programId })`, `['gapAnalysis', programId]` with `queryKeys.gapAnalysisData.list({ programId })`, `['coverageHeatmap', programId]` with `queryKeys.coverageHeatmapData.list({ programId })`

- [x] 6. Migrate fee hooks to use queryKeys factory

  - [x] 6.1 Update `src/hooks/useFees.ts`: import queryKeys; replace `['feeStructures', programId]` with `queryKeys.feeStructures.list({ programId })`, `['feePayments', feeStructureId]` with `queryKeys.feePayments.list({ feeStructureId })`, `['studentFees', studentId]` with `queryKeys.studentFees.list({ studentId })`; update mutation invalidation calls to use `queryKeys.feeStructures.lists()` and `queryKeys.feePayments.lists()`

- [x] 7. Migrate competency framework hooks to use queryKeys factory

  - [x] 7.1 Update `src/hooks/useCompetencyFrameworks.ts`: import queryKeys; replace `['competencyFrameworks', institutionId]` with `queryKeys.competencyFrameworks.list({ institutionId })`, `['competencyItems', frameworkId]` with `queryKeys.competencyItems.list({ frameworkId })`, `['competencyOutcomeMappings', frameworkId]` with `queryKeys.competencyOutcomeMappings.list({ frameworkId })`; update mutation invalidation calls to use `queryKeys.competencyFrameworks.lists()` and `queryKeys.competencyItems.lists()`

- [x] 8. Migrate graduate attribute hooks to use queryKeys factory

  - [x] 8.1 Update `src/hooks/useGraduateAttributes.ts`: import queryKeys; replace `['graduateAttributes', institutionId]` with `queryKeys.graduateAttributes.list({ institutionId })`, `['graduateAttributeMappings', attributeId]` with `queryKeys.graduateAttributeMappings.list({ attributeId })`, `['graduateAttributeAttainment', institutionId]` with `queryKeys.graduateAttributeAttainment.list({ institutionId })`; update mutation invalidation calls to use `queryKeys.graduateAttributes.lists()`

- [x] 9. Migrate calendar, explanation confidence, and leaderboard cosmetics hooks

  - [x] 9.1 Update `src/hooks/useCalendar.ts`: import queryKeys; replace `['calendarEvents', month, year, user?.id]` with `queryKeys.calendarEvents.list({ month, year, userId: user?.id })`
  - [x] 9.2 Update `src/hooks/useExplanationConfidence.ts`: import queryKeys (already imported); replace `['explanationConfidence', questionId]` with `queryKeys.explanationConfidence.detail(questionId)`
  - [x] 9.3 Update `src/hooks/useLeaderboardCosmetics.ts`: import queryKeys; replace `['leaderboard', 'cosmetics', ...studentIds.slice(0, 5)]` with `queryKeys.leaderboardCosmetics.list({ studentIds: studentIds.slice(0, 5).join(',') })`

- [x] 10. Migrate remaining hooks with inline invalidation calls
  - [x] 10.1 Update `src/hooks/useSaleEvents.ts`: replace inline `queryKey: ['marketplace', 'items']` invalidation with `queryKeys.marketplace.items()`
  - [x] 10.2 Update `src/hooks/usePurchase.ts`: replace inline `queryKey: ['marketplace', 'items']` and `['marketplace', 'transactions']` invalidation with `queryKeys.marketplace.items()` and `queryKeys.marketplace.transactions()`
  - [x] 10.3 Update `src/hooks/useOnboarding.ts`: replace inline `queryKey: ['profiles']` invalidation with `queryKeys.profiles.all`
  - [x] 10.4 Update `src/hooks/useAcademicCalendar.ts`: import queryKeys; replace `['academicCalendarEvents']` with `queryKeys.academicCalendarEvents.lists()` in query and mutation invalidation calls
  - [x] 10.5 Update `src/hooks/useAdaptiveXP.ts`: import queryKeys (already imported); replace `['assignmentDifficultyBonus', ...cloIds]` with `queryKeys.assignmentDifficultyBonus.list({ cloIds: cloIds.join(',') })`

## Verification

- [x] 11. Run verification checks
  - [x] 11.1 Run `npx tsc --noEmit` to verify no TypeScript errors after removing `as never` casts and updating queryKey types
  - [x] 11.2 Run `npm run lint` to verify no ESLint warnings
  - [x] 11.3 Run `npm test` to verify all existing and new tests pass
