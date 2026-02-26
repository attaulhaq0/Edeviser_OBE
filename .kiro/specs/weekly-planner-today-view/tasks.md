# Tasks — Weekly Planner & Today View

## Task 1: Database Schema & Migrations

- [ ] 1.1 Create enums: `timer_mode_type` (pomodoro, custom), `session_status_type` (planned, in_progress, completed, cancelled), `task_priority_type` (low, medium, high), `task_status_type` (pending, completed), `goal_type_enum` (study_hours, sessions_completed, tasks_completed)
- [ ] 1.2 Create `study_sessions` table with all columns (id, student_id, course_id, title, description, planned_date, planned_start_time, planned_duration_minutes, actual_start_at, actual_end_at, actual_duration_minutes, timer_mode, status, satisfaction_rating, clo_ids, created_at, updated_at), CHECK constraints on planned_duration_minutes (15–240) and satisfaction_rating (1–5), FKs to profiles and courses, indexes on (student_id, planned_date) and (student_id, status)
- [ ] 1.3 Create `planner_tasks` table with all columns (id, student_id, title, description, due_date, priority, status, course_id, completed_at, created_at, updated_at), FKs to profiles and courses, indexes on (student_id, due_date) and (student_id, status)
- [ ] 1.4 Create `weekly_goals` table with all columns (id, student_id, week_start_date, goal_type, target_value, created_at, updated_at), UNIQUE constraint on (student_id, week_start_date, goal_type), CHECK on target_value > 0, FK to profiles
- [ ] 1.5 Create `session_evidence` table with all columns (id, session_id, student_id, file_url, file_name, file_size_bytes, mime_type, notes, created_at), FKs to study_sessions and profiles — append-only (no UPDATE/DELETE policies)
- [ ] 1.6 Create `session_reflections` table with all columns (id, session_id, student_id, content, word_count, created_at), FKs to study_sessions and profiles — append-only (no UPDATE/DELETE policies)
- [ ] 1.7 Create RLS policies on `study_sessions`: student ALL on own, teacher SELECT CLO-linked sessions for their courses, parent SELECT for linked students
- [ ] 1.8 Create RLS policies on `planner_tasks`: student ALL on own, parent SELECT for linked students
- [ ] 1.9 Create RLS policies on `weekly_goals`: student ALL on own, parent SELECT for linked students
- [ ] 1.10 Create RLS policies on `session_evidence`: student SELECT+INSERT own, teacher SELECT for course students, no UPDATE/DELETE
- [ ] 1.11 Create RLS policies on `session_reflections`: student SELECT+INSERT own, no other role access, no UPDATE/DELETE
- [ ] 1.12 Create Supabase Storage bucket `session-evidence` with RLS: student upload/read own folder, teacher read course student files
- [ ] 1.13 Regenerate TypeScript types: `npx supabase gen types --linked > src/types/database.ts`

## Task 2: TypeScript Types & Shared Utilities

- [ ] 2.1 Create `src/types/planner.ts` with all types: TimerMode, SessionStatus, TaskPriority, TaskStatus, GoalType, TimerState, PomodoroIntervalType, TimeOfDay, StudySession, PlannerTask, WeeklyGoal, GoalProgress, SessionEvidence, SessionReflection, WeekDay, TimelineItem, DailyProgress, WeeklyProgressData, CourseStudyTime, CLOStudyTime, WeeklyStudyData, TimerPersistState, UpcomingDeadline, HabitStatus
- [ ] 2.2 Create `src/lib/plannerUtils.ts` with pure functions: `calculateSessionXP`, `groupByTimeOfDay`, `sortTasksByPriority`, `getDeadlineUrgency`, `isSessionMissed`, `calculateGoalProgress`, `formatTimerDisplay`, `calculateActualDuration`, `getWeekStartDate`, `isWeekInPast`, `countWords`, `aggregateWeeklyStudyTime`, `getPomodoroIntervalType`, `getPomodoroIntervalDuration`
- [ ] 2.3 Create `src/lib/timerPersistence.ts` with `persistTimerState`, `restoreTimerState`, `clearTimerState` functions (localStorage round-trip)
- [ ] 2.4 Create Zod schemas in `src/lib/schemas/planner.ts`: `createStudySessionSchema`, `createPlannerTaskSchema`, `createWeeklyGoalSchema`, `sessionCompletionSchema`, `sessionReflectionSchema` (with word count validation ≥ 30), `weeklyReflectionSchema` (≥ 50 words)

