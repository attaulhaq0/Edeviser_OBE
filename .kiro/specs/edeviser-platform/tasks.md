# Implementation Plan: Edeviser Platform (Full Production)

## Overview

Complete unified implementation of the Edeviser platform covering authentication, RBAC, user/program/course management, the full OBE engine (outcomes, rubrics, assignments, submissions, grading, evidence, rollup), gamification (XP, streaks, badges, levels, leaderboards, journals, daily habits, variable rewards, learning path gating), Bloom's verb guide, email notifications (Resend), AI Co-Pilot (module suggestions, at-risk predictions, feedback drafts), peer milestone notifications, CLO progress dashboard, XP transaction history, seed data generation, CI/CD pipeline, health monitoring, load testing, four role-specific dashboards (plus parent portal), notifications, realtime, reporting, audit logging, platform enhancements (student portfolio, streak freeze, onboarding flows, read habit, dark mode, offline resilience, GDPR data export, notification batching, error states, teacher grading stats), institutional management features (semester management, course sections, surveys, CQI loop, configurable KPI thresholds, multi-accreditation body support, course file generation, announcements, course content/materials, discussion forums, attendance tracking, quiz/exam module, gradebook with weighted categories, calendar view, timetable, department management, academic calendar, student transcripts, parent/guardian portal, fee management), and production readiness improvements (multi-language RTL support, PWA, disaster recovery, Edge Function rate limiting, security headers, cookie consent, ToS/privacy pages, admin impersonation, bulk data operations, connection pooling, image optimization, global search, plagiarism placeholder, granular notification preferences, session management). Tasks are ordered foundation-first in a single unified plan.

## Tasks

- [x] 1. Set up foundation: schemas, utilities, and database
  - [x] 1.1 Create Zod validation schemas (`/src/lib/schemas/`)
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

  - [x] 1.2 Create Audit Logger service (`/src/lib/auditLogger.ts`)
    - Implement `logAuditEvent(entry: AuditLogEntry): Promise<void>`
    - _Requirements: 34_

  - [x] 1.3 Create TanStack Query key factory (`/src/lib/queryKeys.ts`)
    - Define hierarchical keys for all entities including AI Co-Pilot queries and institutional management entities (semesters, departments, courseSections, surveys, cqiPlans, institutionSettings, programAccreditations, announcements, courseModules, courseMaterials, discussionThreads, discussionReplies, classSessions, attendanceRecords, quizzes, quizAttempts, gradeCategories, gradebook, timetableSlots, academicCalendarEvents, parentStudentLinks, feeStructures, feePayments, calendarEvents, transcripts, courseFiles)
    - _Requirements: All_

  - [x] 1.4 Create shared type definitions (`/src/types/app.ts`)
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

  - [x] 1.5 Apply database extensions, indexes, and cron jobs via Supabase MCP
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

  - [x] 1.6 Create Activity Logger service (`/src/lib/activityLogger.ts`)
    - Implement fire-and-forget logging of student behavioral events
    - Log event types: login, page_view, submission, journal, streak_break, assignment_view
    - Insert into `student_activity_log` table (append-only)
    - Never block user-facing flows — use console.error on failure
    - _Requirements: 41.1, 41.4_

- [x] 2. Implement authentication and session management
  - [x] 2.1 Create AuthProvider context and `useAuth()` hook
    - _Requirements: 1, 2, 3, 4_

  - [x] 2.2 Implement login attempt tracking and account lockout
    - _Requirements: 1.2, 1.3_

  - [x] 2.3 Implement session persistence and auto-refresh
    - _Requirements: 4_

  - [x] 2.4 Implement password reset flow
    - _Requirements: 5_

  - [x] 2.5 Create Login page (`/src/pages/LoginPage.tsx`)
    - _Requirements: 1, 3, 5_

  - [x] 2.6 Create AppRouter with role-based route guards
    - Include route guards for all 5 roles: admin, coordinator, teacher, student, parent
    - Add `/parent/*` route group with ParentLayout
    - _Requirements: 3, 86.7_

  - [x] 2.7 Create App shell (`/src/App.tsx`)
    - Wrap in AuthProvider, QueryClientProvider, BrowserRouter, Toaster
    - _Requirements: 1, 3, 4_

  - [x] 2.8 Wire activity logging into AuthProvider (login events)
    - Call `logActivity({ event_type: 'login' })` on successful authentication
    - _Requirements: 41.1_

- [x] 3. Implement Admin user management
  - [x] 3.1 Create user management TanStack Query hooks (`/src/hooks/useUsers.ts`)
    - _Requirements: 6_

  - [x] 3.2 Create User List page with TanStack Table
    - _Requirements: 6.5_

  - [x] 3.3 Create User Create/Edit forms
    - _Requirements: 6.1_

  - [x] 3.4 Implement soft-delete with confirmation
    - _Requirements: 6.2, 6.4_

  - [x] 3.5 Create Bulk Import UI and Edge Function
    - _Requirements: 7_

- [x] 4. Implement Program management
  - [x] 4.1 Create program TanStack Query hooks (`/src/hooks/usePrograms.ts`)
    - _Requirements: 9_

  - [x] 4.2 Create Program List page and forms
    - _Requirements: 9_

  - [x] 4.3 Implement coordinator assignment to programs
    - _Requirements: 9.2_

- [x] 5. Implement ILO management
  - [x] 5.1 Create ILO TanStack Query hooks (`/src/hooks/useILOs.ts`)
    - _Requirements: 12_

  - [x] 5.2 Create ILO List page with drag-and-drop reorder
    - _Requirements: 12.3_

  - [x] 5.3 Create ILO Create/Edit form
    - _Requirements: 12.1_

  - [x] 5.4 Implement ILO deletion with dependency check
    - _Requirements: 12.2_

- [x] 6. Implement Admin Dashboard
  - [x] 6.1 Create Admin layout with sidebar navigation
    - _Requirements: 27_

  - [x] 6.2 Create Admin Dashboard page with KPI cards, activity feed, PLO heatmap
    - _Requirements: 27_

  - [x] 6.3 Create Audit Log viewer page
    - _Requirements: 34_

- [x] 7. Implement Bonus XP Event Manager
  - [x] 7.1 Create bonus XP event TanStack Query hooks (`/src/hooks/useBonusEvents.ts`)
    - _Requirements: 36.3_

  - [x] 7.2 Create Bonus XP Event Manager page (`/src/pages/admin/BonusXPEventManager.tsx`)
    - CRUD for bonus events: title, multiplier, start/end datetime, active toggle
    - Validate no overlapping active events
    - Log creation/modification to Audit_Logger
    - _Requirements: 36.3_

  - [x] 7.3 Create BonusEventBanner shared component
    - Display active bonus event on Student Dashboard with countdown timer
    - _Requirements: 36.3_

- [x] 8. Implement Course management
  - [x] 8.1 Create course TanStack Query hooks (`/src/hooks/useCourses.ts`)
    - _Requirements: 10_

  - [x] 8.2 Create Course List page and forms
    - _Requirements: 10_

  - [x] 8.3 Implement teacher assignment to courses
    - _Requirements: 10.1_

- [x] 9. Implement PLO management
  - [x] 9.1 Create PLO TanStack Query hooks (`/src/hooks/usePLOs.ts`)
    - _Requirements: 13_

  - [x] 9.2 Create PLO List page with drag-and-drop reorder
    - _Requirements: 13.4_

  - [x] 9.3 Create PLO Create/Edit form with ILO mapping
    - _Requirements: 13.1, 13.2_

  - [x] 9.4 Implement PLO-ILO weight validation
    - _Requirements: 13.3_

- [x] 10. Implement Curriculum Matrix
  - [x] 10.1 Create Curriculum Matrix component (PLO × Course grid)
    - _Requirements: 28.2_

  - [x] 10.2 Implement click-through to evidence detail
    - _Requirements: 28.3_

  - [x] 10.3 Implement CSV export
    - _Requirements: 28.3_

- [x] 11. Implement Coordinator Dashboard
  - [x] 11.1 Create Coordinator layout with sidebar
    - _Requirements: 28_

  - [x] 11.2 Create Coordinator Dashboard with matrix, compliance rate, at-risk count
    - _Requirements: 28_

- [x] 12. Implement CLO management
  - [x] 12.1 Create CLO TanStack Query hooks (`/src/hooks/useCLOs.ts`)
    - _Requirements: 14_

  - [x] 12.2 Create CLO List page with Bloom's level tags
    - _Requirements: 14.2_

  - [x] 12.3 Create CLO Create/Edit form with PLO mapping and Bloom's selector
    - _Requirements: 14.1, 14.2, 14.3_

  - [x] 12.4 Create Bloom's Verb Guide component (`/src/components/shared/BloomsVerbGuide.tsx`)
    - Display suggested action verbs when a Bloom's level is selected in CLO builder
    - Implement click-to-insert verb into CLO title field
    - Create `/src/lib/bloomsVerbs.ts` with verb constants per level
    - _Requirements: 38_

- [x] 13. Implement Rubric Builder
  - [x] 13.1 Create Rubric Builder component with dynamic criteria/levels grid
    - _Requirements: 15_

  - [x] 13.2 Implement rubric template save/copy
    - _Requirements: 15.4, 15.5_

  - [x] 13.3 Create rubric preview component
    - _Requirements: 15_

- [x] 14. Implement Assignment management
  - [x] 14.1 Create assignment TanStack Query hooks (`/src/hooks/useAssignments.ts`)
    - _Requirements: 16_

  - [x] 14.2 Create Assignment List page
    - _Requirements: 16_

  - [x] 14.3 Create Assignment Create/Edit form with CLO linking and weight distribution
    - Include prerequisite gate configuration: select CLO + minimum attainment % threshold
    - Store prerequisites as jsonb array on assignments table
    - _Requirements: 16.1, 37.2_

- [x] 15. Implement Student Enrollment
  - [x] 15.1 Create enrollment TanStack Query hooks (`/src/hooks/useEnrollments.ts`)
    - _Requirements: 11_

  - [x] 15.2 Create student enrollment UI within course detail
    - _Requirements: 11_

- [x] 16. Implement Grading
  - [x] 16.1 Create Grading Queue component (pending submissions list)
    - _Requirements: 18, 29.1_

  - [x] 16.2 Create Grading Interface with rubric cell selection
    - _Requirements: 18.1, 18.2, 18.3_

  - [x] 16.3 Implement grade submission triggering Evidence Generator
    - _Requirements: 18.4_

- [x] 17. Implement Evidence Generator Edge Function
  - [x] 17.1 Create `calculate-attainment-rollup` Edge Function
    - Fetch CLO → PLO → ILO chain from outcome_mappings
    - Calculate attainment_level from score_percent
    - Insert immutable evidence record
    - UPSERT outcome_attainment at CLO, PLO, ILO levels
    - Insert notification for student
    - _Requirements: 19, 20_

  - [x] 17.2 Create database trigger on `grades` table to invoke Edge Function
    - _Requirements: 19.4_

- [x] 18. Implement Teacher Dashboard
  - [x] 18.1 Create Teacher layout with sidebar
    - _Requirements: 29_

  - [x] 18.2 Create Teacher Dashboard with grading queue, CLO chart, heatmap, Bloom's distribution
    - _Requirements: 29_

  - [x] 18.3 Implement at-risk student list with nudge notification
    - _Requirements: 29.2, 29.4_

- [x] 19. Implement Student Submission
  - [x] 19.1 Create submission TanStack Query hooks (`/src/hooks/useSubmissions.ts`)
    - _Requirements: 17_

  - [x] 19.2 Create Assignment Detail page with submission form
    - _Requirements: 17_

  - [x] 19.3 Implement file upload to Supabase Storage
    - _Requirements: 17.1_

  - [x] 19.4 Implement late submission logic
    - _Requirements: 17.2, 17.3_

  - [x] 19.5 Wire activity logging into submission flow
    - Call `logActivity({ event_type: 'submission' })` on successful submission
    - _Requirements: 41.1_

- [x] 20. Implement XP Engine
  - [x] 20.1 Create `award-xp` Edge Function
    - Insert xp_transaction record
    - Recalculate student_gamification.xp_total
    - Check level-up condition
    - Check for active bonus_xp_events and apply multiplier
    - _Requirements: 21, 36.3_

  - [x] 20.2 Wire XP triggers: login, submission, grade, journal, streak milestones, perfect day, first-attempt bonus, perfect rubric
    - _Requirements: 21.1, 35.2, 36.1, 36.2_

  - [x] 20.3 Create XP animation component (confetti + count-up)
    - _Requirements: 21.2_

- [x] 21. Implement Streak System
  - [x] 21.1 Create `process-streak` Edge Function
    - Increment or reset streak on login
    - Update last_login_date
    - Check streak milestones
    - _Requirements: 22_

  - [x] 21.2 Create Streak Display component with flame animation
    - _Requirements: 22_

