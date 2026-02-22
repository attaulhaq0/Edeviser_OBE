# Implementation Plan: Edeviser Platform (Full Production)

## Overview

Complete unified implementation of the Edeviser platform covering authentication, RBAC, user/program/course management, the full OBE engine (outcomes, rubrics, assignments, submissions, grading, evidence, rollup), gamification (XP, streaks, badges, levels, leaderboards, journals, daily habits, variable rewards, learning path gating), Bloom's verb guide, email notifications (Resend), AI Co-Pilot (module suggestions, at-risk predictions, feedback drafts), peer milestone notifications, CLO progress dashboard, XP transaction history, seed data generation, CI/CD pipeline, health monitoring, load testing, four role-specific dashboards, notifications, realtime, reporting, and audit logging. Tasks are ordered foundation-first in a single unified plan.

## Tasks

- [ ] 1. Set up foundation: schemas, utilities, and database
  - [ ] 1.1 Create Zod validation schemas (`/src/lib/schemas/`)
    - Create `auth.ts` with `loginSchema`, `resetPasswordSchema`
    - Create `user.ts` with `createUserSchema`, `updateUserSchema`
    - Create `program.ts` with `createProgramSchema`, `updateProgramSchema`
    - Create `course.ts` with `createCourseSchema`, `updateCourseSchema`
    - Create `ilo.ts` with `createILOSchema`, `reorderSchema`
    - Create `plo.ts` with `createPLOSchema`, `mappingSchema`
    - Create `clo.ts` with `createCLOSchema`, `bloomsLevelSchema`
    - Create `rubric.ts` with `rubricSchema`, `criterionSchema`
    - Create `assignment.ts` with `createAssignmentSchema`, `cloWeightSchema`
    - Create `submission.ts` with `submissionSchema`
    - Create `grade.ts` with `gradeSchema`, `rubricSelectionSchema`
    - Create `journal.ts` with `journalEntrySchema`
    - Create `bulkImport.ts` with `csvRowSchema`
    - Create `habitLog.ts` with `habitLogSchema`
    - Create `bonusXPEvent.ts` with `bonusXPEventSchema`, `createBonusEventSchema`
    - Create `emailPrefs.ts` with `emailPreferencesSchema`
    - Create `aiSuggestion.ts` with `moduleSuggestionSchema`, `atRiskPredictionSchema`, `feedbackDraftSchema`, `aiFeedbackSchema`
    - _Requirements: All_

  - [ ] 1.2 Create Audit Logger service (`/src/lib/auditLogger.ts`)
    - Implement `logAuditEvent(entry: AuditLogEntry): Promise<void>`
    - _Requirements: 34_

  - [ ] 1.3 Create TanStack Query key factory (`/src/lib/queryKeys.ts`)
    - Define hierarchical keys for all entities including AI Co-Pilot queries
    - _Requirements: All_

  - [ ] 1.4 Create shared type definitions (`/src/types/app.ts`)
    - Export all app-level interfaces and type aliases
    - Bloom's levels, attainment levels, user roles, XP schedule, badge catalog, level thresholds
    - Habit types, learning path node types, bonus XP event types, activity log event types
    - AI Co-Pilot types: ModuleSuggestion, AtRiskPrediction, FeedbackDraft, AIFeedbackEntry
    - _Requirements: All_

  - [ ] 1.5 Apply database extensions, indexes, and cron jobs via Supabase MCP
    - NOTE: All 23 tables with RLS policies already exist. DO NOT recreate tables.
    - Enable `pg_cron` and `pg_net` extensions (requires Supabase Pro plan — see task 44 for free-tier fallback)
    - Create performance indexes per architecture doc (outcome_attainment, xp_transactions, evidence, student_activity_log, ai_feedback)
    - Create cron jobs: streak-risk-email (daily 8 PM), weekly-summary-email (Monday 8 AM), compute-at-risk-signals (nightly 2 AM), perfect-day-prompt (daily 6 PM), ai-at-risk-prediction (nightly)
    - Regenerate TypeScript types: `npx supabase gen types --linked > src/types/database.ts`
    - Create leaderboard_weekly materialized view and unique index
    - Create cron job: leaderboard-refresh (every 5 minutes — REFRESH MATERIALIZED VIEW CONCURRENTLY)
    - Create cron job: streak-midnight-reset (daily midnight — increment/reset streaks)
    - Create UNIQUE index on outcome_attainment for UPSERT rollup logic
    - Create composite index on `student_gamification(xp_total DESC, student_id)` for leaderboard direct queries
    - _Requirements: 2, 34, 35, 36, 37, 41, 43, 47, 50, 51_

  - [ ] 1.6 Create Activity Logger service (`/src/lib/activityLogger.ts`)
    - Implement fire-and-forget logging of student behavioral events
    - Log event types: login, page_view, submission, journal, streak_break, assignment_view
    - Insert into `student_activity_log` table (append-only)
    - Never block user-facing flows — use console.error on failure
    - _Requirements: 41.1, 41.4_

