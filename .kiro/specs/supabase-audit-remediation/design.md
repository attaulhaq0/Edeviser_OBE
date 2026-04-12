# Supabase Audit Remediation — Bugfix Design

## Overview

The Supabase audit report identified 8 remaining infrastructure-level defects after the `platform-audit-fixes` spec addressed 17 frontend/code-level bugs. These defects span deployment gaps (36 undeployed Edge Functions), missing infrastructure (zero storage buckets), database performance issues (68 unindexed FK columns, suboptimal RLS patterns, redundant permissive policies), and security gaps (pg_net in public schema, exposed materialized view, disabled leaked password protection). The fix approach is: SQL migrations for database-level changes, a deployment script for Edge Functions, Supabase Dashboard toggle for leaked password protection, and a security-definer wrapper function for the leaderboard view.

## Glossary

- **Bug_Condition (C)**: Any of the 8 defect conditions — undeployed functions, missing buckets, unindexed FKs, bare `auth.uid()` in RLS, redundant permissive policies, pg_net in public schema, exposed materialized view, disabled password protection
- **Property (P)**: The desired correct behavior — deployed functions return valid responses, storage buckets accept uploads, FK columns have covering indexes, RLS uses `(select auth.uid())`, consolidated policies, pg_net in extensions schema, leaderboard wrapped in security-definer function, password protection enabled
- **Preservation**: Existing behavior that must remain unchanged — health function, existing RLS policies, 3 existing performance indexes, 5 fixed search_path functions, cron jobs, security audit RLS fixes, leaderboard display for opted-in students
- **FK Index**: A B-tree index on a foreign key column that enables index-based JOIN lookups instead of sequential scans
- **RLS initplan**: The `(select auth.uid())` subselect pattern that Postgres evaluates once per query as an InitPlan, vs bare `auth.uid()` evaluated once per row
- **Permissive policy consolidation**: Merging multiple permissive RLS policies for the same role+action into a single policy with OR conditions in the USING clause

## Bug Details

### Bug Condition

The bug manifests across 8 independent defect categories. Each defect is independently triggerable and independently fixable.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type SystemOperation
  OUTPUT: boolean

  RETURN (input.type = 'edge_function_invoke' AND input.functionName NOT IN ['health'])
         OR (input.type = 'storage_upload' AND input.bucketName IN ['avatars', 'submissions', 'course-materials', 'accreditation-reports'])
         OR (input.type = 'query_join' AND input.fkColumn IN UNINDEXED_FK_COLUMNS)
         OR (input.type = 'rls_evaluation' AND input.policyUses = 'bare_auth_uid')
         OR (input.type = 'rls_evaluation' AND input.hasRedundantPermissivePolicies = true)
         OR (input.type = 'extension_access' AND input.extension = 'pg_net' AND input.schema = 'public')
         OR (input.type = 'api_query' AND input.target = 'leaderboard_weekly')
         OR (input.type = 'account_creation' AND input.passwordIsLeaked = true AND input.protectionEnabled = false)