## Task 3: Property-Based Tests

- [ ] 3.1 Create `src/__tests__/properties/plannerUtils.property.test.ts` with property tests for Properties 1–3, 6–9, 11–13, 17, 19–20 (session XP formula, timer display, actual duration, task sorting, deadline urgency, missed session, time-of-day grouping, week start Monday, past week detection, word count, weekly aggregation, daily progress, zero XP for short sessions)
- [ ] 3.2 Create `src/__tests__/properties/focusTimer.property.test.ts` with property tests for Properties 4–5, 14, 18 (timer state round-trip, Pomodoro interval sequence, duration validation, interval durations)
- [ ] 3.3 Create `src/__tests__/properties/goalProgress.property.test.ts` with property tests for Properties 10, 15–16 (goal progress calculation, max 3 goals, task deletion rules)

## Task 4: Award-XP Edge Function Update

- [ ] 4.1 Add `'study_session'`, `'planner_task'`, `'session_reflection'`, `'weekly_goal'` to `XPSource` type union and `VALID_SOURCES` array in `supabase/functions/award-xp/index.ts`
- [ ] 4.2 Add XP amount logic for new sources: study_session uses passed `xp_amount` (calculated client-side), planner_task = 10, session_reflection = 10, weekly_goal = 25
- [ ] 4.3 Write unit test for new XP sources in `src/__tests__/unit/awardXpPlanner.test.ts`

## Task 5: Check-Badges Edge Function Update

- [ ] 5.1 Add `'study_session'` to `BadgeTrigger` type and `VALID_TRIGGERS` in `supabase/functions/check-badges/index.ts`
- [ ] 5.2 Add badge XP entries for `study_starter` (25), `deep_focus` (50), `weekly_warrior` (100), `evidence_pro` (75) to `BADGE_XP` map
- [ ] 5.3 Implement `checkStudyBadges()`: Study Starter (first completed session), Deep Focus (single session ≥ 60 min), Weekly Warrior (all 3 goals met in a week), Evidence Pro (10 sessions with evidence)
- [ ] 5.4 Wire `checkStudyBadges()` into the main handler for `study_session` trigger
- [ ] 5.5 Add badge definitions to `src/lib/badgeDefinitions.ts`: study_starter, deep_focus, weekly_warrior, evidence_pro
- [ ] 5.6 Write unit test for study badge conditions in `src/__tests__/unit/studyBadges.test.ts`

## Task 6: TanStack Query Hooks — Planner Data

- [ ] 6.1 Create `src/hooks/useWeeklyPlanner.ts` with `useWeeklyPlannerData(studentId, weekStartDate)` — fetches sessions, tasks, deadlines, goals for the week in parallel queries
- [ ] 6.2 Create `src/hooks/useStudySessions.ts` with `useCreateStudySession`, `useUpdateStudySession`, `useCancelStudySession` mutations with optimistic updates and query invalidation
- [ ] 6.3 Create `src/hooks/usePlannerTasks.ts` with `useCreatePlannerTask`, `useUpdatePlannerTask`, `useDeletePlannerTask`, `useCompleteTask` mutations — `useCompleteTask` triggers award-xp with source `planner_task`
- [ ] 6.4 Create `src/hooks/useWeeklyGoals.ts` with `useWeeklyGoals(studentId, weekStartDate)` query and `useSaveWeeklyGoals` mutation
- [ ] 6.5 Create `src/hooks/useTodayView.ts` with `useTodayViewData(studentId)` — fetches today's sessions, tasks, upcoming deadlines (3 days), and habit status

## Task 7: TanStack Query Hooks — Focus Mode & Evidence

