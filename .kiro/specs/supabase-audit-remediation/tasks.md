# Implementation Plan

> **Living Spec**: This is the dedicated Supabase infrastructure spec. New findings from the automated health audit (hook: `supabase-health-audit`, CI: `scheduled-health.yml`) are appended here as new tasks. Run the hook manually or check CI every 2 days for fresh findings.

- [x] 1. Write bug condition exploration test

  - **Property 1: Bug Condition** — Supabase Audit Infrastructure Defects
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bugs exist
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior — it will validate the fixes when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate each infrastructure defect exists
  - **Scoped PBT Approach**: Each sub-property targets a specific defect category with concrete failing cases
  - Test file: `src/__tests__/properties/supabaseAuditFaults.property.test.ts`
  - Test Edge Function deployment: list all 36 function directories in `supabase/functions/` (excluding `_shared` and `health`), verify a deployment script `scripts/deploy-edge-functions.sh` exists and contains `supabase functions deploy <name>` for each — will FAIL (script doesn't exist)
  - Test storage buckets: verify `supabase/migrations/` contains a migration that creates `avatars`, `submissions`, `course-materials`, `accreditation-reports` buckets via `INSERT INTO storage.buckets` — will FAIL (no such migration)
  - Test FK indexes: read `docs/SUPABASE-RELATIONSHIPS-FK.md` and cross-reference against migration files, verify a migration exists with `CREATE INDEX IF NOT EXISTS` for the 68 unindexed FK columns (e.g., `assignments.course_id`, `badges.student_id`, `courses.teacher_id`) — will FAIL (no FK index migration)
  - Test RLS optimization: scan all migration files for RLS policies, verify policies use `(select auth.uid())` pattern instead of bare `auth.uid()` — will FAIL (existing policies use bare `auth.uid()`)
  - Test pg_net schema: verify a migration exists that moves pg_net from `public` to `extensions` schema via `DROP EXTENSION IF EXISTS pg_net; CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions` — will FAIL (no such migration)
  - Test leaderboard security: verify a migration exists that REVOKEs SELECT on `leaderboard_weekly` from `anon` and `authenticated` and creates a `get_leaderboard` security-definer function — will FAIL (no such migration)
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests FAIL (this is correct — it proves the bugs exist)
  - Document counterexamples found to understand root causes
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

- [x] 2. Write preservation property tests (BEFORE implementing fix)

  - **Property 2: Preservation** — Existing Infrastructure Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Test file: `src/__tests__/properties/supabaseAuditPreservation.property.test.ts`
  - Observe: `health` Edge Function directory exists at `supabase/functions/health/index.ts` — verify it continues to exist and contains a valid serve handler
  - Observe: existing RLS policy migrations from `platform-audit-fixes` (evidence, learning_outcomes, submissions, student_gamification, audit_logs) exist in `supabase/migrations/` — verify these migration files still exist and contain the expected policy names
  - Observe: 3 existing performance indexes (notifications unread, journal student+course, xp transactions student+source) exist in migration files — verify these `CREATE INDEX` statements are present
  - Observe: 5 functions with fixed `search_path` (auth_user_role, auth_institution_id, health_check_ping, expire_stale_recovery_sessions, get_wellness_aggregate_stats) have `SET search_path` in migration files — verify these remain
  - Observe: cron job migrations exist and contain `cron.schedule` calls — verify these migration files are unchanged
  - Observe: security audit RLS fixes (Vulns 14-27) exist in migration files — verify institution-scoped policies remain
  - Verify tests pass on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 3. Fix Supabase audit infrastructure defects

  - [x] 3.1 Create Edge Function deployment script

    - Create `scripts/deploy-edge-functions.sh` with `#!/usr/bin/env bash` and `set -euo pipefail`
    - List all 36 functions: award-xp, process-streak, check-badges, calculate-attainment-rollup, ai-at-risk-prediction, ai-feedback-draft, ai-module-suggestion, generate-quiz-questions, select-adaptive-question, update-question-analytics, send-email-notification, weekly-summary-cron, streak-risk-cron, compute-at-risk-signals, compute-habit-correlations, bulk-import-users, bulk-data-import, export-student-data, generate-accreditation-report, generate-course-file, generate-fee-receipt, generate-transcript, process-onboarding, suggest-goals, generate-starter-week, check-login-rate, improvement-bonus-check, challenge-completion, challenge-progress-update, team-streak-risk-cron, import-competency-csv, auto-grade-quiz, fee-overdue-check, notification-digest, perfect-day-prompt, exam-period-notify
    - Each function deployed via `supabase functions deploy <name> --project-ref cdlgtbvxlxjpcddjazzx`
    - Add progress output (`echo "Deploying <name>..."`) and error handling
    - Make script executable (`chmod +x`)
    - NOTE: This is a CLI operation, NOT a migration — Edge Functions are not deployed via GitHub integration
    - _Bug_Condition: isBugCondition(input) where input.type = 'edge_function_invoke' AND input.functionName NOT IN ['health']_
    - _Expected_Behavior: all 36 Edge Functions deployed and returning valid responses_
    - _Preservation: health function continues to work (Req 3.1)_
    - _Requirements: 1.1, 2.1_

  - [x] 3.2 Create storage buckets migration

    - Create `supabase/migrations/XXXXXX_create_storage_buckets.sql`
    - Create `avatars` bucket: public=true, file_size_limit=2097152 (2MB), allowed_mime_types=['image/jpeg','image/png','image/webp','image/gif']
    - Create `submissions` bucket: public=false, file_size_limit=52428800 (50MB), allowed_mime_types for documents/archives
    - Create `course-materials` bucket: public=false, file_size_limit=104857600 (100MB), broad MIME types
    - Create `accreditation-reports` bucket: public=false, file_size_limit=20971520 (20MB), allowed_mime_types=['application/pdf']
    - Add RLS policies for each bucket on `storage.objects`:
      - avatars: authenticated upload/update own folder, public read
      - submissions: student upload own folder, teacher read for courses, admin read institution
      - course-materials: teacher upload for courses, enrolled students read
      - accreditation-reports: service_role insert, admin/coordinator read institution
    - _Bug_Condition: isBugCondition(input) where input.type = 'storage_upload' AND input.bucketName IN ['avatars','submissions','course-materials','accreditation-reports']_
    - _Expected_Behavior: buckets exist with correct size limits, MIME types, and RLS policies_
    - _Requirements: 1.2, 2.2_

  - [x] 3.3 Create FK indexes migration

    - Create `supabase/migrations/XXXXXX_add_fk_indexes.sql`
    - Add `CREATE INDEX IF NOT EXISTS` for all 68 unindexed FK columns listed in the design document
    - Use naming convention `idx_{table}_{column}` for each index
    - Use `CONCURRENTLY` where possible (note: not supported inside transactions, so use regular CREATE INDEX IF NOT EXISTS)
    - Organize by table alphabetically for readability
    - _Bug_Condition: isBugCondition(input) where input.type = 'query_join' AND input.fkColumn IN UNINDEXED_FK_COLUMNS_
    - _Expected_Behavior: all 68 FK columns have covering B-tree indexes for efficient JOIN lookups_
    - _Preservation: 3 existing performance indexes unchanged (Req 3.3)_
    - _Requirements: 1.3, 2.3_

  - [x] 3.4 Create RLS optimization and policy consolidation migration

    - Create `supabase/migrations/XXXXXX_optimize_rls_policies.sql`
    - DROP and recreate ALL RLS policies across 60+ tables replacing bare `auth.uid()` with `(select auth.uid())`, bare `auth_user_role()` with `(select auth_user_role())`, bare `auth_institution_id()` with `(select auth_institution_id())`
    - Simultaneously consolidate multiple permissive policies for the same role+action into single policies with OR conditions (announcements, courses, assignments, grades, attendance_records, outcome_mappings, and others)
    - Policy consolidation and RLS optimization MUST be in the same migration to avoid intermediate states where policies are dropped but not yet recreated
    - _Bug_Condition: isBugCondition(input) where input.type = 'rls_evaluation' AND (input.policyUses = 'bare_auth_uid' OR input.hasRedundantPermissivePolicies = true)_
    - _Expected_Behavior: all policies use (select auth.uid()) pattern, no redundant permissive policies_
    - _Preservation: existing RLS enforcement unchanged, only optimized (Req 3.2); security audit fixes preserved (Req 3.6)_
    - _Requirements: 1.4, 1.5, 2.4, 2.5_

  - [x] 3.5 Create pg_net schema migration

    - Create `supabase/migrations/XXXXXX_move_pgnet_to_extensions.sql`
    - `DROP EXTENSION IF EXISTS pg_net;`
    - `CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;`
    - Safe because no custom triggers use pg_net (confirmed in audit Section 3)
    - _Bug_Condition: isBugCondition(input) where input.type = 'extension_access' AND input.extension = 'pg_net' AND input.schema = 'public'_
    - _Expected_Behavior: pg_net operates from extensions schema, not exposed via PostgREST API_
    - _Requirements: 1.6, 2.6_

  - [x] 3.6 Create leaderboard security wrapper migration

    - Create `supabase/migrations/XXXXXX_secure_leaderboard_view.sql`
    - `REVOKE SELECT ON leaderboard_weekly FROM anon, authenticated;`
    - Create `get_leaderboard(p_institution_id uuid)` function with `SECURITY DEFINER` and `SET search_path = public`
    - Function verifies caller's institution via `(select auth_institution_id()) = p_institution_id`
    - Function filters out `leaderboard_opt_out = true` students
    - Returns same columns as materialized view
    - `GRANT EXECUTE ON FUNCTION get_leaderboard(uuid) TO authenticated;`
    - _Bug_Condition: isBugCondition(input) where input.type = 'api_query' AND input.target = 'leaderboard_weekly'_
    - _Expected_Behavior: leaderboard data only accessible via security-definer function with institution scoping and opt-out filtering_
    - _Preservation: leaderboard displays correct data for opted-in students (Req 3.7)_
    - _Requirements: 1.7, 2.7_

  - [x] 3.7 Document leaked password protection manual step

    - Add a comment block at the top of the leaderboard security migration (or a separate `docs/MANUAL-STEPS.md`) documenting:
    - Navigate to Supabase Dashboard → Auth → Settings → Enable "Leaked password protection"
    - This is a Dashboard toggle, NOT a migration — cannot be automated via SQL
    - Project: Edeviser-Kiro (cdlgtbvxlxjpcddjazzx), Region: ap-northeast-1
    - _Bug_Condition: isBugCondition(input) where input.type = 'account_creation' AND input.passwordIsLeaked = true AND input.protectionEnabled = false_
    - _Expected_Behavior: Supabase Auth rejects passwords known to be compromised_
    - _Requirements: 1.8, 2.8_

  - [x] 3.8 Update useLeaderboard hook to use get_leaderboard function

    - Update `src/hooks/useLeaderboard.ts` to call `.rpc('get_leaderboard', { p_institution_id })` instead of `.from('leaderboard_weekly').select('*')`
    - This ensures the frontend uses the new security-definer function
    - _Bug_Condition: hook queries leaderboard_weekly directly via PostgREST_
    - _Expected_Behavior: hook uses get_leaderboard RPC for institution-scoped, opt-out-respecting queries_
    - _Preservation: leaderboard display behavior unchanged for opted-in students (Req 3.7)_
    - _Requirements: 2.7, 3.7_

  - [x] 3.9 Verify bug condition exploration test now passes

    - **Property 1: Expected Behavior** — Supabase Audit Infrastructure Defects Fixed
    - **IMPORTANT**: Re-run the SAME test from task 1 — do NOT write a new test
    - The test from task 1 encodes the expected behavior for all infrastructure defects
    - When this test passes, it confirms the expected behavior is satisfied
    - Run `src/__tests__/properties/supabaseAuditFaults.property.test.ts`
    - **EXPECTED OUTCOME**: Test PASSES (confirms all bugs are fixed)
    - _Requirements: Expected Behavior Properties from design (2.1–2.8)_

  - [x] 3.10 Verify preservation tests still pass
    - **Property 2: Preservation** — Existing Infrastructure Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run `src/__tests__/properties/supabaseAuditPreservation.property.test.ts`
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all preservation tests still pass after fixes (no regressions)

- [x] 4. Checkpoint — Ensure all tests pass
  - Run full test suite: `npm test`
  - Ensure all property-based tests pass (fault condition + preservation)
  - Ensure all existing unit tests pass (no regressions)
  - Ensure TypeScript compilation succeeds: `npx tsc --noEmit`
  - Verify all migrations apply cleanly (no syntax errors)
  - Remind user to run `scripts/deploy-edge-functions.sh` manually after PR merge
  - Remind user to enable leaked password protection in Supabase Dashboard
  - Ask the user if questions arise