- [ ] 2. Implement authentication and session management
  - [ ] 2.1 Create AuthProvider context and `useAuth()` hook
    - _Requirements: 1, 2, 3, 4_

  - [ ] 2.2 Implement login attempt tracking and account lockout
    - _Requirements: 1.2, 1.3_

  - [ ] 2.3 Implement session persistence and auto-refresh
    - _Requirements: 4_

  - [ ] 2.4 Implement password reset flow
    - _Requirements: 5_

  - [ ] 2.5 Create Login page (`/src/pages/LoginPage.tsx`)
    - _Requirements: 1, 3, 5_

  - [ ] 2.6 Create AppRouter with role-based route guards
    - _Requirements: 3_

  - [ ] 2.7 Create App shell (`/src/App.tsx`)
    - Wrap in AuthProvider, QueryClientProvider, BrowserRouter, Toaster
    - _Requirements: 1, 3, 4_

  - [ ] 2.8 Wire activity logging into AuthProvider (login events)
    - Call `logActivity({ event_type: 'login' })` on successful authentication
    - _Requirements: 41.1_

- [ ] 3. Implement Admin user management
  - [ ] 3.1 Create user management TanStack Query hooks (`/src/hooks/useUsers.ts`)
    - _Requirements: 6_

  - [ ] 3.2 Create User List page with TanStack Table
    - _Requirements: 6.5_

  - [ ] 3.3 Create User Create/Edit forms
    - _Requirements: 6.1_

  - [ ] 3.4 Implement soft-delete with confirmation
    - _Requirements: 6.2, 6.4_

  - [ ] 3.5 Create Bulk Import UI and Edge Function
    - _Requirements: 7_

- [ ] 4. Implement Program management
  - [ ] 4.1 Create program TanStack Query hooks (`/src/hooks/usePrograms.ts`)
    - _Requirements: 9_

  - [ ] 4.2 Create Program List page and forms
    - _Requirements: 9_

  - [ ] 4.3 Implement coordinator assignment to programs
    - _Requirements: 9.2_

- [ ] 5. Implement ILO management
  - [ ] 5.1 Create ILO TanStack Query hooks (`/src/hooks/useILOs.ts`)
    - _Requirements: 12_

  - [ ] 5.2 Create ILO List page with drag-and-drop reorder
    - _Requirements: 12.3_

  - [ ] 5.3 Create ILO Create/Edit form
    - _Requirements: 12.1_

  - [ ] 5.4 Implement ILO deletion with dependency check
    - _Requirements: 12.2_

- [ ] 6. Implement Admin Dashboard
  - [ ] 6.1 Create Admin layout with sidebar navigation
    - _Requirements: 27_

  - [ ] 6.2 Create Admin Dashboard page with KPI cards, activity feed, PLO heatmap
    - _Requirements: 27_

  - [ ] 6.3 Create Audit Log viewer page
    - _Requirements: 34_

- [ ] 7. Implement Bonus XP Event Manager
  - [ ] 7.1 Create bonus XP event TanStack Query hooks (`/src/hooks/useBonusEvents.ts`)
    - _Requirements: 36.3_

  - [ ] 7.2 Create Bonus XP Event Manager page (`/src/pages/admin/BonusXPEventManager.tsx`)
    - CRUD for bonus events: title, multiplier, start/end datetime, active toggle
    - Validate no overlapping active events
    - Log creation/modification to Audit_Logger
    - _Requirements: 36.3_

  - [ ] 7.3 Create BonusEventBanner shared component
    - Display active bonus event on Student Dashboard with countdown timer
    - _Requirements: 36.3_

- [ ] 8. Implement Course management
  - [ ] 8.1 Create course TanStack Query hooks (`/src/hooks/useCourses.ts`)
    - _Requirements: 10_

  - [ ] 8.2 Create Course List page and forms
    - _Requirements: 10_

  - [ ] 8.3 Implement teacher assignment to courses
    - _Requirements: 10.1_

- [ ] 9. Implement PLO management
  - [ ] 9.1 Create PLO TanStack Query hooks (`/src/hooks/usePLOs.ts`)
    - _Requirements: 13_

  - [ ] 9.2 Create PLO List page with drag-and-drop reorder
    - _Requirements: 13.4_

  - [ ] 9.3 Create PLO Create/Edit form with ILO mapping
    - _Requirements: 13.1, 13.2_

  - [ ] 9.4 Implement PLO-ILO weight validation
    - _Requirements: 13.3_

- [ ] 10. Implement Curriculum Matrix
  - [ ] 10.1 Create Curriculum Matrix component (PLO × Course grid)
    - _Requirements: 28.2_

  - [ ] 10.2 Implement click-through to evidence detail
    - _Requirements: 28.3_

  - [ ] 10.3 Implement CSV export
    - _Requirements: 28.3_

- [ ] 11. Implement Coordinator Dashboard
  - [ ] 11.1 Create Coordinator layout with sidebar
    - _Requirements: 28_

  - [ ] 11.2 Create Coordinator Dashboard with matrix, compliance rate, at-risk count
    - _Requirements: 28_

