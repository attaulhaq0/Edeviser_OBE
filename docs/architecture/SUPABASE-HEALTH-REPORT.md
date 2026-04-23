# Supabase Health Audit Report

**Project:** Edeviser-Kiro (cdlgtbvxlxjpcddjazzx)  
**Region:** ap-northeast-1  
**Postgres:** 17.6.1  
**Audit Date:** April 16, 2026  
**Previous Audit:** April 1, 2026  

---

## Executive Summary

This health audit evaluates the current state of the Edeviser Supabase infrastructure across 6 dimensions: Edge Function deployment, storage buckets, schema drift, RLS policy optimization, FK indexing, and security. The platform has made significant progress since the April 1 audit — 17 frontend/code-level bugs were fixed via the `platform-audit-fixes` spec. However, the 8 infrastructure-level defects identified in the `supabase-audit-remediation` spec remain **unresolved**. Additionally, this audit discovered **7 new Edge Functions** added since the original audit that are not tracked in the remediation spec, and **1 new security concern** (unsanitized `.or()` filter in `useGlobalSearch`).

**Overall Health Score: 3/10** — The platform has no working backend logic in production (only `health` function deployed), no file upload capability (zero storage buckets), and performance-degrading RLS patterns across 60+ tables.

---

## 1. Edge Function Deployment Check

### Status: 🔴 CRITICAL

### Findings

**Total function directories:** 43 (excluding `_shared`)  
**Deployed:** 1 (`health`)  
**Not deployed:** 42  
**Deployment script exists:** ❌ No (`scripts/deploy-edge-functions.sh` not found)

#### All Edge Function Directories

| # | Function | Referenced by Frontend Hook | In Original 36 List | Status |
|---|----------|-----------------------------|---------------------|--------|
| 1 | `ai-at-risk-prediction` | — (cron) | ✅ | ❌ Not deployed |
| 2 | `ai-feedback-draft` | `useAIFeedbackDraft.ts` | ✅ | ❌ Not deployed |
| 3 | `ai-module-suggestion` | `useAISuggestions.ts` | ✅ | ❌ Not deployed |
| 4 | `auto-grade-quiz` | — | ✅ | ❌ Not deployed |
| 5 | `award-xp` | `useWellnessHabits.ts`, `useStreakFreeze.ts`, `useSessionReflections.ts`, `useSessionCompletion.ts`, `useReviewSchedule.ts`, `usePlannerTasks.ts`, `usePeerTeaching.ts` | ✅ | ❌ Not deployed |
| 6 | `bulk-data-import` | `useDataImport.ts`, `useBulkOperations.ts` | ✅ | ❌ Not deployed |
| 7 | `bulk-import-users` | `useBulkImport.ts` | ✅ | ❌ Not deployed |
| 8 | `calculate-attainment-rollup` | — (trigger) | ✅ | ❌ Not deployed |
| 9 | `challenge-completion` | — | ✅ | ❌ Not deployed |
| 10 | `challenge-progress-update` | — | ✅ | ❌ Not deployed |
| 11 | `check-badges` | `useWellnessHabits.ts`, `useSessionCompletion.ts` | ✅ | ❌ Not deployed |
| 12 | `check-login-rate` | `loginAttemptTracker.ts` | ✅ | ❌ Not deployed |
| 13 | `compute-at-risk-signals` | — (cron) | ✅ | ❌ Not deployed |
| 14 | `compute-habit-correlations` | `useHabitCorrelations.ts` | ✅ | ❌ Not deployed |
| 15 | `exam-period-notify` | — (cron) | ✅ | ❌ Not deployed |
| 16 | `export-student-data` | — | ✅ | ❌ Not deployed |
| 17 | `fee-overdue-check` | — (cron) | ✅ | ❌ Not deployed |
| 18 | `generate-accreditation-report` | `useAccreditationReport.ts` | ✅ | ❌ Not deployed |
| 19 | `generate-course-file` | `useCourseFile.ts` | ✅ | ❌ Not deployed |
| 20 | `generate-fee-receipt` | `useFees.ts` | ✅ | ❌ Not deployed |
| 21 | `generate-quiz-questions` | `useGenerateQuestions.ts` | ✅ | ❌ Not deployed |
| 22 | `generate-starter-week` | `useStarterWeekPlan.ts` | ✅ | ❌ Not deployed |
| 23 | `generate-transcript` | `useTranscript.ts` | ✅ | ❌ Not deployed |
| 24 | `health` | — | N/A | ✅ Deployed |
| 25 | `import-competency-csv` | `useCompetencyFrameworks.ts` | ✅ | ❌ Not deployed |
| 26 | `improvement-bonus-check` | — | ✅ | ❌ Not deployed |
| 27 | `notification-digest` | — (cron) | ✅ | ❌ Not deployed |
| 28 | `perfect-day-prompt` | — (cron) | ✅ | ❌ Not deployed |
| 29 | `process-onboarding` | `useStudentProfile.ts` | ✅ | ❌ Not deployed |
| 30 | `process-streak` | — | ✅ | ❌ Not deployed |
| 31 | `select-adaptive-question` | `useAdaptiveQuiz.ts` | ✅ | ❌ Not deployed |
| 32 | `send-email-notification` | — | ✅ | ❌ Not deployed |
| 33 | `streak-risk-cron` | — (cron) | ✅ | ❌ Not deployed |
| 34 | `suggest-goals` | `useGoalSuggestions.ts` | ✅ | ❌ Not deployed |
| 35 | `team-streak-risk-cron` | — (cron) | ✅ | ❌ Not deployed |
| 36 | `update-question-analytics` | — | ✅ | ❌ Not deployed |
| 37 | `weekly-summary-cron` | — (cron) | ✅ | ❌ Not deployed |