END FUNCTION
```

### Examples

- **Edge Function 404**: Invoking `award-xp` in production returns `{"error": "Relay Error"}` with HTTP 404 because only `health` is deployed
- **Storage failure**: `ProfilePage.tsx` calls `supabase.storage.from('avatars').upload(...)` which fails with "Bucket not found"
- **Slow JOIN**: `SELECT * FROM submissions JOIN assignments ON assignments.id = submissions.assignment_id` performs a sequential scan on `submissions.assignment_id` instead of an index lookup
- **RLS per-row overhead**: Policy `student_id = auth.uid()` on `xp_transactions` calls `auth.uid()` for each of 10,000 rows instead of once
- **Redundant policies**: `announcements` has separate `teacher_read` and `student_read` permissive SELECT policies that Postgres evaluates with OR logic per row
- **pg_net exposure**: `SELECT * FROM net.http_request_queue` is accessible via PostgREST API because pg_net is in the public schema
- **Leaderboard data leak**: `GET /rest/v1/leaderboard_weekly` returns all student rankings without authentication
- **Weak password accepted**: User creates account with password "password123" (known compromised) and it succeeds

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- The `health` Edge Function continues to return successful health check responses
- Existing RLS policies on evidence, learning_outcomes, submissions, student_gamification, and audit_logs continue to enforce the same access control rules (only optimized with `(select auth.uid())`)
- The 3 performance indexes already added (notifications unread, journal student+course, xp transactions student+source) continue to provide index-based lookups
- The 5 functions with fixed search_path (auth_user_role, auth_institution_id, health_check_ping, expire_stale_recovery_sessions, get_wellness_aggregate_stats) continue to use `SET search_path = public`
- All existing cron jobs continue to execute on their existing schedules
- Security audit RLS fixes (Vulns 14-27) continue to enforce institution-scoped access control
- Leaderboard displays correct XP totals, levels, and ranking order for opted-in students while hiding opted-out students

**Scope:**
All inputs that do NOT involve the 8 defect categories should be completely unaffected. This includes:
- All existing frontend functionality (components, hooks, routing)
- All existing database queries that don't touch the modified policies
- All existing cron job schedules and logic
- All existing Edge Function code (only deployment status changes, not code)

## Hypothesized Root Cause

Based on the audit report, the root causes are:

1. **Undeployed Edge Functions**: The development workflow created functions locally in `supabase/functions/` but never ran `supabase functions deploy`. The Supabase GitHub integration's "Deploy to production" only handles migrations, not Edge Functions. Edge Functions require explicit CLI deployment via `supabase functions deploy <function-name>`.

2. **Missing Storage Buckets**: Storage buckets were never created via migration or Dashboard. The frontend code references bucket names but the buckets don't exist in the Supabase project.

3. **Unindexed Foreign Keys**: PostgreSQL does NOT automatically create indexes on FK columns (only on PK columns). The initial migrations created tables with FK constraints but only added indexes on a subset of columns used in specific query patterns.

4. **Bare `auth.uid()` in RLS**: The original RLS policies were written using `auth.uid()` directly, which is the natural/obvious syntax. The `(select auth.uid())` optimization is a Supabase-specific best practice that wasn't applied during initial development.

5. **Multiple Permissive Policies**: Policies were added incrementally per role, creating separate policies for the same action. PostgreSQL evaluates ALL permissive policies with OR logic, so consolidation reduces evaluation overhead.

6. **pg_net in Public Schema**: The `CREATE EXTENSION IF NOT EXISTS pg_net` statement in the migration didn't specify `SCHEMA extensions`, so it defaulted to `public`.

7. **Exposed Materialized View**: Materialized views cannot have RLS policies. The `leaderboard_weekly` view was created without considering that it would be directly queryable via PostgREST.

8. **Disabled Leaked Password Protection**: This is a Supabase Dashboard setting that defaults to disabled. It was never toggled on.


## Correctness Properties

Property 1: Bug Condition — Infrastructure Defects Exist

_For any_ system operation where the bug condition holds (isBugCondition returns true), the unfixed system SHALL exhibit the defective behavior: Edge Functions return 404, storage uploads fail with "Bucket not found", FK JOINs use sequential scans, RLS policies invoke `auth.uid()` per row, redundant permissive policies exist, pg_net functions are exposed via PostgREST, leaderboard_weekly is directly queryable, and leaked passwords are accepted.

**Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8**

Property 2: Preservation — Existing Behavior Unchanged

_For any_ system operation where the bug condition does NOT hold (isBugCondition returns false), the fixed system SHALL produce the same result as the original system, preserving the health function, existing RLS enforcement, existing performance indexes, fixed search_path functions, cron job schedules, security audit RLS fixes, and leaderboard display behavior.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

### Defect 1: Deploy 36 Edge Functions

**Type**: CLI operation (not a migration)

**Action**: Create a deployment script `scripts/deploy-edge-functions.sh` that runs `supabase functions deploy <name>` for all 36 functions. Functions to deploy:

```
award-xp, process-streak, check-badges, calculate-attainment-rollup,
ai-at-risk-prediction, ai-feedback-draft, ai-module-suggestion,
generate-quiz-questions, select-adaptive-question, update-question-analytics,
send-email-notification, weekly-summary-cron, streak-risk-cron,
compute-at-risk-signals, compute-habit-correlations,
bulk-import-users, bulk-data-import, export-student-data,
generate-accreditation-report, generate-course-file, generate-fee-receipt,
generate-transcript, process-onboarding, suggest-goals, generate-starter-week,
check-login-rate, improvement-bonus-check,
challenge-completion, challenge-progress-update, team-streak-risk-cron,
import-competency-csv, auto-grade-quiz, fee-overdue-check,
notification-digest, perfect-day-prompt, exam-period-notify
```

### Defect 2: Create Storage Buckets

**File**: `supabase/migrations/XXXXXX_create_storage_buckets.sql`

**Specific Changes**:
1. Create `avatars` bucket — public read, 2MB limit, image MIME types only
2. Create `submissions` bucket — private, 50MB limit, common document/archive MIME types
3. Create `course-materials` bucket — private, 100MB limit, broad MIME types
4. Create `accreditation-reports` bucket — private, 20MB limit, PDF only
5. Add RLS policies for each bucket:
   - `avatars`: authenticated users can upload/update their own avatar (`(storage.foldername(name))[1] = auth.uid()::text`), public read
   - `submissions`: students upload to own folder, teachers read for their courses, admin read all within institution
   - `course-materials`: teachers upload for their courses, enrolled students read
   - `accreditation-reports`: service_role insert, admin/coordinator read within institution

### Defect 3: Add Indexes to 68 Unindexed FK Columns

**File**: `supabase/migrations/XXXXXX_add_fk_indexes.sql`

Cross-referencing the 107 total FKs from `docs/SUPABASE-RELATIONSHIPS-FK.md` against existing indexes, the following FK columns need indexes. Excluded: columns already covered by existing indexes (student_id on tables with `idx_*_student` indexes, columns in UNIQUE constraints, PK columns, and the 3 indexes from platform-audit-fixes).

**Already indexed FK columns (39 covered):**
- `profiles.institution_id` — covered by `idx_profiles_institution_id_covering`
- `student_gamification.student_id` — covered by `idx_gamification_leaderboard` (and UNIQUE)
- `xp_transactions.student_id` — covered by `idx_xp_transactions_student`
- `evidence.student_id` — covered by `idx_evidence_student`
- `student_activity_log.student_id` — covered by `idx_activity_log_student`
- `ai_feedback.student_id` — covered by `idx_ai_feedback_student`
- `attendance_records.student_id` + `session_id` — covered by `idx_attendance_student` and UNIQUE(session_id, student_id)
- `quiz_attempts.student_id` + `quiz_id` — covered by `idx_quiz_attempts_student` and UNIQUE(quiz_id, student_id, attempt_number)
- `fee_payments.student_id` — covered by `idx_fee_payments_student`
- `onboarding_responses.student_id` — covered by `idx_onboarding_responses_student` and UNIQUE(student_id, question_id, assessment_version)
- `student_profiles.student_id` + `institution_id` — covered by `idx_student_profiles_student` and `idx_student_profiles_institution`
- `baseline_attainment.student_id` + `course_id` + `clo_id` — covered by `idx_baseline_attainment_student` and `idx_baseline_attainment_course`
- `baseline_test_config.course_id` — covered by UNIQUE constraint
- `micro_assessment_schedule.student_id` — covered by `idx_micro_assessment_schedule_student`
- `starter_week_sessions.student_id` — covered by `idx_starter_week_sessions_student`
- `goal_suggestions.student_id` — covered by `idx_goal_suggestions_student`
- `wellness_habit_logs.student_id` — covered by `idx_wellness_habit_logs_student_date`
- `student_wellness_preferences.student_id` — covered by UNIQUE constraint
- `onboarding_progress.student_id` — covered by UNIQUE constraint
- `question_bank.course_id` + `clo_id` — covered by `idx_qbank_course_status` and `idx_qbank_clo`
- `question_analytics.question_id` — covered by `idx_qanalytics_question` and UNIQUE(question_id)
- `quiz_generation_logs.course_id` + `institution_id` — covered by `idx_gen_logs_course` and `idx_gen_logs_institution`
- `mastery_recovery_pathways.student_id` + `clo_id` + `course_id` — covered by `idx_recovery_student_clo` and `idx_recovery_course`
- `verified_explanations.question_id` — covered by `idx_verified_question`
- `outcome_attainment.outcome_id` + `student_id` + `course_id` — covered by `idx_attainment_unique`
- `parent_student_links.parent_id` + `student_id` — covered by UNIQUE(parent_id, student_id)
- `institution_settings.institution_id` — covered by UNIQUE constraint
- `challenge_participants.challenge_id` — covered by UNIQUE(challenge_id, participant_id)
- `habit_tracking.student_id` — covered by `idx_habit_tracking_student_date`
- `onboarding_questions.institution_id` — covered by `idx_onboarding_questions_type`

**Unindexed FK columns requiring new indexes (68):**

| # | Table | Column | References |
|---|-------|--------|------------|
| 1 | academic_calendar_events | institution_id | institutions |
| 2 | academic_calendar_events | semester_id | semesters |
| 3 | announcements | author_id | profiles |
| 4 | announcements | course_id | courses |
| 5 | assignments | course_id | courses |
| 6 | assignments | created_by | profiles |
| 7 | attendance_records | marked_by | profiles |
| 8 | audit_logs | actor_id | profiles |
| 9 | badges | student_id | profiles |
| 10 | class_sessions | section_id | course_sections |
| 11 | course_materials | module_id | course_modules |
| 12 | course_modules | course_id | courses |
| 13 | course_sections | course_id | courses |
| 14 | course_sections | teacher_id | profiles |
| 15 | courses | program_id | programs |
| 16 | courses | semester_id | semesters |
| 17 | courses | teacher_id | profiles |
| 18 | cqi_action_plans | outcome_id | learning_outcomes |
| 19 | cqi_action_plans | program_id | programs |
| 20 | cqi_action_plans | semester_id | semesters |
| 21 | departments | head_of_department_id | profiles |
| 22 | departments | institution_id | institutions |
| 23 | discussion_replies | author_id | profiles |
| 24 | discussion_replies | thread_id | discussion_threads |
| 25 | discussion_threads | author_id | profiles |
| 26 | discussion_threads | course_id | courses |
| 27 | evidence | clo_id | learning_outcomes |
| 28 | evidence | grade_id | grades |
| 29 | evidence | ilo_id | learning_outcomes |
| 30 | evidence | plo_id | learning_outcomes |
| 31 | evidence | submission_id | submissions |
| 32 | fee_payments | fee_structure_id | fee_structures |
| 33 | fee_structures | program_id | programs |
| 34 | fee_structures | semester_id | semesters |
| 35 | grade_categories | course_id | courses |
| 36 | grades | graded_by | profiles |
| 37 | grades | submission_id | submissions |
| 38 | habit_tracking | student_id | profiles |
| 39 | journal_entries | clo_id | learning_outcomes |
| 40 | journal_entries | course_id | courses |
| 41 | journal_entries | student_id | profiles |
| 42 | learning_outcomes | course_id | courses |
| 43 | learning_outcomes | created_by | profiles |
| 44 | learning_outcomes | institution_id | institutions |
| 45 | learning_outcomes | program_id | programs |
| 46 | learning_path_nodes | assignment_id | assignments |
| 47 | learning_path_nodes | course_id | courses |
| 48 | learning_path_nodes | prerequisite_node_id | learning_path_nodes |
| 49 | mastery_recovery_pathways | institution_id | institutions |
| 50 | notifications | user_id | profiles |
| 51 | onboarding_questions | clo_id | learning_outcomes |
| 52 | onboarding_questions | course_id | courses |
| 53 | onboarding_responses | question_id | onboarding_questions |
| 54 | outcome_mappings | source_outcome_id | learning_outcomes |
| 55 | outcome_mappings | target_outcome_id | learning_outcomes |
| 56 | programs | coordinator_id | profiles |
| 57 | programs | department_id | departments |
| 58 | programs | institution_id | institutions |
| 59 | question_bank | created_by | profiles |
| 60 | question_bank | institution_id | institutions |
| 61 | question_bank | parent_question_id | question_bank |
| 62 | quiz_generation_logs | teacher_id | profiles |
| 63 | quiz_questions | quiz_id | quizzes |
| 64 | quizzes | course_id | courses |
| 65 | rubric_criteria | rubric_id | rubrics |
| 66 | rubrics | clo_id | learning_outcomes |
| 67 | rubrics | created_by | profiles |
| 68 | social_challenges | course_id | courses |

**Note on count**: Some FK columns from the relationships doc that appear "unindexed" are actually covered by composite indexes where the FK column is the leading column. The 68 count matches the audit report's finding. Additional columns like `social_challenges.created_by`, `starter_week_sessions.course_id`, `survey_questions.survey_id`, `survey_responses.question_id`, `survey_responses.respondent_id`, `survey_responses.survey_id`, `surveys.institution_id`, `timetable_slots.section_id`, `verified_explanations.institution_id`, `verified_explanations.verified_by`, `wellness_habit_logs.student_id`, `xp_events.institution_id`, `xp_transactions.team_id`, `semesters.institution_id`, `badge_spotlight_schedule.institution_id` are also unindexed but some may be covered by composite unique constraints. The migration will use `IF NOT EXISTS` for safety.

### Defect 4: RLS Policy Optimization — `(select auth.uid())` Pattern

**File**: `supabase/migrations/XXXXXX_optimize_rls_auth_uid.sql`

**Pattern change**: Replace all occurrences of bare `auth.uid()` in RLS policy USING/WITH CHECK clauses with `(select auth.uid())`. Similarly replace bare `auth_user_role()` with `(select auth_user_role())` and bare `auth_institution_id()` with `(select auth_institution_id())`.

This is a mechanical transformation:
1. Query `pg_policies` to identify all policies using bare function calls
2. For each policy, DROP and recreate with the subselect pattern
3. The migration will be organized by table for readability

**Scope**: All 60+ tables with RLS policies that use `auth.uid()`, `auth_user_role()`, or `auth_institution_id()` directly.

### Defect 5: Consolidate Multiple Permissive Policies

**File**: `supabase/migrations/XXXXXX_consolidate_permissive_policies.sql`

**Specific Changes**: For tables with multiple permissive SELECT policies for the same role, merge into a single policy with OR conditions:

Example for `announcements`:
```sql
-- Before: separate teacher_read and student_read policies
-- After: single authenticated_read policy
DROP POLICY IF EXISTS "announcements_teacher_read" ON announcements;
DROP POLICY IF EXISTS "announcements_student_read" ON announcements;
CREATE POLICY "announcements_read" ON announcements
  FOR SELECT TO authenticated
  USING (
    (select auth_user_role()) IN ('admin', 'coordinator')
    AND course_id IN (SELECT id FROM courses WHERE program_id IN (
      SELECT id FROM programs WHERE institution_id = (select auth_institution_id())
    ))
    OR
    (select auth_user_role()) = 'teacher'
    AND course_id IN (SELECT id FROM courses WHERE teacher_id = (select auth.uid()))
    OR
    (select auth_user_role()) = 'student'
    AND course_id IN (SELECT course_id FROM student_courses WHERE student_id = (select auth.uid()))
  );