- [ ] 12. Implement CLO management
  - [ ] 12.1 Create CLO TanStack Query hooks (`/src/hooks/useCLOs.ts`)
    - _Requirements: 14_

  - [ ] 12.2 Create CLO List page with Bloom's level tags
    - _Requirements: 14.2_

  - [ ] 12.3 Create CLO Create/Edit form with PLO mapping and Bloom's selector
    - _Requirements: 14.1, 14.2, 14.3_

  - [ ] 12.4 Create Bloom's Verb Guide component (`/src/components/shared/BloomsVerbGuide.tsx`)
    - Display suggested action verbs when a Bloom's level is selected in CLO builder
    - Implement click-to-insert verb into CLO title field
    - Create `/src/lib/bloomsVerbs.ts` with verb constants per level
    - _Requirements: 38_

- [ ] 13. Implement Rubric Builder
  - [ ] 13.1 Create Rubric Builder component with dynamic criteria/levels grid
    - _Requirements: 15_

  - [ ] 13.2 Implement rubric template save/copy
    - _Requirements: 15.4, 15.5_

  - [ ] 13.3 Create rubric preview component
    - _Requirements: 15_

- [ ] 14. Implement Assignment management
  - [ ] 14.1 Create assignment TanStack Query hooks (`/src/hooks/useAssignments.ts`)
    - _Requirements: 16_

  - [ ] 14.2 Create Assignment List page
    - _Requirements: 16_

  - [ ] 14.3 Create Assignment Create/Edit form with CLO linking and weight distribution
    - Include prerequisite gate configuration: select CLO + minimum attainment % threshold
    - Store prerequisites as jsonb array on assignments table
    - _Requirements: 16.1, 37.2_

- [ ] 15. Implement Student Enrollment
  - [ ] 15.1 Create enrollment TanStack Query hooks (`/src/hooks/useEnrollments.ts`)
    - _Requirements: 11_

  - [ ] 15.2 Create student enrollment UI within course detail
    - _Requirements: 11_

- [ ] 16. Implement Grading
  - [ ] 16.1 Create Grading Queue component (pending submissions list)
    - _Requirements: 18, 29.1_

  - [ ] 16.2 Create Grading Interface with rubric cell selection
    - _Requirements: 18.1, 18.2, 18.3_

  - [ ] 16.3 Implement grade submission triggering Evidence Generator
    - _Requirements: 18.4_

- [ ] 17. Implement Evidence Generator Edge Function
  - [ ] 17.1 Create `calculate-attainment-rollup` Edge Function
    - Fetch CLO → PLO → ILO chain from outcome_mappings
    - Calculate attainment_level from score_percent
    - Insert immutable evidence record
    - UPSERT outcome_attainment at CLO, PLO, ILO levels
    - Insert notification for student
    - _Requirements: 19, 20_

  - [ ] 17.2 Create database trigger on `grades` table to invoke Edge Function
    - _Requirements: 19.4_

- [ ] 18. Implement Teacher Dashboard
  - [ ] 18.1 Create Teacher layout with sidebar
    - _Requirements: 29_

  - [ ] 18.2 Create Teacher Dashboard with grading queue, CLO chart, heatmap, Bloom's distribution
    - _Requirements: 29_

  - [ ] 18.3 Implement at-risk student list with nudge notification
    - _Requirements: 29.2, 29.4_

- [ ] 19. Implement Student Submission
  - [ ] 19.1 Create submission TanStack Query hooks (`/src/hooks/useSubmissions.ts`)
    - _Requirements: 17_

  - [ ] 19.2 Create Assignment Detail page with submission form
    - _Requirements: 17_

  - [ ] 19.3 Implement file upload to Supabase Storage
    - _Requirements: 17.1_

  - [ ] 19.4 Implement late submission logic
    - _Requirements: 17.2, 17.3_

  - [ ] 19.5 Wire activity logging into submission flow
    - Call `logActivity({ event_type: 'submission' })` on successful submission
    - _Requirements: 41.1_

- [ ] 20. Implement XP Engine
  - [ ] 20.1 Create `award-xp` Edge Function
    - Insert xp_transaction record
    - Recalculate student_gamification.xp_total
    - Check level-up condition
    - Check for active bonus_xp_events and apply multiplier
    - _Requirements: 21, 36.3_

  - [ ] 20.2 Wire XP triggers: login, submission, grade, journal, streak milestones, perfect day, first-attempt bonus, perfect rubric
    - _Requirements: 21.1, 35.2, 36.1, 36.2_

  - [ ] 20.3 Create XP animation component (confetti + count-up)
    - _Requirements: 21.2_

- [ ] 21. Implement Streak System
  - [ ] 21.1 Create `process-streak` Edge Function
    - Increment or reset streak on login
    - Update last_login_date
    - Check streak milestones
    - _Requirements: 22_

  - [ ] 21.2 Create Streak Display component with flame animation
    - _Requirements: 22_