- [x] 22. Implement Badge System
  - [x] 22.1 Create `check-badges` Edge Function
    - Check all badge conditions idempotently
    - Insert badge record if not already awarded
    - Support mystery badges (Speed Demon, Night Owl, Perfectionist) with hidden conditions
    - _Requirements: 23, 36.4_

  - [x] 22.2 Create Badge Award modal with animation
    - Include mystery badge reveal animation (hidden → revealed transition)
    - _Requirements: 23.3, 36.4_

  - [x] 22.3 Create Badge Collection display on profile
    - Show mystery badges as silhouettes until earned
    - _Requirements: 23.4, 36.4_

- [x] 23. Implement Level System with Peer Milestone Notifications
  - [x] 23.1 Implement level calculation from XP thresholds
    - _Requirements: 24_

  - [x] 23.2 Create Level Progress component
    - _Requirements: 24.3_

  - [x] 23.3 Create Level-Up animation (full-screen overlay)
    - _Requirements: 24.2_

  - [x] 23.4 Wire peer milestone notifications on level-up
    - On level-up, query all peers in shared course enrollments
    - Create in-app notification: "Your classmate [name] just hit Level [X]!"
    - Skip students in anonymous leaderboard mode
    - Deliver via Supabase Realtime within 5 seconds
    - _Requirements: 42_

- [x] 24. Implement Leaderboard
  - [x] 24.1 Create leaderboard TanStack Query hooks (`/src/hooks/useLeaderboard.ts`)
    - _Requirements: 25_

  - [x] 24.2 Create Leaderboard page with course/program/all filters
    - _Requirements: 25.2_

  - [x] 24.3 Implement realtime leaderboard updates
    - _Requirements: 25.4_

  - [x] 24.4 Implement anonymous opt-out
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
  - Verify all 102 requirements (including NFRs 50-57, enhancements 58-67, institutional management 68-87, and production readiness 88-102) plus NFR gaps (tasks 97-108) have corresponding implementations
  - Verify all 80 correctness properties are testable
  - Verify tasks 97-108 (production readiness gaps) are complete: Sentry, E2E, CI/CD, backups, secrets, perf budgets, a11y, seed script, throttling, security headers, responsive testing, data migration
  - Confirm all 108 tasks are complete

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

- [ ] 97. Implement Sentry Initialization & Global Error Boundary
  - [ ] 97.1 Configure Sentry SDK initialization in `src/main.tsx`
    - Call `Sentry.init()` with DSN from `VITE_SENTRY_DSN` env var
    - Configure `tracesSampleRate`, `replaysSessionSampleRate`, environment tag
    - Gate initialization behind cookie consent analytics approval (integrate with `analyticsConsent.ts` from task 86.2)
    - _Requirements: NFR_

  - [ ] 97.2 Create global ErrorBoundary wrapping the app (`src/components/shared/ErrorBoundary.tsx`)
    - Use `Sentry.ErrorBoundary` or `@sentry/react`'s `withErrorBoundary`
    - Render user-friendly fallback UI with "Something went wrong" message and "Reload" button
    - Report caught errors to Sentry automatically
    - Wrap `<App />` in `src/main.tsx` with the ErrorBoundary
    - _Requirements: NFR_

  - [ ] 97.3 Add `VITE_SENTRY_DSN` to `.env.example` and document in README
    - _Requirements: NFR_

  - [ ] 97.4 Configure Sentry source map upload in CI pipeline
    - Add `@sentry/vite-plugin` to Vite config for automatic source map upload on production builds
    - Add `SENTRY_AUTH_TOKEN` and `SENTRY_ORG`/`SENTRY_PROJECT` to CI secrets documentation
    - _Requirements: NFR_

- [ ] 98. Implement End-to-End (E2E) Testing with Playwright
  - [ ] 98.1 Install and configure Playwright
    - Add `@playwright/test` as dev dependency
    - Create `playwright.config.ts` with baseURL, projects (chromium, firefox, webkit), retries, reporter
    - Create `e2e/` directory at project root
    - _Requirements: NFR_

  - [ ] 98.2 Create E2E test: login → dashboard redirect
    - Test login with valid credentials redirects to role-appropriate dashboard
    - Test invalid credentials show error message
    - Test locked account after failed attempts
    - _Requirements: 1, 3_

  - [ ] 98.3 Create E2E test: assignment creation → submission → grading → evidence chain
    - Teacher creates assignment with CLO links → Student submits → Teacher grades with rubric → Evidence record created → Student CLO attainment updated
    - _Requirements: 16, 17, 18, 19, 20_

  - [ ] 98.4 Create E2E test: XP award → level up → badge check
    - Student action triggers XP → XP total updates → Level threshold crossed → Badge condition met → Badge awarded
    - _Requirements: 21, 23, 24_

  - [ ] 98.5 Create E2E test: student enrollment → course visibility
    - Admin enrolls student in course → Student sees course on dashboard → Student can access course assignments
    - _Requirements: 11, 30_

  - [ ] 98.6 Add E2E test step to CI pipeline (GitHub Actions)
    - Run Playwright tests after unit/property tests pass
    - Upload test artifacts (screenshots, traces) on failure
    - _Requirements: NFR_

- [ ] 99. Enhance CI/CD Pipeline
  - [ ] 99.1 Add Sentry source map upload step to CI
    - Run after successful build step
    - Use `sentry-cli releases` to create release and upload sourcemaps
    - Skip on PR builds, run only on main/production branch
    - _Requirements: NFR_

  - [ ] 99.2 Add Lighthouse CI performance budget check
    - Install `@lhci/cli` as dev dependency
    - Create `lighthouserc.js` with assertions: performance ≥ 90, accessibility ≥ 90, LCP < 2.5s, CLS < 0.1
    - Add `lhci autorun` step to CI after build
    - _Requirements: NFR_

  - [ ] 99.3 Add bundle size tracking to CI
    - Install `bundlesize` or use `vite-plugin-bundle-analyzer` with JSON output
    - Set budget: initial JS bundle < 500KB gzipped
    - Fail CI if budget exceeded
    - _Requirements: NFR_

  - [ ] 99.4 Add E2E test step to CI (reference task 98.6)
    - Run Playwright tests in CI with headless browsers
    - _Requirements: NFR_

  - [ ] 99.5 Add Supabase migration check to CI
    - Verify `supabase db diff` produces no uncommitted changes
    - Run `supabase db lint` for migration validation
    - _Requirements: NFR_

  - [ ] 99.6 Document branch protection rules in `/docs/ci-cd.md`
    - Required checks: lint, typecheck, test, build, e2e, lighthouse, bundle-size
    - Require PR reviews, no direct pushes to main
    - _Requirements: NFR_

- [ ] 100. Implement Database Backup & PITR Activation
  - [ ] 100.1 Document Supabase PITR activation steps in `/docs/disaster-recovery.md`
    - Step-by-step guide to enable PITR on Supabase Pro project
    - Document retention period configuration (default 7 days)
    - Include point-in-time restore procedure with timestamp selection
    - _Requirements: 90.1_

  - [ ] 100.2 Create automated monthly backup verification script (`/scripts/verify-backup.sh`)
    - Restore latest backup to a temporary Supabase project or local instance
    - Run data integrity checks: row counts, RLS policy presence, FK constraints
    - Output verification report
    - _Requirements: 90.3_

  - [ ] 100.3 Document backup monitoring alerts
    - Configure Supabase dashboard alerts for backup failures
    - Add backup status check to health monitoring endpoint (task 46)
    - _Requirements: 90_

- [ ] 101. Implement Environment & Secrets Management
  - [ ] 101.1 Create comprehensive `.env.example` with all required variables
    - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SENTRY_DSN`
    - Document Edge Function secrets: `RESEND_API_KEY`, `OPENAI_API_KEY` (or `ANTHROPIC_API_KEY`), `CRON_SECRET`
    - Document CI secrets: `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SUPABASE_ACCESS_TOKEN`
    - Include comments explaining each variable's purpose and where to obtain it
    - _Requirements: NFR_

  - [ ] 101.2 Create Edge Function secrets provisioning guide (`/docs/secrets-management.md`)
    - Document `supabase secrets set` CLI commands for each secret
    - Document Supabase Dashboard secrets UI as alternative
    - Include secret rotation procedures
    - _Requirements: NFR_

  - [ ] 101.3 Add startup validation for required environment variables
    - Create `/src/lib/envValidation.ts` with Zod schema for all `VITE_` env vars
    - Validate on app startup in `src/main.tsx`, show clear error if missing
    - _Requirements: NFR_

- [ ] 102. Implement Performance Budgets & Bundle Analysis
  - [ ] 102.1 Configure bundle analysis tooling
    - Add `rollup-plugin-visualizer` to Vite config (generate `stats.html` on build)
    - Add npm script: `"analyze": "vite build && open stats.html"`
    - _Requirements: NFR_

  - [ ] 102.2 Implement code splitting for role-specific page modules
    - Lazy load all route-level page components using `React.lazy()` + `Suspense`
    - Split admin, coordinator, teacher, student, parent page bundles into separate chunks
    - Configure Vite `manualChunks` for vendor splitting (react, tanstack, recharts, framer-motion)
    - _Requirements: NFR_

  - [ ] 102.3 Create performance budget configuration (`/lighthouserc.js`)
    - Bundle size: < 500KB gzipped initial load
    - Lighthouse performance score: ≥ 90
    - LCP: < 2.5s
    - CLS: < 0.1
    - FID: < 100ms
    - _Requirements: NFR_

  - [ ] 102.4 Add performance budget check to CI (reference task 99.2)
    - Fail build if any budget is exceeded
    - _Requirements: NFR_

- [ ] 103. Implement Automated Accessibility Testing
  - [ ] 103.1 Integrate `@axe-core/react` in development mode
    - Conditionally import and initialize in `src/main.tsx` when `import.meta.env.DEV`
    - Log a11y violations to browser console during development
    - _Requirements: NFR_

  - [ ] 103.2 Add `vitest-axe` for component-level a11y assertions
    - Install `vitest-axe` and configure custom matchers in Vitest setup
    - Add a11y assertions to key shared component tests: Button, Card, Dialog, Form, Navigation
    - _Requirements: NFR_

  - [ ] 103.3 Add Lighthouse accessibility score ≥ 90 to CI budget
    - Include in `lighthouserc.js` assertions (reference task 102.3)
    - _Requirements: NFR_

  - [ ]* 103.4 Write a11y-focused unit tests for critical interactive components
    - Test keyboard navigation on SearchCommand, Leaderboard, GradingInterface
    - Test ARIA labels on KPI cards, progress bars, badge collection
    - Test focus management on modal dialogs (ToSAcceptanceDialog, BadgeAwardModal, LevelUpOverlay)
    - _Requirements: NFR_

- [ ] 104. Create Local Development Seed Script
  - [ ] 104.1 Create `supabase/seed.sql` for rapid local development onboarding
    - 1 institution with settings (configurable thresholds, grade scale)
    - 1 admin user, 1 coordinator user, 1 teacher user, 5 student users (all with known test passwords)
    - 1 department, 1 program (assigned to coordinator), 1 semester
    - 2 courses (assigned to teacher, linked to semester), 2 sections per course
    - 3 ILOs, 4 PLOs (mapped to ILOs), 6 CLOs (2 per course, mapped to PLOs, spanning Bloom's levels)
    - 1 rubric template with 3 criteria × 4 levels
    - 2 assignments (one per course, linked to CLOs with rubric)
    - Enroll all 5 students in both courses
    - Sample XP transactions, streak data, and 1 badge per student
    - _Requirements: NFR_

  - [ ] 104.2 Add npm script for seeding: `"seed": "supabase db reset"`
    - Document in README: `npm run seed` for fresh local environment
    - _Requirements: NFR_

- [ ] 105. Implement Client-Side Request Throttling
  - [ ] 105.1 Configure TanStack Query global defaults (`/src/providers/QueryProvider.tsx`)
    - Set `staleTime: 5 * 60 * 1000` (5 minutes) for read-heavy queries
    - Set `gcTime: 30 * 60 * 1000` (30 minutes) for garbage collection
    - Set `retry: 3` with exponential backoff (`retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000)`)
    - Enable `refetchOnWindowFocus: false` globally to reduce unnecessary requests
    - _Requirements: NFR_

  - [ ] 105.2 Add global error handler for HTTP 429 responses
    - Create `onError` callback in QueryClient defaultOptions
    - On 429 response, show Sonner toast: "Too many requests. Please wait a moment."
    - Parse `Retry-After` header and pause queries for that duration
    - _Requirements: 91_

  - [ ] 105.3 Configure request deduplication for concurrent identical queries
    - Verify TanStack Query's built-in deduplication is active (default behavior)
    - Add `queryKeyHashFn` if custom deduplication logic is needed
    - Document deduplication behavior in code comments
    - _Requirements: NFR_

- [ ] 106. Implement Security Headers in vercel.json
  - [ ] 106.1 Add comprehensive security headers configuration to `vercel.json`
    - Content-Security-Policy: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https://*.supabase.co; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.sentry.io; font-src 'self' https://fonts.gstatic.com; frame-ancestors 'none'`
    - Strict-Transport-Security: `max-age=31536000; includeSubDomains`
    - X-Frame-Options: `DENY`
    - X-Content-Type-Options: `nosniff`
    - Referrer-Policy: `strict-origin-when-cross-origin`
    - Permissions-Policy: `camera=(), microphone=(), geolocation=()`
    - _Requirements: 92.1, 92.2, 92.3, 92.4, 92.5, 92.6_

  - [ ] 106.2 Add CDN caching headers for static assets in `vercel.json`
    - `Cache-Control: public, max-age=31536000, immutable` for `/assets/**`
    - `Cache-Control: no-cache` for `index.html` and service worker
    - _Requirements: 98.4_