- [ ] 7.1 Create `src/hooks/useFocusTimer.ts` with timer state machine hook: start, pause, resume, complete, Pomodoro transitions, localStorage persistence via `timerPersistence.ts`, `requestAnimationFrame` tick loop
- [ ] 7.2 Create `src/hooks/useSessionCompletion.ts` with `useCompleteSession` mutation: update session status → upload evidence → insert evidence records → award XP → check badges → auto-mark Read habit → invalidate queries
- [ ] 7.3 Create `src/hooks/useSessionEvidence.ts` with `useUploadEvidence` mutation: upload files to Supabase Storage `session-evidence/{studentId}/{sessionId}/`, insert `session_evidence` records
- [ ] 7.4 Create `src/hooks/useSessionReflections.ts` with `useSaveSessionReflection` mutation (word count validation, XP award) and `useSaveWeeklyReflection` mutation (creates journal_entries record)
- [ ] 7.5 Create `src/hooks/useWeeklyProgress.ts` with `useWeeklyProgressSummary(studentId, weekStartDate)` — computes total study time, sessions/tasks completed, per-course/CLO breakdowns, goal progress
- [ ] 7.6 Create `src/hooks/useStudyTimeAnalytics.ts` with `useStudyTimeTrend(studentId, weekCount)` — fetches 8-week study time data
- [ ] 7.7 Create `src/hooks/useOfflineQueue.ts` with queue-and-retry pattern for API calls during network loss

## Task 8: Weekly Planner Page & Components

- [ ] 8.1 Create `src/components/shared/WeeklyCalendarGrid.tsx` — 7-column grid (Mon–Sun) with day headers, today highlight, session/task/deadline cards per day; single-day view on mobile with tab navigation
- [ ] 8.2 Create `src/components/shared/StudySessionCard.tsx` — card showing session title, time, course, duration, status badge, and Start/Edit actions
- [ ] 8.3 Create `src/components/shared/PlannerTaskItem.tsx` — task item with checkbox, title, priority badge, course tag, edit/delete actions
- [ ] 8.4 Create `src/components/shared/DeadlineItem.tsx` — read-only deadline item with urgency color indicator (red/yellow/green), course name, due time
- [ ] 8.5 Create `src/components/shared/CreateSessionDialog.tsx` — Shadcn Dialog with React Hook Form + Zod: title, date, start time, duration (15-min increments), course select, CLO multi-select, description
- [ ] 8.6 Create `src/components/shared/CreateTaskDialog.tsx` — Shadcn Dialog with React Hook Form + Zod: title, due date, priority select, course select, description
- [ ] 8.7 Create `src/components/shared/WeeklyGoalPanel.tsx` — goal setting panel with up to 3 goal rows (type select + target input), progress bars, edit/save toggle, disabled for past weeks
- [ ] 8.8 Create `src/pages/student/planner/WeeklyPlannerPage.tsx` — main page composing: week navigation, WeeklyCalendarGrid, WeeklyGoalPanel, tabs for Check Progress and Reflect
- [ ] 8.9 Write unit tests `src/__tests__/unit/weeklyCalendarGrid.test.tsx` and `src/__tests__/unit/studySessionCard.test.tsx`

## Task 9: Today View Page & Components

- [ ] 9.1 Create `src/components/shared/TodayTimeline.tsx` — chronological timeline with Morning/Afternoon/Evening/ToDo sections, rendering session cards, task items, deadline items, and habit status
- [ ] 9.2 Create `src/components/shared/DailyProgressSummary.tsx` — 3 KPI cards (study minutes, tasks completed, sessions completed) using project KPI card pattern
- [ ] 9.3 Create `src/pages/student/planner/TodayViewPage.tsx` — main page composing: DailyProgressSummary, TodayTimeline, Quick Add task button, Start Unplanned Session button
- [ ] 9.4 Implement quick actions: Start button on sessions (navigates to Focus Mode), checkbox on tasks (completes + XP), Quick Add (inline task creation dialog), Start Unplanned Session (creates ad-hoc session + navigates to Focus Mode)
- [ ] 9.5 Write unit test `src/__tests__/unit/todayTimeline.test.tsx`

## Task 10: Focus Mode Page & Timer Components