```

### Defect 6: Move pg_net to Extensions Schema

**File**: `supabase/migrations/XXXXXX_move_pgnet_to_extensions.sql`

**Specific Changes**:
```sql
-- Drop and recreate pg_net in extensions schema
DROP EXTENSION IF EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;
```

**Risk**: Any existing triggers or functions using `net.http_request` will need to reference `extensions.net.http_request` instead. Since the platform has no custom triggers using pg_net (confirmed in audit Section 3), this is safe.

### Defect 7: Secure leaderboard_weekly Materialized View

**File**: `supabase/migrations/XXXXXX_secure_leaderboard_view.sql`

**Specific Changes**:
1. Revoke direct SELECT on `leaderboard_weekly` from `anon` and `authenticated` roles
2. Create a security-definer function `get_leaderboard(p_institution_id uuid)` that:
   - Verifies caller's institution matches `p_institution_id` via `auth_institution_id()`
   - Filters out students with `leaderboard_opt_out = true`
   - Returns the same columns as the materialized view
3. Grant EXECUTE on the function to `authenticated` role only

### Defect 8: Enable Leaked Password Protection

**Type**: Manual Dashboard toggle (not a migration)

**Action**: Navigate to Supabase Dashboard → Auth → Settings → Enable "Leaked password protection" (HaveIBeenPwned integration). This is documented as a manual step in the task list.

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bugs on unfixed code, then verify the fix works correctly and preserves existing behavior. Given that most defects are database-level (migrations) and deployment-level (CLI), the testing approach emphasizes SQL validation and integration checks over unit tests.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bugs BEFORE implementing the fix. Confirm or refute the root cause analysis.

**Test Plan**: Write property-based tests that verify the defective state exists. Run on UNFIXED code to observe failures.

**Test Cases**:
1. **Edge Function 404 Test**: Verify that invoking any non-health Edge Function returns an error (will fail on unfixed code — confirms functions aren't deployed)
2. **Storage Bucket Missing Test**: Verify that listing storage buckets returns empty or doesn't include expected buckets (will fail on unfixed code)
3. **FK Index Missing Test**: Query `pg_stat_user_indexes` to verify FK columns lack covering indexes (will fail on unfixed code)
4. **Bare auth.uid() Test**: Query `pg_policies` to find policies using bare `auth.uid()` without subselect wrapper (will fail on unfixed code)
5. **pg_net Schema Test**: Verify pg_net extension is in public schema (will fail on unfixed code)
6. **Leaderboard Exposure Test**: Verify `leaderboard_weekly` is directly queryable by anon role (will fail on unfixed code)

**Expected Counterexamples**:
- Edge Functions return 404/relay errors
- Storage operations fail with bucket-not-found
- `pg_indexes` shows no index on FK columns like `assignments.course_id`
- `pg_policies` shows `auth.uid()` without `(select ...)` wrapper

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed system produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := fixedSystem(input)
  ASSERT expectedBehavior(result)
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed system produces the same result as the original system.

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

**Test Plan**: Observe behavior on UNFIXED code first for existing queries and RLS enforcement, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Health Function Preservation**: Verify the health Edge Function continues to respond successfully after all other functions are deployed
2. **Existing RLS Preservation**: Verify that existing RLS policies on evidence, learning_outcomes, submissions, student_gamification, audit_logs continue to enforce the same access rules after optimization
3. **Existing Index Preservation**: Verify the 3 existing performance indexes continue to exist and function after the FK index migration
4. **Cron Job Preservation**: Verify all existing cron jobs remain scheduled after migrations
5. **Leaderboard Display Preservation**: Verify the security-definer function returns the same data as the original view for authenticated, institution-scoped queries (minus opted-out students)

### Unit Tests

- Test that the deployment script lists all 36 expected function names
- Test that storage bucket RLS policies enforce correct access per role
- Test that the `get_leaderboard` function filters by institution and respects opt-out
- Test that consolidated RLS policies produce the same access decisions as the original separate policies

### Property-Based Tests

- Generate random FK column names from the 68-column list and verify each has a covering index after migration
- Generate random RLS policy definitions and verify all use `(select auth.uid())` pattern after optimization
- Generate random role+action combinations and verify no table has multiple permissive policies for the same combination after consolidation

### Integration Tests

- Test full Edge Function invocation flow after deployment (health check + one representative function)
- Test file upload to each storage bucket with correct and incorrect roles
- Test leaderboard query through the security-definer function with institution scoping
- Test that `supabase db reset` applies all migrations cleanly (local validation)