- [ ] 107. Implement Mobile Responsiveness Testing Strategy
  - [ ] 107.1 Document responsive breakpoints and testing strategy (`/docs/responsive-testing.md`)
    - Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)
    - Document layout behavior per breakpoint: sidebar collapse, grid column changes, touch targets
    - Include manual testing checklist for each role's dashboard at each breakpoint
    - _Requirements: NFR_

  - [ ] 107.2 Verify viewport meta tag in `index.html`
    - Ensure `<meta name="viewport" content="width=device-width, initial-scale=1.0">` is present
    - _Requirements: NFR_

  - [ ] 107.3 Add responsive viewport screenshots to E2E tests
    - Extend Playwright config with viewport sizes: mobile (375×667), tablet (768×1024), desktop (1280×720)
    - Capture screenshots of Student Dashboard, Teacher Grading Queue, Admin Dashboard at each viewport
    - Store as test artifacts for visual regression review
    - _Requirements: NFR_

  - [ ]* 107.4 Write responsive layout assertions in E2E tests
    - Verify sidebar is hidden on mobile, visible on desktop (admin/coordinator/teacher)
    - Verify student dashboard switches from 3-column to single-column on mobile
    - Verify touch targets meet 44×44px minimum on mobile viewports
    - _Requirements: NFR_

- [ ] 108. Implement Data Migration Tooling from Existing LMS
  - [ ] 108.1 Create CSV import templates (`/docs/import-templates/`)
    - `courses.csv`: course_code, title, description, semester_code, teacher_email
    - `outcomes.csv`: type (ILO/PLO/CLO), code, title, bloom_level (CLO only), parent_code (PLO→ILO, CLO→PLO)
    - `grades.csv`: student_email, course_code, assignment_title, score, max_score, date
    - `enrollments.csv`: student_email, course_code, section_code
    - Include sample files with example data
    - _Requirements: 7, NFR_

  - [ ] 108.2 Create `bulk-data-import` Edge Function (`/supabase/functions/bulk-data-import/`)
    - Accept CSV file upload with `import_type` parameter (courses, outcomes, grades, enrollments)
    - Parse and validate rows against Zod schemas
    - Process valid rows: create/update records with proper FK resolution (lookup by code/email)
    - Return summary: total rows, imported count, skipped count, error details per row
    - Log import to audit_logs with summary metadata
    - _Requirements: 7, NFR_

  - [ ] 108.3 Create Data Import UI (`/src/pages/admin/import/DataImportPage.tsx`)
    - Import type selector (Courses, Outcomes, Grades, Enrollments)
    - CSV file upload with drag-and-drop
    - Preview parsed rows before import with validation status per row
    - Import progress indicator and result summary
    - Download error report for failed rows
    - Link to download CSV templates
    - _Requirements: 7, NFR_

  - [ ] 108.4 Create data import TanStack Query hooks (`/src/hooks/useDataImport.ts`)
    - Mutation for uploading and processing CSV imports
    - Query for import history/status
    - _Requirements: NFR_


- [ ] 109. OBE Engine — Sub-CLO Database Migration and Core Logic
  - [ ] 109.1 Apply Sub-CLO database migration via Supabase MCP `apply_migration`
    - Add `weight` column to `learning_outcomes` table: `ALTER TABLE learning_outcomes ADD COLUMN weight numeric DEFAULT 1.0 CHECK (weight > 0 AND weight <= 1.0)`
    - Update type check constraint to include `SUB_CLO`: `ALTER TABLE learning_outcomes DROP CONSTRAINT IF EXISTS learning_outcomes_type_check; ALTER TABLE learning_outcomes ADD CONSTRAINT learning_outcomes_type_check CHECK (type IN ('ILO', 'PLO', 'CLO', 'SUB_CLO'))`
    - Create `validate_sub_clo_weights()` trigger function that ensures Sub-CLO parent is a CLO
    - Create `trg_validate_sub_clo` trigger on `learning_outcomes` BEFORE INSERT OR UPDATE
    - Regenerate TypeScript types: `npx supabase gen types --linked > src/types/database.ts`
    - _Requirements: 103.1_

  - [ ] 109.2 Create Sub-CLO Zod schemas (`/src/lib/schemas/subCLO.ts`)
    - `subCLOSchema`: validates title, description, code, weight (0.0–1.0), parent_outcome_id
    - `subCLOWeightSumSchema`: validates that sum of sibling Sub-CLO weights equals 1.0 (±0.001 tolerance)
    - _Requirements: 103.1, 103.2_

  - [ ] 109.3 Create Sub-CLO TanStack Query hooks (`/src/hooks/useSubCLOs.ts`)
    - `useSubCLOs(cloId)`: fetches Sub-CLOs for a parent CLO
    - `useCreateSubCLO()`: mutation to create Sub-CLO with weight validation
    - `useUpdateSubCLO()`: mutation to update Sub-CLO
    - `useDeleteSubCLO()`: mutation that checks for linked evidence before deletion (Req 103.5)
    - Add query keys to `/src/lib/queryKeys.ts`: `subCLOs`
    - _Requirements: 103.1, 103.5_

  - [ ] 109.4 Implement Sub-CLO weighted rollup logic in `calculate-attainment-rollup` Edge Function
    - When a CLO has Sub-CLOs, calculate parent CLO attainment as `sum(sub_clo_attainment × sub_clo_weight)`
    - When no Sub-CLOs exist, retain existing direct evidence calculation
    - _Requirements: 103.4_

  - [ ]* 109.5 Write property tests for Sub-CLO weight sum constraint (`/src/__tests__/properties/sub-clo.property.test.ts`)
    - **Property 81: Sub-CLO weight sum constraint**
    - **Validates: Requirements 103.1, 103.2**

  - [ ]* 109.6 Write property tests for Sub-CLO weighted rollup accuracy
    - **Property 82: Sub-CLO weighted rollup accuracy**
    - **Validates: Requirements 103.4**

  - [ ]* 109.7 Write property test for Sub-CLO deletion protection
    - **Property 83: Sub-CLO deletion protection**
    - **Validates: Requirements 103.5**


- [ ] 110. OBE Engine — Sub-CLO UI Components
  - [ ] 110.1 Create SubCLOManager page component (`/src/pages/teacher/outcomes/SubCLOManager.tsx`)
    - Form for creating/editing Sub-CLOs with weight input (React Hook Form + Zod)
    - Weight sum validation indicator showing current total vs 1.0
    - Deletion blocked when evidence exists, showing dependent evidence count
    - _Requirements: 103.1, 103.2, 103.5_

  - [ ] 110.2 Create SubCLORow shared component (`/src/components/shared/SubCLORow.tsx`)
    - Expandable row beneath parent CLO in outcome list views
    - Shows Sub-CLO code, title, weight, and attainment bar
    - Uses Shadcn/ui Collapsible for expand/collapse
    - _Requirements: 103.6_

  - [ ] 110.3 Update CLO list views to display Sub-CLOs as expandable children
    - Modify Teacher CLO list page to render SubCLORow beneath each CLO
    - Modify Coordinator outcome views to show Sub-CLO hierarchy
    - Modify Student CLO progress view to show Sub-CLO breakdown
    - _Requirements: 103.6_

  - [ ] 110.4 Update RubricBuilder to support Sub-CLO linkage
    - When a CLO has Sub-CLOs, allow rubric criteria to link to individual Sub-CLOs
    - Show Sub-CLO selector dropdown when parent CLO is selected
    - _Requirements: 103.3_

- [ ] 111. Checkpoint — Sub-CLO Implementation
  - Ensure all tests pass, ask the user if questions arise.


- [ ] 112. OBE Engine — Graduate Attribute Database and Core Logic
  - [ ] 112.1 Apply Graduate Attribute database migration via Supabase MCP `apply_migration`
    - Create `graduate_attributes` table with `id`, `institution_id`, `title`, `description`, `code`, `created_at`, `updated_at`, UNIQUE(institution_id, code)
    - Create `graduate_attribute_mappings` table with `id`, `graduate_attribute_id`, `ilo_id`, `weight`, UNIQUE(graduate_attribute_id, ilo_id)
    - Enable RLS on both tables with admin-manages and all-roles-read policies
    - Regenerate TypeScript types
    - _Requirements: 104.1, 104.2_

  - [ ] 112.2 Create Graduate Attribute Zod schemas (`/src/lib/schemas/graduateAttribute.ts`)
    - `graduateAttributeSchema`: validates title, description, code
    - `graduateAttributeMappingSchema`: validates graduate_attribute_id, ilo_id, weight (0.0–1.0)
    - _Requirements: 104.1, 104.2_

  - [ ] 112.3 Create Graduate Attribute TanStack Query hooks (`/src/hooks/useGraduateAttributes.ts`)
    - `useGraduateAttributes(institutionId)`, `useCreateGraduateAttribute()`, `useUpdateGraduateAttribute()`, `useDeleteGraduateAttribute()`
    - `useGraduateAttributeMappings(attributeId)`, `useGraduateAttributeAttainment(institutionId)`
    - All mutations log to audit_logs via auditLogger
    - Add query keys to `/src/lib/queryKeys.ts`
    - _Requirements: 104.1, 104.2, 104.3, 104.6_

  - [ ] 112.4 Implement GA weighted rollup in `calculate-attainment-rollup` Edge Function
    - Calculate GA attainment as weighted average of mapped ILO attainments: `sum(ilo_attainment × mapping_weight)`
    - _Requirements: 104.3_

  - [ ]* 112.5 Write property tests for Graduate Attribute rollup (`/src/__tests__/properties/graduate-attributes.property.test.ts`)
    - **Property 84: Graduate Attribute weighted rollup accuracy**
    - **Validates: Requirements 104.2, 104.3**

  - [ ]* 112.6 Write property test for Graduate Attribute audit logging
    - **Property 85: Graduate Attribute audit logging**
    - **Validates: Requirements 104.6**


- [ ] 113. OBE Engine — Graduate Attribute UI Components
  - [ ] 113.1 Create GraduateAttributeManager page (`/src/pages/admin/graduate-attributes/GraduateAttributeManager.tsx`)
    - CRUD form for Graduate Attributes (React Hook Form + Zod)
    - Mapping interface to link GAs to ILOs with weight input
    - Data table with sorting/filtering via TanStack Table
    - _Requirements: 104.1, 104.2_

  - [ ] 113.2 Create GraduateAttributeCard shared component (`/src/components/shared/GraduateAttributeCard.tsx`)
    - Displays GA title, code, attainment percentage, mapped ILO count
    - Color-coded attainment level (Excellent/Satisfactory/Developing/Not Yet)
    - _Requirements: 104.5_

  - [ ] 113.3 Add GA attainment overview card to Admin Dashboard
    - Institution-wide attainment percentages per attribute
    - Uses GraduateAttributeCard in a grid layout
    - _Requirements: 104.5_

  - [ ] 113.4 Update Report Generator Edge Function to include GA summary in accreditation PDF
    - Add Graduate Attribute attainment summary section to PDF report
    - _Requirements: 104.4_

- [ ] 114. OBE Engine — Competency Framework Database and Core Logic
  - [ ] 114.1 Apply Competency Framework database migration via Supabase MCP `apply_migration`
    - Create `competency_frameworks` table with `id`, `institution_id`, `name`, `version`, `source`, UNIQUE(institution_id, name, version)
    - Create `competency_items` table with `id`, `framework_id`, `parent_id` (self-ref), `level` (domain/competency/indicator), `code`, `title`, `sort_order`, UNIQUE(framework_id, code)
    - Create `competency_outcome_mappings` table with `id`, `competency_item_id`, `outcome_id`, UNIQUE(competency_item_id, outcome_id)
    - Enable RLS on all three tables with admin-manages and all-roles-read policies
    - Regenerate TypeScript types
    - _Requirements: 105.1, 105.2, 105.3_

  - [ ] 114.2 Create Competency Framework Zod schemas (`/src/lib/schemas/competencyFramework.ts`)
    - `competencyFrameworkSchema`: validates name, version, source
    - `competencyItemSchema`: validates framework_id, parent_id, level, code, title
    - `competencyCSVRowSchema`: validates domain_code, domain_title, competency_code, competency_title, indicator_code, indicator_title
    - _Requirements: 105.1, 105.4_

  - [ ] 114.3 Create Competency Framework TanStack Query hooks (`/src/hooks/useCompetencyFrameworks.ts`)
    - `useCompetencyFrameworks(institutionId)`, `useCompetencyItems(frameworkId)`
    - `useCreateCompetencyFramework()`, `useImportCompetencyCSV()`, `useCompetencyOutcomeMappings(frameworkId)`
    - Add query keys to `/src/lib/queryKeys.ts`
    - _Requirements: 105.1, 105.3, 105.4_

  - [ ] 114.4 Create CSV import Edge Function for competency frameworks (`/supabase/functions/import-competency-csv/`)
    - Parse CSV with columns: domain_code, domain_title, competency_code, competency_title, indicator_code, indicator_title
    - Build three-level hierarchy: Domain → Competency → Indicator
    - Validate against Zod schema, return import summary
    - _Requirements: 105.4_

  - [ ]* 114.5 Write property tests for competency hierarchy (`/src/__tests__/properties/competency-frameworks.property.test.ts`)
    - **Property 86: Competency hierarchy level consistency**
    - **Validates: Requirements 105.1**

  - [ ]* 114.6 Write property test for CSV import round-trip
    - **Property 87: Competency CSV import round-trip**
    - **Validates: Requirements 105.4**

  - [ ]* 114.7 Write property test for unmapped indicator flagging
    - **Property 88: Unmapped competency indicator flagging**
    - **Validates: Requirements 105.6**