- [ ] 10.1 Create `src/components/shared/FocusTimer.tsx` — large countdown timer display (MM:SS), start/pause/resume/end controls, Pomodoro interval indicator, session context (title, course, CLOs)
- [ ] 10.2 Create `src/components/shared/PomodoroIndicator.tsx` — shows current interval number, type (Work/Break/Long Break), and progress dots for completed intervals
- [ ] 10.3 Implement timer logic using `requestAnimationFrame` + `Date.now()` delta for accuracy; persist state to localStorage on every tick
- [ ] 10.4 Implement Pomodoro state machine: work → break → work → break → work → break → work → long_break → repeat; auto-transition with prompt before next work interval
- [ ] 10.5 Implement pause/resume: track totalPausedMs, exclude from actual duration calculation
- [ ] 10.6 Implement timer completion: audio notification (with visual fallback), transition to completion form
- [ ] 10.7 Implement offline resilience: detect network loss, show "Offline" indicator, queue pending API calls, auto-sync on reconnect
- [ ] 10.8 Implement ARIA live region for timer: announce remaining time at 5-min intervals and 1-min mark
- [ ] 10.9 Create `src/pages/student/planner/FocusModePage.tsx` — full-screen focus page composing: FocusTimer, SessionCompletionForm (shown on complete), minimal navigation
- [ ] 10.10 Write unit tests `src/__tests__/unit/focusTimer.test.tsx` and `src/__tests__/unit/pomodoroIndicator.test.tsx`

## Task 11: Session Completion & Evidence Components

- [ ] 11.1 Create `src/components/shared/SessionCompletionForm.tsx` — form with: session notes textarea, EvidenceUploader, satisfaction rating (1–5 stars), SessionReflectionInput, Submit and Skip buttons
- [ ] 11.2 Create `src/components/shared/EvidenceUploader.tsx` — drag-and-drop file upload area, max 3 files, 5MB limit, accepted types (jpg, png, pdf, doc, docx), file preview thumbnails, remove button per file
- [ ] 11.3 Create `src/components/shared/SessionReflectionInput.tsx` — textarea with live word count, minimum 30 words indicator, save button
- [ ] 11.4 Implement completion flow: submit form → update session → upload files → insert evidence records → award XP (calculated via `calculateSessionXP`) → check badges → auto-mark Read habit → show XP toast → navigate back to planner
- [ ] 11.5 Write unit tests `src/__tests__/unit/sessionCompletionForm.test.tsx` and `src/__tests__/unit/evidenceUploader.test.tsx`

## Task 12: Progress & Reflection Components

- [ ] 12.1 Create `src/components/shared/ProgressSummaryPanel.tsx` — weekly summary: total study hours, sessions completed, tasks completed, goal progress bars with success indicators
- [ ] 12.2 Create `src/components/shared/CourseStudyBreakdown.tsx` — horizontal bar chart (Recharts) showing study time per course for the week
- [ ] 12.3 Create `src/components/shared/StudyTimeChart.tsx` — Recharts BarChart showing weekly study hours for last 8 weeks with average line, course filter toggle
- [ ] 12.4 Create `src/components/shared/WeeklyReflectionPanel.tsx` — textarea with live word count (min 50 words), save button, creates journal_entries record on save
- [ ] 12.5 Integrate Check Progress tab and Reflect tab into WeeklyPlannerPage
- [ ] 12.6 Write unit tests `src/__tests__/unit/progressSummaryPanel.test.tsx` and `src/__tests__/unit/studyTimeChart.test.tsx`

## Task 13: Routing & Navigation

- [ ] 13.1 Add routes to `src/router/AppRouter.tsx`: `/student/planner` (WeeklyPlannerPage), `/student/today` (TodayViewPage), `/student/focus/:sessionId` (FocusModePage), `/parent/planner/:studentId` (ParentPlannerView)
- [ ] 13.2 Add "Planner" and "Today" nav items to `src/pages/student/StudentLayout.tsx` with CalendarDays and CalendarCheck icons
- [ ] 13.3 Add "Study Plan" nav item to `src/pages/parent/ParentLayout.tsx`

## Task 14: Parent Planner View

- [ ] 14.1 Create `src/pages/parent/planner/ParentPlannerView.tsx` — read-only weekly planner showing linked student's sessions, tasks, goals with progress, and total study hours; no session notes or reflections visible
- [ ] 14.2 Reuse WeeklyCalendarGrid and WeeklyGoalPanel components in read-only mode (no create/edit/delete actions)
- [ ] 14.3 Write unit test `src/__tests__/unit/parentPlannerView.test.tsx`

## Task 15: Integration & Polish

