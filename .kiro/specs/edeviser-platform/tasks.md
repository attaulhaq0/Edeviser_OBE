# Implementation Plan: Edeviser Platform (Full Production)

## Overview

Complete unified implementation of the Edeviser platform covering authentication, RBAC, user/program/course management, the full OBE engine (outcomes, rubrics, assignments, submissions, grading, evidence, rollup), gamification (XP, streaks, badges, levels, leaderboards, journals, daily habits, variable rewards, learning path gating), Bloom's verb guide, email notifications (Resend), AI Co-Pilot (module suggestions, at-risk predictions, feedback drafts), peer milestone notifications, CLO progress dashboard, XP transaction history, seed data generation, CI/CD pipeline, health monitoring, load testing, four role-specific dashboards (plus parent portal), notifications, realtime, reporting, audit logging, platform enhancements (student portfolio, streak freeze, onboarding flows, read habit, dark mode, offline resilience, GDPR data export, notification batching, error states, teacher grading stats), institutional management features (semester management, course sections, surveys, CQI loop, configurable KPI thresholds, multi-accreditation body support, course file generation, announcements, course content/materials, discussion forums, attendance tracking, quiz/exam module, gradebook with weighted categories, calendar view, timetable, department management, academic calendar, student transcripts, parent/guardian portal, fee management), and production readiness improvements (multi-language RTL support, PWA, disaster recovery, Edge Function rate limiting, security headers, cookie consent, ToS/privacy pages, admin impersonation, bulk data operations, connection pooling, image optimization, global search, plagiarism placeholder, granular notification preferences, session management). Tasks are ordered foundation-first in a single unified plan.

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
    - Create `streakFreeze.ts` with `streakFreezePurchaseSchema`
    - Create `exportData.ts` with `exportRequestSchema`
    - Create `themePrefs.ts` with `themePreferenceSchema`
    - Create `onboarding.ts` with `onboardingStepSchema`, `checklistItemSchema`
    - Create `semester.ts` with `createSemesterSchema`, `updateSemesterSchema`
    - Create `department.ts` with `createDepartmentSchema`, `updateDepartmentSchema`
    - Create `courseSection.ts` with `createSectionSchema`, `updateSectionSchema`
    - Create `survey.ts` with `createSurveySchema`, `surveyQuestionSchema`, `surveyResponseSchema`
    - Create `cqiPlan.ts` with `createCQIPlanSchema`, `updateCQIPlanSchema`
    - Create `institutionSettings.ts` with `institutionSettingsSchema`, `gradeScaleSchema`
    - Create `programAccreditation.ts` with `programAccreditationSchema`
    - Create `announcement.ts` with `createAnnouncementSchema`
    - Create `courseModule.ts` with `createModuleSchema`, `createMaterialSchema`
    - Create `discussion.ts` with `createThreadSchema`, `createReplySchema`
    - Create `attendance.ts` with `createSessionSchema`, `attendanceRecordSchema`
    - Create `quiz.ts` with `createQuizSchema`, `quizQuestionSchema`, `quizAttemptSchema`
    - Create `gradeCategory.ts` with `gradeCategorySchema`
    - Create `timetable.ts` with `timetableSlotSchema`
    - Create `academicCalendar.ts` with `academicCalendarEventSchema`
    - Create `parentLink.ts` with `parentStudentLinkSchema`
    - Create `feeStructure.ts` with `feeStructureSchema`, `feePaymentSchema`
    - Create `transcript.ts` with `transcriptRequestSchema`
    - Create `courseFile.ts` with `courseFileRequestSchema`
    - Create `languagePrefs.ts` with `languagePreferenceSchema`
    - Create `cookieConsent.ts` with `cookieConsentSchema`
    - Create `impersonation.ts` with `impersonationSchema`
    - Create `bulkGradeExport.ts` with `gradeExportSchema`
    - Create `enrollmentImport.ts` with `enrollmentImportRowSchema`
    - Create `semesterTransition.ts` with `semesterTransitionSchema`
    - Create `globalSearch.ts` with `searchQuerySchema`, `searchResultSchema`
    - Create `notificationPrefs.ts` with `notificationPreferencesSchema`
    - Create `sessionManagement.ts` with `sessionActionSchema`
    - _Requirements: All_

  - [ ] 1.2 Create Audit Logger service (`/src/lib/auditLogger.ts`)
    - Implement `logAuditEvent(entry: AuditLogEntry): Promise<void>`
    - _Requirements: 34_

  - [ ] 1.3 Create TanStack Query key factory (`/src/lib/queryKeys.ts`)
    - Define hierarchical keys for all entities including AI Co-Pilot queries and institutional management entities (semesters, departments, courseSections, surveys, cqiPlans, institutionSettings, programAccreditations, announcements, courseModules, courseMaterials, discussionThreads, discussionReplies, classSessions, attendanceRecords, quizzes, quizAttempts, gradeCategories, gradebook, timetableSlots, academicCalendarEvents, parentStudentLinks, feeStructures, feePayments, calendarEvents, transcripts, courseFiles)
    - _Requirements: All_

  - [ ] 1.4 Create shared type definitions (`/src/types/app.ts`)
    - Export all app-level interfaces and type aliases
    - Bloom's levels, attainment levels, user roles, XP schedule, badge catalog, level thresholds
    - Habit types, learning path node types, bonus XP event types, activity log event types
    - AI Co-Pilot types: ModuleSuggestion, AtRiskPrediction, FeedbackDraft, AIFeedbackEntry
    - Portfolio types, StreakFreeze types, Onboarding types, ThemePreference, GradingStats types
    - DraftManager types, OfflineQueue types, NotificationBatcher types, ExportData types
    - Semester types, CourseSection types, Survey types, CQI types, InstitutionSettings types
    - Announcement types, CourseModule types, Discussion types, Attendance types
    - Quiz types, Gradebook types, Calendar types, Timetable types
    - Department types, AcademicCalendar types, Transcript types, CourseFile types
    - ParentPortal types, FeeManagement types, PaymentStatus types
    - LanguagePreference types, CookieConsent types, Impersonation types
    - BulkOperation types, GlobalSearch types, NotificationPreferences types
    - SessionManagement types, PWA types, RateLimiter types
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
    - Apply column additions: `student_gamification.streak_freezes_available`, `profiles.onboarding_completed`, `profiles.portfolio_public`, `profiles.theme_preference` (see design.md Column Additions)
    - Create new tables: `semesters`, `departments`, `course_sections`, `surveys`, `survey_questions`, `survey_responses`, `cqi_action_plans`, `institution_settings`, `program_accreditations`, `announcements`, `course_modules`, `course_materials`, `discussion_threads`, `discussion_replies`, `class_sessions`, `attendance_records`, `quizzes`, `quiz_questions`, `quiz_attempts`, `grade_categories`, `timetable_slots`, `academic_calendar_events`, `parent_student_links`, `fee_structures`, `fee_payments` — all with RLS enabled
    - Apply column additions: `courses.semester_id`, `programs.department_id`, `student_courses.section_id`
    - Create indexes: `idx_announcements_course`, `idx_discussion_threads_course`, `idx_attendance_student`, `idx_quiz_attempts_student`, `idx_fee_payments_student`
    - Update `student_activity_log.event_type` CHECK to include `grading_start`, `grading_end`, `material_view`, `announcement_view`, `discussion_post`, `quiz_attempt`, `attendance_marked`
    - Update `xp_transactions.source` CHECK to include `streak_freeze_purchase`, `discussion_question`, `discussion_answer`, `survey_completion`, `quiz_completion`
    - Create RLS policies for all new tables using `auth_user_role()` and `auth_institution_id()` helper functions
    - Create RLS policies for `parent` role on `parent_student_links` and read-only access to linked student data
    - Add pg_cron job: fee-overdue-check (daily 6 AM — update pending → overdue)
    - Apply column additions for production readiness: `profiles.language_preference`, `profiles.tos_accepted_at`, `profiles.notification_preferences`, `submissions.plagiarism_score`
    - Create full-text search tsvector columns and GIN indexes on `courses`, `assignments`, `announcements`, `course_materials`, `profiles`
    - _Requirements: 2, 34, 35, 36, 37, 41, 43, 47, 50, 51, 58, 59, 60, 62, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 91, 92, 94, 99, 100, 101_

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
    - Include route guards for all 5 roles: admin, coordinator, teacher, student, parent
    - Add `/parent/*` route group with ParentLayout
    - _Requirements: 3, 86.7_

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
  - [ ] 39.1 Create all shared components: AttainmentBar, BloomsPill, OutcomeTypeBadge, KPICard, GradientCardHeader, HabitGrid, LockedNode, BloomsVerbGuide, MysteryBadge, BonusEventBanner, AIFeedbackThumbs, AISuggestionCard, AtRiskStudentRow, CLOProgressBar, XPTransactionRow, Shimmer, EmptyState, ConfirmDialog, DataTable wrapper, ErrorState, UploadProgress, ReconnectBanner, StreakFreezeShop, ExportDataButton, QuickStartChecklist, SurveyForm, AttendanceGrid, QuizQuestionCard, GradebookMatrix, TimetableGrid, AnnouncementCard, MaterialItem, DiscussionThreadCard, CalendarEventCard, CQIStatusBadge, SectionComparisonChart, FeeStatusBadge, ParentStudentCard
  - [ ] 39.2 Apply brand design tokens from design style guide to all pages
  - [ ] 39.3 Add custom animations: xp-pulse, badge-pop, shimmer, float, streak-flame, node-unlock, mystery-reveal
  - [ ] 39.4 Implement reduced motion support