#### NEW Edge Functions (Not in Original 36 — Discovered This Audit)

| # | Function | Referenced by Frontend Hook | Has Directory | Status |
|---|----------|-----------------------------|---------------|--------|
| 38 | `check-bonus-question` | `useBonusQuestion.ts` | ✅ | ❌ Not deployed |
| 39 | `process-purchase` | `useStreakFreeze.ts` | ✅ | ❌ Not deployed |
| 40 | `resolve-mystery-reward` | `useMysteryRewardBox.ts` | ✅ | ❌ Not deployed |
| 41 | `score-reflection-quality` | `useReflectionQuality.ts` | ✅ | ❌ Not deployed |
| 42 | `generate-reflection-digest` | — | ✅ | ❌ Not deployed |
| 43 | `update-challenge-progress` | — | ✅ | ❌ Not deployed |

#### Edge Functions Referenced by Hooks but Missing Directories

| Function | Referenced by | Has Directory |
|----------|---------------|---------------|
| `bulk-grade-export` | `useBulkOperations.ts` | ❌ Missing |
| `semester-transition` | `useBulkOperations.ts` | ❌ Missing |

### Severity: CRITICAL
All frontend features that invoke Edge Functions will fail with 404/relay errors in production. This blocks gamification (XP, streaks, badges), AI features, PDF generation, bulk import, onboarding, and quiz generation.

### Recommendation
1. Create `scripts/deploy-edge-functions.sh` covering all 42 undeployed functions
2. Add the 6 newly discovered functions to the deployment script
3. Create missing function directories for `bulk-grade-export` and `semester-transition`
4. Run deployment after PR merge

---

## 2. Storage Bucket Check

### Status: 🔴 CRITICAL

### Findings

**Storage buckets in migrations:** 0  
**Storage buckets referenced in code:** 4 (+ 1 in Edge Functions)

| Bucket Name | Referenced In | Created in Migration | Status |
|-------------|---------------|---------------------|--------|
| `avatars` | `src/lib/fileUpload.ts` (AVATAR_BUCKET) | ❌ | 🔴 Missing |
| `submissions` | `src/lib/fileUpload.ts` (BUCKET_NAME) | ❌ | 🔴 Missing |
| `course-materials` | `src/hooks/useCourseModules.ts` (MATERIAL_BUCKET) | ❌ | 🔴 Missing |
| `accreditation-reports` | Referenced in audit report | ❌ | 🔴 Missing |
| `transcripts` | `supabase/functions/generate-transcript/index.ts` | ❌ (created at runtime via `createBucket`) | ⚠️ Runtime creation |

### Severity: CRITICAL
All file upload features are broken: avatar uploads, assignment submissions, course material uploads, and PDF report generation. The `generate-transcript` function attempts runtime bucket creation which is fragile and lacks proper RLS policies.