- [ ] 115. OBE Engine — Competency Framework UI Components
  - [ ] 115.1 Create CompetencyFrameworkManager page (`/src/pages/admin/competency-frameworks/CompetencyFrameworkManager.tsx`)
    - CRUD form for frameworks (name, version, source) with React Hook Form + Zod
    - CSV file upload with drag-and-drop for bulk import
    - Import preview with validation status per row
    - Data table listing frameworks with TanStack Table
    - _Requirements: 105.1, 105.2, 105.4_

  - [ ] 115.2 Create CompetencyTree shared component (`/src/components/shared/CompetencyTree.tsx`)
    - Hierarchical tree view: Domain → Competency → Indicator
    - Expand/collapse nodes using Shadcn/ui Collapsible
    - "Unmapped" warning badge on indicators with zero outcome mappings
    - _Requirements: 105.1, 105.6_

  - [ ] 115.3 Create CompetencyAlignmentMatrix shared component (`/src/components/shared/CompetencyAlignmentMatrix.tsx`)
    - Matrix: Competency Indicators (rows) × Outcomes (columns)
    - Coverage indicators showing mapping presence and attainment
    - Unmapped indicators flagged with visual warning
    - _Requirements: 105.5, 105.6_

  - [ ] 115.4 Create mapping interface for competency indicators to outcomes
    - Dropdown selectors for linking indicators to ILOs, PLOs, or CLOs
    - Mapping stored in `competency_outcome_mappings` table
    - _Requirements: 105.3_

  - [ ] 115.5 Update Report Generator to produce competency alignment matrix report
    - Add competency-to-outcome alignment section to accreditation PDF
    - Show mapping coverage and attainment per indicator
    - _Requirements: 105.5_

- [ ] 116. Checkpoint — Graduate Attributes and Competency Frameworks
  - Ensure all tests pass, ask the user if questions arise.


- [ ] 117. OBE Engine — Visualization Data Hooks and Utilities
  - [ ] 117.1 Create Sankey data transformation utility (`/src/lib/sankeyTransform.ts`)
    - Transform outcome_mappings + outcome_attainment into SankeyNode[] and SankeyLink[]
    - Color-code nodes by attainment level: green (Excellent), blue (Satisfactory), yellow (Developing), red (Not Yet), gray (Unmapped)
    - Link widths proportional to mapping weights
    - _Requirements: 106.1, 106.4_

  - [ ] 117.2 Create Gap Analysis classification utility (`/src/lib/gapAnalysis.ts`)
    - Classify outcomes as: fully_mapped, partially_mapped, unmapped, no_evidence
    - Flag PLOs with < 2 mapped CLOs as "Under-Mapped"
    - Flag CLOs with 0 linked assessments in current semester as "Unassessed"
    - Generate recommendation actions for flagged outcomes
    - _Requirements: 107.1, 107.2, 107.3, 107.5_

  - [ ] 117.3 Create Coverage Heatmap data utility (`/src/lib/coverageHeatmap.ts`)
    - Build CLO × Course matrix from evidence records
    - Sequential color scale: white (0) → light blue (1–5) → dark blue (6+)
    - Toggle support for attainment percentage coloring mode
    - _Requirements: 108.1, 108.2_

  - [ ] 117.4 Create visualization TanStack Query hooks (`/src/hooks/useVisualizationData.ts`)
    - `useSankeyData(programId?, courseId?, semesterId?)`: fetches and transforms Sankey data
    - `useGapAnalysis(programId, semesterId)`: fetches gap analysis data
    - `useCoverageHeatmap(programId, semesterId?)`: fetches heatmap matrix data
    - Add query keys to `/src/lib/queryKeys.ts`
    - _Requirements: 106.1, 107.1, 108.1_

  - [ ] 117.5 Create Zod filter schemas for visualizations (`/src/lib/schemas/`)
    - `sankeyFilter.ts`: sankeyFilterSchema (programId, courseId, semesterId)
    - `gapAnalysis.ts`: gapAnalysisFilterSchema (programId, semesterId)
    - `coverageHeatmap.ts`: coverageHeatmapFilterSchema (programId, semesterId, attainmentThreshold)
    - _Requirements: 106.5, 107.1, 108.4_

  - [ ]* 117.6 Write property test for Sankey data transformation (`/src/__tests__/properties/sankey-diagram.property.test.ts`)
    - **Property 89: Sankey data transformation correctness**
    - **Validates: Requirements 106.1, 106.4**

  - [ ]* 117.7 Write property test for Gap status classification (`/src/__tests__/properties/gap-analysis.property.test.ts`)
    - **Property 90: Gap status classification correctness**
    - **Validates: Requirements 107.1, 107.2, 107.3**

  - [ ]* 117.8 Write property test for Coverage heatmap data integrity (`/src/__tests__/properties/coverage-heatmap.property.test.ts`)
    - **Property 91: Coverage heatmap data integrity**
    - **Validates: Requirements 108.1, 108.2**


- [ ] 118. OBE Engine — Sankey Diagram UI
  - [ ] 118.1 Create SankeyChart shared component (`/src/components/shared/SankeyChart.tsx`)
    - Reusable Sankey diagram component using Recharts Sankey or custom D3
    - Node rendering with attainment-level color coding
    - Link rendering with proportional widths
    - Performance target: render within 2 seconds for 30 ILOs, 100 PLOs, 500 CLOs
    - _Requirements: 106.1, 106.4, 106.6_

  - [ ] 118.2 Create SankeyDiagramView page (`/src/pages/coordinator/sankey/SankeyDiagramView.tsx`)
    - Hover tooltip: source outcome, target outcome, weight, attainment %
    - Click node: opens detail panel with full outcome info, mapped children/parents, attainment breakdown
    - Filter controls: program, course, semester (using nuqs for URL state)
    - _Requirements: 106.2, 106.3, 106.5_

  - [ ] 118.3 Add Sankey diagram route and navigation
    - Add route `/coordinator/sankey` to AppRouter
    - Add navigation link in Coordinator sidebar
    - Also accessible from Admin dashboard
    - _Requirements: 106.1_

- [ ] 119. OBE Engine — Gap Analysis UI
  - [ ] 119.1 Create GapStatusBadge shared component (`/src/components/shared/GapStatusBadge.tsx`)
    - Color-coded status: Fully Mapped (green), Partially Mapped (yellow), Unmapped (red), No Evidence (gray)
    - "Under-Mapped" and "Unassessed" warning variants with warning icon
    - _Requirements: 107.1, 107.2, 107.3_

  - [ ] 119.2 Create GapAnalysisView page (`/src/pages/coordinator/gap-analysis/GapAnalysisView.tsx`)
    - Hierarchical tree with GapStatusBadge per outcome
    - Summary statistics bar: total outcomes, % fully mapped, % with evidence, % meeting targets
    - Click flagged outcome → recommended actions panel
    - Filter by program and semester (nuqs)
    - _Requirements: 107.1, 107.4, 107.5_

  - [ ] 119.3 Add PDF export for Gap Analysis
    - Export gap analysis summary as PDF using jspdf
    - Include hierarchical tree, summary stats, and recommendations
    - _Requirements: 107.6_

  - [ ] 119.4 Add Gap Analysis route and navigation
    - Add route `/coordinator/gap-analysis` to AppRouter
    - Add navigation link in Coordinator sidebar
    - _Requirements: 107.1_


- [ ] 120. OBE Engine — Coverage Heatmap UI
  - [ ] 120.1 Create HeatmapGrid shared component (`/src/components/shared/HeatmapGrid.tsx`)
    - Reusable matrix component: rows × columns with color-coded cells
    - Sequential color scale for evidence count mode
    - Attainment-level color scale for attainment mode
    - Empty cells highlighted with distinct border pattern
    - Click cell → drill-down callback
    - Performance target: render within 3 seconds for 200 CLOs × 50 courses
    - _Requirements: 108.1, 108.2, 108.5, 108.6_

  - [ ] 120.2 Create CoverageHeatmapView page (`/src/pages/coordinator/coverage-heatmap/CoverageHeatmapView.tsx`)
    - Matrix: CLOs (rows) × Courses (columns)
    - Toggle between evidence count and attainment percentage coloring
    - Click cell → drill-down to individual student attainment records
    - Filter by semester, program, attainment level threshold (nuqs)
    - _Requirements: 108.1, 108.2, 108.3, 108.4_

  - [ ] 120.3 Add Coverage Heatmap route and navigation
    - Add route `/coordinator/coverage-heatmap` to AppRouter
    - Add navigation link in Coordinator sidebar
    - _Requirements: 108.1_

- [ ] 121. Checkpoint — OBE Visualizations (Sankey, Gap Analysis, Heatmap)
  - Ensure all tests pass, ask the user if questions arise.


- [ ] 122. OBE Engine — Semester Trends Database and Core Logic
  - [ ] 122.1 Apply semester attainment snapshots migration via Supabase MCP `apply_migration`
    - Create `semester_attainment_snapshots` table with `id`, `outcome_id`, `semester_id`, `avg_attainment`, `student_count`, `evidence_count`, `std_deviation`, `snapshot_at`, UNIQUE(outcome_id, semester_id)
    - Enable RLS with coordinator/admin read policy
    - Create `mv_semester_attainment` materialized view aggregating evidence by semester and outcome
    - Create unique index on materialized view
    - Create pg_cron job to refresh materialized view on semester close
    - Regenerate TypeScript types
    - _Requirements: 109.1, 109.6_

  - [ ] 122.2 Create semester trend Zod schemas and hooks
    - `semesterTrend.ts`: semesterTrendFilterSchema (outcomeId, outcomeType)
    - `useSemesterTrends(outcomeId, outcomeType)`: fetches trend data from mv_semester_attainment
    - Add query keys to `/src/lib/queryKeys.ts`
    - _Requirements: 109.2_

  - [ ] 122.3 Create declining trend detection utility (`/src/lib/trendDetection.ts`)
    - Detect ≥10 percentage point drop between consecutive semesters
    - Return flagged outcomes with "Declining Trend" status
    - _Requirements: 109.3_

  - [ ]* 122.4 Write property tests for semester trends (`/src/__tests__/properties/semester-trends.property.test.ts`)
    - **Property 92: Semester attainment snapshot completeness**
    - **Validates: Requirements 109.1**

  - [ ]* 122.5 Write property test for declining trend detection
    - **Property 93: Declining trend detection**
    - **Validates: Requirements 109.3**

- [ ] 123. OBE Engine — Semester Trend UI
  - [ ] 123.1 Create TrendLineChart shared component (`/src/components/shared/TrendLineChart.tsx`)
    - Multi-series line chart using Recharts
    - Data points labeled by semester name
    - Support side-by-side comparison of up to 4 outcomes
    - _Requirements: 109.2, 109.4_

  - [ ] 123.2 Create DecliningTrendBadge shared component (`/src/components/shared/DecliningTrendBadge.tsx`)
    - Warning badge for ≥10pp attainment decline
    - Red/amber styling with warning icon
    - _Requirements: 109.3_

  - [ ] 123.3 Create SemesterTrendView page (`/src/pages/coordinator/trends/SemesterTrendView.tsx`)
    - Line chart: attainment % over semesters (up to 8 semesters)
    - DecliningTrendBadge on flagged outcomes
    - Side-by-side comparison of up to 4 outcomes
    - Tabular view alongside chart (semester, attainment %, student count, evidence count)
    - Outcome selector with type filter (CLO/PLO/ILO)
    - _Requirements: 109.2, 109.3, 109.4, 109.5_

  - [ ] 123.4 Add Semester Trend route and navigation
    - Add route `/coordinator/trends` to AppRouter
    - Add navigation link in Coordinator sidebar
    - _Requirements: 109.2_