- [ ] 40. Implement i18n foundation
  - [ ] 40.1 Set up i18next with English translations
  - [ ] 40.2 Extract all user-facing strings to translation files

- [ ] 41. Write comprehensive tests
  - [ ]* 41.1 Write property-based tests (Properties 1–50)
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
    - **Properties 41-42**: Streak Freeze (consumption correctness, purchase constraints)
    - **Properties 43-44**: Notification batching (rate limiting, batching correctness)
    - **Properties 45-46**: Offline queue (flush integrity, draft round-trip)
    - **Property 47**: Student data export completeness
    - **Property 48**: Dark mode token consistency
    - **Property 49**: Read habit timer accuracy
    - **Property 50**: Grading time calculation correctness
    - _Validates: Requirements 1-67_

  - [ ]* 41.2 Write unit tests for all modules
    - Auth, users, programs, courses, outcomes, rubrics, assignments, grading, evidence
    - XP, streaks, badges, leaderboard, journal, notifications, reports
    - Habits, bonus XP events, learning path, Bloom's verbs, journal prompts
    - Email notifications, activity logger, CLO progress, XP history
    - Peer notifications, Perfect Day prompt
    - AI module suggestion, AI at-risk prediction, AI feedback draft, AI feedback flywheel
    - Semesters, departments, course sections, surveys, CQI plans, institution settings
    - Program accreditations, announcements, course modules, discussion forum
    - Attendance, quizzes, gradebook, calendar view, timetable
    - Academic calendar, transcripts, course file, parent portal, fee management
    - _Requirements: All_

  - [ ]* 41.3 Write integration tests
    - Grading → evidence → rollup pipeline
    - XP award → level check → badge check pipeline
    - Habit completion → Perfect Day → XP pipeline
    - Prerequisite gating → unlock → notification pipeline
    - Level-up → peer milestone notification pipeline
    - AI suggestion → feedback collection pipeline
    - Realtime subscription delivery
    - Quiz attempt → auto-grade → evidence → CLO attainment pipeline
    - Attendance marking → at-risk signal → AI prediction pipeline
    - Discussion post → XP award → badge check pipeline
    - Survey response → indirect evidence → accreditation report pipeline
    - Semester activation → course scoping → report filtering pipeline
    - Parent link verification → data access → notification pipeline
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
    - Create thin API routes for: streak-risk, weekly-summary, compute-at-risk, perfect-day-prompt, streak-reset, leaderboard-refresh, ai-at-risk-prediction, notification-digest
    - Each route authenticates with `CRON_SECRET` env var and calls the corresponding Supabase Edge Function
    - Include fee-overdue-check route
    - _Requirements: 50, 53, 87_

  - [ ] 44.2 Create `vercel.json` cron configuration
    - Configure schedules matching pg_cron jobs: streak-risk (8 PM daily), weekly-summary (Monday 8 AM), compute-at-risk (2 AM nightly), perfect-day-prompt (6 PM daily), streak-reset (midnight daily), leaderboard-refresh (every 5 min), ai-at-risk-prediction (nightly), notification-digest (8 PM daily), fee-overdue-check (6 AM daily)
    - _Requirements: 50, 53, 87_

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

- [ ] 49. Implement Student Learning Portfolio Page
  - [ ] 49.1 Create portfolio TanStack Query hooks (`/src/hooks/usePortfolio.ts`)
    - Query CLO mastery across all courses from `outcome_attainment`
    - Query badge collection with earn dates
    - Query journal entries with CLO links
    - Query cumulative XP timeline from `xp_transactions`
    - Query semester-over-semester attainment averages
    - _Requirements: 58_

  - [ ] 49.2 Create Student Portfolio page (`/src/pages/student/portfolio/StudentPortfolio.tsx`)
    - CLO mastery section grouped by course with Bloom's pills and attainment color coding
    - Badge collection grid with earn dates
    - Journal entry history with CLO links
    - XP timeline chart (Recharts line chart — cumulative XP over time)
    - Attainment growth section (semester comparison)
    - _Requirements: 58.1, 58.2, 58.3, 58.4_

  - [ ] 49.3 Implement public portfolio opt-in and shareable link
    - Toggle on Portfolio page to enable/disable public profile
    - Store `portfolio_public` boolean on `profiles` table
    - Create public route `/portfolio/:student_id` (unauthenticated, read-only)
    - Public view shows only non-sensitive data: badges, CLO attainment levels, XP total, level
    - _Requirements: 58.5, 58.6_

  - [ ] 49.4 Add portfolio route to AppRouter and Student sidebar navigation
    - _Requirements: 58_

- [ ] 50. Implement Streak Freeze
  - [ ] 50.1 Apply database migration: add `streak_freezes_available` column to `student_gamification`
    - `ALTER TABLE student_gamification ADD COLUMN streak_freezes_available integer NOT NULL DEFAULT 0 CHECK (streak_freezes_available >= 0 AND streak_freezes_available <= 2)`
    - Update `xp_transactions` source CHECK to include `'streak_freeze_purchase'`
    - Regenerate TypeScript types
    - _Requirements: 59.2_

  - [ ] 50.2 Create Streak Freeze Shop component (`/src/components/shared/StreakFreezeShop.tsx`)
    - Display current freeze inventory (snowflake icons, max 2)
    - Purchase button: disabled when XP < 200 or freezes >= 2
    - Calls `award-xp` Edge Function with `source = 'streak_freeze_purchase'`, `xp_amount = -200`
    - Show confirmation dialog before purchase
    - _Requirements: 59.1, 59.3, 59.6_

  - [ ] 50.3 Update `process-streak` Edge Function to consume Streak Freeze on missed day
    - If `streak_freezes_available > 0` and student missed a day: decrement freeze, keep streak intact
    - If `streak_freezes_available = 0` and student missed a day: reset streak to 0
    - _Requirements: 59.4_

  - [ ] 50.4 Create streak freeze TanStack Query hooks (`/src/hooks/useStreakFreeze.ts`)
    - Query current freeze inventory
    - Mutation for purchasing freeze
    - _Requirements: 59.1, 59.5_

  - [ ] 50.5 Add Streak Freeze Shop to Student Dashboard (near streak display)
    - _Requirements: 59_

- [ ] 51. Implement Onboarding Flows
  - [ ] 51.1 Apply database migration: add `onboarding_completed` column to `profiles`
    - `ALTER TABLE profiles ADD COLUMN onboarding_completed boolean NOT NULL DEFAULT false`
    - Regenerate TypeScript types
    - _Requirements: 60.6_

  - [ ] 51.2 Create OnboardingWizard component for Admin (`/src/components/shared/OnboardingWizard.tsx`)
    - Progress stepper: Create ILOs → Create Programs → Invite Coordinators → Invite Teachers
    - Each step navigates to the relevant page
    - Mark onboarding complete when all steps done
    - _Requirements: 60.1_

  - [ ] 51.3 Create WelcomeTour component for Coordinator, Teacher, Student (`/src/components/shared/WelcomeTour.tsx`)
    - Coordinator: program management, PLO mapping, curriculum matrix highlights
    - Teacher: course setup, CLO creation, rubric builder, grading queue highlights
    - Student: XP, streaks, habits, learning path, badges walkthrough + 50 XP Welcome Bonus on completion
    - _Requirements: 60.2, 60.3, 60.4_

  - [ ] 51.4 Create QuickStartChecklist component (`/src/components/shared/QuickStartChecklist.tsx`)
    - Role-specific checklist items displayed on dashboard
    - Persists until all items completed
    - Hides when `onboarding_completed = true`
    - _Requirements: 60.5, 60.7_

  - [ ] 51.5 Create onboarding TanStack Query hooks (`/src/hooks/useOnboarding.ts`)
    - Query onboarding status from `profiles.onboarding_completed`
    - Mutation to mark onboarding complete
    - _Requirements: 60.6, 60.7_

  - [ ] 51.6 Wire onboarding check into each role's dashboard layout
    - On first login (onboarding_completed = false), show wizard/tour
    - Show QuickStartChecklist until all items completed
    - _Requirements: 60_