### Recommendation
Create a migration (`supabase/migrations/XXXXXX_create_storage_buckets.sql`) that creates all 5 buckets with proper size limits, MIME type restrictions, and RLS policies. Add `transcripts` bucket to the migration instead of relying on runtime creation.

---

## 3. Schema Drift Check

### Status: 🟢 CLEAN

### Findings

Cross-referencing column names used in `src/hooks/*.ts` Supabase queries against `src/types/database.ts` and `docs/SUPABASE-COLUMNS-DATATYPES.md`:

- **Column mismatches found:** 0
- The `platform-audit-fixes` spec already corrected the column name mismatches (`current_streak` → `streak_count`, `current_level` → `level`, `score_percent` → `attainment_percent`)
- All `.select()`, `.eq()`, `.order()`, `.insert()`, `.update()` calls in hooks reference valid column names
- The `as never` type casts on some table names (e.g., `blooms_progression`, `bonus_xp_events`, `student_active_boosts`) indicate tables that exist in the database but may not be in the auto-generated `database.ts` types — this is a type generation gap, not a schema drift issue

### Severity: LOW
No schema drift detected. The type generation should be re-run to include newer tables.

### Recommendation
Run `npx supabase gen types --linked > src/types/database.ts` to capture all tables including recently added ones (blooms_progression, bonus_xp_events, student_active_boosts, teams, team_members, etc.).

---

## 4. RLS Policy Optimization Check

### Status: 🟡 HIGH

### Findings

| Pattern | Count | Status |
|---------|-------|--------|
| Bare `auth.uid()` in policies | **90+** occurrences across 20+ migration files | 🔴 Not optimized |
| `(select auth.uid())` optimized pattern | **0** occurrences | 🔴 Missing |
| Bare `auth_user_role()` in policies | **80+** occurrences across 15+ migration files | 🔴 Not optimized |
| `(select auth_user_role())` optimized pattern | **0** occurrences | 🔴 Missing |
| Bare `auth_institution_id()` in policies | **60+** occurrences across 10+ migration files | 🔴 Not optimized |
| `(select auth_institution_id())` optimized pattern | **0** occurrences | 🔴 Missing |

#### Affected Migration Files (sample)

| Migration File | Bare `auth.uid()` Count |
|----------------|------------------------|
| `20260222124654_add_rls_policies_part2.sql` | 12+ |
| `20260222124721_add_rls_policies_part3.sql` | 10+ |
| `20260313132109_create_onboarding_rls_policies.sql` | 14+ |
| `20260319133131_wellness_rls_policies.sql` | 8+ |
| `20260320000006_add_question_bank_rls.sql` | 4+ |
| `20260320000701_add_mastery_recovery_rls_policies.sql` | 4+ |
| `20260325000001_security_audit_rls_fixes.sql` | 0 (uses `auth_institution_id()` bare) |
| `20260416000001_session_intent_flow_optimization.sql` | 6+ |
| `20260720000017_team_rls_policies.sql` | 12+ |
| `20260720000024_rls_peer_teaching_health_votes.sql` | 6+ |

### Severity: HIGH
Every RLS policy evaluation calls `auth.uid()`, `auth_user_role()`, and `auth_institution_id()` once per row instead of once per query. At scale (10k+ rows), this causes O(n) function invocations per query, significantly degrading performance.

### Recommendation
Create a single migration that DROPs and recreates ALL RLS policies with the `(select ...)` subselect pattern. This is a mechanical transformation that should be done in one atomic migration to avoid intermediate states.

---

## 5. Unindexed FK Check

### Status: 🟡 HIGH

### Findings

**Total FKs in database:** 107  
**FKs with covering indexes:** ~39  
**FKs without indexes:** ~68  
**FK index migration exists:** ❌ No

#### Sample Unindexed FK Columns (High-Impact)