- [ ] 124. OBE Engine — Cohort Comparison Analytics
  - [ ] 124.1 Create cohort comparison Zod schemas and hooks
    - `cohortComparison.ts`: cohortDefinitionSchema (type: semester/section/enrollment_year, value, label), cohortComparisonExportSchema
    - `useCohortComparison(programId, cohorts)`: fetches comparison data with avg attainment, student count, std deviation per outcome per cohort
    - Add query keys to `/src/lib/queryKeys.ts`
    - _Requirements: 110.1, 110.2_

  - [ ] 124.2 Create Cohen's d effect size utility (`/src/lib/cohortStats.ts`)
    - Calculate Cohen's d: `(mean1 - mean2) / pooled_std_dev`
    - Pooled std dev: `sqrt(((n1-1)*s1² + (n2-1)*s2²) / (n1+n2-2))`
    - Only calculate when both cohorts have n ≥ 20
    - Detect "Significant Gap" when ≥15 percentage point difference
    - _Requirements: 110.3, 110.5_

  - [ ] 124.3 Create CohortBarChart shared component (`/src/components/shared/CohortBarChart.tsx`)
    - Grouped bar chart using Recharts
    - Average attainment per CLO/PLO across selected cohorts
    - Red highlight + "Significant Gap" label for ≥15pp differences
    - _Requirements: 110.2, 110.5_

  - [ ] 124.4 Create SignificantGapLabel shared component (`/src/components/shared/SignificantGapLabel.tsx`)
    - Red "Significant Gap" label with warning styling
    - _Requirements: 110.5_

  - [ ] 124.5 Create CohortComparisonView page (`/src/pages/coordinator/cohort-comparison/CohortComparisonView.tsx`)
    - Cohort selector: define cohorts by semester, section, or enrollment year
    - Grouped bar chart with CohortBarChart
    - Cohen's d display for 2-cohort comparisons with n≥20
    - CSV export: outcome_code, outcome_title, cohort_label, average_attainment, student_count, standard_deviation
    - _Requirements: 110.1, 110.2, 110.3, 110.4, 110.5_

  - [ ] 124.6 Add Cohort Comparison route and navigation
    - Add route `/coordinator/cohort-comparison` to AppRouter
    - Add navigation link in Coordinator sidebar, also accessible from Admin dashboard
    - _Requirements: 110.6_

  - [ ]* 124.7 Write property tests for cohort comparison (`/src/__tests__/properties/cohort-comparison.property.test.ts`)
    - **Property 94: Cohort comparison average attainment and gap detection**
    - **Validates: Requirements 110.2, 110.5**

  - [ ]* 124.8 Write property test for Cohen's d calculation
    - **Property 95: Cohen's d effect size calculation**
    - **Validates: Requirements 110.3**


- [ ] 125. OBE Engine — Historical Evidence Analysis
  - [ ] 125.1 Apply historical evidence materialized view migration via Supabase MCP `apply_migration`
    - Create `mv_historical_evidence` materialized view aggregating evidence by semester, outcome_type, blooms_level
    - Columns: semester_id, semester_name, start_date, outcome_type, blooms_level, evidence_count, avg_score, excellent_count, satisfactory_count, developing_count, not_yet_count
    - Create unique index on (semester_id, outcome_type, blooms_level)
    - Create pg_cron job to refresh materialized view periodically
    - _Requirements: 111.1, 111.6_

  - [ ] 125.2 Create historical evidence Zod schemas and hooks
    - `historicalEvidence.ts`: historicalEvidenceFilterSchema (programId, courseId, outcomeId, bloomsLevel)
    - `useHistoricalEvidence(filters)`: fetches from mv_historical_evidence
    - Add query keys to `/src/lib/queryKeys.ts`
    - _Requirements: 111.1, 111.3_

  - [ ] 125.3 Create StackedAreaChart shared component (`/src/components/shared/StackedAreaChart.tsx`)
    - Stacked area chart using Recharts
    - Shows proportion of Excellent, Satisfactory, Developing, Not Yet per semester
    - Color-coded by attainment level (green, blue, yellow, red)
    - _Requirements: 111.2_

  - [ ] 125.4 Create HistoricalEvidenceDashboard page (`/src/pages/admin/historical-evidence/HistoricalEvidenceDashboard.tsx`)
    - Aggregated stats: total evidence records, avg attainment by level (CLO/PLO/ILO), attainment distribution
    - Stacked area chart for attainment level proportions over time
    - Filter by program, course, outcome, Bloom's level (nuqs)
    - Performance target: load within 4 seconds for 500,000 evidence records
    - _Requirements: 111.1, 111.2, 111.3, 111.6_

  - [ ] 125.5 Create "Continuous Improvement Report" PDF generation
    - Update Report Generator Edge Function to produce CI report
    - Include trend charts, cohort comparisons, gap analysis summaries, CQI action plan status
    - Selectable date range
    - _Requirements: 111.4_

  - [ ] 125.6 Add Historical Evidence route and navigation
    - Add route `/admin/historical-evidence` to AppRouter
    - Add navigation link in Admin sidebar
    - _Requirements: 111.1_

  - [ ]* 125.7 Write property test for historical evidence distribution (`/src/__tests__/properties/historical-evidence.property.test.ts`)
    - **Property 96: Historical evidence attainment distribution**
    - **Validates: Requirements 111.1, 111.2**

- [ ] 126. Checkpoint — Semester Trends, Cohort Comparison, Historical Evidence
  - Ensure all tests pass, ask the user if questions arise.


- [ ] 127. Habit Engine — Extended Habit Types Database and Core Logic
  - [ ] 127.1 Apply extended habit types migration via Supabase MCP `apply_migration`
    - Update `habit_logs` type constraint: `ALTER TABLE habit_logs DROP CONSTRAINT IF EXISTS habit_logs_habit_type_check; ALTER TABLE habit_logs ADD CONSTRAINT habit_logs_habit_type_check CHECK (habit_type IN ('login', 'submit', 'journal', 'read', 'collaborate', 'practice', 'review', 'mentor'))`
    - Regenerate TypeScript types
    - _Requirements: 112.1_

  - [ ] 127.2 Update shared type definitions (`/src/types/app.ts`)
    - Update `HabitType` to include all 8 types: `'login' | 'submit' | 'journal' | 'read' | 'collaborate' | 'practice' | 'review' | 'mentor'`
    - _Requirements: 112.1_

  - [ ] 127.3 Implement extended habit completion triggers
    - Collaborate: auto-complete when student posts discussion question or answer (trigger on `discussion_replies` insert)
    - Practice: auto-complete when student completes quiz attempt (trigger on `quiz_attempts` insert)
    - Review: auto-complete when student submits peer review (trigger on relevant action)
    - Mentor: auto-complete when student's discussion answer is marked correct by teacher
    - Each completion awards 15 XP via `award-xp` Edge Function
    - _Requirements: 112.2, 112.3, 112.4, 112.5, 112.6_

  - [ ] 127.4 Update Perfect Day logic
    - Update threshold: Perfect Day requires ≥ 6 of 8 habits completed
    - Update `perfect-day-nudge-cron` Edge Function to check 8 habits
    - Nudge when student has completed 5 of 8 habits: "You're 1 habit away from a Perfect Day!"
    - _Requirements: 112.8_

  - [ ] 127.5 Update HabitTracker component (`/src/components/shared/HabitTracker.tsx`)
    - Display all 8 habits in 7-day grid
    - New habit icons: Collaborate (MessageSquare), Practice (Brain), Review (Eye), Mentor (HandHelping) from Lucide
    - Completed habits as filled icons, incomplete as outlined
    - _Requirements: 112.7_

  - [ ]* 127.6 Write property tests for extended habits (`/src/__tests__/properties/extended-habits.property.test.ts`)
    - **Property 97: Extended habit type validation**
    - **Validates: Requirements 112.1**

  - [ ]* 127.7 Write property test for extended habit completion triggers
    - **Property 98: Extended habit completion triggers**
    - **Validates: Requirements 112.2, 112.3, 112.4, 112.5, 112.6**

  - [ ]* 127.8 Write property test for updated Perfect Day threshold
    - **Property 99: Updated Perfect Day threshold**
    - **Validates: Requirements 112.8**


- [ ] 128. Habit Engine — Team Management Database and Core Logic
  - [ ] 128.1 Apply teams database migration via Supabase MCP `apply_migration`
    - Create `teams` table with `id`, `name`, `course_id`, `created_by`, `avatar_letter` (char(1)), `created_at`, UNIQUE(course_id, name)
    - Create `team_members` table with `id`, `team_id`, `student_id`, `joined_at`, UNIQUE(team_id, student_id)
    - Create `team_gamification` table with `id`, `team_id` (unique), `xp_total`, `xp_this_week`, `streak_current`, `streak_longest`
    - Enable RLS on all three tables with teacher-manages and student-reads policies
    - Create `enforce_team_size_limit()` trigger: max 6 members per team
    - Create `enforce_one_team_per_course()` trigger: student can only be in 1 team per course
    - Regenerate TypeScript types
    - _Requirements: 115.1, 115.2, 115.3_

  - [ ] 128.2 Create Team Zod schemas (`/src/lib/schemas/team.ts`)
    - `teamSchema`: validates name, course_id
    - `teamMemberSchema`: validates team_id, student_id
    - `autoGenerateTeamsSchema`: validates course_id, team_size (2–6)
    - _Requirements: 115.1, 115.2, 115.4_

  - [ ] 128.3 Create Team TanStack Query hooks (`/src/hooks/useTeams.ts`)
    - `useTeams(courseId)`, `useTeamMembers(teamId)`, `useCreateTeam()`, `useAddTeamMember()`, `useRemoveTeamMember()`
    - `useAutoGenerateTeams()`: mutation for balanced auto-generation
    - `useTeamGamification(teamId)`: fetches team XP, streak data
    - Add query keys to `/src/lib/queryKeys.ts`
    - _Requirements: 115.1, 115.4, 115.5_

  - [ ] 128.4 Implement auto-generate balanced teams logic
    - Randomly distribute N enrolled students into teams of target size S
    - Ensure balanced distribution: team sizes differ by at most 1
    - Every enrolled student assigned to exactly one team
    - _Requirements: 115.4_

  - [ ]* 128.5 Write property tests for team membership constraints (`/src/__tests__/properties/teams.property.test.ts`)
    - **Property 100: Team membership constraints**
    - **Validates: Requirements 115.2, 115.3**

  - [ ]* 128.6 Write property test for auto-generated team balance
    - **Property 101: Auto-generated team balance**
    - **Validates: Requirements 115.4**


- [ ] 129. Habit Engine — Team Management UI
  - [ ] 129.1 Create TeamManager page (`/src/pages/teacher/teams/TeamManager.tsx`)
    - CRUD form for teams (name, course_id) with React Hook Form + Zod
    - Member management: add/remove students with autocomplete
    - Auto-generate balanced teams button with team size input (2–6)
    - Data table listing teams with member count, XP total via TanStack Table
    - Enforce min 2, max 6 members visually with validation messages
    - _Requirements: 115.1, 115.2, 115.4_

  - [ ] 129.2 Create TeamDashboardCard shared component (`/src/components/shared/TeamDashboardCard.tsx`)
    - Displays team name, avatar letter, member avatars, team XP pool, team streak (flame icon)
    - Team badges section
    - Link to full team leaderboard
    - _Requirements: 115.6, 116.3_

  - [ ] 129.3 Add team display to Student Dashboard course card
    - Show team name and member avatars on enrolled course cards
    - _Requirements: 115.6_

  - [ ] 129.4 Add Team Manager route and navigation
    - Add route `/teacher/teams` to AppRouter
    - Add navigation link in Teacher sidebar
    - _Requirements: 115.1_

- [ ] 130. Checkpoint — Extended Habits and Team Management
  - Ensure all tests pass, ask the user if questions arise.


- [ ] 131. Habit Engine — Team XP Pool and Leaderboard
  - [ ] 131.1 Update `award-xp` Edge Function for team XP contribution
    - When student is a team member: credit 100% to individual, credit `floor(amount / 2)` to team XP pool
    - Create separate `xp_transactions` record with `scope = 'team'` and `team_id`
    - Update `team_gamification.xp_total` and `xp_this_week`
    - _Requirements: 116.1, 116.4_

  - [ ] 131.2 Apply xp_transactions column additions via Supabase MCP `apply_migration`
    - Add `scope` column: `ALTER TABLE xp_transactions ADD COLUMN scope text NOT NULL DEFAULT 'individual' CHECK (scope IN ('individual', 'team'))`
    - Add `team_id` column: `ALTER TABLE xp_transactions ADD COLUMN team_id uuid REFERENCES teams(id)`
    - Add `base_xp` column: `ALTER TABLE xp_transactions ADD COLUMN base_xp integer`
    - Add `final_xp` column: `ALTER TABLE xp_transactions ADD COLUMN final_xp integer`
    - Add `multipliers` jsonb column: `ALTER TABLE xp_transactions ADD COLUMN multipliers jsonb DEFAULT '{}'`
    - Regenerate TypeScript types
    - _Requirements: 116.4, 120.3_

  - [ ] 131.3 Create Team Leaderboard TanStack Query hooks (`/src/hooks/useTeamLeaderboard.ts`)
    - `useTeamLeaderboard(courseId, view: 'weekly' | 'all_time')`: fetches team rankings
    - Supabase Realtime subscription for live updates on `team_gamification` changes
    - Add query keys to `/src/lib/queryKeys.ts`
    - _Requirements: 117.1, 117.4_

  - [ ] 131.4 Create TeamLeaderboard page (`/src/pages/student/leaderboard/TeamLeaderboard.tsx`)
    - All teams in course ranked by XP (weekly and all-time toggle)
    - Each entry: rank, team name, avatar letter, member count, total XP, weekly XP
    - Top 3: Gold, Silver, Bronze styling
    - Current student's team highlighted with distinct visual indicator
    - Real-time updates via Supabase Realtime
    - _Requirements: 117.1, 117.2, 117.3, 117.4, 117.5_

  - [ ] 131.5 Add Team Leaderboard tab to existing LeaderboardView
    - Add "Teams" tab alongside existing individual leaderboard
    - Accessible from Student Dashboard and course detail page
    - _Requirements: 117.6_

  - [ ]* 131.6 Write property test for Team XP split (`/src/__tests__/properties/team-xp.property.test.ts`)
    - **Property 102: Team XP split correctness**
    - **Validates: Requirements 116.1, 116.4**

  - [ ]* 131.7 Write property test for Team Leaderboard ordering (`/src/__tests__/properties/team-leaderboard.property.test.ts`)
    - **Property 103: Team leaderboard ordering and completeness**
    - **Validates: Requirements 117.1, 117.2**