- [ ] 52. Implement Read Habit (Achievable from Day One)
  - [ ] 52.1 Create `useReadHabitTimer` hook (`/src/hooks/useReadHabitTimer.ts`)
    - Start timer on mount for assignment detail and CLO progress pages
    - Track cumulative view duration per calendar day
    - When 30 seconds reached, insert `habit_log` record for 'read' habit
    - Log activity with `duration_seconds` metadata
    - _Requirements: 61.1, 61.2, 61.4_

  - [ ] 52.2 Wire `useReadHabitTimer` into AssignmentDetail and CLOProgressView pages
    - _Requirements: 61.2_

  - [ ] 52.3 Update Activity Logger to include `duration_seconds` metadata for `assignment_view` and `page_view` events
    - _Requirements: 61.3_

- [ ] 53. Implement Dark Mode Foundation
  - [ ] 53.1 Apply database migration: add `theme_preference` column to `profiles`
    - `ALTER TABLE profiles ADD COLUMN theme_preference text NOT NULL DEFAULT 'system' CHECK (theme_preference IN ('light', 'dark', 'system'))`
    - Regenerate TypeScript types
    - _Requirements: 62.3_

  - [ ] 53.2 Create ThemeProvider (`/src/providers/ThemeProvider.tsx`)
    - Read preference from `profiles.theme_preference`
    - Apply 'dark' class to `<html>` element
    - Listen to `prefers-color-scheme` media query when preference = 'system'
    - Provide `setPreference` mutation that updates profile and applies immediately
    - _Requirements: 62.4, 62.6_

  - [ ] 53.3 Define CSS custom properties for light/dark mode in `/src/index.css`
    - Light: background white, card white, border slate-200, text slate-900
    - Dark: background slate-950, card slate-900, border slate-700, text slate-100
    - _Requirements: 62.1, 62.5_

  - [ ] 53.4 Add theme toggle to Profile/Settings page
    - Three-way toggle: Light / Dark / System
    - _Requirements: 62.2_

  - [ ] 53.5 Wrap App in ThemeProvider
    - _Requirements: 62_

- [ ] 54. Implement Offline Resilience & Draft Saving
  - [ ] 54.1 Create DraftManager utility (`/src/lib/draftManager.ts`)
    - `saveDraft(key, content)`, `loadDraft(key)`, `clearDraft(key)`, `startAutoSave(key, getContent, intervalMs)`
    - Auto-save interval: 30 seconds
    - Clear draft on successful server save
    - _Requirements: 63.1, 63.2_

  - [ ] 54.2 Create OfflineQueue utility (`/src/lib/offlineQueue.ts`)
    - Queue events to localStorage when offline (`navigator.onLine` + `online`/`offline` events)
    - Auto-flush on `online` event
    - Max 3 retries per event
    - _Requirements: 63.5_

  - [ ] 54.3 Wire DraftManager into Journal Editor
    - Auto-save journal draft every 30 seconds
    - Restore draft on page load
    - Clear draft on successful save
    - _Requirements: 63.1_

  - [ ] 54.4 Wire DraftManager into Submission Form
    - Persist file selection and form state to localStorage
    - Clear on successful upload
    - _Requirements: 63.2_

  - [ ] 54.5 Implement upload retry on network failure
    - Queue failed uploads, retry when connectivity restored (max 3 retries)
    - _Requirements: 63.3_

  - [ ] 54.6 Wire OfflineQueue into Activity Logger
    - Queue activity log events when offline, flush when online
    - _Requirements: 63.5_

  - [ ] 54.7 Add TanStack Query optimistic updates for XP display and streak counter
    - _Requirements: 63.4_

- [ ] 55. Implement Student Data Export (GDPR)
  - [ ] 55.1 Create `export-student-data` Edge Function (`/supabase/functions/export-student-data/`)
    - Query all student-scoped tables: profiles, grades, outcome_attainment, xp_transactions, journal_entries, badges, habit_logs
    - Package as JSON or CSV based on request format
    - Upload to Supabase Storage, return signed download URL
    - Must complete within 30 seconds
    - _Requirements: 64.2, 64.3, 64.4, 64.5_

  - [ ] 55.2 Create ExportDataButton component (`/src/components/shared/ExportDataButton.tsx`)
    - Format selector (JSON/CSV) + Download button
    - Loading state during generation
    - Sonner toast on success/failure
    - _Requirements: 64.1, 64.5_

  - [ ] 55.3 Add "Download My Data" button to Student Profile page
    - _Requirements: 64.1_

- [ ] 56. Implement Notification Batching & Rate Limiting
  - [ ] 56.1 Create NotificationBatcher utility (`/src/lib/notificationBatcher.ts`)
    - Batch peer milestone notifications within 1-hour window
    - Enforce max 5 peer milestone notifications per student per 24 hours
    - Group notifications by type when >3 of same type exist
    - _Requirements: 65.1, 65.2, 65.3_

  - [ ] 56.2 Update peer milestone notification logic (in `award-xp` / `check-badges` Edge Functions)
    - Apply batching and rate limiting before creating notifications
    - _Requirements: 65.1, 65.2_

  - [ ] 56.3 Update Notification Center to display grouped notifications
    - "5 new grades released" instead of 5 separate notifications when >3 of same type
    - _Requirements: 65.3_

  - [ ] 56.4 Implement Notification Digest preference
    - Add digest toggle to notification preferences (stored in `profiles.email_preferences`)
    - Create `notification-digest` Edge Function (pg_cron → 8 PM daily)
    - Aggregate undelivered notifications into single daily summary for digest subscribers
    - _Requirements: 65.4, 65.5_

- [ ] 57. Implement ErrorState Component & Upload Progress
  - [ ] 57.1 Create ErrorState shared component (`/src/components/shared/ErrorState.tsx`)
    - Error icon, descriptive message, retry button, optional fallback content
    - _Requirements: 66.1_

  - [ ] 57.2 Create UploadProgress shared component (`/src/components/shared/UploadProgress.tsx`)
    - Progress bar with percentage, file name, file size
    - Status states: uploading, success, error
    - Retry and cancel buttons
    - _Requirements: 66.2_

  - [ ] 57.3 Create ReconnectBanner shared component (`/src/components/shared/ReconnectBanner.tsx`)
    - "Live updates paused — Reconnecting..." with animated dots
    - Auto-hide on reconnection
    - _Requirements: 66.4_

  - [ ] 57.4 Wire ErrorState into all error boundaries and data fetching error states
    - _Requirements: 66.1_

  - [ ] 57.5 Wire UploadProgress into Submission Form file upload
    - Show progress bar during upload, ErrorState with retry on failure
    - _Requirements: 66.2, 66.3_

  - [ ] 57.6 Wire ReconnectBanner into useRealtime hook
    - Show banner when Realtime disconnects, hide on reconnect
    - _Requirements: 66.4_

- [ ] 58. Implement Teacher Grading Stats
  - [ ] 58.1 Update Activity Logger to track grading time
    - Log `grading_start` event when teacher opens a submission in Grading Interface
    - Log `grading_end` event when teacher submits the grade
    - _Requirements: 67.2_

  - [ ] 58.2 Create grading stats TanStack Query hooks (`/src/hooks/useGradingStats.ts`)
    - Query: total graded this week, average grading time, pending count, velocity trend (last 30 days)
    - Calculate grading streak (consecutive days with ≥1 graded submission)
    - _Requirements: 67.1, 67.3_

  - [ ] 58.3 Create GradingStats component (`/src/pages/teacher/dashboard/GradingStats.tsx`)
    - KPI card layout: graded this week, avg time, pending, grading streak
    - Recharts line chart for velocity trend (submissions/day over 30 days)
    - _Requirements: 67.1, 67.4_

  - [ ] 58.4 Add GradingStats card to Teacher Dashboard
    - _Requirements: 67_

- [ ] 59. Write tests for platform enhancements
  - [ ]* 59.1 Write property-based tests (Properties 41–50)
    - **Properties 41-42**: Streak Freeze (consumption correctness, purchase constraints)
    - **Properties 43-44**: Notification batching (rate limiting, batching correctness)
    - **Properties 45-46**: Offline queue (flush integrity, draft round-trip)
    - **Property 47**: Student data export completeness
    - **Property 48**: Dark mode token consistency
    - **Property 49**: Read habit timer accuracy
    - **Property 50**: Grading time calculation correctness
    - _Requirements: 58-67_

  - [ ]* 59.2 Write unit tests for new modules
    - Student portfolio, streak freeze, onboarding, read habit timer, dark mode
    - Draft manager, offline queue, data export, notification batcher
    - Error state, upload progress, grading stats
    - _Requirements: 58-67_

  - [ ]* 59.3 Write integration tests for new flows
    - Streak freeze consumption pipeline (miss day → freeze consumed → streak preserved)
    - Offline queue flush pipeline (queue events → go online → events flushed)
    - _Requirements: 59, 63_

