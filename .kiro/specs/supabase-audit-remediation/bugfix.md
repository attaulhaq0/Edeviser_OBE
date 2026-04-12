# Bugfix Requirements Document

## Introduction

The Supabase audit report (Sections 13-14) identified critical infrastructure-level defects that were NOT addressed by the previous `platform-audit-fixes` spec. That spec fixed 17 frontend/code-level bugs (type safety, query keys, column mismatches, XP constants, audit logging, ErrorBoundary, Sentry, realtime manager, shimmer loading, award-xp permissions, PostgREST sanitization, server-side rate limiting). The remaining issues are database-level and deployment-level: 36 undeployed Edge Functions, zero storage buckets, 68 unindexed foreign keys, suboptimal RLS policy patterns across 60+ tables, multiple permissive policy consolidation, pg_net in the wrong schema, an exposed materialized view, and disabled leaked password protection. These collectively mean the platform has no working backend logic in production, no file upload capability, degraded query performance at scale, and security gaps.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN any of the 36 Edge Functions (award-xp, process-streak, check-badges, calculate-attainment-rollup, ai-at-risk-prediction, ai-feedback-draft, ai-module-suggestion, generate-quiz-questions, select-adaptive-question, update-question-analytics, send-email-notification, weekly-summary-cron, streak-risk-cron, notification-digest, perfect-day-prompt, exam-period-notify, bulk-import-users, bulk-data-import, export-student-data, generate-accreditation-report, generate-course-file, generate-fee-receipt, generate-transcript, process-onboarding, suggest-goals, generate-starter-week, check-login-rate, improvement-bonus-check, challenge-completion, challenge-progress-update, team-streak-risk-cron, import-competency-csv, auto-grade-quiz, compute-habit-correlations, fee-overdue-check, compute-at-risk-signals) are invoked in production THEN the system returns a 404/relay error because only the `health` function is deployed

1.2 WHEN a user attempts to upload an avatar, submit an assignment file, upload course materials, or generate an accreditation report PDF THEN the system fails because no Supabase Storage buckets exist (avatars, submissions, course-materials, accreditation-reports)

1.3 WHEN queries JOIN on any of the 68 unindexed foreign key columns (across courses, learning_outcomes, evidence, assignments, submissions, discussion_replies, fee_payments, outcome_attainment, rubrics, quiz_questions, and 40+ other tables) THEN the database performs sequential scans instead of index lookups, degrading performance linearly with data growth

1.4 WHEN RLS policies evaluate on tables using `auth.uid()` directly (60+ tables including profiles, assignments, grades, submissions, badges, xp_transactions, journal_entries, notifications, quiz_attempts) THEN the `auth.uid()` function is called once per row instead of once per query, causing O(n) function invocations per query

1.5 WHEN multiple permissive RLS policies exist for the same role+action on tables (announcements, courses, assignments, grades, attendance_records, outcome_mappings, and others) THEN Postgres evaluates ALL permissive policies with OR logic per row, performing redundant checks that degrade query performance

1.6 WHEN the `pg_net` extension is used THEN it operates from the `public` schema instead of the `extensions` schema, exposing its internal functions to the PostgREST API and creating an unnecessary attack surface

1.7 WHEN an unauthenticated or authenticated user queries the `leaderboard_weekly` materialized view THEN the view is directly accessible via the PostgREST API without any RLS protection (materialized views cannot have RLS), potentially exposing student ranking data to anonymous users

1.8 WHEN a user creates an account with a password that has been exposed in known data breaches THEN the system accepts it because Supabase Auth's HaveIBeenPwned leaked password protection is disabled

### Expected Behavior (Correct)

2.1 WHEN any Edge Function is invoked in production THEN the system SHALL route the request to the deployed function and return a valid response, because all 36 Edge Functions have been deployed via `supabase functions deploy <function-name>`

2.2 WHEN a user uploads an avatar THEN the system SHALL store it in a public-read `avatars` bucket with a 2MB file size limit; WHEN a student submits an assignment file THEN the system SHALL store it in a private `submissions` bucket with a 50MB limit; WHEN a teacher uploads course materials THEN the system SHALL store them in a private `course-materials` bucket with a 100MB limit; WHEN an accreditation report is generated THEN the system SHALL store it in a private `accreditation-reports` bucket with a 20MB limit

2.3 WHEN queries JOIN on foreign key columns THEN the database SHALL use covering indexes on all 68 FK columns (minus the 3 already indexed: notifications unread, journal student+course, xp transactions student+source) for efficient index-based lookups

2.4 WHEN RLS policies evaluate on any table THEN the system SHALL use the `(select auth.uid())` subselect pattern instead of bare `auth.uid()` so the function is evaluated once per query, not once per row

2.5 WHEN multiple permissive RLS policies exist for the same role+action on a table THEN the system SHALL consolidate them into a single policy per role+action combination using OR conditions within the USING clause

2.6 WHEN the `pg_net` extension is used THEN it SHALL operate from the `extensions` schema, not the `public` schema, preventing its functions from being exposed via the PostgREST API

2.7 WHEN the leaderboard data is accessed THEN the system SHALL wrap the `leaderboard_weekly` materialized view in a security-definer function that checks `auth_institution_id()` and respects anonymous opt-out, revoking direct SELECT on the view from anon and authenticated roles

2.8 WHEN a user creates an account with a password known to be compromised THEN the system SHALL reject it because Supabase Auth's HaveIBeenPwned leaked password protection is enabled (manual Dashboard toggle: Auth → Settings → Enable "Leaked password protection")

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the `health` Edge Function is invoked THEN the system SHALL CONTINUE TO return a successful health check response as it is already deployed

3.2 WHEN existing RLS policies on evidence, learning_outcomes, submissions, student_gamification, and audit_logs (added by the previous platform-audit-fixes spec) are evaluated THEN the system SHALL CONTINUE TO enforce the same access control rules, only optimized with the `(select auth.uid())` pattern

3.3 WHEN the 3 performance indexes already added (notifications unread, journal student+course, xp transactions student+source) are used by queries THEN the system SHALL CONTINUE TO provide the same index-based lookup performance

3.4 WHEN the 5 functions with already-fixed search_path (auth_user_role, auth_institution_id, health_check_ping, expire_stale_recovery_sessions, get_wellness_aggregate_stats) are called THEN the system SHALL CONTINUE TO use `SET search_path = public`

3.5 WHEN existing cron jobs (streak reset, weekly summary, at-risk signals, perfect day prompt, AI predictions, leaderboard refresh, fee overdue check, exam period notify, notification digest, streak risk) are scheduled THEN the system SHALL CONTINUE TO execute on their existing schedules

3.6 WHEN the security audit RLS fixes (Vulns 14-27: cross-tenant leakage fixes on student_courses, outcome_mappings, assignments, outcome_attainment, attendance_records, xp_transactions, ai_feedback, student_activity_log, habit_tracking, badges, verified_explanations, quiz_attempts) are evaluated THEN the system SHALL CONTINUE TO enforce institution-scoped access control

3.7 WHEN the leaderboard displays entries for opted-in students THEN the system SHALL CONTINUE TO show correct XP totals, levels, and ranking order while hiding opted-out students
