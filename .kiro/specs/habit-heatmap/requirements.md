# Requirements Document — Habit Heatmap Visualization & Wellness Habits

## Introduction

The Habit Heatmap feature extends the existing daily habit tracking system in Edeviser from a 7-day grid into a semester-long heatmap visualization (inspired by GitHub's contribution graph) and introduces optional wellness habits alongside the existing academic habits. Currently, the platform tracks 4 academic habits (Login, Submit, Journal, Read) in a `habit_logs` table with a `HabitType` enum, displayed as a 7-day grid on the Student Dashboard. Perfect Day (all 4 academic habits completed) awards 50 XP. This feature adds: (1) a semester-long heatmap where each cell represents one day and color intensity reflects the number of habits completed, with hover/tap detail tooltips; (2) wellness habits (Meditation, Hydration, Exercise, Sleep) that are opt-in, contribute to the heatmap but do NOT count toward Perfect Day, and are private to the student by default; (3) a Habit Analytics Dashboard showing weekly/monthly completion rates, consistency scores, best-day-of-week analysis, habit correlation insights, and exportable reports. The feature integrates with the existing Supabase backend (PostgreSQL + RLS, Edge Functions, Realtime), TanStack Query hooks, gamification engine (XP, streaks, badges), and the student dashboard.

## Glossary

- **Heatmap**: The semester-long grid visualization where each cell represents one calendar day, color intensity encodes the number of habits completed that day (0 through maximum tracked habits), and interaction (hover on desktop, tap on mobile) reveals a detail tooltip
- **Heatmap_Cell**: A single day cell in the Heatmap, displaying color intensity based on habit completion count and providing interactive detail on hover/tap
- **Academic_Habit**: One of the 4 existing daily habits tracked by the platform: Login, Submit, Journal, Read. These count toward Perfect Day and are stored in `habit_logs` with `habit_type` enum values
- **Wellness_Habit**: An optional, student-enabled daily habit in one of 4 categories: Meditation, Hydration, Exercise, Sleep. Wellness habits contribute to the Heatmap but do NOT count toward Perfect Day
- **Habit_Log**: A record in the `habit_logs` table representing a single habit completion event for a student on a given date, with columns including student_id, date, habit_type, and completed_at
- **Wellness_Habit_Log**: A record in the `wellness_habit_logs` table representing a single wellness habit completion event, with columns including student_id, date, wellness_type, value, and completed_at
- **Wellness_Preferences**: A record in the `student_wellness_preferences` table storing which wellness habits a student has opted into and their visibility settings
- **Perfect_Day**: The existing gamification event triggered when a student completes all 4 Academic_Habits in a single calendar day, awarding 50 XP. Wellness habits are excluded from this calculation
- **Habit_Analytics_Dashboard**: The student-facing analytics page showing weekly/monthly completion rates, consistency score, best-day-of-week analysis, habit correlation insights, and exportable reports
- **Consistency_Score**: The percentage of days within a selected date range on which the student completed at least one habit (academic or wellness combined)
- **Habit_Filter**: A UI control on the Heatmap that allows filtering the visualization by individual habit type (academic or wellness) or viewing all habits combined
- **Semester_Range**: The date range of the current academic semester, used to bound the Heatmap display. Derived from the `semesters` table or institution settings
- **Wellness_XP**: The configurable XP amount awarded per wellness habit completion (default 5 XP), managed by the Admin via institution settings
- **Habit_Report**: An exportable document (CSV or PDF) summarizing a student's habit data over a selected date range for self-reflection purposes

## Requirements

### SECTION A: Semester-Long Habit Heatmap

#### Requirement 1: Heatmap Grid Rendering

**User Story:** As a Student, I want to see a semester-long heatmap of my daily habit completions, so that I can visualize my consistency and identify patterns over time.

##### Acceptance Criteria

1. THE Heatmap SHALL render a grid of Heatmap_Cells spanning the full Semester_Range, with columns representing weeks and rows representing days of the week (Monday through Sunday).
2. Each Heatmap_Cell SHALL display a color intensity proportional to the number of habits completed on that day: 0 habits (empty/lightest), 1 habit (light), 2 habits (medium-light), 3 habits (medium), 4 or more habits (full intensity).
3. THE Heatmap SHALL use the streak color palette (red-500 to orange-500 gradient scale) for cell intensity levels, consistent with the existing streak display design tokens.
4. THE Heatmap SHALL display month labels above the grid aligned to the first week of each month within the Semester_Range.
5. THE Heatmap SHALL display day-of-week labels (Mon, Wed, Fri) along the left axis of the grid.
6. THE Heatmap SHALL render a color legend below the grid showing the intensity scale from "No activity" to "4+ habits".

---

#### Requirement 2: Heatmap Cell Interaction

**User Story:** As a Student, I want to hover over or tap a heatmap cell to see details about that day, so that I can review which habits I completed and what I earned.

##### Acceptance Criteria

1. WHEN a Student hovers over a Heatmap_Cell on desktop, THE Heatmap SHALL display a tooltip showing: the date, a list of completed habits (academic and wellness) with checkmarks, the total XP earned that day, and the streak status (active or broken) on that date.
2. WHEN a Student taps a Heatmap_Cell on mobile, THE Heatmap SHALL display the same detail information in a bottom sheet or popover.
3. WHEN a Heatmap_Cell represents a day with no completed habits, THE tooltip SHALL display "No habits completed" with the date.
4. WHEN a Heatmap_Cell represents a future date, THE Heatmap SHALL render the cell as disabled (no color, no interaction).

---

#### Requirement 3: Heatmap Filtering

**User Story:** As a Student, I want to filter the heatmap by specific habit types, so that I can focus on my consistency for individual habits.

##### Acceptance Criteria

1. THE Heatmap SHALL provide a Habit_Filter control with options: "All Habits" (default), each individual Academic_Habit (Login, Submit, Journal, Read), and each enabled Wellness_Habit.
2. WHEN a Student selects a specific habit in the Habit_Filter, THE Heatmap SHALL re-render cell intensities based only on the selected habit (binary: completed or not completed for that day).
3. WHEN a Student selects "All Habits", THE Heatmap SHALL render cell intensities based on the total count of all completed habits (academic and wellness combined) for each day.
4. THE Habit_Filter selection SHALL be persisted in the URL query parameters using nuqs, so that the filter state survives page navigation and sharing.

---

#### Requirement 4: Heatmap Summary Statistics

**User Story:** As a Student, I want to see key streak and activity statistics alongside the heatmap, so that I can quickly assess my overall habit performance.

##### Acceptance Criteria

1. THE Heatmap page SHALL display the following summary statistics above the heatmap grid: current streak (consecutive days with at least 1 academic habit), longest streak within the Semester_Range, and total active days (days with at least 1 habit completed).
2. THE current streak statistic SHALL match the value stored in `student_gamification.current_streak`.
3. THE longest streak statistic SHALL be computed from the `habit_logs` data within the Semester_Range.
4. THE total active days statistic SHALL count distinct dates in `habit_logs` (and `wellness_habit_logs` if wellness habits are enabled) within the Semester_Range for the student.

---

#### Requirement 5: Heatmap Responsive Layout

**User Story:** As a Student using a mobile device, I want the heatmap to be usable on smaller screens, so that I can check my habit history on any device.

##### Acceptance Criteria

1. WHILE the viewport width is below the `md` breakpoint (768px), THE Heatmap SHALL render with horizontal scrolling enabled, preserving the full grid width.
2. WHILE the viewport width is at or above the `md` breakpoint, THE Heatmap SHALL render the full grid without scrolling, sized to fit the available container width.
3. THE Heatmap cell size SHALL scale proportionally to the container width on desktop, with a minimum cell size of 12px to maintain readability.
4. THE Heatmap SHALL honor the `prefers-reduced-motion` media query by disabling any hover/tap transition animations when the user has requested reduced motion.

---

### SECTION B: Wellness Habits Extension

#### Requirement 6: Wellness Habit Opt-In Configuration

**User Story:** As a Student, I want to choose which wellness habits I want to track, so that I can customize my habit tracking to include personal wellness goals.

##### Acceptance Criteria

1. THE Platform SHALL provide a Wellness_Preferences settings panel accessible from the student's habit tracking page.
2. THE Wellness_Preferences panel SHALL display 4 wellness habit options: Meditation (5+ minute session), Hydration (8 glasses of water), Exercise (30+ minute activity), and Sleep (7+ hours logged).
3. WHEN a Student enables a Wellness_Habit, THE Platform SHALL create or update the student's Wellness_Preferences record to include the selected habit type.
4. WHEN a Student disables a Wellness_Habit, THE Platform SHALL update the Wellness_Preferences record and stop displaying that habit in the student's tracking UI, while preserving historical Wellness_Habit_Log records.
5. THE Platform SHALL default all wellness habits to disabled for new students.

---

#### Requirement 7: Wellness Habit Logging

**User Story:** As a Student, I want to log my wellness habit completions each day, so that my wellness activities are tracked alongside my academic habits.

##### Acceptance Criteria

1. THE Platform SHALL display enabled wellness habits in the student's daily habit tracking UI alongside the existing academic habits, visually distinguished with a "Wellness" label or section separator.
2. WHEN a Student marks a Wellness_Habit as completed, THE Platform SHALL insert a Wellness_Habit_Log record with the student_id, current date, wellness_type, a value field (e.g., minutes meditated, glasses of water), and completed_at timestamp.
3. THE Platform SHALL allow a Student to log each Wellness_Habit at most once per calendar day (UTC).
4. WHEN a Student logs a Wellness_Habit, THE Platform SHALL NOT include the wellness habit in the Perfect_Day calculation (Perfect_Day remains academic-only: Login, Submit, Journal, Read).
5. WHEN a Student logs a Wellness_Habit and Wellness_XP is enabled by the Admin, THE Platform SHALL award the configured Wellness_XP amount (default 5 XP) via the existing `award-xp` Edge Function with source `wellness_habit`.

---

#### Requirement 8: Wellness Habit Privacy

**User Story:** As a Student, I want my wellness habit data to be private by default, so that my personal wellness information is not visible to teachers or parents without my consent.

##### Acceptance Criteria

1. THE RLS policies on `wellness_habit_logs` SHALL ensure that only the owning Student can SELECT their own wellness habit data by default.
2. THE RLS policies on `wellness_habit_logs` SHALL prevent Teachers from accessing individual student wellness data.
3. THE Wellness_Preferences record SHALL include a `parent_visibility` boolean (default false) that, WHEN set to true by the Student, allows linked Parents (via `parent_student_links` where `verified = true`) to view the student's wellness habit data.
4. THE Admin role SHALL be able to SELECT aggregate wellness habit statistics (total logs per wellness type across the institution) but SHALL NOT access individual student wellness records.
5. THE RLS policies on `student_wellness_preferences` SHALL ensure that only the owning Student can SELECT and UPDATE their own preferences.

---

#### Requirement 9: Wellness XP Configuration

**User Story:** As an Admin, I want to configure whether wellness habits award XP and how much, so that I can control the gamification incentives for wellness activities.

##### Acceptance Criteria

1. THE Admin SHALL be able to configure the Wellness_XP amount per wellness habit completion via the institution settings page (default: 5 XP, range: 0–25 XP).
2. WHEN the Admin sets Wellness_XP to 0, THE Platform SHALL disable XP awards for all wellness habit completions institution-wide.
3. WHEN the Wellness_XP amount is changed, THE new amount SHALL apply only to future wellness habit completions and SHALL NOT retroactively modify existing XP transactions.
4. THE `award-xp` Edge Function SHALL recognize `wellness_habit` as a valid XP source and apply the institution-configured Wellness_XP amount.

---

### SECTION C: Habit Analytics Dashboard

#### Requirement 10: Weekly and Monthly Completion Rates

**User Story:** As a Student, I want to see my habit completion rates broken down by week and month, so that I can track whether my consistency is improving over time.

##### Acceptance Criteria

1. THE Habit_Analytics_Dashboard SHALL display a bar chart showing weekly habit completion rates (percentage of possible habit completions achieved) for the current semester.
2. THE Habit_Analytics_Dashboard SHALL display a bar chart showing monthly habit completion rates for the current semester.
3. THE completion rate calculation SHALL use the formula: (total habits completed in period) / (total possible habits per day × number of days in period) × 100, where "total possible habits per day" equals the number of academic habits (4) plus the number of enabled wellness habits for that student.
4. THE charts SHALL support toggling between academic-only and all-habits (academic + wellness) views.

---

#### Requirement 11: Consistency Score

**User Story:** As a Student, I want to see a consistency score that tells me what percentage of days I completed at least one habit, so that I have a single metric for my overall engagement.

##### Acceptance Criteria

1. THE Habit_Analytics_Dashboard SHALL display a Consistency_Score as a percentage, calculated as: (number of days with at least 1 habit completed) / (total days in selected range) × 100.
2. THE Consistency_Score SHALL be displayed as a prominent metric with a circular progress indicator.
3. THE Consistency_Score SHALL update when the student changes the date range filter (current week, current month, full semester).
4. THE Consistency_Score calculation SHALL include both academic and wellness habit completions.

---

#### Requirement 12: Best Day of Week Analysis

**User Story:** As a Student, I want to know which day of the week I am most active, so that I can understand my weekly patterns and plan accordingly.

##### Acceptance Criteria

1. THE Habit_Analytics_Dashboard SHALL display a "Best Day" section showing the day of the week with the highest average habit completion count across the selected date range.
2. THE Habit_Analytics_Dashboard SHALL display a horizontal bar chart showing average habit completions per day of the week (Monday through Sunday).
3. THE analysis SHALL use data from the full Semester_Range by default, with an option to narrow to the last 30 days.

---

#### Requirement 13: Habit Correlation Insights

**User Story:** As a Student, I want to see insights about how my habits relate to each other and to my academic performance, so that I can make informed decisions about my daily routines.

##### Acceptance Criteria

1. THE Habit_Analytics_Dashboard SHALL display up to 3 correlation insight cards based on the student's habit data.
2. WHEN a positive correlation exists between a wellness habit and an academic outcome (e.g., higher submission rate on days with meditation logged), THE Habit_Analytics_Dashboard SHALL display an insight card describing the correlation in plain language (e.g., "You submit more assignments on days you meditate").
3. THE correlation insights SHALL be computed by an Edge Function that analyzes co-occurrence patterns between habit types and academic events (submissions, grades) over the Semester_Range.
4. IF insufficient data exists to compute meaningful correlations (fewer than 14 days of habit data), THEN THE Habit_Analytics_Dashboard SHALL display a message: "Keep tracking your habits — insights will appear after 2 weeks of data."
5. THE correlation insights SHALL NOT imply causation — insight text SHALL use language such as "on days when" and "tends to" rather than "because" or "causes".

---

#### Requirement 14: Exportable Habit Report

**User Story:** As a Student, I want to export my habit data as a report, so that I can reflect on my habits outside the platform or share with a counselor.

##### Acceptance Criteria

1. THE Habit_Analytics_Dashboard SHALL provide an "Export Report" action that generates a Habit_Report in CSV format.
2. THE Habit_Report SHALL include one row per day within the selected date range, with columns: date, each academic habit (completed: yes/no), each enabled wellness habit (completed: yes/no, value if applicable), total habits completed, XP earned that day, and streak status.
3. THE Habit_Report SHALL include a summary header row with: total active days, Consistency_Score, longest streak, and total XP earned from habits.
4. THE export SHALL trigger a browser download of the generated CSV file.
5. THE Habit_Report SHALL include only the requesting student's own data, enforced by RLS policies.

---

### SECTION D: Data Model and Security

#### Requirement 15: Wellness Habit Data Model

**User Story:** As the system, I want a well-structured data model for wellness habits and preferences, so that wellness tracking data is stored efficiently with proper access control.

##### Acceptance Criteria

1. THE Platform SHALL create a `wellness_habit_logs` table with columns: `id` (uuid PK), `student_id` (FK to profiles), `date` (date), `wellness_type` (enum: meditation, hydration, exercise, sleep), `value` (numeric, nullable — e.g., minutes, glasses, hours), `completed_at` (timestamptz), `created_at` (timestamptz), with a unique constraint on (student_id, date, wellness_type) to enforce one log per habit per day.
2. THE Platform SHALL create a `student_wellness_preferences` table with columns: `id` (uuid PK), `student_id` (FK to profiles, unique), `enabled_habits` (text array — subset of ['meditation', 'hydration', 'exercise', 'sleep']), `parent_visibility` (boolean, default false), `created_at` (timestamptz), `updated_at` (timestamptz).
3. THE Platform SHALL add `wellness_habit` as a valid XP source in the `xp_transactions` source enum and in the `award-xp` Edge Function validation.
4. THE Platform SHALL add a `wellness_xp_amount` column (integer, default 5) to the `institution_settings` table for admin-configurable wellness XP.
5. THE `wellness_habit_logs` table SHALL be append-only for inserts — updates to the `value` field are permitted but deletion is prohibited, consistent with the evidence immutability pattern.

---

#### Requirement 16: Row-Level Security Policies

**User Story:** As the system, I want RLS policies on all habit-related tables, so that data access is properly scoped by role and privacy settings.

##### Acceptance Criteria

1. RLS policies on `wellness_habit_logs` SHALL ensure: Students can SELECT and INSERT their own wellness habit logs; Students can UPDATE the `value` field on their own logs; no role can DELETE wellness habit logs.
2. RLS policies on `wellness_habit_logs` SHALL ensure: Teachers cannot SELECT individual student wellness data; Admins can SELECT aggregate data only (via a database function, not direct table access to individual rows).
3. RLS policies on `wellness_habit_logs` SHALL ensure: Parents can SELECT wellness habit logs for linked students only WHEN the student's `student_wellness_preferences.parent_visibility` is true.
4. RLS policies on `student_wellness_preferences` SHALL ensure: Students can SELECT, INSERT, and UPDATE their own preferences; no other role can access individual student preferences.
5. RLS policies on the existing `habit_logs` table SHALL remain unchanged — this feature does not modify academic habit access patterns.
6. THE existing RLS policies on `student_gamification` SHALL remain unchanged — wellness habits do not affect streak or Perfect Day calculations.

---

### SECTION E: Integration with Existing Systems

#### Requirement 17: Award-XP Edge Function Integration

**User Story:** As the system, I want the award-xp Edge Function to handle wellness habit XP awards, so that wellness completions flow through the unified XP pipeline.

##### Acceptance Criteria

1. THE `award-xp` Edge Function SHALL accept `wellness_habit` as a valid XP source.
2. WHEN the `award-xp` Edge Function receives a `wellness_habit` source, THE function SHALL look up the `wellness_xp_amount` from `institution_settings` for the student's institution to determine the XP amount.
3. WHEN the `wellness_xp_amount` is 0, THE `award-xp` Edge Function SHALL skip the XP transaction insert and return a success response with 0 XP awarded.
4. THE `award-xp` Edge Function SHALL apply existing XP multipliers (admin Bonus XP Events, student XP Boosts if the XP Marketplace feature is active) to wellness habit XP awards.

---

#### Requirement 18: Heatmap Data Query Optimization

**User Story:** As the system, I want heatmap data queries to be performant, so that the semester-long visualization loads quickly even with months of daily habit data.

##### Acceptance Criteria

1. THE Platform SHALL create a database index on `habit_logs(student_id, date)` to support efficient date-range queries for the Heatmap.
2. THE Platform SHALL create a database index on `wellness_habit_logs(student_id, date)` to support efficient date-range queries for the Heatmap.
3. THE Heatmap data query SHALL fetch all habit completion data for the Semester_Range in a single query (not one query per day), returning aggregated counts per date.
4. THE Heatmap data query SHALL complete within 500ms for a full semester of data (approximately 120 days × up to 8 habits per day).

---

#### Requirement 19: Gamification Badge Integration

**User Story:** As the system, I want new badges related to heatmap milestones and wellness habits, so that students are rewarded for sustained habit engagement.

##### Acceptance Criteria

1. THE Platform SHALL define a "Habit Master" badge awarded WHEN a student achieves 30 or more active days (days with at least 1 habit completed) within a single semester.
2. THE Platform SHALL define a "Wellness Warrior" badge awarded WHEN a student logs at least one wellness habit for 14 consecutive days.
3. THE Platform SHALL define a "Full Spectrum" badge awarded WHEN a student completes all 4 academic habits AND at least 1 wellness habit on the same day, for 7 days within a semester.
4. THE badge check logic SHALL be integrated into the existing `check-badges` Edge Function, triggered after habit log inserts.
5. THE badge definitions SHALL be added to the `badgeDefinitions` configuration in `src/lib/badgeDefinitions.ts`.

---

### SECTION F: Non-Functional Requirements

#### Requirement 20: Performance

**User Story:** As a Student, I want the heatmap and analytics to load quickly, so that checking my habit history does not interrupt my workflow.

##### Acceptance Criteria

1. THE Heatmap page SHALL load and render the full semester grid within 1 second, including data fetch and rendering.
2. THE Habit_Analytics_Dashboard SHALL load all charts and metrics within 1.5 seconds.
3. THE Habit_Report CSV export SHALL generate and trigger download within 3 seconds for a full semester of data.
4. THE Heatmap cell tooltip SHALL appear within 100ms of hover/tap interaction.

---

#### Requirement 21: Accessibility

**User Story:** As a Student using assistive technology, I want the heatmap and analytics to be accessible, so that I can use the feature regardless of ability.

##### Acceptance Criteria

1. THE Heatmap grid SHALL include ARIA labels on each Heatmap_Cell describing the date and number of habits completed (e.g., "March 15, 2025: 3 habits completed").
2. THE Heatmap SHALL be keyboard-navigable using arrow keys to move between cells, with Enter or Space to activate the detail tooltip.
3. THE color intensity scale SHALL maintain a minimum contrast ratio of 3:1 between adjacent intensity levels against the background.
4. THE Habit_Analytics_Dashboard charts SHALL include text alternatives or data tables accessible to screen readers.
5. THE Heatmap SHALL honor the `prefers-reduced-motion` media query by disabling all transition animations.