- [ ] 60. Implement Semester & Academic Structure
  - [ ] 60.1 Create semester TanStack Query hooks (`/src/hooks/useSemesters.ts`)
    - CRUD operations for semesters
    - Active semester query with institution scoping
    - _Requirements: 68_

  - [ ] 60.2 Create Semester Manager page (`/src/pages/admin/semesters/SemesterManager.tsx`)
    - List, create, edit semesters with date range validation
    - Active/inactive toggle with single-active enforcement
    - Deactivation preserves data as read-only
    - Log changes to Audit_Logger
    - _Requirements: 68.1, 68.2, 68.3, 68.5_

  - [ ] 60.3 Create Department Manager page (`/src/pages/admin/departments/DepartmentManager.tsx`)
    - CRUD for departments with head-of-department assignment
    - Block deletion if active programs exist
    - Log changes to Audit_Logger
    - _Requirements: 83_

  - [ ] 60.4 Create department TanStack Query hooks (`/src/hooks/useDepartments.ts`)
    - _Requirements: 83_

  - [ ] 60.5 Add department-level analytics to Admin Dashboard
    - Aggregated PLO/ILO attainment per department
    - _Requirements: 83.3_

  - [ ] 60.6 Migrate courses to use `semester_id` FK and programs to use `department_id` FK
    - Update course creation/edit forms to use semester dropdown
    - Update program creation/edit forms to use department dropdown
    - _Requirements: 68.6, 83.2_

- [ ] 61. Implement Course Section Support
  - [ ] 61.1 Create course section TanStack Query hooks (`/src/hooks/useCourseSections.ts`)
    - CRUD operations for sections within a course
    - _Requirements: 69_

  - [ ] 61.2 Create Section Manager UI within course detail page
    - Add/edit sections with section_code, teacher assignment, capacity
    - _Requirements: 69.1_

  - [ ] 61.3 Update student enrollment to scope by section
    - `student_courses` now includes `section_id` FK
    - Enrollment UI shows section selector
    - _Requirements: 69.2_

  - [ ] 61.4 Update submissions and grades to scope by section
    - Grading queue filtered by section
    - _Requirements: 69.3_

  - [ ] 61.5 Create section comparison view on Coordinator Dashboard
    - Side-by-side attainment metrics across sections of the same course
    - _Requirements: 69.6_

  - [ ] 61.6 Update Teacher Dashboard for per-section analytics
    - _Requirements: 69.7_

- [ ] 62. Implement Survey Module (Indirect Assessment)
  - [ ] 62.1 Create survey TanStack Query hooks (`/src/hooks/useSurveys.ts`)
    - CRUD for surveys, questions, and responses
    - _Requirements: 70_

  - [ ] 62.2 Create Survey Manager page (`/src/pages/admin/surveys/SurveyManager.tsx`)
    - Create surveys with title, type, linked outcomes
    - Add questions: Likert (1-5), MCQ, open text
    - Publish/unpublish surveys
    - _Requirements: 70.1, 70.2_

  - [ ] 62.3 Create Survey Response page (`/src/pages/student/surveys/SurveyResponsePage.tsx`)
    - Render survey questions with appropriate input types
    - Enforce single response per respondent
    - Award 15 XP on completion via XP_Engine
    - _Requirements: 70.3, 70.5, 70.6_

  - [ ] 62.4 Integrate survey results into accreditation reports
    - Aggregate responses by linked PLO/ILO as indirect assessment evidence
    - _Requirements: 70.4_

- [ ] 63. Implement CQI Loop
  - [ ] 63.1 Create CQI TanStack Query hooks (`/src/hooks/useCQIPlans.ts`)
    - CRUD for CQI action plans
    - _Requirements: 71_

  - [ ] 63.2 Create CQI Action Plan Manager page (`/src/pages/coordinator/cqi/CQIManager.tsx`)
    - Create/edit plans with outcome, baseline/target attainment, action description
    - Status workflow: planned → in_progress → completed → evaluated
    - Require result_attainment on evaluation
    - Log changes to Audit_Logger
    - _Requirements: 71.1, 71.2, 71.3, 71.6_

  - [ ] 63.3 Add CQI section to Coordinator Dashboard
    - Open/closed action plans with baseline vs. result comparison
    - _Requirements: 71.5_

  - [ ] 63.4 Integrate CQI plans into accreditation reports
    - Include as "closing the loop" evidence
    - _Requirements: 71.4_

- [ ] 64. Implement Configurable KPI Thresholds & Multi-Accreditation
  - [ ] 64.1 Create Institution Settings page (`/src/pages/admin/settings/InstitutionSettings.tsx`)
    - Configure attainment thresholds (excellent/satisfactory/developing)
    - Configure success threshold
    - Select accreditation body
    - Configure grade scales (letter/min/max/GPA points)
    - Log changes to Audit_Logger
    - _Requirements: 72.1, 72.2, 72.3, 72.5_

  - [ ] 64.2 Create institution settings TanStack Query hooks (`/src/hooks/useInstitutionSettings.ts`)
    - _Requirements: 72_

  - [ ] 64.3 Refactor all attainment level calculations to use configurable thresholds
    - Update Evidence_Generator, dashboards, reports, AI predictions
    - Replace hardcoded 85/70/50 with institution_settings values
    - _Requirements: 72.4_

  - [ ] 64.4 Create Program Accreditation Manager
    - Tag programs with multiple accreditation bodies
    - Track accreditation dates and review schedules
    - Display accreditation status on Admin Dashboard
    - _Requirements: 73_

  - [ ] 64.5 Update Report Generator for body-specific reports
    - Generate reports per accreditation body per program
    - Support different PLO naming conventions
    - _Requirements: 73.2, 73.3_

- [ ] 65. Implement Course File / Portfolio Generation
  - [ ] 65.1 Create `generate-course-file` Edge Function (`/supabase/functions/generate-course-file/`)
    - Aggregate: syllabus, CLO-PLO mapping, assessment instruments, sample work (best/avg/worst), CLO attainment charts, teacher reflection, CQI recommendations
    - Generate as PDF or ZIP
    - Upload to Supabase Storage, return signed URL
    - Must complete within 30 seconds
    - _Requirements: 74.1, 74.2, 74.3, 74.5_

  - [ ] 65.2 Create Course File generation UI on Coordinator course detail page
    - Trigger generation button with format selector (PDF/ZIP)
    - Loading state during generation
    - Download link on completion
    - _Requirements: 74.4_

  - [ ] 65.3 Create course file TanStack Query hooks (`/src/hooks/useCourseFile.ts`)
    - Mutation for triggering generation
    - _Requirements: 74_

- [ ] 66. Implement Announcements & Course Content
  - [ ] 66.1 Create announcement TanStack Query hooks (`/src/hooks/useAnnouncements.ts`)
    - CRUD for announcements within a course
    - _Requirements: 75_

  - [ ] 66.2 Create Announcement Editor page (`/src/pages/teacher/announcements/AnnouncementEditor.tsx`)
    - Create/edit announcements with markdown content and pin toggle
    - _Requirements: 75.1, 75.4_

  - [ ] 66.3 Display announcements on Student Dashboard and course detail page
    - Ordered by pinned DESC, created_at DESC
    - Trigger notification on new announcement
    - _Requirements: 75.2, 75.3_

  - [ ] 66.4 Wire announcement view into Read habit (30+ seconds)
    - Use `useReadHabitTimer` hook on announcement detail view
    - _Requirements: 75.5_

  - [ ] 66.5 Create Course Module Manager (`/src/pages/teacher/courses/ModuleManager.tsx`)
    - Create/edit modules with title, description, sort order, publish toggle
    - Add materials: file upload (Supabase Storage), links, video embeds, text
    - Link materials to CLOs for traceability
    - _Requirements: 76.1, 76.2, 76.3, 76.4_

  - [ ] 66.6 Create course module/material TanStack Query hooks (`/src/hooks/useCourseModules.ts`)
    - _Requirements: 76_

  - [ ] 66.7 Display materials on Student course detail page organized by module
    - Wire material view into Read habit (30+ seconds)
    - _Requirements: 76.5, 76.6_

- [ ] 67. Implement Discussion Forum
  - [ ] 67.1 Create discussion TanStack Query hooks (`/src/hooks/useDiscussions.ts`)
    - CRUD for threads and replies
    - _Requirements: 77_

  - [ ] 67.2 Create Discussion Thread List page (`/src/pages/student/discussions/DiscussionForum.tsx`)
    - List threads per course, ordered by pinned DESC, created_at DESC
    - Resolved threads visually distinguished
    - _Requirements: 77.6_

  - [ ] 67.3 Create Thread Detail page with replies
    - Teacher can mark reply as "answer" (sets is_resolved on thread)
    - _Requirements: 77.2, 77.3_

  - [ ] 67.4 Wire XP awards for discussion participation
    - 10 XP for creating a thread (discussion_question)
    - 15 XP for answer marked correct (discussion_answer)
    - _Requirements: 77.4, 77.5_

  - [ ] 67.5 Create Discussion Moderation page for Teachers
    - Pin/unpin threads, mark answers, delete inappropriate content
    - _Requirements: 77.3_