- [ ] 22. Implement Badge System
  - [ ] 22.1 Create `check-badges` Edge Function
    - Check all badge conditions idempotently
    - Insert badge record if not already awarded
    - Support mystery badges (Speed Demon, Night Owl, Perfectionist) with hidden conditions
    - _Requirements: 23, 36.4_

  - [ ] 22.2 Create Badge Award modal with animation
    - Include mystery badge reveal animation (hidden → revealed transition)
    - _Requirements: 23.3, 36.4_

  - [ ] 22.3 Create Badge Collection display on profile
    - Show mystery badges as silhouettes until earned
    - _Requirements: 23.4, 36.4_

- [ ] 23. Implement Level System with Peer Milestone Notifications
  - [ ] 23.1 Implement level calculation from XP thresholds
    - _Requirements: 24_

  - [ ] 23.2 Create Level Progress component
    - _Requirements: 24.3_

  - [ ] 23.3 Create Level-Up animation (full-screen overlay)
    - _Requirements: 24.2_

  - [ ] 23.4 Wire peer milestone notifications on level-up
    - On level-up, query all peers in shared course enrollments
    - Create in-app notification: "Your classmate [name] just hit Level [X]!"
    - Skip students in anonymous leaderboard mode
    - Deliver via Supabase Realtime within 5 seconds
    - _Requirements: 42_

- [ ] 24. Implement Leaderboard
  - [ ] 24.1 Create leaderboard TanStack Query hooks (`/src/hooks/useLeaderboard.ts`)
    - _Requirements: 25_

  - [ ] 24.2 Create Leaderboard page with course/program/all filters
    - _Requirements: 25.2_

  - [ ] 24.3 Implement realtime leaderboard updates
    - _Requirements: 25.4_

  - [ ] 24.4 Implement anonymous opt-out
    - _Requirements: 25.5_

- [ ] 25. Implement Reflection Journal
  - [ ] 25.1 Create journal TanStack Query hooks (`/src/hooks/useJournal.ts`)
    - _Requirements: 26_

  - [ ] 25.2 Create Journal Editor page with contextual prompts
    - _Requirements: 26.1, 26.2_

  - [ ] 25.3 Implement word count validation and share toggle
    - _Requirements: 26.3, 26.4_

  - [ ] 25.4 Create contextual journal prompt generator (`/src/lib/journalPromptGenerator.ts`)
    - Generate prompts using CLO title, Bloom's level, attainment level, rubric feedback summary
    - Include 3–4 Kolb's Cycle aligned reflection questions
    - Store generated prompt text alongside journal entry
    - Allow student to dismiss prompt and write freely
    - _Requirements: 40_

  - [ ] 25.5 Wire activity logging into journal editor
    - Call `logActivity({ event_type: 'journal' })` on journal entry save
    - _Requirements: 41.1_

- [ ] 26. Implement Student Dashboard
  - [ ] 26.1 Create Student layout (mobile-first)
    - _Requirements: 30_

  - [ ] 26.2 Create Student Dashboard with hero card, learning path, deadlines, habit tracker, badges, leaderboard position
    - Include active Bonus XP Event banner when applicable
    - _Requirements: 30, 36.3_

  - [ ] 26.3 Create Learning Path visualization (node-based journey map)
    - Order assignments by Bloom's level (Remembering → Creating)
    - Show locked nodes with prerequisite tooltip for gated assignments
    - Animate node unlock when prerequisite is met
    - _Requirements: 30.1, 37_

  - [ ] 26.4 Create Daily Habit Tracker component (`/src/components/shared/HabitTracker.tsx`)
    - 7-day grid with 4 habit rows (Login, Submit, Journal, Read)
    - Color-coded cells: green = completed, gray = missed
    - Wire Perfect Day detection → XP award trigger
    - Create TanStack Query hooks (`/src/hooks/useHabits.ts`)
    - _Requirements: 30.1, 35_

- [ ] 27. Implement Student CLO Progress Dashboard
  - [ ] 27.1 Create CLO Progress component (`/src/pages/student/progress/CLOProgress.tsx`)
    - Display per-CLO attainment bars for each enrolled course
    - Each entry shows: CLO title, Bloom's level pill (color-coded), attainment percentage bar (color-coded by attainment level), attainment level label
    - Source data from `outcome_attainment` table scoped to `student_course`
    - _Requirements: 44.1, 44.2, 44.3_

  - [ ] 27.2 Implement CLO evidence drill-down
    - On CLO click, expand to show contributing evidence records (assignment name, score, date)
    - _Requirements: 44.5_

  - [ ] 27.3 Wire realtime updates for CLO Progress
    - Subscribe to `outcome_attainment` changes for the student
    - Update bars in real time when new grades are released
    - _Requirements: 44.4_

  - [ ] 27.4 Create CLOProgressBar shared component (`/src/components/shared/CLOProgressBar.tsx`)
    - Reusable attainment bar with Bloom's color coding and attainment level styling
    - _Requirements: 44.2_

