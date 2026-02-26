# Tasks — Habit Heatmap Visualization & Wellness Habits

## Task 1: Database Schema & Migrations

- [ ] 1.1 Create `wellness_habit_type` enum: `CREATE TYPE wellness_habit_type AS ENUM ('meditation', 'hydration', 'exercise', 'sleep');`
- [ ] 1.2 Create `wellness_habit_logs` table with columns (id, student_id, date, wellness_type, value, completed_at, created_at), unique constraint on (student_id, date, wellness_type), FK to profiles, and indexes on (student_id, date) and (student_id, wellness_type, date)
- [ ] 1.3 Create `student_wellness_preferences` table with columns (id, student_id, enabled_habits, parent_visibility, created_at, updated_at), unique constraint on student_id, FK to profiles
- [ ] 1.4 Add `wellness_xp_amount` integer column (default 5) to `institution_settings` table
- [ ] 1.5 Create index `idx_habit_logs_student_date` on existing `habit_logs(student_id, date)` if not exists
- [ ] 1.6 Create RLS policies on `wellness_habit_logs`: student SELECT/INSERT own, student UPDATE value on own, parent SELECT linked with parent_visibility=true, no DELETE, no teacher SELECT
- [ ] 1.7 Create RLS policies on `student_wellness_preferences`: student ALL on own, no other role access
- [ ] 1.8 Create `get_wellness_aggregate_stats` database function for admin aggregate access
- [ ] 1.9 Regenerate TypeScript types: `npx supabase gen types --linked > src/types/database.ts`

## Task 2: TypeScript Types & Shared Utilities

- [ ] 2.1 Create `src/types/habits.ts` with types: WellnessHabitType, AcademicHabitType, HabitType, HeatmapDay, CompletedHabit, WellnessHabitLog, WellnessPreferences, HeatmapSummary, CompletionRateData, DayOfWeekData, CorrelationInsight, HabitReportRow, DateRange
- [ ] 2.2 Create `src/lib/heatmapUtils.ts` with pure functions: `getIntensityLevel(count)`, `computeLongestStreak(days)`, `computeConsistencyScore(days, totalDays)`, `computeCompletionRate(completed, possiblePerDay, days)`, `computeDayOfWeekAverages(days)`, `getBestDay(averages)`, `computeCellSize(containerWidth, numWeeks)`, `generateMonthLabels(startDate, endDate)`, `generateGridDimensions(startDate, endDate)`, `isDateFuture(date)`, `getFilterOptions(enabledWellnessHabits)`, `generateAriaLabel(date, count)`
- [ ] 2.3 Create `src/lib/habitExport.ts` with `generateHabitCSV(data, summary, enabledWellnessHabits)` and `downloadCSV(csv, filename)` functions
- [ ] 2.4 Create `src/lib/perfectDayCheck.ts` with `isPerfectDay(academicHabits)` function that checks only the 4 academic habits (excluding wellness)
- [ ] 2.5 Add Zod schema `wellnessXpAmountSchema` (integer, min 0, max 25) to `src/lib/schemas/`

## Task 3: Property-Based Tests for Heatmap Utilities

- [ ] 3.1 Create `src/__tests__/properties/habitHeatmap.property.test.ts` with property tests for Properties 1–10 and 25 (grid structure, intensity mapping, tooltip content, future dates, filter options, binary filter, all-habits sum, longest streak, total active days, cell size, ARIA labels)
- [ ] 3.2 Create `src/__tests__/properties/wellnessHabits.property.test.ts` with property tests for Properties 11–16 and 26 (preferences toggle, log fields, one-per-day, Perfect Day exclusion, wellness XP, XP validation, bonus multiplier)
- [ ] 3.3 Create `src/__tests__/properties/habitAnalytics.property.test.ts` with property tests for Properties 17–21 (completion rate formula, consistency score, day-of-week averages, correlation cap/language, CSV structure)
- [ ] 3.4 Create `src/__tests__/properties/habitBadges.property.test.ts` with property tests for Properties 22–24 (Habit Master 30-day, Wellness Warrior 14-consecutive, Full Spectrum 7-day)

## Task 4: Award-XP Edge Function Update

- [ ] 4.1 Add `'wellness_habit'` to `XPSource` type union and `VALID_SOURCES` array in `supabase/functions/award-xp/index.ts`
- [ ] 4.2 Add wellness XP lookup logic: when source is `wellness_habit`, fetch `wellness_xp_amount` from `institution_settings` for the student's institution and use that as the XP amount (override the passed `xp_amount`)
- [ ] 4.3 Handle `wellness_xp_amount = 0`: skip XP transaction insert and return `{ success: true, xp_awarded: 0 }`
- [ ] 4.4 Write unit test for award-xp wellness_habit source handling in `src/__tests__/unit/awardXpWellness.test.ts`