- [ ] 68. Implement Attendance Tracking
  - [ ] 68.1 Create attendance TanStack Query hooks (`/src/hooks/useAttendance.ts`)
    - CRUD for class sessions and attendance records
    - Attendance percentage calculation
    - _Requirements: 78_

  - [ ] 68.2 Create Attendance Marker page (`/src/pages/teacher/attendance/AttendanceMarker.tsx`)
    - Create class sessions (date, type, topic)
    - Mark attendance per student: present/absent/late/excused
    - Bulk marking with AttendanceGrid component
    - _Requirements: 78.1, 78.2_

  - [ ] 68.3 Create Attendance Report view
    - Per-student attendance percentage per course
    - Flag students below 75% threshold
    - _Requirements: 78.3, 78.4_

  - [ ] 68.4 Display attendance on Student Dashboard
    - Attendance percentage per enrolled course
    - _Requirements: 78.5_

  - [ ] 68.5 Wire attendance data into AI at-risk prediction
    - Add attendance frequency as contributing signal in `compute-at-risk-signals`
    - _Requirements: 78.6_

  - [ ] 68.6 Wire "Perfect Attendance Week" badge
    - Award badge when student is present for all sessions in a 7-day period
    - _Requirements: 78.7_

- [ ] 69. Implement Quiz/Exam Module
  - [ ] 69.1 Create quiz TanStack Query hooks (`/src/hooks/useQuizzes.ts`)
    - CRUD for quizzes, questions, and attempts
    - _Requirements: 79_

  - [ ] 69.2 Create Quiz Builder page (`/src/pages/teacher/quizzes/QuizBuilder.tsx`)
    - Create quizzes with title, CLO links, time limit, max attempts, due date
    - Add questions: MCQ (single/multi), true/false, short answer, fill-in-blank
    - Set correct answers and point values
    - Publish/unpublish toggle
    - _Requirements: 79.1, 79.2_

  - [ ] 69.3 Create Quiz Attempt page (`/src/pages/student/quizzes/QuizAttemptPage.tsx`)
    - Display questions with timer (if time limit set)
    - Enforce max attempts
    - Auto-submit on time expiry
    - _Requirements: 79.3, 79.7_

  - [ ] 69.4 Create `auto-grade-quiz` Edge Function or client-side grading logic
    - Auto-grade MCQ, true/false, fill-in-blank immediately
    - Flag short answer for manual teacher grading
    - _Requirements: 79.4_

  - [ ] 69.5 Wire quiz scores into CLO attainment pipeline
    - Generate evidence records from quiz scores (same as assignment grades)
    - _Requirements: 79.5_

  - [ ] 69.6 Wire XP awards for quiz completion
    - 50 XP on-time, 25 XP if late (same schedule as assignments)
    - _Requirements: 79.6_

- [ ] 70. Implement Gradebook with Weighted Categories
  - [ ] 70.1 Create gradebook TanStack Query hooks (`/src/hooks/useGradebook.ts`)
    - CRUD for grade categories
    - Gradebook matrix query (students × assessments)
    - _Requirements: 80_

  - [ ] 70.2 Create Grade Category Manager
    - Define categories with name and weight percentage
    - Enforce sum of weights = 100%
    - Link assignments and quizzes to categories
    - _Requirements: 80.1, 80.2_

  - [ ] 70.3 Create Gradebook View page (`/src/pages/teacher/gradebook/GradebookView.tsx`)
    - Students × assessments matrix with category subtotals
    - Final weighted grade and letter grade per student
    - Filterable by section
    - _Requirements: 80.3, 80.4, 80.6_

  - [ ] 70.4 Implement letter grade mapping using institution_settings.grade_scales
    - _Requirements: 80.5_

- [ ] 71. Implement Calendar View
  - [ ] 71.1 Create calendar TanStack Query hooks (`/src/hooks/useCalendar.ts`)
    - Aggregate events from assignments, quizzes, class_sessions, academic_calendar_events
    - _Requirements: 81_

  - [ ] 71.2 Create Calendar View page (`/src/pages/shared/CalendarView.tsx`)
    - Monthly/weekly view with color-coded events by course
    - Student view: all enrolled courses; Teacher view: all taught courses
    - _Requirements: 81.1, 81.2, 81.3_

  - [ ] 71.3 Integrate calendar with Student Dashboard deadline widget
    - _Requirements: 81.4_

  - [ ] 71.4 Add calendar to dashboard sidebar for Students and Teachers
    - _Requirements: 81.5_

- [ ] 72. Implement Timetable
  - [ ] 72.1 Create timetable TanStack Query hooks (`/src/hooks/useTimetable.ts`)
    - Query timetable slots for student (from enrolled sections) or teacher (from assigned sections)
    - _Requirements: 82_

  - [ ] 72.2 Create Timetable View page (`/src/pages/shared/TimetableView.tsx`)
    - Weekly grid: days as columns, time slots as rows
    - Color-coded by course
    - _Requirements: 82.1, 82.4_

  - [ ] 72.3 Admin/Coordinator UI for managing timetable slots
    - Assign day, time, room, slot type per section
    - _Requirements: 82.1_

  - [ ] 72.4 Add timetable to dashboard sidebar
    - _Requirements: 82.5_

- [ ] 73. Implement Academic Calendar Management
  - [ ] 73.1 Create academic calendar TanStack Query hooks (`/src/hooks/useAcademicCalendar.ts`)
    - CRUD for academic calendar events
    - _Requirements: 84_

  - [ ] 73.2 Create Academic Calendar Manager page (`/src/pages/admin/calendar/AcademicCalendarManager.tsx`)
    - Create events: semester dates, exam periods, holidays, registration deadlines
    - Support recurring events
    - _Requirements: 84.1_

  - [ ] 73.3 Display academic calendar events on unified Calendar View
    - _Requirements: 84.2_

  - [ ] 73.4 Implement assignment due date holiday validation
    - Warn teachers when due date falls on a holiday
    - _Requirements: 84.3_

  - [ ] 73.5 Wire exam period approach notifications
    - "Exam period starts in 5 days" notification to enrolled students
    - _Requirements: 84.4_

- [ ] 74. Implement Student Transcript Generation
  - [ ] 74.1 Create `generate-transcript` Edge Function (`/supabase/functions/generate-transcript/`)
    - Query student courses, grades, grade categories, CLO attainment per semester
    - Calculate semester GPA and cumulative GPA using institution grade scales
    - Generate PDF via jspdf
    - Upload to Supabase Storage, return signed URL
    - Must complete within 10 seconds
    - _Requirements: 85.1, 85.2, 85.3, 85.5_

  - [ ] 74.2 Create transcript TanStack Query hooks (`/src/hooks/useTranscript.ts`)
    - Mutation for triggering generation
    - _Requirements: 85_

  - [ ] 74.3 Add "Download Transcript" button to Student Profile page
    - Semester selector for per-semester or cumulative transcript
    - _Requirements: 85.4_

  - [ ] 74.4 Add transcript generation to Admin user detail page
    - _Requirements: 85.4_

- [ ] 75. Implement Parent/Guardian Portal
  - [ ] 75.1 Create parent TanStack Query hooks (`/src/hooks/useParentPortal.ts`)
    - Query linked students via parent_student_links
    - Query student grades, attendance, CLO progress, habits (read-only)
    - _Requirements: 86_

  - [ ] 75.2 Create Parent Dashboard page (`/src/pages/parent/ParentDashboard.tsx`)
    - Display linked students with grades, attendance %, CLO progress bars, habit tracker
    - XP/level/streak summary per student
    - Read-only — no mutation capabilities
    - _Requirements: 86.3_

  - [ ] 75.3 Create ParentLayout with sidebar navigation
    - _Requirements: 86.7_

  - [ ] 75.4 Implement parent email notifications
    - Grade released, attendance alert (below 75%), at-risk warning
    - _Requirements: 86.4_

  - [ ] 75.5 Create parent invite flow for Admin
    - Bulk import or individual invite creating parent profile + parent_student_links record
    - _Requirements: 86.5_

  - [ ] 75.6 Create RLS policies for parent role
    - Read-only access to linked student data via verified parent_student_links
    - _Requirements: 86.1, 86.6_