- [ ] 132. Habit Engine — Team Badges and Streaks
  - [ ] 132.1 Apply badges table column additions via Supabase MCP `apply_migration`
    - Add `scope` column: `ALTER TABLE badges ADD COLUMN scope text NOT NULL DEFAULT 'individual' CHECK (scope IN ('individual', 'team'))`
    - Add `team_id` column: `ALTER TABLE badges ADD COLUMN team_id uuid REFERENCES teams(id)`
    - Regenerate TypeScript types
    - _Requirements: 118.1_

  - [ ] 132.2 Update `check-badges` Edge Function for team badges
    - Team Spirit: team earns 500 XP → award badge
    - Unstoppable: team wins 3 challenges → award badge
    - Dream Team: all members complete Perfect Day on same day → award badge
    - Study Squad: team maintains 7-day team streak → award badge
    - All awards atomic and idempotent (cannot be awarded twice for same trigger and team)
    - _Requirements: 118.2, 118.5_

  - [ ] 132.3 Create TeamBadgeDisplay shared component (`/src/components/shared/TeamBadgeDisplay.tsx`)
    - Display team badges with emoji, name, description, earned date
    - Animated notification to all online team members when badge awarded (Framer Motion)
    - Shown on Team Dashboard card and team member profiles under "Team Badges" section
    - _Requirements: 118.3, 118.4_

  - [ ] 132.4 Update `process-streak` Edge Function for team streaks
    - Team streak increments when ALL team members log in on same calendar day
    - Team streak resets to 0 when any member misses a day
    - Update `team_gamification.streak_current` and `streak_longest`
    - Streak milestones: 7 days → 100 XP + badge, 14 days → 250 XP + badge, 30 days → 500 XP + badge
    - _Requirements: 119.1, 119.2, 119.3, 119.5_

  - [ ] 132.5 Create `team-streak-risk-cron` Edge Function
    - pg_cron → 8 PM daily (institution timezone)
    - Check if any team member has not logged in today
    - Send notification to all team members: "Your team streak is at risk — [member_name] hasn't logged in today."
    - _Requirements: 119.6_

  - [ ] 132.6 Add team streak display to TeamDashboardCard
    - Flame icon consistent with individual streak styling (red-500 to orange-500 gradient)
    - Show streak_current and streak_longest
    - _Requirements: 119.4_

  - [ ]* 132.7 Write property test for team badge idempotency (`/src/__tests__/properties/team-badges.property.test.ts`)
    - **Property 104: Team badge idempotency**
    - **Validates: Requirements 118.2, 118.5**

  - [ ]* 132.8 Write property tests for team streak calculation (`/src/__tests__/properties/team-streaks.property.test.ts`)
    - **Property 105: Team streak calculation**
    - **Validates: Requirements 119.1, 119.2**

  - [ ]* 132.9 Write property test for team streak milestone rewards
    - **Property 106: Team streak milestone rewards**
    - **Validates: Requirements 119.5**

- [ ] 133. Checkpoint — Team XP, Leaderboard, Badges, and Streaks
  - Ensure all tests pass, ask the user if questions arise.


- [ ] 134. Habit Engine — Social Challenges Database and Core Logic
  - [ ] 134.1 Apply social challenges database migration via Supabase MCP `apply_migration`
    - Create `social_challenges` table with `id`, `title`, `description`, `challenge_type` (team/course_wide), `course_id`, `start_date`, `end_date`, `goal_metric` (total_xp/habits_completed/assignments_submitted/quiz_score_avg), `goal_target`, `reward_type` (xp_bonus/badge), `reward_value`, `status` (draft/active/completed/cancelled), `created_by`, `created_at`
    - Create `challenge_participants` table with `id`, `challenge_id`, `participant_id` (team_id or student_id), `participant_type` (team/student), `current_progress`, `created_at`
    - Enable RLS on both tables with teacher-manages and student-reads policies
    - Create trigger to enforce max 3 active course-wide challenges per course
    - Regenerate TypeScript types
    - _Requirements: 113.1, 114.1, 114.5_

  - [ ] 134.2 Create Challenge Zod schemas (`/src/lib/schemas/challenge.ts`)
    - `challengeSchema`: validates title, description, challenge_type, course_id, start/end dates, goal_metric, goal_target, reward_type, reward_value
    - `challengeProgressSchema`: validates challenge_id, participant_id, participant_type, current_progress
    - _Requirements: 113.1_

  - [ ] 134.3 Create Challenge TanStack Query hooks (`/src/hooks/useChallenges.ts`)
    - `useChallenges(courseId, status?)`, `useCreateChallenge()`, `useChallengeProgress(challengeId)`
    - `useStudentChallenges(studentId)`: fetches challenges for a student
    - Supabase Realtime subscription for live progress updates on active challenges
    - Add query keys to `/src/lib/queryKeys.ts`
    - _Requirements: 113.1, 113.3_

  - [ ] 134.4 Create `challenge-progress-update` Edge Function
    - Triggered on qualifying actions during active challenges
    - Update `challenge_participants.current_progress` based on goal_metric
    - For course-wide: aggregate individual contributions toward shared goal
    - _Requirements: 113.3, 114.2_

  - [ ] 134.5 Create `challenge-completion` Edge Function (pg_cron daily)
    - Check challenge end dates daily
    - For team challenges: determine winning team(s), distribute reward atomically to all members
    - For course-wide: distribute reward to all students who contributed ≥1 qualifying action
    - Auto-cancel team challenges with < 2 participating teams at start date
    - _Requirements: 113.4, 113.6, 114.3_

  - [ ] 134.6 Implement 90% notification trigger for course-wide challenges
    - When course-wide challenge reaches 90% of goal target, send notification to all enrolled students
    - Send once per challenge (track notification sent flag)
    - _Requirements: 114.6_

  - [ ]* 134.7 Write property tests for challenge creation constraints (`/src/__tests__/properties/social-challenges.property.test.ts`)
    - **Property 112: Challenge creation constraints**
    - **Validates: Requirements 113.1, 113.2, 113.6**

  - [ ]* 134.8 Write property test for course-wide challenge participation and reward
    - **Property 113: Course-wide challenge participation and reward distribution**
    - **Validates: Requirements 114.1, 114.2, 114.3, 114.5**

  - [ ]* 134.9 Write property test for 90% notification trigger
    - **Property 114: Challenge 90% notification trigger**
    - **Validates: Requirements 114.6**

  - [ ]* 134.10 Write property test for team challenge reward atomicity
    - **Property 115: Team challenge reward atomicity**
    - **Validates: Requirements 113.4**


- [ ] 135. Habit Engine — Social Challenges UI
  - [ ] 135.1 Create ChallengeManager page (`/src/pages/teacher/challenges/ChallengeManager.tsx`)
    - CRUD form for challenges with React Hook Form + Zod
    - Team selector for team-based challenges (min 2, max 20 teams)
    - Goal metric and target configuration
    - Reward type selector (XP bonus or badge)
    - Data table listing challenges with status via TanStack Table
    - _Requirements: 113.1, 113.2_

  - [ ] 135.2 Create ChallengeListView page (`/src/pages/student/challenges/ChallengeListView.tsx`)
    - Active and completed challenges tabs
    - Live progress bars for active challenges (Supabase Realtime)
    - Contribution leaderboard for course-wide challenges
    - Team progress display for team-based challenges
    - _Requirements: 113.3, 113.5, 114.4_

  - [ ] 135.3 Add Challenges tab to Student Dashboard
    - Dedicated "Challenges" tab showing active challenges
    - Quick-view progress bars
    - _Requirements: 113.5_

  - [ ] 135.4 Add Challenge routes and navigation
    - Add route `/teacher/challenges` to AppRouter with Teacher sidebar link
    - Add route `/student/challenges` to AppRouter with Student sidebar link
    - _Requirements: 113.1, 113.5_

- [ ] 136. Checkpoint — Social Challenges
  - Ensure all tests pass, ask the user if questions arise.


- [ ] 137. Habit Engine — Adaptive XP Engine Core Logic
  - [ ] 137.1 Create Adaptive XP calculation utility (`/src/lib/adaptiveXP.ts`)
    - `getLevelMultiplier(level)`: 1.2 for levels 1–5, 1.0 for 6–10, 0.9 for 11–15, 0.8 for 16–20
    - `getDifficultyMultiplier(bloomsLevel)`: Remembering 1.0, Understanding 1.1, Applying 1.2, Analyzing 1.3, Evaluating 1.4, Creating 1.5
    - `getDiminishingMultiplier(repeatCount, isMilestone)`: 1.0 → 0.8 → 0.6 → 0.4 → 0.2 per repetition; milestones always 1.0
    - `calculateFinalXP(baseXP, level, bloomsLevels, repeatCount, isMilestone)`: `floor(base × level × difficulty × diminishing)`
    - For multiple CLOs: use highest Bloom's level for difficulty multiplier
    - _Requirements: 120.1, 120.2, 121.1, 121.2, 122.1, 122.5_

  - [ ] 137.2 Create Adaptive XP Zod schemas (`/src/lib/schemas/adaptiveXP.ts`)
    - `xpMultiplierSchema`: validates level_multiplier, difficulty_multiplier, diminishing_multiplier
    - `diminishingReturnsSchema`: validates action_type, repeat_count, window_start
    - _Requirements: 120.1, 122.1_

  - [ ] 137.3 Update `award-xp` Edge Function with adaptive XP calculation
    - Integrate level-based, difficulty-based, and diminishing returns multipliers
    - Calculate final_xp using the adaptive formula
    - Store base_xp, final_xp, and multipliers jsonb in xp_transactions
    - Query rolling 24-hour window for diminishing returns count per action type
    - Recalculate level multiplier immediately on level-up
    - _Requirements: 120.1, 120.2, 120.4, 121.1, 122.1, 122.2, 122.4_

  - [ ] 137.4 Create diminishing returns tracking hooks (`/src/hooks/useAdaptiveXP.ts`)
    - `useStudentXPMultiplier(studentId)`: fetches current level multiplier
    - `useDiminishingReturnsStatus(studentId, actionType)`: checks if next action would receive reduced XP
    - `useImprovementBonusHistory(studentId)`: fetches improvement bonus records
    - Add query keys to `/src/lib/queryKeys.ts`
    - _Requirements: 120.5, 122.3_

  - [ ]* 137.5 Write property tests for adaptive XP formula (`/src/__tests__/properties/adaptive-xp.property.test.ts`)
    - **Property 107: Adaptive XP formula correctness**
    - **Validates: Requirements 120.1, 120.2, 121.1, 121.2**

  - [ ]* 137.6 Write property test for XP transaction auditability
    - **Property 108: XP transaction auditability**
    - **Validates: Requirements 120.3, 121.4**

  - [ ]* 137.7 Write property test for diminishing returns mechanics
    - **Property 109: Diminishing returns mechanics**
    - **Validates: Requirements 122.1, 122.4, 122.5**


- [ ] 138. Habit Engine — Adaptive XP UI Components
  - [ ] 138.1 Create AdaptiveXPDisplay shared component (`/src/components/shared/AdaptiveXPDisplay.tsx`)
    - Shows current XP multiplier on Student Dashboard gamification card
    - Displays "Diminishing Returns" indicator when next action would receive reduced XP
    - Shows current level and level multiplier
    - _Requirements: 120.5, 122.3_

  - [ ] 138.2 Add difficulty bonus display to assignment detail page
    - Show difficulty multiplier as "Difficulty Bonus" indicator
    - Display Bloom's level badge alongside the multiplier
    - _Requirements: 121.3_

  - [ ] 138.3 Integrate AdaptiveXPDisplay into Student Dashboard
    - Add multiplier display to existing gamification card
    - Show diminishing returns warning when applicable
    - _Requirements: 120.5, 122.3_