## Task 5: Check-Badges Edge Function Update

- [ ] 5.1 Add `'habit_log'` to `BadgeTrigger` type and `VALID_TRIGGERS` array in `supabase/functions/check-badges/index.ts`
- [ ] 5.2 Add badge XP entries for `habit_master` (100), `wellness_warrior` (75), `full_spectrum` (150) to `BADGE_XP` map
- [ ] 5.3 Implement `checkHabitBadges()` function: Habit Master (30+ active days in semester), Wellness Warrior (14 consecutive wellness days), Full Spectrum (7 days with all 4 academic + ≥1 wellness)
- [ ] 5.4 Wire `checkHabitBadges()` into the main handler for `habit_log` trigger
- [ ] 5.5 Add badge definitions to `src/lib/badgeDefinitions.ts`: habit_master, wellness_warrior, full_spectrum with names, descriptions, icons, XP rewards, and conditions
- [ ] 5.6 Write unit test for habit badge conditions in `src/__tests__/unit/habitBadges.test.ts`

## Task 6: Compute-Habit-Correlations Edge Function

- [ ] 6.1 Create `supabase/functions/compute-habit-correlations/index.ts` with standard Edge Function structure (CORS, service role client)
- [ ] 6.2 Implement correlation logic: fetch habit_logs + wellness_habit_logs + submissions for semester range, compute co-occurrence rates between habit types and academic events, return up to 3 insights sorted by strength
- [ ] 6.3 Implement 14-day minimum data threshold check — return empty insights with `insufficient_data: true` flag when below threshold
- [ ] 6.4 Ensure insight text uses non-causal language ("on days when", "tends to") — no "because", "causes", "due to"
- [ ] 6.5 Write unit test for correlation computation logic in `src/__tests__/unit/habitCorrelations.test.ts`

## Task 7: TanStack Query Hooks

- [ ] 7.1 Create `src/hooks/useHeatmapData.ts` with `useHeatmapData(studentId, semesterRange, filter)` hook — single aggregated query joining habit_logs + wellness_habit_logs grouped by date
- [ ] 7.2 Create `useHeatmapSummary` hook in same file — derives current streak (from student_gamification), longest streak, and total active days from heatmap data
- [ ] 7.3 Create `src/hooks/useWellnessPreferences.ts` with `useWellnessPreferences(studentId)` query and `useUpdateWellnessPreferences` mutation
- [ ] 7.4 Create `src/hooks/useWellnessHabits.ts` with `useWellnessHabitLogs(studentId, date)` query, `useLogWellnessHabit` mutation (insert log → invoke award-xp → invoke check-badges → invalidate queries)
- [ ] 7.5 Create `src/hooks/useHabitAnalytics.ts` with `useWeeklyCompletionRates`, `useMonthlyCompletionRates`, `useConsistencyScore`, `useBestDayOfWeek` hooks
- [ ] 7.6 Create `src/hooks/useHabitCorrelations.ts` with `useHabitCorrelations(studentId)` hook — invokes compute-habit-correlations Edge Function
- [ ] 7.7 Create `src/hooks/useHabitExport.ts` with `useHabitExport` hook — generates CSV from cached TanStack Query data and triggers browser download

## Task 8: Heatmap Grid Components

- [ ] 8.1 Create `src/components/shared/HeatmapGrid.tsx` — SVG-based grid rendering with cells, month labels, day-of-week labels, color legend; accepts HeatmapDay[] data and DateRange
- [ ] 8.2 Implement cell color intensity using streak gradient palette (5 levels: empty, light, medium-light, medium, full) with CSS custom properties
- [ ] 8.3 Implement keyboard navigation (arrow keys between cells, Enter/Space to activate tooltip) with proper focus management
- [ ] 8.4 Add ARIA labels on each cell: `aria-label="{formatted date}: {count} habits completed"`
- [ ] 8.5 Implement `prefers-reduced-motion` support — disable hover/tap transition animations
- [ ] 8.6 Implement responsive cell sizing: `max(floor(containerWidth / numWeeks), 12)` on desktop, fixed 12px with horizontal scroll on mobile
- [ ] 8.7 Write unit test `src/__tests__/unit/heatmapGrid.test.tsx` for grid rendering, cell states, keyboard nav, ARIA attributes

## Task 9: Heatmap Interaction Components

- [ ] 9.1 Create `src/components/shared/HeatmapTooltip.tsx` — desktop hover tooltip showing date, completed habits with checkmarks, XP earned, streak status
- [ ] 9.2 Create `src/components/shared/HabitMobileBottomSheet.tsx` — mobile tap bottom sheet with same content as tooltip, using Shadcn Sheet component
- [ ] 9.3 Handle empty day state: tooltip shows "No habits completed" with date
- [ ] 9.4 Handle future date state: cell rendered as disabled, no tooltip interaction
- [ ] 9.5 Write unit test `src/__tests__/unit/heatmapTooltip.test.tsx` for tooltip content variants