- [ ] 76. Implement Fee Management
  - [ ] 76.1 Create fee management TanStack Query hooks (`/src/hooks/useFees.ts`)
    - CRUD for fee structures and payments
    - Fee collection summary query
    - _Requirements: 87_

  - [ ] 76.2 Create Fee Structure Manager page (`/src/pages/admin/fees/FeeManager.tsx`)
    - Create fee structures per program per semester
    - Record payments with method, receipt number
    - Fee collection dashboard with overdue alerts
    - Log changes to Audit_Logger
    - _Requirements: 87.1, 87.2, 87.4, 87.5, 87.7_

  - [ ] 76.3 Display fee status on Student Profile page
    - Outstanding and paid fees
    - _Requirements: 87.3_

  - [ ] 76.4 Implement fee receipt PDF generation
    - Downloadable receipt per payment
    - _Requirements: 87.6_

  - [ ] 76.5 Implement overdue auto-flagging via pg_cron
    - Daily check: update pending → overdue when past due_date
    - _Requirements: 87.5_

- [ ] 77. Implement Report Generator updates for new features
  - [ ] 77.1 Update accreditation reports to include survey results as indirect assessment evidence
    - _Requirements: 70.4_

  - [ ] 77.2 Update accreditation reports to include CQI action plans as "closing the loop" evidence
    - _Requirements: 71.4_

  - [ ] 77.3 Update reports to scope by semester_id
    - _Requirements: 68.4_

  - [ ] 77.4 Update reports to show per-section and aggregated attainment
    - _Requirements: 69.5_

  - [ ] 77.5 Update report template selector to include QQA and NCAAA
    - _Requirements: 73.2_

- [ ] 78. Wire new XP sources and badges
  - [ ] 78.1 Update `award-xp` Edge Function to support new sources
    - Add: `discussion_question`, `discussion_answer`, `survey_completion`, `quiz_completion`
    - _Requirements: 77.4, 77.5, 70.5, 79.6_

  - [ ] 78.2 Update `check-badges` Edge Function for new badges
    - Perfect Attendance Week, Quiz Master, Discussion Helper, Survey Completer
    - _Requirements: 78.7, 23_

  - [ ] 78.3 Update Read habit to include announcements and course materials
    - Wire `useReadHabitTimer` into announcement and material views
    - _Requirements: 75.5, 76.6_

  - [ ] 78.4 Update `compute-at-risk-signals` to include attendance and quiz data
    - _Requirements: 78.6, 41_

- [ ] 79. Write tests for institutional management & LMS features
  - [ ]* 79.1 Write property-based tests (Properties 51–65)
    - **Properties 51, 65**: Semester (active uniqueness, scoping integrity)
    - **Property 52**: Course section CLO sharing
    - **Property 53**: Survey response uniqueness
    - **Property 54**: CQI action plan lifecycle
    - **Property 55**: Configurable threshold consistency
    - **Property 56**: Grade category weight sum
    - **Properties 57, 58**: Quiz (auto-grading correctness, attempt limit enforcement)
    - **Property 59**: Attendance percentage calculation
    - **Property 60**: Discussion XP award correctness
    - **Property 61**: Calendar event aggregation completeness
    - **Property 62**: Parent portal data isolation
    - **Property 63**: Fee payment status consistency
    - **Property 64**: Course file content completeness
    - _Requirements: 68-87_

  - [ ]* 79.2 Write unit tests for institutional management modules
    - Semesters, departments, course sections, surveys, CQI plans
    - Institution settings, program accreditations, announcements, course modules
    - Discussion forum, attendance, quizzes, gradebook
    - Calendar view, timetable, academic calendar, transcripts, course file
    - Parent portal, fee management
    - _Requirements: 68-87_

  - [ ]* 79.3 Write integration tests for new flows
    - Quiz attempt → auto-grade → evidence → CLO attainment pipeline
    - Attendance marking → at-risk signal → AI prediction pipeline
    - Discussion post → XP award → badge check pipeline
    - Survey response → indirect evidence → accreditation report pipeline
    - Semester activation → course scoping → report filtering pipeline
    - Parent link verification → data access → notification pipeline
    - _Requirements: 68-87_

- [ ] 80. Final verification — All tests pass, production ready
  - Ensure all tests pass, ask the user if questions arise.
  - Verify all 102 requirements (including NFRs 50-57, enhancements 58-67, institutional management 68-87, and production readiness 88-102) have corresponding implementations
  - Verify all 80 correctness properties are testable
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
- Streak Freeze (Requirement 59) adds `streak_freezes_available` column to `student_gamification` and `streak_freeze_purchase` source to `xp_transactions`
- Platform enhancements (Requirements 58-67) add 4 new columns to `profiles`: `onboarding_completed`, `portfolio_public`, `theme_preference`, and extend `email_preferences` with digest option
- Dark mode (Requirement 62) uses CSS custom properties with `.dark` class on `<html>` — ThemeProvider manages the toggle
- Offline resilience (Requirement 63) uses localStorage for draft saving and event queuing — never blocks user-facing flows
- Notification batching (Requirement 65) applies to peer milestone notifications only — grade/assignment notifications are always delivered immediately
- Student data export (Requirement 64) runs as an Edge Function with a 30-second timeout — exports are uploaded to Supabase Storage
- Teacher grading stats (Requirement 67) tracks grading time via `grading_start`/`grading_end` activity log events
- Read habit (Requirement 61) uses a client-side 30-second timer on qualifying pages — replaces the Phase 2 content engagement tracker
- Onboarding (Requirement 60) awards 50 XP Welcome Bonus to students on tour completion via the existing `award-xp` Edge Function
- Semester management (Requirement 68) replaces the free-text `semester` field on courses with a proper `semester_id` FK
- Course sections (Requirement 69) share CLOs/rubrics/assignments at the course level but scope enrollments/submissions/grades to the section level
- Surveys (Requirement 70) provide indirect assessment evidence for accreditation — results appear alongside direct assessment data in reports
- CQI action plans (Requirement 71) are the institutional equivalent of student reflection journals — they close Kolb's cycle at the program level
- Configurable thresholds (Requirement 72) replace all hardcoded attainment level values (85/70/50) with institution-specific settings
- Quiz auto-grading (Requirement 79) generates evidence for CLO attainment using the same pipeline as assignment grades
- Gradebook (Requirement 80) coexists with CLO attainment — one shows traditional grades, the other shows OBE competency
- Parent role (Requirement 86) requires its own RLS policies and route guard — read-only access only
- Fee management (Requirement 87) uses pg_cron for daily overdue auto-flagging
- All 25 new database tables require RLS policies — no exceptions
- All admin mutations on new tables must log to audit_logs
- New XP sources: discussion_question (10), discussion_answer (15), survey_completion (15), quiz_completion (50/25)
- New badges: Perfect Attendance Week, Quiz Master, Discussion Helper, Survey Completer
- Attendance data feeds into AI at-risk prediction as a contributing signal
- Course File generation packages Pillars 1, 2, 3, and 10 into a single accreditation artifact
- Transcript generation combines traditional gradebook grades with OBE CLO attainment data
- RTL support (Requirement 88) extends task 40 (i18n foundation) — LanguageProvider sets `dir="rtl"` on `<html>` for Urdu/Arabic
- PWA (Requirement 89) uses cache-first for app shell only — never caches Supabase API responses
- Disaster recovery (Requirement 90) is documentation-only — no code changes, just `/docs/disaster-recovery.md`
- Edge Function rate limiting (Requirement 91) uses a shared `_shared/rateLimiter.ts` module imported by all Edge Functions
- Security headers (Requirement 92) are configured entirely in `vercel.json` — no application code changes
- Cookie consent (Requirement 93) uses localStorage — blocks analytics until consent given, core functionality unaffected
- ToS acceptance (Requirement 94) adds `tos_accepted_at` column to `profiles` — blocks all protected routes until accepted
- Admin impersonation (Requirement 95) is read-only — all mutations blocked during impersonation, auto-expires after 30 minutes
- Bulk data operations (Requirement 96) include grade export (teacher), enrollment import/export (coordinator), semester transition (coordinator), and data cleanup (admin)
- Connection pooling (Requirement 97) is documentation-only — `/docs/connection-pooling.md` with pool size recommendations per tier
- Image optimization (Requirement 98) uses client-side canvas API compression before upload — max 500KB, 256×256
- Global search (Requirement 99) uses Supabase full-text search with tsvector + GIN indexes — Cmd+K / Ctrl+K shortcut
- Plagiarism placeholder (Requirement 100) adds nullable `plagiarism_score` column to `submissions` — no actual plagiarism detection, just infrastructure
- Notification preferences (Requirement 101) adds `notification_preferences` jsonb to `profiles` — per-course muting and quiet hours
- Session management (Requirement 102) uses Supabase Auth admin API for session enumeration and termination
- New column additions to `profiles`: `language_preference`, `tos_accepted_at`, `notification_preferences`
- New column addition to `submissions`: `plagiarism_score`
- Full-text search adds `search_vector` tsvector columns to: `courses`, `assignments`, `announcements`, `course_materials`, `profiles`