- [ ] 28. Implement XP Transaction History
  - [ ] 28.1 Create XP history TanStack Query hooks (`/src/hooks/useXPHistory.ts`)
    - Query `xp_transactions` filtered by student_id
    - Support time period filtering: today, this_week, this_month, all_time
    - _Requirements: 45.3, 45.5_

  - [ ] 28.2 Create XP Transaction History page (`/src/pages/student/progress/XPHistory.tsx`)
    - Display each transaction: source label, XP amount (+prefix), timestamp, reference description
    - Show running total and per-source category summary
    - Use nuqs for URL-persisted filter state
    - _Requirements: 45.1, 45.2, 45.4_

  - [ ] 28.3 Add XP History link to Student Dashboard and Profile page
    - _Requirements: 45.1_

- [ ] 29. Implement Notification System
  - [ ] 29.1 Create notification TanStack Query hooks (`/src/hooks/useNotifications.ts`)
    - _Requirements: 31_

  - [ ] 29.2 Create Notification Bell component with unread count
    - _Requirements: 31.3_

  - [ ] 29.3 Create Notification Center dropdown
    - _Requirements: 31.4_

  - [ ] 29.4 Wire notification triggers: grade released, new assignment, badge earned, streak at risk, prerequisite unlocked, peer milestone
    - _Requirements: 31.2, 37.4, 42_

- [ ] 30. Implement Email Notifications
  - [ ] 30.1 Create `send-email-notification` Edge Function (Resend API integration)
    - Support templates: streak_risk, weekly_summary, new_assignment, grade_released, bulk_import_invitation
    - Implement retry logic (3× with exponential backoff)
    - _Requirements: 39_

  - [ ] 30.2 Create `streak-risk-cron` Edge Function (pg_cron → daily 8 PM)
    - Query students with no login today who have active streaks
    - Invoke send-email-notification for each
    - _Requirements: 39.1_

  - [ ] 30.3 Create `weekly-summary-cron` Edge Function (pg_cron → Monday 8 AM)
    - Aggregate weekly XP, badges, streak, attainment changes per student
    - Send summary email via Resend
    - _Requirements: 39.1_

  - [ ] 30.4 Create `perfect-day-prompt` Edge Function (pg_cron → daily 6 PM)
    - Query each active student's habit completion for the current day
    - If exactly 3 of 4 habits completed, send in-app notification identifying the missing habit
    - Notification text: "You're 1 habit away from a Perfect Day! ✨ Complete your [missing_habit] to earn 50 bonus XP."
    - Skip students who already completed all 4 habits
    - _Requirements: 43_

  - [ ] 30.5 Add email notification opt-out settings to Profile page
    - Per-type toggle: streak_risk, weekly_summary, new_assignment, grade_released
    - Store preferences in `profiles.email_preferences` jsonb column
    - _Requirements: 39.2_

- [ ] 31. Implement Realtime Subscriptions
  - [ ] 31.1 Create useRealtime hook (`/src/hooks/useRealtime.ts`)
    - Implement shared subscription manager: one subscription per table, components register callbacks
    - Do NOT create per-component subscriptions — share via centralized manager
    - _Requirements: 32_

  - [ ] 31.2 Wire realtime to: leaderboard, grading queue, notifications, XP/streak updates, CLO progress
    - _Requirements: 32.1, 44.4_

  - [ ] 31.3 Implement reconnection with exponential backoff
    - On connection failure, fall back to polling (30-second refetchInterval via TanStack Query)
    - Show "Live updates paused" banner when in polling fallback mode
    - _Requirements: 32, 53.5_

- [ ] 32. Implement Accreditation Report Generator
  - [ ] 32.1 Create `generate-accreditation-report` Edge Function
    - Aggregate outcome_attainment across institution
    - Render PDF via `jspdf` + `jspdf-autotable` (lightweight, no Puppeteer)
    - For charts: accept pre-rendered SVG/base64 from client
    - Upload to Supabase Storage
    - Return signed download URL
    - _Requirements: 33_

  - [ ] 32.2 Create Report Generator UI (Admin → Reports tab)
    - Program selector, semester selector, template selector (ABET/HEC/Generic)
    - _Requirements: 33.3_

  - [ ] 32.3 Create report download and email delivery
    - _Requirements: 33.4_

- [ ] 33. Implement AI Data Collection Foundation
  - [ ] 33.1 Wire activity logging into remaining flows
    - Page navigation (page_view), assignment detail (assignment_view), streak processor (streak_break)
    - _Requirements: 41.1_

  - [ ] 33.2 Create `compute-at-risk-signals` Edge Function (pg_cron → nightly 2 AM)
    - Compute: days since last login, CLO attainment trend direction, submission timing patterns
    - Store computed signals in student_gamification or dedicated column
    - _Requirements: 41.3_

- [ ] 34. Implement Profile Management
  - [ ] 34.1 Create Profile page for all roles
    - Include email notification preferences section
    - _Requirements: 8, 39.2_

  - [ ] 34.2 Implement avatar upload to Supabase Storage
    - _Requirements: 8.2_