## Task 10: Heatmap Filters & Summary Stats

- [ ] 10.1 Create `src/components/shared/HeatmapFilters.tsx` — pill-style filter tabs using Shadcn Tabs with "All Habits" default, academic habits, and enabled wellness habits; persisted via nuqs `useQueryState('habit', ...)`
- [ ] 10.2 Create `src/components/shared/HeatmapSummaryStats.tsx` — 3 KPI cards (current streak with flame icon, longest streak, total active days) using project KPI card pattern
- [ ] 10.3 Write unit test `src/__tests__/unit/heatmapFilters.test.tsx` for filter rendering and selection

## Task 11: Wellness Habit Components

- [ ] 11.1 Create `src/components/shared/WellnessHabitLogger.tsx` — displays enabled wellness habits with toggle buttons and optional value input (minutes, glasses, hours), visually separated from academic habits with "Wellness" section label
- [ ] 11.2 Create wellness preferences panel (inline on habits page) — 4 toggle switches for wellness habits with descriptions, parent visibility toggle
- [ ] 11.3 Implement one-log-per-day enforcement in UI: disable toggle after logging, show checkmark for completed
- [ ] 11.4 Implement XP award flow: on wellness log → call award-xp with source 'wellness_habit' → show XP toast on success
- [ ] 11.5 Write unit tests `src/__tests__/unit/wellnessHabitLogger.test.tsx` and `src/__tests__/unit/wellnessSettings.test.tsx`

## Task 12: Habit Heatmap Page

- [ ] 12.1 Create `src/pages/student/habits/HabitHeatmapPage.tsx` — main page composing: HeatmapSummaryStats, HeatmapFilters, HeatmapGrid, WellnessHabitLogger, and link to analytics
- [ ] 12.2 Implement semester range resolution: fetch from semesters table or fall back to current calendar year
- [ ] 12.3 Wrap page in ErrorBoundary
- [ ] 12.4 Add route `/student/habits` to `src/router/AppRouter.tsx`
- [ ] 12.5 Add "Habits" nav item to `src/pages/student/StudentLayout.tsx` with appropriate icon

## Task 13: Habit Analytics Dashboard

- [ ] 13.1 Create `src/components/shared/ConsistencyScoreRing.tsx` — circular progress indicator using SVG circle with percentage text
- [ ] 13.2 Create `src/components/shared/HabitCompletionChart.tsx` — Recharts BarChart for weekly/monthly completion rates with academic-only / all-habits toggle
- [ ] 13.3 Create `src/components/shared/BestDayChart.tsx` — Recharts horizontal BarChart for day-of-week averages with best day highlighted
- [ ] 13.4 Create `src/components/shared/CorrelationInsightCard.tsx` — card displaying insight description with habit icon and strength indicator
- [ ] 13.5 Create `src/pages/student/habits/HabitAnalyticsPage.tsx` — composing: ConsistencyScoreRing, HabitCompletionChart (weekly + monthly), BestDayChart, CorrelationInsightCards (up to 3), Export Report button
- [ ] 13.6 Implement insufficient data state for correlations: "Keep tracking — insights appear after 2 weeks of data"
- [ ] 13.7 Implement CSV export button using useHabitExport hook
- [ ] 13.8 Wrap page in ErrorBoundary
- [ ] 13.9 Add route `/student/habits/analytics` to `src/router/AppRouter.tsx`
- [ ] 13.10 Write unit tests `src/__tests__/unit/habitAnalyticsPage.test.tsx` and `src/__tests__/unit/correlationInsightCard.test.tsx`

## Task 14: Admin Wellness XP Configuration

- [ ] 14.1 Add wellness XP amount field to admin institution settings page — number input with Zod validation (0–25), label "Wellness XP per Completion", helper text explaining 0 disables XP
- [ ] 14.2 Create mutation hook for updating `wellness_xp_amount` in `institution_settings` with audit logging
- [ ] 14.3 Write unit test for wellness XP config validation

## Task 15: Integration & Polish

- [ ] 15.1 Verify heatmap data query performance: ensure single-query aggregation completes within 500ms for full semester (~120 days)
- [ ] 15.2 Verify wellness habit logging flow end-to-end: log → XP award → badge check → heatmap update
- [ ] 15.3 Verify parent visibility flow: student enables parent_visibility → parent can see wellness data via RLS
- [ ] 15.4 Verify CSV export generates correct file with all required columns and summary row
- [ ] 15.5 Run all property-based tests and unit tests, fix any failures