- [ ] 81. Implement Multi-Language / RTL Support
  - [ ] 81.1 Apply database migration: add `language_preference` column to `profiles`
    - `ALTER TABLE profiles ADD COLUMN language_preference text NOT NULL DEFAULT 'en' CHECK (language_preference IN ('en', 'ur', 'ar'))`
    - Regenerate TypeScript types
    - _Requirements: 88.5_

  - [ ] 81.2 Create LanguageProvider (`/src/providers/LanguageProvider.tsx`)
    - Read preference from `profiles.language_preference`
    - Set `dir="rtl"` on `<html>` for Urdu and Arabic, `dir="ltr"` for English
    - Switch i18next language on preference change
    - Apply direction change without page refresh
    - _Requirements: 88.1, 88.6_

  - [ ] 81.3 Create translation file stubs
    - `/public/locales/en/translation.json` (existing English strings)
    - `/public/locales/ur/translation.json` (Urdu stub with key structure matching English)
    - `/public/locales/ar/translation.json` (Arabic stub with key structure matching English)
    - _Requirements: 88.2_

  - [ ] 81.4 Create RTL-aware CSS utilities (`/src/styles/rtl.css`)
    - Mirror horizontal padding, margins, flexbox directions, border-radius for RTL
    - Ensure sidebar moves to right side in RTL mode
    - _Requirements: 88.3_

  - [ ] 81.5 Create LanguageSelector component (`/src/components/shared/LanguageSelector.tsx`)
    - Dropdown: English, اردو (Urdu), العربية (Arabic)
    - Add to Profile Settings page
    - _Requirements: 88.4_

  - [ ] 81.6 Wrap App in LanguageProvider and wire into i18next configuration
    - Extend existing task 40 (i18n foundation) with RTL support
    - _Requirements: 88.1, 88.6_