- [ ] 35. Implement AI Module Suggestion (Capability 1)
  - [ ] 35.1 Create `ai-module-suggestion` Edge Function
    - Query student's `outcome_attainment` to find CLOs with attainment < 70%
    - Identify prerequisite CLO relationships from `outcome_mappings`
    - Generate suggestion text with CLO gap analysis
    - Query historical cohort data for social proof statistics
    - Store suggestion in `ai_feedback` table with `suggestion_type = 'module_suggestion'`
    - _Requirements: 46.1, 46.2, 46.3, 46.4, 46.5_

  - [ ] 35.2 Create AI Suggestion Widget for Student Dashboard (`/src/components/shared/AISuggestionCard.tsx`)
    - Display suggestion cards with CLO gap info and social proof text
    - Include thumbs up/down feedback buttons (AIFeedbackThumbs component)
    - Store feedback in `ai_feedback.feedback` column
    - _Requirements: 46.2, 46.6_

  - [ ] 35.3 Create AI suggestion TanStack Query hooks (`/src/hooks/useAISuggestions.ts`)
    - Fetch suggestions for current student
    - Mutation for submitting feedback
    - _Requirements: 46.5, 46.6_

- [ ] 36. Implement AI At-Risk Early Warning (Capability 2)
  - [ ] 36.1 Create `ai-at-risk-prediction` Edge Function (pg_cron → nightly)
    - Monitor per-student behavioral signals: login frequency (from `student_activity_log`), submission timing patterns, CLO attainment trends (from `outcome_attainment`)
    - Predict students likely to fail a CLO ≥7 days before next assignment due date
    - Calculate probability score (0–100%) based on weighted signal combination
    - Store predictions in `ai_feedback` table with `suggestion_type = 'at_risk_prediction'`
    - _Requirements: 47.1, 47.2, 47.5, 47.6_

  - [ ] 36.2 Create AI At-Risk Widget for Teacher Dashboard
    - Display at-risk students: name, CLO, probability score, contributing signals
    - One-click "Send Nudge" button to send personalized notification to student
    - _Requirements: 47.3, 47.4_

  - [ ] 36.3 Create at-risk prediction TanStack Query hooks (`/src/hooks/useAtRiskPredictions.ts`)
    - Fetch predictions for teacher's courses
    - Mutation for sending nudge notifications
    - _Requirements: 47.3, 47.4_

  - [ ] 36.4 Implement prediction validation on grade submission
    - When an assignment is graded, check if there was an at-risk prediction for that student+CLO
    - Update `ai_feedback.validated_outcome` to 'correct' or 'incorrect'
    - _Requirements: 49.2_

- [ ] 37. Implement AI Feedback Draft Generation (Capability 3)
  - [ ] 37.1 Create `ai-feedback-draft` Edge Function
    - Accept: submission_id, rubric_id, rubric_selections, student_id, clo_id
    - Generate draft feedback comments per rubric criterion based on: criteria descriptions, selected performance levels, student's historical feedback patterns, CLO context
    - Generate overall draft feedback
    - Return structured FeedbackDraftResponse
    - _Requirements: 48.1, 48.2, 48.4_

  - [ ] 37.2 Integrate AI draft into Grading Interface
    - Add "Generate AI Draft" button in grading interface
    - Display draft comments per criterion with accept/edit/reject controls
    - Label AI-generated feedback as "AI Draft" until teacher confirms
    - Log accepted/edited/rejected status to `ai_feedback` table with `suggestion_type = 'feedback_draft'`
    - _Requirements: 48.3, 48.5, 48.6_

  - [ ] 37.3 Create feedback draft TanStack Query hooks (`/src/hooks/useAIFeedbackDraft.ts`)
    - Mutation for generating draft
    - Mutation for logging draft acceptance/rejection
    - _Requirements: 48.4, 48.6_

- [ ] 38. Implement AI Feedback Flywheel & Admin Dashboard
  - [ ] 38.1 Create AI Performance summary for Admin Dashboard
    - Show: suggestion acceptance rate (thumbs up %), prediction accuracy rate (correct %), feedback draft acceptance rate (accepted %)
    - Query aggregated data from `ai_feedback` table grouped by `suggestion_type`
    - _Requirements: 49.5_

  - [ ] 38.2 Create AI performance TanStack Query hooks (`/src/hooks/useAIPerformance.ts`)
    - Aggregate metrics from `ai_feedback` table
    - _Requirements: 49.5_

- [ ] 39. Implement shared UI components
  - [ ] 39.1 Create all shared components: AttainmentBar, BloomsPill, OutcomeTypeBadge, KPICard, GradientCardHeader, HabitGrid, LockedNode, BloomsVerbGuide, MysteryBadge, BonusEventBanner, AIFeedbackThumbs, AISuggestionCard, AtRiskStudentRow, CLOProgressBar, XPTransactionRow, Shimmer, EmptyState, ConfirmDialog, DataTable wrapper
  - [ ] 39.2 Apply brand design tokens from design style guide to all pages
  - [ ] 39.3 Add custom animations: xp-pulse, badge-pop, shimmer, float, streak-flame, node-unlock, mystery-reveal
  - [ ] 39.4 Implement reduced motion support