- [ ] 15.1 Implement habit auto-completion: when a study session ≥ 15 min is completed, auto-mark "Read" habit in `habit_logs` if not already marked for today
- [ ] 15.2 Verify XP award flow end-to-end: session completion → XP → badge check → toast
- [ ] 15.3 Verify task completion XP flow: checkbox → award-xp → toast
- [ ] 15.4 Verify weekly goal XP: when goal met → award 25 XP per goal
- [ ] 15.5 Verify parent RLS: parent can see sessions/tasks/goals but not reflections/notes
- [ ] 15.6 Verify Focus Mode timer accuracy: < 50ms drift over 25 minutes
- [ ] 15.7 Verify offline queue: disconnect during focus → timer continues → reconnect → data syncs
- [ ] 15.8 Run all property-based tests and unit tests, fix any failures


## Task 16: Session Intent & Flow Optimization — Database & Types

- [ ] 16.1 Create enums: `flow_response_type` (in_the_zone, stuck, too_easy), `review_status_type` (pending, completed, skipped), `reflection_type_enum` (session_reflection, journal_entry), `reflection_template_type` (free_form, simple, gibbs), `quality_category_type` (thoughtful, good_effort, needs_detail)
- [ ] 16.2 Create `session_intents` table with columns (id, session_id, student_id, concept, success_criterion, is_auto_suggested, created_at), UNIQUE on session_id, FKs to study_sessions and profiles
- [ ] 16.3 Create `flow_check_ins` table with columns (id, session_id, student_id, interval_number, response, created_at), UNIQUE on (session_id, interval_number), CHECK interval_number ≥ 1, FKs to study_sessions and profiles
- [ ] 16.4 Create `review_schedules` table with columns (id, student_id, clo_id, course_id, source_session_id, review_date, interval_days, status, review_session_id, created_at, updated_at), UNIQUE on (student_id, clo_id, review_date, interval_days), CHECK interval_days IN (1,3,7), FKs to profiles, courses, study_sessions, indexes on (student_id, review_date)
- [ ] 16.5 Create `reflection_digests` table with columns (id, student_id, month, themes, growth_patterns, emotional_trends, suggested_focus, shared_with, generated_at), UNIQUE on (student_id, month), FK to profiles
- [ ] 16.6 Create `reflection_quality_scores` table with columns (id, reflection_id, reflection_type, student_id, score, originality_score, relevance_score, depth_score, flags, scored_at), CHECK scores 0–100, FK to profiles, indexes on (reflection_id, reflection_type) and (student_id)
- [ ] 16.7 Create RLS policies on `session_intents`: student SELECT+INSERT own
- [ ] 16.8 Create RLS policies on `flow_check_ins`: student SELECT+INSERT own
- [ ] 16.9 Create RLS policies on `review_schedules`: student ALL on own, parent SELECT for linked students
- [ ] 16.10 Create RLS policies on `reflection_digests`: student SELECT+UPDATE own, parent SELECT shared digests for linked students, teacher SELECT shared digests
- [ ] 16.11 Create RLS policies on `reflection_quality_scores`: student SELECT own (INSERT via service role only)
- [ ] 16.12 Add new TypeScript types to `src/types/planner.ts`: FlowResponse, ReviewStatus, ReflectionTypeEnum, ReflectionTemplateType, QualityCategory, SessionIntent, SuggestedIntent, FlowCheckIn, ReviewSchedule, ReflectionDigest, DigestTheme, DigestPattern, DigestTrend, DigestFocus, DigestShareEntry, ReflectionQualityScore, SimpleReflectionValues, GibbsReflectionValues
- [ ] 16.13 Add new Zod schemas to `src/lib/schemas/planner.ts`: sessionIntentSchema, flowCheckInSchema, quickThoughtSchema, reviewScheduleCreateSchema, reflectionDigestShareSchema
- [ ] 16.14 Add new utility functions to `src/lib/plannerUtils.ts`: calculateReflectionXP, getQualityCategory, generateReviewDates, concatenateReflectionTemplate, isReviewCycleComplete
- [ ] 16.15 Add `'review_session'` and `'review_cycle_complete'` to `XPSource` type and `VALID_SOURCES` in `supabase/functions/award-xp/index.ts` with XP amounts 15 and 25 respectively
- [ ] 16.16 Regenerate TypeScript types: `npx supabase gen types --linked > src/types/database.ts`

## Task 17: Session Intent & Flow Check-In Components