| Table | Column | References | Query Impact |
|-------|--------|------------|-------------|
| `assignments` | `course_id` | `courses` | Every assignment list query |
| `badges` | `student_id` | `profiles` | Badge collection lookups |
| `courses` | `program_id` | `programs` | Course listing by program |
| `courses` | `teacher_id` | `profiles` | Teacher's course list |
| `evidence` | `clo_id` | `learning_outcomes` | Attainment rollup JOINs |
| `evidence` | `submission_id` | `submissions` | Grade→evidence chain |
| `grades` | `submission_id` | `submissions` | Grading interface |
| `learning_outcomes` | `course_id` | `courses` | CLO listing per course |
| `notifications` | `user_id` | `profiles` | Notification bell queries |
| `quiz_questions` | `quiz_id` | `quizzes` | Quiz rendering |
| `rubric_criteria` | `rubric_id` | `rubrics` | Rubric display |
| `submissions` | `assignment_id` | `assignments` | Submission listing |

Full list of all 68 unindexed FK columns is documented in the `supabase-audit-remediation` design document.

### Severity: HIGH
Sequential scans on FK columns degrade linearly with data growth. At 10k+ rows per table, JOIN queries will become noticeably slow.

### Recommendation
Create `supabase/migrations/XXXXXX_add_fk_indexes.sql` with `CREATE INDEX IF NOT EXISTS` for all 68 FK columns. Use naming convention `idx_{table}_{column}`.

---

## 6. Security Check

### Status: 🟡 MEDIUM

### Findings

#### 6.1 `.or()` Filter Sanitization

| Hook | `.or()` Usage | Sanitized | Status |
|------|---------------|-----------|--------|
| `useUsers.ts` | `query.or(\`full_name.ilike.%${safe}%,...\`)` | ✅ `sanitizePostgrestValue()` | ✅ Safe |
| `usePrograms.ts` | `query.or(\`name.ilike.%${safe}%,...\`)` | ✅ `sanitizePostgrestValue()` | ✅ Safe |
| `useCourses.ts` | `query.or(\`name.ilike.%${safe}%,...\`)` | ✅ `sanitizePostgrestValue()` | ✅ Safe |
| `useAuditLogs.ts` | `query.or(\`action.ilike.%${safe}%,...\`)` | ✅ `sanitizePostgrestValue()` | ✅ Safe |
| **`useGlobalSearch.ts`** | `.or(\`name.ilike.%${query}%,...\`)` | **❌ NOT sanitized** | 🔴 **Vulnerable** |
| `useBloomsProgression.ts` | `.or('bloom_explorer_awarded.eq.true,...')` | N/A (static string) | ✅ Safe |

**NEW FINDING:** `useGlobalSearch.ts` interpolates the raw `query` parameter directly into `.or()` and `.ilike()` filters without calling `sanitizePostgrestValue()`. This allows PostgREST filter injection via special characters (`.`, `,`, `(`, `)`, `%`, `*`).

#### 6.2 `award-xp` Edge Function Permission Validation

The `award-xp` function has **proper permission validation** (fixed in `platform-audit-fixes` spec):

- ✅ Checks if caller is using `SUPABASE_SERVICE_ROLE_KEY` (server-to-server)
- ✅ For non-service-role callers, verifies the caller is the student themselves
- ✅ Only allows self-triggered sources (`login`, `submission`, `journal`)
- ✅ Server-side XP amounts enforced (students cannot choose their own XP)
- ✅ Idempotent reference_id prevents duplicate awards
- ✅ Returns 403 Forbidden for unauthorized requests

#### 6.3 Other Security Observations

| Issue | Status | Severity |
|-------|--------|----------|
| `pg_net` in `public` schema | ❌ Not fixed | Medium |
| `leaderboard_weekly` exposed to API | ❌ Not fixed | Medium |
| Leaked password protection | ❌ Not enabled | Medium |
| `generate-transcript` creates buckets at runtime | ⚠️ Fragile | Low |

### Severity: MEDIUM
The `useGlobalSearch` vulnerability is the most actionable new finding. The remaining issues are tracked in the `supabase-audit-remediation` spec.

### Recommendation
1. Apply `sanitizePostgrestValue()` to the `query` parameter in `useGlobalSearch.ts`
2. Complete the `supabase-audit-remediation` spec tasks for pg_net, leaderboard, and password protection

---

## Issues Fixed Since Last Audit

The `platform-audit-fixes` spec (completed) addressed 17 frontend/code-level bugs:

| # | Fix | Status |
|---|-----|--------|
| 1 | Regenerated `database.ts` with full schema types | ✅ Fixed |
| 2 | Removed `any` casts from 25+ hook files | ✅ Fixed |
| 3 | Added missing dashboard keys to `queryKeys` factory | ✅ Fixed |
| 4 | Fixed column name mismatches (`streak_count`, `level`, `attainment_percent`) | ✅ Fixed |
| 5 | Corrected XP schedule constants (submission=25, grade=15, etc.) | ✅ Fixed |
| 6 | Fixed course name display in upcoming deadlines | ✅ Fixed |
| 7 | Batched parent dashboard queries | ✅ Fixed |
| 8 | Batched reorder operations (CLOs, PLOs, ILOs) | ✅ Fixed |
| 9 | Added pagination to list hooks | ✅ Fixed |
| 10 | Added audit logging to uncovered mutation hooks | ✅ Fixed |
| 11 | Created ErrorBoundary component | ✅ Fixed |
| 12 | Initialized Sentry error monitoring | ✅ Fixed |
| 13 | Created shared realtime subscription manager | ✅ Fixed |
| 14 | Replaced full-page spinner with shimmer loading | ✅ Fixed |
| 15 | Added permission validation to `award-xp` | ✅ Fixed |
| 16 | Created PostgREST filter sanitization utility | ✅ Fixed |
| 17 | Implemented server-side login rate limiting | ✅ Fixed |

Additionally, the April 1 audit migration fixed:
- RLS policies on `evidence`, `learning_outcomes`, `submissions`, `student_gamification`, `audit_logs`
- `search_path` on 5 functions
- 3 performance indexes (notifications unread, journal student+course, xp transactions student+source)

---

## Remaining Action Items (supabase-audit-remediation spec)

| Task | Description | Status | Severity |
|------|-------------|--------|----------|
| 3.1 | Create Edge Function deployment script | ❌ Not started | Critical |
| 3.2 | Create storage buckets migration | ❌ Not started | Critical |
| 3.3 | Create FK indexes migration (68 columns) | ❌ Not started | High |
| 3.4 | Optimize RLS policies with `(select ...)` pattern | ❌ Not started | High |
| 3.5 | Move `pg_net` to extensions schema | ❌ Not started | Medium |
| 3.6 | Secure `leaderboard_weekly` materialized view | ❌ Not started | Medium |
| 3.7 | Document leaked password protection manual step | ❌ Not started | Medium |
| 3.8 | Update `useLeaderboard` hook to use `get_leaderboard` RPC | ❌ Not started | Medium |

---

## NEW Issues Discovered This Audit

| # | Issue | Severity | Category | Recommendation |
|---|-------|----------|----------|----------------|
| N1 | **7 new Edge Functions not in deployment list**: `check-bonus-question`, `process-purchase`, `resolve-mystery-reward`, `score-reflection-quality`, `generate-reflection-digest`, `update-challenge-progress` (6 have directories) | Critical | Deployment | Add to deployment script |
| N2 | **2 Edge Functions referenced but missing directories**: `bulk-grade-export`, `semester-transition` | High | Code Gap | Create function directories or remove references |
| N3 | **`useGlobalSearch.ts` unsanitized `.or()` filter**: raw user input interpolated into PostgREST filter without `sanitizePostgrestValue()` | Medium | Security | Apply sanitization |
| N4 | **`transcripts` bucket not in migration**: `generate-transcript` creates bucket at runtime via `createBucket()` | Low | Infrastructure | Add to storage bucket migration |
| N5 | **`as never` type casts on newer tables**: `blooms_progression`, `bonus_xp_events`, `student_active_boosts` not in generated types | Low | Type Safety | Re-run `supabase gen types` |

---

## Summary by Severity

| Severity | Count | Issues |
|----------|-------|--------|
| 🔴 Critical | 3 | Edge Functions not deployed (42), Storage buckets missing (5), New functions not tracked (7) |
| 🟡 High | 4 | RLS not optimized (230+ bare calls), FK indexes missing (68), Missing function directories (2), Permissive policy consolidation needed |
| 🟠 Medium | 4 | `useGlobalSearch` unsanitized filter, `pg_net` in public schema, leaderboard exposed, leaked password protection disabled |
| 🟢 Low | 2 | `transcripts` bucket runtime creation, type generation gap |

---

*Report generated by Supabase Health Audit hook. Next scheduled audit: April 18, 2026.*