- [ ] 40. Implement i18n foundation
  - [ ] 40.1 Set up i18next with English translations
  - [ ] 40.2 Extract all user-facing strings to translation files

- [ ] 41. Write comprehensive tests
  - [ ]* 41.1 Write property-based tests (Properties 1–40)
    - **Properties 1-3**: Auth (login, lockout, generic errors)
    - **Properties 4-5**: RBAC (data isolation, role enforcement)
    - **Properties 6-8**: Routing (role redirect, access denied, unauthenticated)
    - **Properties 9-12**: User management (CRUD, soft-delete, audit)
    - **Properties 13-14**: Bulk import (validation, atomicity)
    - **Properties 15-17**: ILO management (CRUD, dependency check, reorder)
    - **Property 18**: Audit logging (immutability)
    - **Properties 19-24**: OBE engine (PLO weights, CLO mapping, rubric structure, evidence, immutability, rollup)
    - **Properties 25-28**: Gamification (XP ledger, badge idempotency, streak calc, leaderboard order)
    - **Property 29**: Habit tracker Perfect Day detection
    - **Properties 30, 32**: Bonus XP (multiplier, first-attempt idempotency)
    - **Property 31**: Learning path prerequisite gating
    - **Property 33**: Mystery badge hidden conditions
    - **Property 34**: Activity log append-only integrity
    - **Property 35**: Journal prompt Kolb's Cycle alignment
    - **Property 36**: Peer milestone notification scoping
    - **Property 37**: Perfect Day prompt notification accuracy
    - **Properties 38-40**: AI Co-Pilot (CLO gap detection, at-risk timeliness, feedback flywheel integrity)
    - **Validates: Requirements 1-57**

  - [ ]* 41.2 Write unit tests for all modules
    - Auth, users, programs, courses, outcomes, rubrics, assignments, grading, evidence
    - XP, streaks, badges, leaderboard, journal, notifications, reports
    - Habits, bonus XP events, learning path, Bloom's verbs, journal prompts
    - Email notifications, activity logger, CLO progress, XP history
    - Peer notifications, Perfect Day prompt
    - AI module suggestion, AI at-risk prediction, AI feedback draft, AI feedback flywheel
    - _Requirements: All_

  - [ ]* 41.3 Write integration tests
    - Grading → evidence → rollup pipeline
    - XP award → level check → badge check pipeline
    - Habit completion → Perfect Day → XP pipeline
    - Prerequisite gating → unlock → notification pipeline
    - Level-up → peer milestone notification pipeline
    - AI suggestion → feedback collection pipeline
    - Realtime subscription delivery
    - _Requirements: All_

- [ ] 42. Production hardening
  - [ ] 42.1 Run Supabase security and performance advisors, fix all issues
  - [ ] 42.2 Verify RLS policies on all tables (including: habit_logs, bonus_xp_events, student_activity_log, ai_feedback)
  - [ ] 42.3 Add error boundaries and Sentry integration
  - [ ] 42.4 Performance audit: Lighthouse CI, bundle analysis
  - [ ] 42.5 Accessibility audit: keyboard navigation, screen reader, color contrast
  - [ ] 42.6 Validate NFR performance targets: dashboard load ≤1.5s, rollup ≤500ms, API p95 ≤300ms
  - [ ] 42.7 Validate FERPA/GDPR compliance: data classification, no PII in logs, deletion workflows
  - [ ] 42.8 Set up GitHub Dependabot for dependency vulnerability scanning

- [ ] 43. Seed 50 realistic students for AI Co-Pilot
  - [ ] 43.1 Create `seed-demo-data` Edge Function or SQL seed script (`supabase/seed.sql`)
    - Create 50 student profiles with realistic names, emails, institution_id
    - Create enrollments across 2–4 courses per student
    - Generate 10–30 submissions per student with varying scores and timing patterns (early, on-time, late, missed)
    - Generate grade records with rubric selections for each submission
    - Generate evidence records and outcome_attainment at CLO, PLO, ILO levels
    - Generate XP transactions (50–200 per student) from various sources (login, submission, badge, perfect_day, etc.)
    - Generate streak records in student_gamification
    - Generate badge awards (0–15 per student based on performance tier)
    - Generate journal entries (0–20 per student with varying word counts)
    - Generate habit_logs spanning 90–120 days with tier-appropriate completion rates
    - Generate student_activity_log entries (logins, page_views, submissions, journal, assignment_view)
    - Generate xp_transactions with sources matching activity patterns
    - Data distribution: 10 at-risk (low login, declining attainment), 15 high performers (daily logins, high scores, long streaks), 25 average (mixed patterns)
    - All timestamps distributed across 3–4 months ending at current date
    - Script must be idempotent — check for existing seed data before inserting
    - _Requirements: 54_