- [ ] 17.1 Create `src/hooks/useSessionIntent.ts` with `useSaveSessionIntent` mutation and `useSuggestedIntents(sessionId)` query — fetches low-attainment CLOs (<70%) and upcoming deadlines for auto-suggestions
- [ ] 17.2 Create `src/hooks/useFlowCheckIns.ts` with `useSaveFlowCheckIn` mutation and `useSessionFlowCheckIns(sessionId)` query
- [ ] 17.3 Create `src/components/shared/SessionIntentDialog.tsx` — Shadcn Dialog with concept + success criterion inputs, auto-suggested intents as clickable chips, Skip button, Submit button
- [ ] 17.4 Create `src/components/shared/FlowCheckInDialog.tsx` — Shadcn Dialog with 3 response buttons ("In the zone" / "Stuck" / "Too easy"), dismiss button, conditional AI Tutor link for "Stuck" and Bloom's suggestion for "Too easy"
- [ ] 17.5 Integrate SessionIntentDialog into Focus Mode launch flow: show dialog before starting timer, display intent text alongside timer in FocusTimer component
- [ ] 17.6 Integrate FlowCheckInDialog into Pomodoro break transitions: show at each work→break transition, also at midpoint for custom sessions ≥50 min
- [ ] 17.7 Create `src/components/shared/QuickThoughtInput.tsx` — single-line input with character counter (max 280), submit button
- [ ] 17.8 Update `src/components/shared/SessionCompletionForm.tsx` to add QuickThoughtInput as primary evidence option, with "Attach Files" expansion for full EvidenceUploader
- [ ] 17.9 Write unit tests `src/__tests__/unit/sessionIntentDialog.test.tsx` and `src/__tests__/unit/flowCheckInDialog.test.tsx`

## Task 18: Spaced Repetition System

- [ ] 18.1 Create `src/hooks/useReviewSchedule.ts` with `useWeeklyReviews(studentId, weekStartDate)` query, `useCreateReviewSession` mutation (creates study_session + updates review_schedules), `useSkipReview` mutation
- [ ] 18.2 Create `src/components/shared/ReviewSessionBadge.tsx` — badge showing interval label ("Day 1 Review", "Day 3 Review", "Day 7 Review") with distinct styling per interval, status indicator
- [ ] 18.3 Create `src/components/shared/ReviewScheduleList.tsx` — list of pending reviews with Start and Skip actions per item
- [ ] 18.4 Update `src/hooks/useSessionCompletion.ts` to trigger review schedule creation: after completing a CLO-linked session, call generateReviewDates() and INSERT into review_schedules with ON CONFLICT DO NOTHING
- [ ] 18.5 Update `src/components/shared/WeeklyCalendarGrid.tsx` to render ReviewSessionBadge items from review_schedules in day columns, visually distinct from student-created sessions
- [ ] 18.6 Update `src/pages/student/planner/TodayViewPage.tsx` to show missed reviews with "Missed Review" indicator for past-due pending reviews
- [ ] 18.7 Implement review completion XP flow: on review session completion, award 15 XP (review_session source); check if all 3 intervals complete for CLO, award 25 XP (review_cycle_complete source)
- [ ] 18.8 Write unit tests `src/__tests__/unit/reviewSessionBadge.test.tsx` and `src/__tests__/unit/reviewSchedule.test.ts`

## Task 19: Reflection Frameworks & Quality System