- [ ] 139. Habit Engine — Improvement Bonus
  - [ ] 139.1 Create `improvement-bonus-check` Edge Function
    - Triggered after evidence creation
    - Compare current evidence score to student's previous evidence score for same CLO
    - If improvement ≥ 15 percentage points: award 50 XP with `action_type = 'improvement_bonus'`
    - Store CLO reference and previous/current scores in xp_transactions record
    - _Requirements: 123.1, 123.2, 123.5_

  - [ ] 139.2 Create Improvement Bonus Zod schema (`/src/lib/schemas/improvementBonus.ts`)
    - `improvementBonusSchema`: validates clo_id, previous_percent, current_percent, bonus_xp
    - _Requirements: 123.1_

  - [ ] 139.3 Update `check-badges` Edge Function for Comeback Kid badge
    - Award "Comeback Kid" badge when student earns 3 Improvement Bonuses within a single semester
    - Idempotent: cannot be awarded twice for same semester
    - _Requirements: 123.4_

  - [ ] 139.4 Create ImprovementBonusCelebration shared component (`/src/components/shared/ImprovementBonusCelebration.tsx`)
    - Celebratory animation: "Great improvement on [CLO title]!"
    - Shows +50 XP bonus amount
    - Uses Framer Motion + canvas-confetti
    - Honors `prefers-reduced-motion`
    - _Requirements: 123.3_

  - [ ]* 139.5 Write property test for improvement bonus correctness (`/src/__tests__/properties/improvement-bonus.property.test.ts`)
    - **Property 110: Improvement bonus correctness**
    - **Validates: Requirements 123.1, 123.2, 123.5**

  - [ ]* 139.6 Write property test for Comeback Kid badge threshold
    - **Property 111: Comeback Kid badge threshold**
    - **Validates: Requirements 123.4**

- [ ] 140. Checkpoint — Adaptive XP Engine and Improvement Bonus
  - Ensure all tests pass, ask the user if questions arise.


- [ ] 141. Integration — Wire OBE Enhancements into Existing Dashboards
  - [ ] 141.1 Update Coordinator Dashboard with OBE visualization links
    - Add Sankey Diagram, Gap Analysis, Coverage Heatmap, Semester Trends, Cohort Comparison quick-access cards
    - _Requirements: 106.1, 107.1, 108.1, 109.2, 110.6_

  - [ ] 141.2 Update Admin Dashboard with new sections
    - Add Graduate Attribute attainment overview card
    - Add Historical Evidence dashboard link
    - Add Competency Framework management link
    - _Requirements: 104.5, 111.1, 105.1_

  - [ ] 141.3 Update Student Dashboard with team and challenge sections
    - Add TeamDashboardCard to course cards for team members
    - Add Challenges tab with active challenge progress
    - Add AdaptiveXPDisplay to gamification card
    - Update HabitTracker to show 8 habits
    - _Requirements: 112.7, 113.5, 115.6, 120.5_

  - [ ] 141.4 Update Teacher Dashboard with team and challenge management links
    - Add Team Manager link in sidebar
    - Add Challenge Manager link in sidebar
    - _Requirements: 113.1, 115.1_

  - [ ] 141.5 Update AppRouter with all new routes
    - Coordinator: `/coordinator/sankey`, `/coordinator/gap-analysis`, `/coordinator/coverage-heatmap`, `/coordinator/trends`, `/coordinator/cohort-comparison`
    - Admin: `/admin/graduate-attributes`, `/admin/competency-frameworks`, `/admin/historical-evidence`
    - Teacher: `/teacher/teams`, `/teacher/challenges`, `/teacher/outcomes/sub-clos`
    - Student: `/student/challenges`, `/student/team`
    - Add role-based route guards for all new routes
    - _Requirements: All Sections U & V_

  - [ ] 141.6 Update TanStack Query key factory with all new keys
    - Add all new query keys: subCLOs, graduateAttributes, graduateAttributeMappings, graduateAttributeAttainment, competencyFrameworks, competencyItems, competencyOutcomeMappings, sankeyData, gapAnalysis, coverageHeatmap, semesterTrends, cohortComparison, historicalEvidence, teams, teamMembers, teamGamification, teamLeaderboard, teamBadges, challenges, challengeProgress, studentChallenges, xpMultiplier, diminishingReturns, improvementBonusHistory
    - _Requirements: All Sections U & V_

- [ ] 142. Final Checkpoint — Sections U & V Complete
  - Ensure all tests pass, ask the user if questions arise.
  - Verify all 21 requirements (103–123) are covered by implementation tasks
  - Verify all 35 correctness properties (81–115) have corresponding property test tasks


- [ ] 143. Streak Recovery — Comeback Challenge Database and Core Logic
  - [ ] 143.1 Apply Comeback Challenge database migration via Supabase MCP `apply_migration`
    - Add columns to `student_gamification`: `comeback_challenge_active` (boolean, default false), `comeback_challenge_start_date` (timestamptz), `comeback_challenge_days_completed` (integer, default 0, CHECK 0–3), `comeback_challenge_streak_to_restore` (integer, default 0)
    - Add `total_active_days` column to `student_gamification`: integer, default 0, CHECK >= 0
    - Regenerate TypeScript types
    - _Requirements: 124.1, 126.3_

  - [ ] 143.2 Create Comeback Challenge Zod schemas (`/src/lib/schemas/comebackChallenge.ts`)
    - `comebackChallengeStateSchema`: validates is_active, days_completed (0–3), streak_to_restore
    - _Requirements: 124.1_

  - [ ] 143.3 Update `process-streak` Edge Function for Comeback Challenge logic
    - On streak break: store lost streak value, set `comeback_challenge_active = true`, calculate `streak_to_restore = floor(lost_streak / 2)`
    - On daily login during active challenge: check habit completion at current Habit Difficulty Level, increment days_completed or cancel challenge
    - On 3 days completed: restore streak, deactivate challenge, check Comeback Kid badge eligibility
    - Increment `total_active_days` when student completes at least 1 habit
    - _Requirements: 124.1, 124.2, 124.3, 124.4, 124.6, 126.3_

  - [ ] 143.4 Create Comeback Challenge TanStack Query hooks (`/src/hooks/useComebackChallenge.ts`)
    - `useComebackChallenge(studentId)`: fetches current challenge state
    - `useStartComebackChallenge()`: mutation to activate challenge
    - `useCancelComebackChallenge()`: mutation to dismiss/cancel challenge
    - Add query keys to `/src/lib/queryKeys.ts`
    - _Requirements: 124.1, 124.5_

  - [ ]* 143.5 Write property test for Comeback Challenge streak restoration (`/src/__tests__/properties/comeback-challenge.property.test.ts`)
    - **Property 101: Comeback Challenge streak restoration accuracy**
    - **Validates: Requirements 124.2, 124.3, 124.4**

  - [ ]* 143.6 Write property test for Total Active Days monotonicity (`/src/__tests__/properties/total-active-days.property.test.ts`)
    - **Property 103: Total Active Days monotonic increment**
    - **Validates: Requirements 126.2, 126.3**


- [ ] 144. Streak Recovery — Streak Sabbatical and Range Display
  - [ ] 144.1 Update `institution_settings` schema to include `streak_sabbatical_enabled` boolean (default false)
    - Update Institution Settings Zod schema
    - Update Institution Settings form to include Streak Sabbatical toggle
    - _Requirements: 125.3, 125.4_

  - [ ] 144.2 Update `process-streak` Edge Function for Streak Sabbatical
    - Check `institution_settings.streak_sabbatical_enabled` before evaluating streak
    - Skip streak check on Saturday and Sunday when enabled
    - Apply change from next calendar day when toggled
    - _Requirements: 125.1, 125.2, 125.5_

  - [ ] 144.3 Update StreakDisplay component (`/src/components/shared/StreakDisplay.tsx`)
    - Range format: "[X]-day streak, [Y] rest days" when sabbatical enabled
    - Total Active Days counter with milestone celebrations (30, 60, 100, 200, 365)
    - Motivational message on streak reset
    - _Requirements: 126.1, 126.2, 126.4, 126.5_

  - [ ] 144.4 Create ComebackChallengeBanner component (`/src/components/shared/ComebackChallengeBanner.tsx`)
    - Progress indicator: 3 circles for days 1/2/3
    - Shows streak value to be restored
    - Dismiss option to cancel challenge
    - _Requirements: 124.5_

  - [ ] 144.5 Wire Comeback Challenge banner and updated StreakDisplay into Student Dashboard
    - _Requirements: 124.5, 126.1, 126.2_

  - [ ]* 144.6 Write property test for Streak Sabbatical weekend exclusion (`/src/__tests__/properties/streak-sabbatical.property.test.ts`)
    - **Property 102: Streak Sabbatical weekend exclusion**
    - **Validates: Requirements 125.1, 125.2**


- [ ] 145. Habit Difficulty Levels — Database and Core Logic
  - [ ] 145.1 Apply Habit Difficulty Level database migration via Supabase MCP `apply_migration`
    - Add columns to `student_gamification`: `habit_difficulty_level` (integer, default 1, CHECK IN (1,2,3)), `habit_level_streak` (integer, default 0, CHECK >= 0)
    - Regenerate TypeScript types
    - _Requirements: 127.4_

  - [ ] 145.2 Create Habit Difficulty Level Zod schema (`/src/lib/schemas/habitDifficulty.ts`)
    - `habitDifficultyLevelSchema`: validates level (1, 2, 3), habit_level_streak
    - _Requirements: 127.1_

  - [ ] 145.3 Create Habit Difficulty Level utility (`/src/lib/habitDifficulty.ts`)
    - `getRequiredHabitsForLevel(level)`: Level 1 → 1, Level 2 → 2, Level 3 → 6 of 8
    - `checkLevelPromotion(level, habitLevelStreak)`: promote if streak >= 7 and level < 3
    - `getPerfectDayThreshold(level)`: returns required habit count for Perfect Day at given level
    - _Requirements: 127.1, 127.3, 128.1, 128.2, 128.3_

  - [ ] 145.4 Update `process-streak` Edge Function for Habit Difficulty Level tracking
    - Check daily habit completion against current level requirements
    - Increment `habit_level_streak` on success, reset to 0 on miss (without demotion)
    - Promote level when `habit_level_streak` reaches 7
    - _Requirements: 127.3, 127.5_

  - [ ] 145.5 Update `perfect-day-nudge-cron` Edge Function for level-relative thresholds
    - Use `getPerfectDayThreshold(habit_difficulty_level)` instead of fixed threshold
    - Nudge when student is 1 habit away from their level's Perfect Day
    - _Requirements: 128.4_

  - [ ] 145.6 Create HabitDifficultyIndicator component (`/src/components/shared/HabitDifficultyIndicator.tsx`)
    - Displays current level with progress toward next level
    - Level icons: Seedling (1), Sprout (2), Tree (3)
    - _Requirements: 127.6_

  - [ ] 145.7 Create Habit Difficulty Level TanStack Query hook (`/src/hooks/useHabitDifficulty.ts`)
    - `useHabitDifficultyLevel(studentId)`: fetches current level and streak
    - Add query keys to `/src/lib/queryKeys.ts`
    - _Requirements: 127.4_

  - [ ] 145.8 Wire HabitDifficultyIndicator into Student Dashboard
    - Display below or alongside HabitTracker component
    - _Requirements: 127.6_

  - [ ]* 145.9 Write property tests for Habit Difficulty Level (`/src/__tests__/properties/habit-difficulty.property.test.ts`)
    - **Property 104: Habit Difficulty Level promotion correctness**
    - **Property 105: Relative Perfect Day threshold**
    - **Validates: Requirements 127.3, 127.5, 128.1, 128.2, 128.3, 128.5**

- [ ] 146. Checkpoint — Streak Recovery and Habit Difficulty Levels
  - Ensure all tests pass, ask the user if questions arise.


- [ ] 147. Leaderboard Enhancements — Personal Best and Most Improved
  - [ ] 147.1 Create Personal Best leaderboard utility (`/src/lib/personalBestLeaderboard.ts`)
    - Query `xp_transactions` grouped by ISO week for a student (last 8 weeks)
    - Identify personal best week
    - _Requirements: 129.1, 129.2_

  - [ ] 147.2 Create Most Improved leaderboard utility (`/src/lib/mostImprovedLeaderboard.ts`)
    - Calculate improvement: `(current_4_week_xp - previous_4_week_xp) / previous_4_week_xp * 100`
    - Exclude students with zero previous XP
    - Return top 20 by improvement percentage
    - _Requirements: 130.1, 130.2, 130.3, 130.4_

  - [ ] 147.3 Create Personal Best and Most Improved TanStack Query hooks
    - `usePersonalBestLeaderboard(studentId)`: fetches weekly XP history
    - `useMostImprovedLeaderboard(courseId)`: fetches top 20 most improved
    - Add query keys to `/src/lib/queryKeys.ts`
    - _Requirements: 129.1, 130.1_

  - [ ] 147.4 Update LeaderboardPage with Personal Best tab
    - Bar chart of last 8 weeks with current week highlighted
    - "New Personal Best" confetti celebration
    - Default view for leaderboard opt-out students
    - _Requirements: 129.1, 129.2, 129.3, 129.4, 129.5_

  - [ ] 147.5 Update LeaderboardPage with Most Improved tab
    - Top 20 students with improvement percentage and XP delta
    - "Rising Star" badge eligibility indicator
    - _Requirements: 130.1, 130.4, 130.5_

  - [ ] 147.6 Update `check-badges` Edge Function for Rising Star badge
    - Award "Rising Star" badge when student appears in top 3 of Most Improved for 2 consecutive weeks
    - _Requirements: 130.5_

  - [ ]* 147.7 Write property tests for Personal Best (`/src/__tests__/properties/personal-best.property.test.ts`)
    - **Property 106: Personal Best leaderboard data integrity**
    - **Validates: Requirements 129.1, 129.2**

  - [ ]* 147.8 Write property test for Most Improved calculation (`/src/__tests__/properties/most-improved.property.test.ts`)
    - **Property 107: Most Improved calculation correctness**
    - **Validates: Requirements 130.2, 130.3**


