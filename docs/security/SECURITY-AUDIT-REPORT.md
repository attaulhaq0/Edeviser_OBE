# Full Repository Security Audit Report

**Repository:** Edeviser-Kiro (Educational Platform)
**Stack:** React 18 + Supabase (PostgreSQL, Edge Functions, RLS) + Vercel
**Date:** 2026-03-24
**Scope:** Full codebase — all backend logic, API routes, authentication, database policies

---

## Executive Summary

This audit identified **30 confirmed vulnerabilities** across the Supabase Edge Functions, Row Level Security policies, and application code. The two most critical systemic issues are:

1. **15 of 22 Edge Functions have zero authentication**, while using the `SUPABASE_SERVICE_ROLE_KEY` (which bypasses all RLS). Any caller with the public anon key can invoke these endpoints to access student data, send emails, manipulate gamification state, and generate institutional reports.

2. **Widespread cross-tenant data leakage** in RLS policies. At least 8 policies check the caller's role but not their `institution_id`, allowing any admin/coordinator/teacher at Institution A to read or write data belonging to Institution B.

---

## Table of Contents

- [Critical — Code Integrity](#critical--code-integrity)
- [Critical — Missing Authentication on Edge Functions](#critical--missing-authentication-on-edge-functions)
- [High — Cross-Tenant Data Leakage (RLS Policies)](#high--cross-tenant-data-leakage-rls-policies)
- [Medium — Cross-Tenant Data Leakage (Additional Policies)](#medium--cross-tenant-data-leakage-additional-policies)
- [Medium — Overly Permissive RLS Policies](#medium--overly-permissive-rls-policies)
- [Medium — CORS & Error Handling](#medium--cors--error-handling)
- [Medium — Application Layer](#medium--application-layer)
- [Remediation Priority](#remediation-priority)
- [Appendix: Positive Security Findings](#appendix-positive-security-findings)

---

## Critical — Code Integrity

### Vuln 1: Unresolved Merge Conflicts in `award-xp/index.ts`

- **File:** `supabase/functions/award-xp/index.ts:37-41, 100-105`
- **Severity:** Critical
- **Category:** `code_integrity`
- **Confidence:** 10/10
- **Description:** Two unresolved git merge conflict blocks (`<<<<<<< HEAD` / `=======` / `>>>>>>>`) break the TypeScript file at the `XPSource` type union and the `VALID_SOURCES` array. The Deno runtime cannot parse this file at all.
- **Impact:** The entire XP award system is non-functional. All server-side XP validation, caps, idempotency checks, and permission enforcement return 500 errors. Every call from `check-badges`, `process-streak`, `AuthProvider.signIn`, and manual XP awards fails.
- **Recommendation:** Resolve the merge conflict immediately. Both `wellness_habit` and `practice_quiz` sources should be included.

### Vuln 2: Unresolved Merge Conflicts in `check-badges/index.ts`

- **File:** `supabase/functions/check-badges/index.ts:42-50, 369-377, 384-561`
- **Severity:** Critical
- **Category:** `code_integrity`
- **Confidence:** 10/10
- **Description:** Three unresolved merge conflict blocks break the `BADGE_XP` record, the `checkHabitBadges`/`checkBloomsBadges` function declaration, and ~180 lines of function body. The file cannot parse.
- **Impact:** The entire badge evaluation engine is non-functional. No badges can be awarded. Badge-triggered XP rewards also fail.
- **Recommendation:** Resolve the merge conflict. Both habit badges and Bloom's progression badges should coexist.

---

## Critical — Missing Authentication on Edge Functions

### Vuln 3: Unauthenticated Email Relay — `send-email-notification`

- **File:** `supabase/functions/send-email-notification/index.ts:229-258`
- **Severity:** High
- **Category:** `auth_bypass`
- **Confidence:** 10/10
- **Description:** Zero authentication. Accepts any `to` email address and any template with caller-controlled `data` fields (including `login_url`, `invite_url`, `assignment_url`). Uses `SUPABASE_SERVICE_ROLE_KEY` to query profiles and sends emails via Resend from `noreply@edeviser.com`.
- **Exploit Scenario:** An attacker calls this endpoint with a `bulk_import_invitation` template, setting `invite_url` to a phishing page. The victim receives a legitimate-looking email from the Edeviser domain with a malicious link.
- **Recommendation:** Add JWT authentication. Verify the caller is an admin or the system (cron). Restrict `to` addresses to known platform users.

### Vuln 4: Unauthenticated Institutional Data Exposure — `generate-accreditation-report`

- **File:** `supabase/functions/generate-accreditation-report/index.ts:245-266`
- **Severity:** High
- **Category:** `auth_bypass`, `data_exposure`
- **Confidence:** 10/10
- **Description:** Zero authentication. Accepts any `program_id`, queries all courses, learning outcomes, and student attainment scores for that program. Generates a PDF report, uploads it to Supabase Storage, returns a signed download URL, and optionally emails it to any address.
- **Exploit Scenario:** An attacker iterates over program IDs to generate accreditation reports containing aggregate student performance data for every program across all institutions.
- **Recommendation:** Add JWT authentication. Verify the caller is an admin/coordinator at the institution that owns the program.

### Vuln 5: Unauthenticated Student Data Access — `ai-feedback-draft`

- **File:** `supabase/functions/ai-feedback-draft/index.ts:250-260`
- **Severity:** High
- **Category:** `auth_bypass`, `idor`
- **Confidence:** 10/10
- **Description:** Zero authentication. Accepts any `student_id` and queries that student's submission history (up to 20 submissions) and past grades including `overall_feedback` and `rubric_selections` (up to 10 records) via the service role client.
- **Exploit Scenario:** An attacker supplies a known student ID and retrieves their complete grading history and teacher feedback.
- **Recommendation:** Add JWT authentication. Verify the caller is the student's teacher or an admin at the same institution.

### Vuln 6: Unauthenticated Student Data Access — `ai-module-suggestion`

- **File:** `supabase/functions/ai-module-suggestion/index.ts:203-214`
- **Severity:** High
- **Category:** `auth_bypass`, `idor`
- **Confidence:** 10/10
- **Description:** Zero authentication. Accepts any `student_id` and queries their CLO attainment data, returning their weakest learning outcomes and attainment percentages.
- **Exploit Scenario:** An attacker retrieves any student's academic weakness profile.
- **Recommendation:** Add JWT authentication and ownership verification.

### Vuln 7: Unauthenticated Student Data Access — `compute-habit-correlations`

- **File:** `supabase/functions/compute-habit-correlations/index.ts:202-223`
- **Severity:** High
- **Category:** `auth_bypass`, `idor`
- **Confidence:** 10/10
- **Description:** Zero authentication. Accepts any `student_id` and queries their habit logs, wellness logs, and submission history, returning behavioral pattern data.
- **Exploit Scenario:** An attacker learns any student's daily habits, wellness practices, and submission patterns.
- **Recommendation:** Add JWT authentication. Verify the caller is the student themselves or their teacher.

### Vuln 8: Unauthenticated Badge/XP Injection — `check-badges`

- **File:** `supabase/functions/check-badges/index.ts:646-667`
- **Severity:** High
- **Category:** `auth_bypass`, `privilege_escalation`
- **Confidence:** 10/10
- **Description:** Zero authentication. Accepts any `student_id` and `trigger`, evaluates badge conditions, and awards badges + XP via the `award-xp` function (called with service role privileges). Currently non-functional due to merge conflicts (Vuln 2), but the design flaw persists.
- **Exploit Scenario:** Once merge conflicts are resolved, an attacker triggers badge checks for any student, awarding badges and XP they haven't earned.
- **Recommendation:** Add JWT authentication. Only allow teachers, admins, or internal system calls.

### Vuln 9: Unauthenticated Streak Manipulation — `process-streak`

- **File:** `supabase/functions/process-streak/index.ts:122-143`
- **Severity:** High
- **Category:** `auth_bypass`, `privilege_escalation`
- **Confidence:** 10/10
- **Description:** Zero authentication. Accepts any `student_id`, updates their streak count, and awards milestone XP (up to 500 XP at 100-day milestones).
- **Exploit Scenario:** An attacker calls this daily for a target student, building an artificial streak and farming milestone XP bonuses.
- **Recommendation:** Add JWT authentication. Verify the caller is the student themselves (triggered by login activity) or a system cron.

### Vuln 10: Unauthenticated Attainment Manipulation — `calculate-attainment-rollup`

- **File:** `supabase/functions/calculate-attainment-rollup/index.ts:32-44`
- **Severity:** High
- **Category:** `auth_bypass`
- **Confidence:** 10/10
- **Description:** Zero authentication. Accepts `grade_id` and `submission_id`, creates evidence records, and recalculates CLO/PLO/ILO attainment scores.
- **Exploit Scenario:** An attacker triggers attainment recalculations with crafted IDs, potentially corrupting academic records.
- **Recommendation:** Add JWT authentication. This should only be callable by the grade-insert trigger or admin users.

### Vuln 11: Unauthenticated Quiz Analytics Manipulation — `update-question-analytics`

- **File:** `supabase/functions/update-question-analytics/index.ts:227-250`
- **Severity:** High
- **Category:** `auth_bypass`
- **Confidence:** 10/10
- **Description:** Zero authentication. Accepts any `quiz_attempt_id` and updates question analytics (success rates, discrimination indices, calibrated difficulty, quality flags).
- **Exploit Scenario:** An attacker skews question difficulty calibration, causing the adaptive quiz engine to serve inappropriately easy or hard questions for all students.
- **Recommendation:** Add JWT authentication. Restrict to teacher/admin roles or system-triggered calls only.

### Vuln 12: Unauthenticated Rate Limit Reset — `check-login-rate`

- **File:** `supabase/functions/check-login-rate/index.ts:178-190`
- **Severity:** High
- **Category:** `auth_bypass`
- **Confidence:** 10/10
- **Description:** Zero authentication. The `clear` action deletes the `login_attempts` record for any email, completely resetting the brute-force lockout. An attacker can call `clear` after every 4 failed login attempts to prevent the 5-attempt lockout from ever triggering.
- **Exploit Scenario:** Attacker automates: attempt 4 passwords -> call `clear` -> attempt 4 more -> call `clear` -> repeat indefinitely. The rate limiting protection is completely defeated.
- **Recommendation:** Remove the `clear` action from the public endpoint entirely, or require admin authentication. Clear should only happen on successful login (server-side).

### Vuln 13: Unauthenticated Cron Function Invocation

- **Files:**
  - `supabase/functions/ai-at-risk-prediction/index.ts:162`
  - `supabase/functions/compute-at-risk-signals/index.ts:86`
  - `supabase/functions/perfect-day-prompt/index.ts:25`
  - `supabase/functions/streak-risk-cron/index.ts:13`
  - `supabase/functions/weekly-summary-cron/index.ts:13`
- **Severity:** Medium
- **Category:** `auth_bypass`
- **Confidence:** 8/10
- **Description:** Five cron-scheduled functions have zero authentication but are accessible as HTTP endpoints. They can trigger mass email sends, mass at-risk predictions, and mass notification sends.
- **Exploit Scenario:** An attacker repeatedly invokes `weekly-summary-cron` to flood all students' inboxes with duplicate weekly summary emails.
- **Recommendation:** Add a shared secret header check (e.g., `x-cron-secret`) to all cron-only functions.

---

## High — Cross-Tenant Data Leakage (RLS Policies)

### Vuln 14: Cross-Tenant Read — `student_courses`

- **File:** `supabase/migrations/20260222075034_add_remaining_rls_policies.sql:45-48`
- **Severity:** High
- **Category:** `cross_tenant`
- **Confidence:** 10/10
- **Description:** Policy `student_courses_admin_read` checks `auth_user_role() IN ('admin', 'coordinator')` with no `institution_id` filter. Any admin/coordinator can read all student-course enrollments across all institutions.
- **Affected SQL:**
  ```sql
  CREATE POLICY "student_courses_admin_read" ON public.student_courses
    FOR SELECT USING (
      auth_user_role() IN ('admin', 'coordinator')
    );
  ```
- **Recommendation:** Add `AND course_id IN (SELECT id FROM courses WHERE program_id IN (SELECT id FROM programs WHERE institution_id = auth_institution_id()))`.

### Vuln 15: Cross-Tenant Write — `outcome_mappings`

- **File:** `supabase/migrations/20260222075034_add_remaining_rls_policies.sql:58-65`
- **Severity:** High
- **Category:** `cross_tenant`
- **Confidence:** 10/10
- **Description:** Three `FOR ALL` policies (`admin`, `coordinator`, `teacher`) check only the role. Any staff member at any institution can INSERT, UPDATE, or DELETE outcome mappings (CLO-to-PLO, PLO-to-ILO relationships) belonging to any other institution. The companion read policy IS correctly scoped, but all write paths are open.
- **Affected SQL:**
  ```sql
  CREATE POLICY "outcome_mappings_admin_write" ON public.outcome_mappings
    FOR ALL USING (auth_user_role() = 'admin');
  CREATE POLICY "outcome_mappings_coordinator_write" ON public.outcome_mappings
    FOR ALL USING (auth_user_role() = 'coordinator');
  CREATE POLICY "outcome_mappings_teacher_write" ON public.outcome_mappings
    FOR ALL USING (auth_user_role() = 'teacher');
  ```
- **Exploit Scenario:** A teacher at Institution A deletes outcome mappings at Institution B, corrupting their accreditation data.
- **Recommendation:** Add institution filtering via the `learning_outcomes` join, matching the pattern used in the read policy.

### Vuln 16: Cross-Tenant Read — `assignments`

- **File:** `supabase/migrations/20260222075034_add_remaining_rls_policies.sql:110-113`
- **Severity:** High
- **Category:** `cross_tenant`
- **Confidence:** 10/10
- **Description:** Policy `assignments_staff_read` checks `auth_user_role() IN ('admin', 'coordinator')` with no institution filter. Any admin/coordinator can read all assignments (titles, descriptions, due dates, CLO weights) across all institutions.
- **Affected SQL:**
  ```sql
  CREATE POLICY "assignments_staff_read" ON public.assignments
    FOR SELECT USING (
      auth_user_role() IN ('admin', 'coordinator')
    );
  ```
- **Exploit Scenario:** An admin reads exam content and grading weights from a competing institution.
- **Recommendation:** Add institution scoping through the course -> program -> institution chain.

### Vuln 17: Cross-Tenant Read — `outcome_attainment`

- **File:** `supabase/migrations/20260222075034_add_remaining_rls_policies.sql:146-149`
- **Severity:** High
- **Category:** `cross_tenant`
- **Confidence:** 10/10
- **Description:** Policy `attainment_staff_read` checks `auth_user_role() IN ('teacher', 'coordinator', 'admin')` with no institution filter. Any staff at any institution can read all student attainment scores (`student_id`, `score_percent`) across the platform.
- **Affected SQL:**
  ```sql
  CREATE POLICY "attainment_staff_read" ON public.outcome_attainment
    FOR SELECT USING (
      auth_user_role() IN ('teacher', 'coordinator', 'admin')
    );
  ```
- **Recommendation:** Add institution scoping via the `learning_outcomes` or `profiles` join.

### Vuln 18: Cross-Tenant Read — `attendance_records`

- **File:** `supabase/migrations/20260222124654_add_rls_policies_part2.sql:145-146`
- **Severity:** High
- **Category:** `cross_tenant`
- **Confidence:** 10/10
- **Description:** Policy `attendance_admin_read` checks only `auth_user_role() = 'admin'` with no institution filter. Any admin can read attendance records for all students at all institutions.
- **Affected SQL:**
  ```sql
  CREATE POLICY "attendance_admin_read" ON attendance_records
    FOR SELECT USING (auth_user_role() = 'admin');
  ```
- **Recommendation:** Add institution scoping through the session -> course -> program -> institution chain.

### Vuln 19: SECURITY DEFINER Function — `get_wellness_aggregate_stats`

- **File:** `supabase/migrations/20260319133141_wellness_aggregate_stats_function.sql:1-18`
- **Severity:** High
- **Category:** `insecure_function`, `cross_tenant`
- **Confidence:** 9/10
- **Description:** This `SECURITY DEFINER` function bypasses all RLS and accepts an arbitrary `p_institution_id` parameter with no authorization check. Any authenticated user can call it with any institution ID to retrieve wellness engagement metrics.
- **Affected SQL:**
  ```sql
  CREATE OR REPLACE FUNCTION get_wellness_aggregate_stats(p_institution_id uuid)
  RETURNS TABLE (...) AS $$
  BEGIN
    RETURN QUERY
    SELECT ... FROM wellness_habit_logs whl
    JOIN profiles p ON p.id = whl.student_id
    WHERE p.institution_id = p_institution_id ...
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;
  ```
- **Exploit Scenario:** A student calls `SELECT * FROM get_wellness_aggregate_stats('<competitor-institution-uuid>')` and receives wellness data for another institution.
- **Recommendation:** Add `IF auth_institution_id() != p_institution_id THEN RAISE EXCEPTION 'unauthorized'; END IF;` at the start of the function body.

### Vuln 20: Service Role Key Potentially Extractable via GUC

- **File:** `supabase/migrations/20260223100000_add_grade_trigger_for_attainment_rollup.sql:12-50`
- **Severity:** High
- **Category:** `insecure_function`
- **Confidence:** 8/10
- **Description:** The `trigger_attainment_rollup` SECURITY DEFINER function reads the service role key from `current_setting('app.settings.service_role_key', true)` and passes it in an HTTP header via `pg_net`. If this GUC setting is readable by authenticated users (not restricted to superuser), any user could extract the full service role key, which bypasses all RLS.
- **Exploit Scenario:** A user runs `SELECT current_setting('app.settings.service_role_key', true)` and obtains the service role key, then uses it to bypass all RLS on every table.
- **Recommendation:** Ensure the GUC is set with `ALTER ROLE postgres SET app.settings.service_role_key = '...'` (not session-level), and verify non-superuser roles cannot read it. Consider using Vault secrets instead.

---

## Medium — Cross-Tenant Data Leakage (Additional Policies)

### Vuln 21: Cross-Tenant Read — `xp_transactions`

- **File:** `supabase/migrations/20260222075034_add_remaining_rls_policies.sql:166-167`
- **Severity:** Medium
- **Category:** `cross_tenant`
- **Confidence:** 9/10
- **Description:** `xp_transactions_admin_read` uses `auth_user_role() = 'admin'` with no institution filter. Any admin reads all XP transactions across all institutions.
- **Recommendation:** Add institution scoping via the `profiles` table join on `student_id`.

### Vuln 22: Cross-Tenant Read — `ai_feedback`

- **File:** `supabase/migrations/20260222124630_add_rls_policies_part1.sql:25-26`
- **Severity:** Medium
- **Category:** `cross_tenant`
- **Confidence:** 9/10
- **Description:** `ai_feedback_admin_read` uses `auth_user_role() = 'admin'` with no institution filter. Any admin reads all AI feedback (at-risk predictions, module suggestions) for all students.
- **Recommendation:** Add institution scoping via the `profiles` table join on `student_id`.

### Vuln 23: Cross-Tenant Read — `student_activity_log`

- **File:** `supabase/migrations/20260222124630_add_rls_policies_part1.sql:8-9`
- **Severity:** Medium
- **Category:** `cross_tenant`
- **Confidence:** 9/10
- **Description:** `activity_log_admin_read` uses `auth_user_role() = 'admin'` with no institution filter. Any admin reads full behavioral tracking data (logins, page views, quiz attempts) for all students.
- **Recommendation:** Add institution scoping via the `profiles` table join on `student_id`.

### Vuln 24: Cross-Tenant Read — `habit_tracking`

- **File:** `supabase/migrations/20260222075006_add_habit_tracking_and_xp_events.sql:22-23`
- **Severity:** Medium
- **Category:** `cross_tenant`
- **Confidence:** 9/10
- **Description:** `habit_tracking_staff_read` uses `auth_user_role() IN ('teacher', 'coordinator', 'admin')` with no institution filter. Any teacher/coordinator/admin reads habit data for students at other institutions.
- **Recommendation:** Add institution scoping via the `profiles` table join on `student_id`.

### Vuln 25: Cross-Tenant Read — `badges`

- **File:** `supabase/migrations/20260222075034_add_remaining_rls_policies.sql:157-158`
- **Severity:** Medium
- **Category:** `cross_tenant`
- **Confidence:** 8/10
- **Description:** `badges_public_read` uses `USING (true)`. Any authenticated user reads all badge awards (`student_id`, `badge_key`, `awarded_at`) across all institutions.
- **Affected SQL:**
  ```sql
  CREATE POLICY "badges_public_read" ON public.badges
    FOR SELECT USING (true);
  ```
- **Recommendation:** Replace with institution-scoped policy or at minimum restrict to authenticated users within the same institution.

### Vuln 26: Cross-Tenant Read — `verified_explanations`

- **File:** `supabase/migrations/20260320005125_add_verified_explanations_rls_policies.sql:25-30`
- **Severity:** Medium
- **Category:** `cross_tenant`
- **Confidence:** 9/10
- **Description:** `verified_student_read` checks `auth_user_role() = 'student' AND is_active = true` with no institution or course filter. Any student reads teacher-approved answer explanations from all institutions.
- **Exploit Scenario:** A student at Institution A accesses verified exam explanations created by teachers at Institution B.
- **Recommendation:** Add institution or course scoping to the policy.

---

## Medium — Overly Permissive RLS Policies

### Vuln 27: Students Can Delete/Modify Quiz Attempts — `quiz_attempts`

- **File:** `supabase/migrations/20260222124721_add_rls_policies_part3.sql:40-41`
- **Severity:** Medium
- **Category:** `missing_delete_update_restrictions`
- **Confidence:** 9/10
- **Description:** Policy `quiz_attempts_own` uses `FOR ALL USING (student_id = auth.uid())`. Students can DELETE failed attempts to retry unlimited times (bypassing `max_attempts`), or UPDATE their `score`, `answers`, and `submitted_at` fields.
- **Affected SQL:**
  ```sql
  CREATE POLICY "quiz_attempts_own" ON quiz_attempts
    FOR ALL USING (student_id = auth.uid());
  ```
- **Exploit Scenario:** A student submits a quiz, receives a low score, runs `DELETE FROM quiz_attempts WHERE student_id = auth.uid() AND quiz_id = '<target>'`, then retakes the quiz with knowledge of the questions. Or they directly `UPDATE quiz_attempts SET score = 100`.
- **Recommendation:** Replace `FOR ALL` with separate `FOR SELECT` and `FOR INSERT` policies. Students should never UPDATE or DELETE quiz attempts.

---

## Medium — CORS & Error Handling

### Vuln 28: Wildcard CORS on All 22 Edge Functions

- **Files:** All 22 files in `supabase/functions/*/index.ts`
- **Severity:** Medium
- **Category:** `cors`
- **Confidence:** 9/10
- **Description:** Every Edge Function sets `Access-Control-Allow-Origin: '*'`. Combined with the missing authentication on 15 functions, any malicious website can silently call these endpoints from a visitor's browser.
- **Affected Code:**
  ```typescript
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  };
  ```
- **Recommendation:** Restrict to the production domain(s) (e.g., `https://edeviser.com`).

---

## Medium — Application Layer

### Vuln 29: Sentry Session Replay Without Explicit PII Masking

- **File:** `src/lib/sentry.ts:11-15`
- **Severity:** Medium
- **Category:** `data_exposure`
- **Confidence:** 8/10
- **Description:** Sentry Replay is configured at 10% session sample rate and 100% on-error rate with no explicit privacy options (`maskAllText`, `maskAllInputs`, `blockAllMedia`). On error, full session replays may capture form inputs (password fields, student names, journal content, grade data) and send them to Sentry's servers.
- **Affected Code:**
  ```typescript
  Sentry.init({
    dsn,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(), // No privacy options passed
    ],
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
  ```
- **Exploit Scenario:** A student encounters an error while typing a journal entry. The full replay including personal content is sent to a third-party service, creating FERPA/GDPR compliance risk for an educational platform.
- **Recommendation:** Add explicit privacy controls:
  ```typescript
  Sentry.replayIntegration({
    maskAllText: true,
    maskAllInputs: true,
    blockAllMedia: true,
  });
  ```

### Vuln 30: Audit Log Records Full Form Data Including PII

- **Files:** `src/hooks/useUsers.ts:107-113`, `src/hooks/useGrades.ts:85-91`, and multiple other mutation hooks
- **Severity:** Medium
- **Category:** `data_exposure`
- **Confidence:** 8/10
- **Description:** All mutation hooks pass the complete `data` object (including email, full_name, grades, rubric_selections, feedback text) into the `changes` field of audit log entries. This creates an ever-growing store of PII in the `audit_logs` table.
- **Affected Code Pattern:**
  ```typescript
  await logAuditEvent({
    action: "create",
    entity_type: "user",
    entity_id: profile.id,
    changes: data, // Full form data dumped to audit log
    performed_by: user?.id ?? "unknown",
  });
  ```
- **Recommendation:** Create an explicit allowlist of fields to log per entity type rather than dumping the full form data:
  ```typescript
  changes: { role: data.role, full_name: data.full_name }, // explicit allowlist
  ```

---

## Remediation Priority

| Priority             | Action                                                          | Vulns        | Effort   |
| -------------------- | --------------------------------------------------------------- | ------------ | -------- |
| **P0 — Immediate**   | Resolve merge conflicts in `award-xp` and `check-badges`        | 1, 2         | 1 hour   |
| **P0 — Immediate**   | Add JWT authentication to all 15 unauthenticated Edge Functions | 3-13         | 2-3 days |
| **P1 — This Sprint** | Add `institution_id` filtering to all cross-tenant RLS policies | 14-18, 21-26 | 1-2 days |
| **P1 — This Sprint** | Add auth checks to SECURITY DEFINER functions                   | 19, 20       | 4 hours  |
| **P1 — This Sprint** | Restrict `quiz_attempts` to `FOR SELECT` + `FOR INSERT` only    | 27           | 1 hour   |
| **P2 — Next Sprint** | Restrict CORS to production domains                             | 28           | 2 hours  |
| **P2 — Next Sprint** | Configure Sentry replay privacy and audit log field filtering   | 29, 30       | 4 hours  |

---

## Summary Statistics

| Severity  | Count  |
| --------- | ------ |
| Critical  | 2      |
| High      | 18     |
| Medium    | 10     |
| **Total** | **30** |

| Category                             | Count |
| ------------------------------------ | ----- |
| `auth_bypass`                        | 11    |
| `cross_tenant`                       | 13    |
| `code_integrity`                     | 2     |
| `data_exposure`                      | 3     |
| `privilege_escalation`               | 3     |
| `idor`                               | 3     |
| `cors`                               | 1     |
| `insecure_function`                  | 3     |
| `missing_delete_update_restrictions` | 1     |

---

## Appendix: Positive Security Findings

The following areas were reviewed and found to have good security practices:

1. **No `dangerouslySetInnerHTML`** — Zero instances in the entire `src/` directory. React's default XSS protection is fully intact.
2. **No service_role key in client code** — `src/lib/supabase.ts` uses only the anon key. No service_role or admin clients exist client-side.
3. **No `eval()` or `new Function()`** — Zero instances found anywhere in client code.
4. **No open redirect vulnerabilities** — `redirectTo` is derived from a hardcoded `ROLE_DASHBOARD_MAP`, not from user input.
5. **PostgREST filter injection protection** — `sanitizePostgrestValue` in `src/lib/sanitizeFilter.ts` properly escapes special characters before interpolation into `.or()` expressions.
6. **Email enumeration prevention** — `ResetPasswordPage.tsx` shows a success message even when the reset fails.
7. **Generic login error messages** — `AuthProvider.tsx` returns `'Invalid email or password.'` without revealing whether the email exists.
8. **Proper session management** — Supabase client configured with `autoRefreshToken: true`, `persistSession: true`. Session state properly cleared on `SIGNED_OUT`.
9. **User-scoped journal mutations** — `useJournal.ts` correctly adds `.eq('student_id', user.id)` as a secondary filter on updates and deletes.
10. **Server-side user ID for submissions** — `useCreateSubmission` gets the user from `supabase.auth.getUser()` (server-verified) rather than a client-supplied value.
11. **File upload validation** — `fileUpload.ts` validates file size (10MB limit), allowed extensions, and sanitizes filenames.
12. **Route protection** — All role-specific routes in `AppRouter.tsx` are wrapped in `<RouteGuard allowedRoles={[...]}>`.
13. **Zod schema validation** — Forms use Zod schemas for input validation before submission.
14. **TypeScript strict mode** — `strict: true`, `noUncheckedIndexedAccess: true` enabled in `tsconfig.json`.
15. **6 Edge Functions with proper auth** — `generate-quiz-questions`, `select-adaptive-question`, `generate-starter-week`, `process-onboarding`, `suggest-goals`, and `bulk-import-users` all properly validate JWTs and check authorization.

---

_Report generated by automated security audit tooling. All findings have been validated against the source code with false-positive filtering applied. Only findings with confidence >= 8/10 are included._