- [ ] 19.1 Create `src/hooks/useReflectionTemplates.ts` with template selection state management and `concatenateReflectionTemplate` integration
- [ ] 19.2 Create `src/components/shared/ReflectionTemplateSelector.tsx` — Shadcn Select with options: Free-form, Simple, Gibbs' Cycle
- [ ] 19.3 Create `src/components/shared/SimpleReflectionTemplate.tsx` — 3 labeled text areas (What went well? / What was challenging? / What will I do differently?)
- [ ] 19.4 Create `src/components/shared/GibbsReflectionTemplate.tsx` — 6 labeled text areas (Description, Feelings, Evaluation, Analysis, Conclusion, Action Plan)
- [ ] 19.5 Update `src/components/shared/SessionReflectionInput.tsx` to integrate ReflectionTemplateSelector, render selected template component, concatenate sections on save
- [ ] 19.6 Update `src/components/shared/WeeklyReflectionPanel.tsx` to integrate ReflectionTemplateSelector, pre-populate with session reflection summaries, add ReflectionStreakIndicator
- [ ] 19.7 Create `src/components/shared/ReflectionStreakIndicator.tsx` — shows consecutive weeks with completed weekly reflection
- [ ] 19.8 Create `supabase/functions/score-reflection-quality/index.ts` — Edge Function: receive text + student_id + reflection_id + type, fetch last 10 reflections, score originality/relevance/depth, compute overall score, flag if <30, insert into reflection_quality_scores, return score + category + suggestions
- [ ] 19.9 Create `src/hooks/useReflectionQuality.ts` with `useScoreReflection` mutation (calls score-reflection-quality Edge Function), `useReflectionScore(reflectionId)` query, `calculateReflectionXP` integration
- [ ] 19.10 Create `src/components/shared/QualityFeedbackBanner.tsx` — displays quality category ("Thoughtful reflection" / "Good effort" / "Try adding more detail") with improvement suggestions, no numeric score shown
- [ ] 19.11 Update `src/hooks/useSessionReflections.ts` to trigger quality scoring after save, apply XP adjustments based on Quality_Score via calculateReflectionXP
- [ ] 19.12 Create `supabase/functions/generate-reflection-digest/index.ts` — Edge Function: for each student with ≥3 reflections in month, analyze themes/growth/sentiment/focus, insert into reflection_digests
- [ ] 19.13 Create `src/hooks/useReflectionDigest.ts` with `useMonthlyDigest(studentId, month)` query, `useShareDigest` mutation, `useRevokeDigestShare` mutation
- [ ] 19.14 Create `src/components/shared/ReflectionDigestCard.tsx` — card displaying themes, growth patterns, emotional trends, suggested focus; Share button with Parent/Advisor options; Revoke sharing
- [ ] 19.15 Integrate ReflectionDigestCard into WeeklyPlannerPage Reflect tab as "Monthly Insights" section
- [ ] 19.16 Write unit tests `src/__tests__/unit/reflectionTemplateSelector.test.tsx`, `src/__tests__/unit/qualityFeedbackBanner.test.tsx`, `src/__tests__/unit/reflectionDigestCard.test.tsx`

## Task 20: Property Tests for New Features

- [ ] 20.1 Create `src/__tests__/properties/sessionIntent.property.test.ts` with property tests for Properties 21, 29 (session intent validation, quick thought length)
- [ ] 20.2 Create `src/__tests__/properties/flowCheckIn.property.test.ts` with property test for Property 22 (flow check-in response options and interval uniqueness)
- [ ] 20.3 Create `src/__tests__/properties/reviewSchedule.property.test.ts` with property tests for Properties 23, 24, 25 (review date generation, deduplication, cycle completion)
- [ ] 20.4 Create `src/__tests__/properties/reflectionQuality.property.test.ts` with property tests for Properties 26, 27, 28, 30 (template concatenation, quality category thresholds, quality-adjusted XP, digest minimum entries)

## Task 21: Integration & Polish for New Features

- [ ] 21.1 Verify session intent flow end-to-end: intent dialog → save → display in Focus Mode → stored in DB
- [ ] 21.2 Verify flow check-in flow: Pomodoro break → dialog → response saved → AI Tutor link works for "Stuck"
- [ ] 21.3 Verify spaced repetition flow: CLO session completion → review schedules created → reviews appear in planner → review completion awards bonus XP → cycle completion awards bonus XP
- [ ] 21.4 Verify reflection template flow: select template → fill sections → concatenated text saved → word count validated across sections
- [ ] 21.5 Verify quality scoring flow: save reflection → Edge Function scores → quality banner shown → XP adjusted correctly (5 for <30, base for 30-79, base+bonus for ≥80)
- [ ] 21.6 Verify reflection digest flow: monthly cron → digest generated for students with ≥3 entries → digest card visible → sharing works → parent/advisor can view shared digest
- [ ] 21.7 Verify RLS on all new tables: students see only own data, parents see linked student reviews/digests (shared only for digests), quality scores read-only for students
- [ ] 21.8 Verify reflection consolidation: max one prompt per session, max one weekly, no duplicate prompts for already-reflected sessions
- [ ] 21.9 Run all property-based tests (P21–P30) and unit tests for new features, fix any failures