- [ ] 148. Leaderboard Enhancements — Percentile Bands and League Tiers
  - [ ] 148.1 Create Percentile Band utility (`/src/lib/percentileBand.ts`)
    - `calculatePercentileBand(rank, totalStudents)`: returns exact rank for top 10, percentile band otherwise
    - Band thresholds: top 10%, top 25%, top 50%, bottom 50%
    - _Requirements: 131.1, 131.2, 131.3_

  - [ ] 148.2 Create League Tier utility (`/src/lib/leagueTier.ts`)
    - `getLeagueTier(cumulativeXP, thresholds)`: returns tier based on configurable thresholds
    - Default thresholds: Bronze (0–499), Silver (500–1499), Gold (1500–3999), Diamond (4000+)
    - _Requirements: 132.1, 132.5_

  - [ ] 148.3 Update `institution_settings` schema to include `league_thresholds` configuration
    - Default: `{ "bronze": 0, "silver": 500, "gold": 1500, "diamond": 4000 }`
    - Update Institution Settings form with League Tier threshold inputs
    - _Requirements: 132.5_

  - [ ] 148.4 Create League Tier TanStack Query hooks
    - `useLeagueLeaderboard(courseId, tier)`: fetches within-tier ranking by weekly XP
    - `useStudentLeagueTier(studentId)`: fetches current tier
    - `useStudentPercentileBand(studentId, courseId)`: fetches percentile position
    - Add query keys to `/src/lib/queryKeys.ts`
    - _Requirements: 131.1, 132.1, 132.2_

  - [ ] 148.5 Update LeaderboardPage with Percentile Bands in Top XP mode
    - Show exact rank for top 10, percentile band for others
    - Student's own position card always visible at top
    - _Requirements: 131.1, 131.2, 131.4_

  - [ ] 148.6 Update LeaderboardPage with League tab
    - Within-tier ranking by weekly XP
    - League Tier badge display (Bronze, Silver, Gold, Diamond)
    - _Requirements: 132.2, 132.6_

  - [ ] 148.7 Create LeagueTierBadge component (`/src/components/shared/LeagueTierBadge.tsx`)
    - Color-coded tier badges: Bronze (amber-600), Silver (gray-400), Gold (yellow-400), Diamond (blue-400)
    - _Requirements: 132.3_

  - [ ] 148.8 Create LeaguePromotionCelebration component (`/src/components/shared/LeaguePromotionCelebration.tsx`)
    - Full-screen overlay with tier transition animation
    - +100 XP bonus display
    - _Requirements: 132.4_

  - [ ] 148.9 Update `award-xp` Edge Function for League Promotion bonus
    - Award 100 XP when student crosses a League Tier threshold
    - Ensure idempotent — no duplicate bonuses on re-query
    - _Requirements: 132.4_

  - [ ]* 148.10 Write property tests for Percentile Bands (`/src/__tests__/properties/percentile-band.property.test.ts`)
    - **Property 108: Percentile band assignment correctness**
    - **Validates: Requirements 131.1, 131.2, 131.3**

  - [ ]* 148.11 Write property tests for League Tiers (`/src/__tests__/properties/league-tier.property.test.ts`)
    - **Property 109: League Tier assignment correctness**
    - **Property 110: League Promotion XP bonus idempotence**
    - **Validates: Requirements 132.1, 132.4, 132.5**

- [ ] 149. Checkpoint — Leaderboard Enhancements
  - Ensure all tests pass, ask the user if questions arise.


- [ ] 150. Badge Tiers — Progressive Badge System Database and Core Logic
  - [ ] 150.1 Apply Badge Tier database migration via Supabase MCP `apply_migration`
    - Add columns to `badges`: `tier` (text, CHECK IN ('bronze','silver','gold'), nullable), `category` (text)
    - Add columns to `student_badges`: `is_pinned` (boolean, default false), `archived_at` (timestamptz, nullable)
    - Create `badge_spotlight_schedule` table with `id`, `institution_id`, `week_start` (date, always Monday), `category`, `is_manual` (boolean), UNIQUE(institution_id, week_start)
    - Enable RLS on `badge_spotlight_schedule` with admin-manages and all-roles-read policies
    - Regenerate TypeScript types
    - _Requirements: 133.4, 134.1, 135.5_

  - [ ] 150.2 Create Badge Tier Zod schemas (`/src/lib/schemas/badgeTier.ts`)
    - `badgeTierSchema`: validates tier ('bronze', 'silver', 'gold'), category
    - `tieredBadgeSchema`: validates category, current_tier, progress, is_pinned, archived_at
    - `badgePinSchema`: validates student_badge_id, is_pinned
    - _Requirements: 133.1, 135.4_

  - [ ] 150.3 Create Badge Spotlight Zod schema (`/src/lib/schemas/badgeSpotlight.ts`)
    - `badgeSpotlightScheduleSchema`: validates week_start (must be Monday), category, is_manual
    - _Requirements: 134.2_

  - [ ] 150.4 Update `check-badges` Edge Function for tiered badge progression
    - Check if student meets next tier threshold for each badge category
    - Award bronze → upgrade to silver → upgrade to gold
    - Store only highest tier per category per student
    - _Requirements: 133.2, 133.3, 133.5_

  - [ ] 150.5 Update `award-xp` Edge Function for Badge Spotlight 2x bonus
    - Check if earned/upgraded badge category matches current spotlight
    - Apply 2x multiplier to badge XP award during spotlight week
    - _Requirements: 134.1, 134.5_

  - [ ] 150.6 Create `badge-spotlight-rotate-cron` pg_cron job
    - Runs at midnight UTC every Monday
    - If no manual selection for current week, auto-rotate alphabetically through categories
    - _Requirements: 134.3, 134.6_

  - [ ] 150.7 Create `badge-archive-cron` pg_cron job
    - Runs daily
    - Archive badges not upgraded in 90 days (set `archived_at`)
    - Skip pinned badges
    - _Requirements: 135.3_

  - [ ]* 150.8 Write property tests for Badge Tiers (`/src/__tests__/properties/badge-tier.property.test.ts`)
    - **Property 111: Badge tier progression monotonicity**
    - **Validates: Requirements 133.3, 133.5**

  - [ ]* 150.9 Write property test for Badge Spotlight bonus (`/src/__tests__/properties/badge-spotlight.property.test.ts`)
    - **Property 112: Badge Spotlight XP bonus application**
    - **Validates: Requirements 134.1, 134.5**

  - [ ]* 150.10 Write property tests for Badge Archive (`/src/__tests__/properties/badge-archive.property.test.ts`)
    - **Property 113: Badge archive threshold**
    - **Property 114: Badge pin limit enforcement**
    - **Property 115: Active badge collection size limit**
    - **Validates: Requirements 135.1, 135.2, 135.3, 135.4**


- [ ] 151. Badge Tiers — UI Components
  - [ ] 151.1 Update BadgeCollection component (`/src/components/shared/BadgeCollection.tsx`)
    - Active section: max 12 badges, most recently earned/upgraded first
    - Pinned badges (up to 3) always in Active section
    - Archived section: "View All Badges" expandable
    - Tier display: color-coded border (Bronze: amber-600, Silver: gray-400, Gold: yellow-400)
    - Progress bar toward next tier within each badge card
    - _Requirements: 133.6, 135.1, 135.2, 135.4_

  - [ ] 151.2 Create BadgeSpotlightCard component (`/src/components/shared/BadgeSpotlightCard.tsx`)
    - Featured badge category with sparkle icon
    - Progress toward next tier
    - "2x XP Bonus this week" label with countdown
    - _Requirements: 134.4_

  - [ ] 151.3 Create BadgeSpotlightManager page (`/src/pages/admin/badges/BadgeSpotlightManager.tsx`)
    - Calendar view of upcoming spotlight schedule
    - Manual selection or auto-rotate
    - Preview of each badge category with tier thresholds
    - _Requirements: 134.2_

  - [ ] 151.4 Create Badge Tier TanStack Query hooks (`/src/hooks/useTieredBadges.ts`)
    - `useTieredBadges(studentId)`: fetches badges with tier info, pinned status, archive status
    - `usePinBadge()`, `useUnpinBadge()`: mutations for badge pinning
    - `useBadgeSpotlight(institutionId)`: fetches current spotlight
    - `useBadgeSpotlightSchedule(institutionId)`: fetches schedule for admin
    - `useUpdateBadgeSpotlightSchedule()`: mutation for admin schedule changes
    - Add query keys to `/src/lib/queryKeys.ts`
    - _Requirements: 133.6, 134.2, 135.4_

  - [ ] 151.5 Wire BadgeSpotlightCard into Student Dashboard
    - _Requirements: 134.4_

  - [ ] 151.6 Add Badge Spotlight Manager route and navigation
    - Add route `/admin/badges/spotlight` to AppRouter
    - Add navigation link in Admin sidebar
    - _Requirements: 134.2_

- [ ] 152. Checkpoint — Badge Tiers and Spotlight
  - Ensure all tests pass, ask the user if questions arise.


- [ ] 153. Integration — Wire Engagement Safeguards into Existing Dashboards
  - [ ] 153.1 Update Student Dashboard with all Section W components
    - Comeback Challenge banner (when active)
    - Updated StreakDisplay with range format and Total Active Days
    - Habit Difficulty Level indicator
    - Badge Spotlight card
    - League Tier badge on gamification card
    - _Requirements: 124.5, 126.1, 126.2, 127.6, 132.3, 134.4_

  - [ ] 153.2 Update Leaderboard page tab navigation
    - Add tabs: Top XP, Personal Best, Most Improved, League
    - Wire percentile bands into Top XP mode
    - Default to Personal Best for opt-out students
    - _Requirements: 129.4, 131.4_

  - [ ] 153.3 Update Admin Institution Settings page
    - Add Streak Sabbatical toggle
    - Add League Tier threshold configuration
    - _Requirements: 125.3, 132.5_

  - [ ] 153.4 Update seed script with Section W data
    - Add badge categories with tier thresholds
    - Add badge spotlight schedule entries
    - Add league tier default thresholds to institution settings
    - _Requirements: All Section W_

- [ ] 154. Write tests for Engagement Safeguards features
  - [ ]* 154.1 Write unit tests for Streak Recovery
    - Comeback Challenge activation, day completion, streak restoration, cancellation
    - Streak Sabbatical weekend exclusion
    - Total Active Days increment
    - _Requirements: 124, 125, 126_

  - [ ]* 154.2 Write unit tests for Habit Difficulty Levels
    - Level promotion after 7 days, streak reset without demotion, Perfect Day thresholds per level
    - _Requirements: 127, 128_

  - [ ]* 154.3 Write unit tests for Leaderboard Enhancements
    - Personal Best weekly XP calculation, Most Improved percentage, Percentile Band assignment, League Tier determination
    - _Requirements: 129, 130, 131, 132_

  - [ ]* 154.4 Write unit tests for Badge Tiers
    - Tier progression, spotlight bonus, archive logic, pin limit
    - _Requirements: 133, 134, 135_

- [ ] 155. Final Checkpoint — Section W Complete
  - Ensure all tests pass, ask the user if questions arise.
  - Verify all 12 requirements (124–135) are covered by implementation tasks
  - Verify all 15 correctness properties (101–115) have corresponding property test tasks

## Notes (Tasks 109–155)

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document (Properties 81–115)
- All database migrations use Supabase MCP `apply_migration` for DDL changes
- TypeScript types regenerated after every migration: `npx supabase gen types --linked > src/types/database.ts`
- All UI components use Shadcn/ui as base, Tailwind CSS v4 for styling, Lucide React for icons
- All forms use React Hook Form + Zod for validation
- All data fetching through TanStack Query hooks, never raw supabase calls in components
- URL-persisted filter state uses nuqs in list/filter pages
- Streak Sabbatical (Requirement 125) is stored in `institution_settings` jsonb — no new table needed
- League Tier thresholds (Requirement 132) are stored in `institution_settings` jsonb — tier is derived at query time from cumulative XP
- Habit Difficulty Level (Requirement 127) does not demote students — only `habit_level_streak` resets on missed days
- Badge Spotlight auto-rotation (Requirement 134) uses pg_cron weekly job — falls back to alphabetical order when no manual selection
- Badge archive (Requirement 135) uses pg_cron daily job — pinned badges are never auto-archived
- Comeback Challenge (Requirement 124) restores 50% of lost streak (rounded down) — challenge is cancelled on any missed day
- Personal Best leaderboard (Requirement 129) is the default view for students who opted out of public leaderboard
- Most Improved leaderboard (Requirement 130) excludes students with zero previous-period XP to avoid division-by-zero
- Percentile Bands (Requirement 131) only apply to ranks > 10 — top 10 always see exact rank