- [ ] 82. Implement Progressive Web App (PWA)
  - [ ] 82.1 Create web app manifest (`/public/manifest.json`)
    - Edeviser branding: name, short_name, icons (192×192, 512×512), theme_color (#3b82f6), background_color (#ffffff), display: standalone, start_url: /
    - _Requirements: 89.1_

  - [ ] 82.2 Create service worker (`/public/sw.js`)
    - Cache-first strategy for app shell (HTML, CSS, JS bundles)
    - Network-first for API calls — never cache Supabase responses
    - Offline fallback: display cached shell with "You are offline" message
    - Version cache name for cache busting on deploy
    - _Requirements: 89.2, 89.5, 89.6_

  - [ ] 82.3 Register service worker in app entry point
    - Register in `src/main.tsx` with scope `/`
    - _Requirements: 89.2_

  - [ ] 82.4 Create PWAInstallPrompt component (`/src/components/shared/PWAInstallPrompt.tsx`)
    - Listen for `beforeinstallprompt` event
    - Show install banner on mobile devices
    - Store dismissal in localStorage (suppress for 30 days)
    - _Requirements: 89.3_

  - [ ] 82.5 Add PWA meta tags to `index.html`
    - `<link rel="manifest" href="/manifest.json">`
    - `<meta name="theme-color" content="#3b82f6">`
    - `<link rel="apple-touch-icon" href="/icons/icon-192.png">`
    - _Requirements: 89.4_

- [ ] 83. Document Backup & Disaster Recovery Procedures
  - [ ] 83.1 Create `/docs/disaster-recovery.md` runbook
    - Document Supabase PITR configuration and activation steps
    - Define RTO <4h and RPO <1h procedures with step-by-step restoration guide
    - Document rollback procedures for failed Edge Function deployments and database migrations
    - Include contact escalation paths and communication templates
    - _Requirements: 90.1, 90.2, 90.4, 90.5_

  - [ ] 83.2 Document monthly backup verification procedure
    - Steps to restore backup to staging environment
    - Verification checklist: data integrity, RLS policies, Edge Function connectivity
    - _Requirements: 90.3_

- [ ] 84. Implement Edge Function Rate Limiting
  - [ ] 84.1 Create rate limiter shared module (`/supabase/functions/_shared/rateLimiter.ts`)
    - In-memory Map keyed by `user_id:function_name`
    - Read limit: 100 requests/minute, Write limit: 30 requests/minute
    - Return `{ allowed, remaining, retryAfter }` result
    - _Requirements: 91.1, 91.3_

  - [ ] 84.2 Integrate rate limiter into all existing Edge Functions
    - Import shared module at the top of each Edge Function handler
    - Return HTTP 429 with `Retry-After` header when limit exceeded
    - _Requirements: 91.1, 91.2_

  - [ ] 84.3 Log rate limit violations to audit_logs
    - `action = 'rate_limit_exceeded'`, `target_type = 'edge_function'`, function name in metadata
    - _Requirements: 91.4_

- [ ] 85. Implement Security Headers
  - [ ] 85.1 Add security headers to `vercel.json`
    - Content-Security-Policy: restrict script-src, style-src, img-src, connect-src, font-src
    - Strict-Transport-Security: `max-age=31536000; includeSubDomains`
    - X-Frame-Options: `DENY`
    - X-Content-Type-Options: `nosniff`
    - Referrer-Policy: `strict-origin-when-cross-origin`
    - _Requirements: 92.1, 92.2, 92.3, 92.4, 92.5, 92.6_

- [ ] 86. Implement Cookie Consent / Privacy Banner
  - [ ] 86.1 Create CookieConsentBanner component (`/src/components/shared/CookieConsentBanner.tsx`)
    - Display on first visit (no `edeviser_cookie_consent` in localStorage)
    - Options: "Accept All", "Reject Non-Essential", "Manage Preferences"
    - Manage Preferences dialog: essential (always on), analytics, performance toggles
    - Store consent in localStorage key `edeviser_cookie_consent`
    - _Requirements: 93.1, 93.2, 93.4_

  - [ ] 86.2 Create analytics consent gate utility (`/src/lib/analyticsConsent.ts`)
    - Block Sentry and any analytics scripts until consent is given
    - Initialize analytics only when `analytics: true` in consent
    - _Requirements: 93.3_

  - [ ] 86.3 Add "Cookie Settings" link to app footer
    - Opens the Manage Preferences dialog
    - _Requirements: 93.5_

- [ ] 87. Implement Terms of Service & Privacy Policy Pages
  - [ ] 87.1 Create public routes `/terms` and `/privacy`
    - Add to AppRouter as unauthenticated routes
    - Create TermsPage (`/src/pages/public/TermsPage.tsx`) and PrivacyPage (`/src/pages/public/PrivacyPage.tsx`)
    - Render markdown content
    - _Requirements: 94.1, 94.2_

  - [ ] 87.2 Add footer links to ToS and Privacy Policy on all pages
    - _Requirements: 94.3_

  - [ ] 87.3 Apply database migration: add `tos_accepted_at` column to `profiles`
    - `ALTER TABLE profiles ADD COLUMN tos_accepted_at timestamptz`
    - Regenerate TypeScript types
    - _Requirements: 94.5_

  - [ ] 87.4 Create ToSAcceptanceDialog component (`/src/components/shared/ToSAcceptanceDialog.tsx`)
    - Shown on first login when `tos_accepted_at` is null
    - Checkbox + "Accept" button
    - Blocks navigation to protected routes until accepted
    - Stores timestamp in `profiles.tos_accepted_at`
    - _Requirements: 94.4, 94.5, 94.6_

- [ ] 88. Implement Admin Impersonation / Support Mode
  - [ ] 88.1 Create ImpersonationProvider (`/src/providers/ImpersonationProvider.tsx`)
    - Context: `isImpersonating`, `impersonatedUser`, `startImpersonation`, `stopImpersonation`, `timeRemaining`
    - Store impersonation state in Zustand or context with 30-minute auto-expire timer
    - Block all mutations during impersonation (read-only mode)
    - _Requirements: 95.2, 95.6, 95.7_

  - [ ] 88.2 Create ImpersonationBanner component (`/src/components/shared/ImpersonationBanner.tsx`)
    - "You are viewing as [user_name] — [role]. Click to exit."
    - Prominent banner at top of every page during impersonation
    - _Requirements: 95.3_

  - [ ] 88.3 Add "View as User" button to Admin user detail page
    - Only visible for admin role, only for users within same institution
    - _Requirements: 95.1, 95.5_

  - [ ] 88.4 Log impersonation sessions to audit_logs
    - `impersonation_start` and `impersonation_end` actions with actor_id and target_id
    - _Requirements: 95.4_

  - [ ] 88.5 Create impersonation TanStack Query hooks (`/src/hooks/useImpersonation.ts`)
    - Mutation for starting/stopping impersonation
    - Query for impersonated user profile
    - _Requirements: 95_

- [ ] 89. Implement Bulk Data Operations
  - [ ] 89.1 Create bulk grade export Edge Function (`/supabase/functions/bulk-grade-export/`)
    - Accept course_id and optional section_id
    - Query enrolled students, assessment scores, category subtotals, final grade, letter grade
    - Generate CSV and upload to Supabase Storage
    - Return signed download URL
    - _Requirements: 96.1_

  - [ ] 89.2 Create grade export UI on Teacher gradebook page
    - Export button with course/section selector
    - Loading state during generation, download link on completion
    - _Requirements: 96.1_

  - [ ] 89.3 Create bulk enrollment import/export for Coordinators
    - Import CSV: `student_email`, `course_code`, `section_code`
    - Validate rows, reject invalid, process valid
    - Export current enrollments as CSV
    - _Requirements: 96.2, 96.5_

  - [ ] 89.4 Create semester transition tool (`/src/pages/coordinator/courses/SemesterTransition.tsx`)
    - Source semester → target semester selector within a program
    - Bulk copy: courses, CLOs, rubrics, grade_categories (no student data)
    - Skip duplicates, show summary of copied items
    - _Requirements: 96.3_

  - [ ] 89.5 Create bulk data cleanup tool for Admins
    - Archive/purge data from deactivated semesters older than configurable retention period
    - Confirmation dialog with data summary before cleanup
    - _Requirements: 96.4_

  - [ ] 89.6 Create bulk operations TanStack Query hooks (`/src/hooks/useBulkOperations.ts`)
    - Mutations for grade export, enrollment import/export, semester transition, data cleanup
    - _Requirements: 96_

- [ ] 90. Document Database Connection Pooling Configuration
  - [ ] 90.1 Create `/docs/connection-pooling.md`
    - Document Supabase PgBouncer configuration
    - Pool size recommendations: free (15), pro (50), team (100)
    - Troubleshooting steps for connection exhaustion
    - _Requirements: 97.1, 97.4_

  - [ ] 90.2 Configure Edge Functions to use pooler connection URL
    - Update Supabase client initialization in Edge Functions to use pooler URL
    - _Requirements: 97.2_

  - [ ] 90.3 Add pool status to health check endpoint
    - Include `pool_status` field in health check response
    - _Requirements: 97.3_

- [ ] 91. Implement Image/Asset Optimization
  - [ ] 91.1 Create image compressor utility (`/src/lib/imageCompressor.ts`)
    - Client-side compression using canvas API
    - Max 500KB, 256×256 pixels, quality 0.8
    - Returns compressed File object
    - _Requirements: 98.1_

  - [ ] 91.2 Wire image compressor into avatar upload flow
    - Compress before uploading to Supabase Storage
    - Show warning if compression fails, upload original as fallback
    - _Requirements: 98.1_

  - [ ] 91.3 Add lazy loading to all images
    - `loading="lazy"` on avatars, badge icons, material thumbnails
    - _Requirements: 98.2_

  - [ ] 91.4 Configure Supabase Storage image transformations for avatar thumbnails
    - 64×64 and 128×128 thumbnail sizes
    - _Requirements: 98.3_

  - [ ] 91.5 Configure Vercel CDN caching headers for static assets
    - `Cache-Control: public, max-age=31536000, immutable` for hashed assets in `vercel.json`
    - _Requirements: 98.4_

- [ ] 92. Implement Global Search
  - [ ] 92.1 Apply database migration: add full-text search indexes
    - Add `search_vector` tsvector columns to `courses`, `assignments`, `announcements`, `course_materials`, `profiles`
    - Create GIN indexes on all search_vector columns
    - _Requirements: 99.5_

  - [ ] 92.2 Create SearchCommand component (`/src/components/shared/SearchCommand.tsx`)
    - Cmd+K / Ctrl+K keyboard shortcut from any page
    - Debounced input (300ms)
    - Results grouped by category: Courses, Assignments, Students, Announcements, Materials
    - Keyboard navigation (arrow keys + Enter)
    - Built on Shadcn/ui Command component (cmdk)
    - _Requirements: 99.1, 99.3, 99.4_

  - [ ] 92.3 Create global search TanStack Query hooks (`/src/hooks/useGlobalSearch.ts`)
    - Query Supabase full-text search across multiple tables
    - Scope results by user role and institution
    - Students: only enrolled course content; Teachers: only assigned course content; Admins: institution-wide
    - _Requirements: 99.2, 99.6_

  - [ ] 92.4 Add SearchCommand to app header/navbar
    - Search icon button + keyboard shortcut hint
    - _Requirements: 99.1_

- [ ] 93. Implement Plagiarism Awareness Placeholder
  - [ ] 93.1 Apply database migration: add `plagiarism_score` column to `submissions`
    - `ALTER TABLE submissions ADD COLUMN plagiarism_score numeric CHECK (plagiarism_score IS NULL OR (plagiarism_score >= 0 AND plagiarism_score <= 100))`
    - Regenerate TypeScript types
    - _Requirements: 100.1_

  - [ ] 93.2 Create PlagiarismPlaceholder component (`/src/components/shared/PlagiarismPlaceholder.tsx`)
    - Show "Plagiarism check: Not configured" when score is null
    - Show score badge when configured (future)
    - _Requirements: 100.2_

  - [ ] 93.3 Add PlagiarismPlaceholder to Grading Interface
    - Display alongside submission details
    - _Requirements: 100.2_

  - [ ] 93.4 Document integration points in code comments
    - Turnitin/Copyleaks API integration points in Grading Interface and submission processing
    - Add `PLAGIARISM_API_KEY` to `.env.example`
    - _Requirements: 100.3, 100.4_

- [ ] 94. Implement Granular In-App Notification Preferences
  - [ ] 94.1 Apply database migration: add `notification_preferences` column to `profiles`
    - `ALTER TABLE profiles ADD COLUMN notification_preferences jsonb NOT NULL DEFAULT '{"muted_courses": [], "quiet_hours": {"enabled": false, "start": "22:00", "end": "07:00"}}'`
    - Regenerate TypeScript types
    - _Requirements: 101.3_

  - [ ] 94.2 Create Notification Preferences page (`/src/pages/shared/NotificationPreferences.tsx`)
    - Per-course mute toggles (list enrolled/assigned courses with toggle)
    - Quiet hours: enable toggle + start/end time pickers
    - Accessible from Profile Settings
    - _Requirements: 101.1, 101.2, 101.5_

  - [ ] 94.3 Create notification preferences TanStack Query hooks (`/src/hooks/useNotificationPreferences.ts`)
    - Query current preferences from `profiles.notification_preferences`
    - Mutation for updating preferences
    - _Requirements: 101_

  - [ ] 94.4 Update Notification_Service to respect preferences
    - Check `muted_courses` before delivering course-specific notifications
    - Check quiet hours: hold non-critical notifications, deliver critical immediately
    - Critical notifications: grade released, at-risk alert
    - _Requirements: 101.4_

- [ ] 95. Implement Session Management UI
  - [ ] 95.1 Create Session Management page (`/src/pages/shared/SessionManagement.tsx`)
    - Display active sessions: device type, browser, masked IP, last active, current session indicator
    - "Sign out other sessions" button
    - "Sign out all sessions" button
    - Accessible from Profile Settings
    - _Requirements: 102.1, 102.2, 102.3, 102.4_

  - [ ] 95.2 Create session management TanStack Query hooks (`/src/hooks/useSessionManagement.ts`)
    - Query active sessions via Supabase Auth admin API
    - Mutations for signing out other/all sessions
    - _Requirements: 102.5_

  - [ ] 95.3 Log session termination to audit_logs
    - Record action with count of terminated sessions
    - _Requirements: 102.6_

- [ ] 96. Write tests for production readiness features
  - [ ]* 96.1 Write property-based tests (Properties 66–80)
    - **Property 66**: RTL layout direction correctness
    - **Property 67**: PWA manifest validity
    - **Property 68**: Rate limiting enforcement
    - **Property 69**: Security headers presence
    - **Property 70**: Cookie consent blocking
    - **Property 71**: ToS acceptance gate
    - **Property 72**: Impersonation read-only enforcement
    - **Property 73**: Bulk grade export completeness
    - **Property 74**: Global search result scoping
    - **Property 75**: Image compression constraints
    - **Property 76**: Notification quiet hours enforcement
    - **Property 77**: Session management correctness
    - **Property 78**: Plagiarism score column integrity
    - **Property 79**: Semester transition data integrity
    - **Property 80**: Per-course notification muting
    - _Requirements: 88-102_

  - [ ]* 96.2 Write unit tests for production readiness modules
    - RTL language, PWA, rate limiter, security headers, cookie consent
    - ToS acceptance, impersonation, bulk operations, global search
    - Image compressor, notification preferences, session management, semester transition
    - _Requirements: 88-102_

  - [ ]* 96.3 Write integration tests for production readiness flows
    - Impersonation start → audit log → auto-expire pipeline
    - Bulk grade export → CSV generation → download pipeline
    - Semester transition → course copy → CLO copy pipeline
    - _Requirements: 88-102_