- [ ] 44. Implement Vercel Cron fallback for free-tier (pg_cron alternative)
  - [ ] 44.1 Create Vercel API routes for cron triggers (`/api/cron/`)
    - Create thin API routes for: streak-risk, weekly-summary, compute-at-risk, perfect-day-prompt, streak-reset, leaderboard-refresh, ai-at-risk-prediction
    - Each route authenticates with `CRON_SECRET` env var and calls the corresponding Supabase Edge Function
    - _Requirements: 50, 53_

  - [ ] 44.2 Create `vercel.json` cron configuration
    - Configure schedules matching pg_cron jobs: streak-risk (8 PM daily), weekly-summary (Monday 8 AM), compute-at-risk (2 AM nightly), perfect-day-prompt (6 PM daily), streak-reset (midnight daily), leaderboard-refresh (every 5 min), ai-at-risk-prediction (nightly)
    - _Requirements: 50, 53_

  - [ ] 44.3 Add environment detection to skip pg_cron setup on free tier
    - Check for `SUPABASE_PRO` env var; if absent, skip pg_cron extension and cron job creation in migrations
    - Document both approaches in README
    - _Requirements: 50_

- [ ] 45. Implement CI/CD Pipeline
  - [ ] 45.1 Create `.github/workflows/ci.yml`
    - Steps: checkout, setup Node 20, npm ci, ESLint (`npx eslint . --max-warnings 0`), TypeScript check (`npx tsc --noEmit`), unit tests (`npx vitest --run`), build (`npx vite build`)
    - Trigger on push to `main` and pull requests to `main`
    - _Requirements: 55_

  - [ ] 45.2 Configure Vercel GitHub integration
    - Production deployment on merge to `main`
    - Preview deployment on pull request
    - _Requirements: 55.3_

- [ ] 46. Implement Health Check Endpoint
  - [ ] 46.1 Create `health` Edge Function (`/supabase/functions/health/`)
    - Return JSON: `{ status, database, timestamp }`
    - Verify database connectivity with lightweight `SELECT 1` query
    - Return HTTP 503 if database unreachable
    - _Requirements: 56_

  - [ ] 46.2 Document BetterUptime/Checkly integration in README
    - Monitor health endpoint every 60 seconds
    - Alert on 2 consecutive failures
    - _Requirements: 56.3_

- [ ] 47. Create Load Test Scripts
  - [ ] 47.1 Create k6 load test scripts in `/load-tests/`
    - `login.js` — Authentication flow under load
    - `submission.js` — Assignment submission with file upload
    - `grading-pipeline.js` — Grade submission → evidence → rollup chain
    - `leaderboard.js` — Leaderboard queries with concurrent reads
    - Target: 5,000 virtual users, p95 ≤300ms
    - _Requirements: 57_

- [ ] 48. Implement leaderboard index optimization
  - [ ] 48.1 Add composite index on `student_gamification(xp_total DESC, student_id)` for direct leaderboard queries
    - Add institution-scoped index via `profiles.institution_id` join optimization
    - Document Redis upgrade path in code comments for >10K student scale
    - _Requirements: 50, 25_

- [ ] 49. Final verification — All tests pass, production ready
  - Ensure all tests pass, ask the user if questions arise.
  - Verify all 57 requirements (including NFRs 50-57) have corresponding implementations
  - Verify all 40+ correctness properties are testable
  - Confirm all tasks are complete

## Notes

- Tasks are ordered foundation-first in a single unified plan — no phase boundaries
- Edge Functions are deployed via Supabase MCP `deploy_edge_function`
- Database changes are applied via Supabase MCP `apply_migration`
- Types are regenerated after every migration
- All property tests use fast-check with Vitest, minimum 100 iterations
- Shared UI components (task 39) can be built incrementally as needed during earlier tasks
- pg_cron jobs require Supabase Pro plan or self-hosted — task 44 provides Vercel Cron fallback for free tier
- Supabase Realtime supports ~5K concurrent connections (Pro) / ~200 (free) — task 31 implements shared subscription pooling and polling fallback
- PDF generation uses `jspdf` + `jspdf-autotable` (no Puppeteer) due to Deno Edge Function constraints
- Leaderboard uses materialized view (works up to ~10K students) — Redis sorted sets documented as upgrade path
- Resend API key stored as Edge Function secret (`RESEND_API_KEY`)
- Activity logging is fire-and-forget — never blocks user-facing flows
- `ai_feedback` table is used by all 3 AI Co-Pilot capabilities (module suggestion, at-risk prediction, feedback draft)
- AI Co-Pilot Edge Functions use rule-based heuristics initially; can be upgraded to ML models as training data accumulates
- All 23 database tables with RLS already exist — Task 1.5 only adds extensions, indexes, cron jobs, and regenerates types
- 4 additional tables still need creation: habit_logs, bonus_xp_events, student_activity_log, ai_feedback
- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The `award-xp` Edge Function is referenced as `process-xp-event` in the architecture doc — they are the same function
- Streak Freeze item (purchasable with XP to protect streak for 1 day) is deferred to post-v1.0
