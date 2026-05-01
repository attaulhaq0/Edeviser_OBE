# Edeviser Pre-Deployment Full-Stack Audit Report

**Date:** April 30, 2026  
**Auditor:** Kiro AI  
**Project:** Edeviser OBE + Gamification Platform  
**Supabase Project ID:** `cdlgtbvxlxjpcddjazzx`

---

## Executive Summary

| Category               | Critical | High   | Medium | Low   |
| ---------------------- | -------- | ------ | ------ | ----- |
| Build & Compile        | 1        | 1      | 0      | 0     |
| Frontend-Database Sync | 1        | 2      | 2      | 1     |
| Database Schema        | 0        | 1      | 1      | 0     |
| Security               | 1        | 3      | 1      | 1     |
| Data Integrity         | 0        | 0      | 0      | 0     |
| Frontend Quality       | 0        | 1      | 2      | 2     |
| Deployment Readiness   | 1        | 2      | 1      | 1     |
| **TOTAL**              | **4**    | **10** | **7**  | **5** |

---

## PART 1: Build & Compile Checks

### 1.1 ESLint (`npm run lint`)

**Result: FAIL — 8 errors, 2 warnings**

| #   | File                                              | Line | Error                                                |
| --- | ------------------------------------------------- | ---- | ---------------------------------------------------- |
| 1   | `src/__tests__/unit/flowCheckInDialog.test.tsx`   | 88   | `props` assigned but never used                      |
| 2   | `src/__tests__/unit/quickThoughtInput.test.tsx`   | 212  | `user` assigned but never used                       |
| 3   | `src/__tests__/unit/sessionIntentDialog.test.tsx` | 9    | `SessionIntent` defined but never used               |
| 4   | `src/components/shared/FlowCheckInDialog.tsx`     | 56   | setState in effect (cascading renders)               |
| 5   | `src/components/shared/FocusTimer.tsx`            | 183  | setState in effect (cascading renders)               |
| 6   | `src/components/shared/FocusTimer.tsx`            | 465  | Ref access during render                             |
| 7   | `src/pages/student/planner/FocusModePage.tsx`     | 100  | setState in effect (cascading renders)               |
| 8   | `src/types/database.ts`                           | 1090 | Parsing error (truncated file)                       |
| W1  | `src/components/shared/CreateSessionDialog.tsx`   | 82   | React Hook Form `watch()` incompatible with compiler |
| W2  | `src/components/shared/SessionIntentDialog.tsx`   | 154  | React Hook Form `watch()` incompatible with compiler |

### 1.2 TypeScript (`npx tsc --noEmit`)

**Result: FAIL — 1 error**

| File                    | Line | Error                                             |
| ----------------------- | ---- | ------------------------------------------------- |
| `src/types/database.ts` | 1090 | `'}' expected` — file is truncated mid-definition |

**Root cause:** `database.ts` was truncated during a previous generation attempt. Only tables `academic_calendar_events` through `courses` are present. ~60 tables are missing.

### 1.3 Tests (`npm test`)

**Result: FAIL — 1 failed, 332 passed (3564/3565 tests pass)**

| File                                                            | Test                                           | Error                                                                                                                                                                  |
| --------------------------------------------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/__tests__/properties/supabaseAuditFaults.property.test.ts` | RLS policy optimization — `auth.uid()` pattern | Property failed: migration `20260427120000_create_session_intent_review_reflection_tables.sql` uses bare `auth.uid()` in RLS policies instead of `(select auth.uid())` |

### 1.4 Build (`npm run build`)

**Result: FAIL** — blocked by TypeScript error in `database.ts`

---

## PART 2: Frontend-Database Sync Audit

### 2A. Route Completeness

Routes verified via `AppRouter.tsx`. All lazy-loaded page components exist at their expected paths. No orphaned routes detected.

### 2B. Hook-to-Table Mapping

**Tables referenced in hooks but MISSING from current `database.ts`:**
All 60+ tables beyond `courses` are missing from the truncated file. The MCP-generated types (from live schema) confirm all tables exist in the live database. Once `database.ts` is regenerated, all hooks will have proper type coverage.

**Hooks still using `as unknown as` casts (residual from incomplete type generation):**

- `useQuizzes.ts` — 5 casts (quiz_questions, quiz_attempts inserts)
- `useSurveys.ts` — 8 casts (survey casting)
- `useSubmissions.ts` — 2 casts
- `useRubrics.ts` — 2 casts (levels JSON)
- `usePracticeMode.ts` — 2 casts
- `useInstitutionSettings.ts` — 5 casts
- `useGradebook.ts` — 3 casts
- `useGrades.ts` — 3 casts
- `useJournal.ts` — 2 casts
- `useLearningPath.ts` — 1 cast
- `useExplanationConfidence.ts` — 4 casts
- `useHabitExport.ts` — 1 cast
- `useHabitDifficulty.ts` — 1 cast
- `useSabbaticalStatus.ts` — 1 cast
- `useNotificationPreferences.ts` — 1 cast (Json cast, acceptable)
- `useSemesters.ts` — 2 casts
- `useUsers.ts` — 1 cast
- `useDiscussions.ts` — residual casts

### 2C. Edge Function Inventory

**Deployed to Supabase (live):** Only 2 functions
| Slug | verify_jwt | Status |
|------|-----------|--------|
| `health` | false | ACTIVE |
| `quick-handler` | true | ACTIVE |

**Edge Functions in codebase (`supabase/functions/`) but NOT deployed:**

- `award-xp`, `process-streak`, `check-badges`, `calculate-attainment-rollup`
- `bulk-import-users`, `bulk-data-import`, `generate-accreditation-report`
- `generate-course-file`, `generate-quiz-questions`, `select-adaptive-question`
- `update-question-analytics`, `ai-at-risk-prediction`, `ai-feedback-draft`
- `ai-module-suggestion`, `compute-at-risk-signals`, `compute-habit-correlations`
- `send-email-notification`, `streak-risk-cron`, `weekly-summary-cron`
- `perfect-day-prompt`, `notification-digest`, `check-login-rate`
- `export-student-data`, `generate-transcript`, `generate-fee-receipt`
- `fee-overdue-check`, `exam-period-notify`, `auto-grade-quiz`
- `process-onboarding`, `generate-starter-week`, `suggest-goals`
- `improvement-bonus-check`, `challenge-completion`, `challenge-progress-update`
- `team-streak-risk-cron`, `import-competency-csv`
- `score-reflection-quality` (referenced but not found in codebase)
- `_shared/rateLimiter.ts` (shared utility)

### 2D. Cron Job Audit

**Vercel crons configured (9):**
| Path | Schedule | Edge Function Exists |
|------|----------|---------------------|
| `/api/cron/streak-risk` | `0 20 * * *` | ✅ `streak-risk-cron` |
| `/api/cron/weekly-summary` | `0 8 * * 1` | ✅ `weekly-summary-cron` |
| `/api/cron/compute-at-risk` | `0 2 * * *` | ✅ `compute-at-risk-signals` |
| `/api/cron/perfect-day-prompt` | `0 18 * * *` | ✅ `perfect-day-prompt` |
| `/api/cron/streak-reset` | `0 0 * * *` | ✅ `process-streak` |
| `/api/cron/leaderboard-refresh` | `*/5 * * * *` | ⚠️ No dedicated EF |
| `/api/cron/ai-at-risk-prediction` | `0 3 * * *` | ✅ `ai-at-risk-prediction` |
| `/api/cron/notification-digest` | `0 20 * * *` | ✅ `notification-digest` |
| `/api/cron/fee-overdue-check` | `0 6 * * *` | ✅ `fee-overdue-check` |

**Cron file exists but NOT in vercel.json:**

- `api/cron/exam-period-notify.ts` — orphaned, never scheduled

---

## PART 3: Database Schema Integrity

### 3A. Migration vs Live Schema

**Tables in migrations but NOT in live database:**

- `login_attempts` (from `check-login-rate` migration) — **NOT APPLIED**
- `flow_check_ins` (from `20260427120000` migration) — **NOT APPLIED**
- `session_intents` (from `20260427120000` migration) — **NOT APPLIED**
- `review_schedules` (from `20260427120000` migration) — **NOT APPLIED**
- `reflection_digests` (from `20260427120000` migration) — **NOT APPLIED**
- `reflection_quality_scores` (from `20260427120000` migration) — **NOT APPLIED**
- `team_gamification` (referenced in `award-xp` edge function) — **NOT IN DB**

### 3B. RLS Policy Coverage

**Result: ALL 101 tables have RLS enabled ✅**

Helper functions `auth_user_role()` and `auth_institution_id()` exist in the schema ✅

### 3C. Supabase Security Advisors

**1 storage warning:**

- Public bucket `avatars` has broad SELECT policy allowing file listing

**12 SECURITY DEFINER functions callable by `anon` role:**

- `get_badge_spotlight`, `get_earn_spend_ratio`, `get_effective_price`
- `get_leaderboard`, `get_xp_balance`, `process_marketplace_purchase`
- `recalculate_dynamic_prices`, `recalculate_league_tiers`
- `rls_auto_enable`, `seed_marketplace_items`, `trigger_attainment_rollup`

**Auth warning:**

- Leaked password protection is DISABLED

---

## PART 4: Security Audit

### 4A. Environment Variables

- `.env` and `.env.local` are in `.gitignore` ✅
- No hardcoded Supabase URLs or keys in source code ✅
- No `SUPABASE_SERVICE_ROLE_KEY` in client-side code ✅
- `.env.example` documents all required variables ✅

### 4B. Auth Flow

- `AuthProvider.tsx` handles session management ✅
- `AppRouter.tsx` has role-based route guards ✅
- Login rate limiting has client-side tracker + server-side edge function (but `login_attempts` table not applied to live DB)

### 4C. Input Validation

- Most mutation hooks use Zod schemas ✅
- `sanitizePostgrestValue` utility exists for filter injection prevention ✅

### 4D. Edge Function Security

- Only 2 functions deployed — the other ~35 are NOT deployed
- `health` function has `verify_jwt: false` (acceptable for health checks)
- `quick-handler` has `verify_jwt: true` ✅

---

## PART 5: Data Integrity Invariants

Based on RLS policies and code review:

- Evidence records: RLS has no UPDATE/DELETE policies ✅
- Audit logs: Append-only pattern enforced ✅
- XP transactions: Append-only ✅
- Leaderboard respects `leaderboard_anonymous` flag ✅
- Outcome mapping weight validation exists in frontend Zod schemas ✅

---

## PART 6: Frontend Quality

### 6A. Dead Code

- `database_new.ts` — empty temp file from failed type generation (2 lines)
- `tsc_check.txt`, `tsc_out.txt` — diagnostic temp files in root

### 6B. i18n Coverage

- Locale files exist for `en/` (admin, auth, teacher)
- Arabic locale files referenced but coverage is partial
- Many page components have hardcoded English strings (common across the codebase)

### 6C. Accessibility

- Shadcn/ui components used consistently ✅
- `src/__tests__/helpers/a11y.ts` helper exists ✅

### 6D. Error Handling

- `ErrorBoundary.tsx` exists and wraps app ✅
- Sentry integration initialized ✅
- `RealtimeStatusBanner` for connection status ✅

---

## PART 7: Deployment Readiness

### 7A. Build Output

- `npm run build` FAILS due to truncated `database.ts`
- Bundle size: Cannot measure (build fails)
- Fix: Regenerate `database.ts` from Supabase MCP types

### 7B. Environment Config

- `vercel.json` is MISSING SPA rewrite rules (`"rewrites": [{"source": "/(.*)", "destination": "/index.html"}]`)
- Without this, direct URL navigation to any route (e.g., `/admin/dashboard`) will return 404
- Only 2 of ~35 Edge Functions are deployed to Supabase
- `exam-period-notify` cron file exists but is not scheduled in vercel.json

### 7C. Temp File Cleanup

| File                        | Action                                 |
| --------------------------- | -------------------------------------- |
| `tsc_check.txt`             | Delete (already in .gitignore pattern) |
| `tsc_out.txt`               | Delete (already in .gitignore pattern) |
| `src/types/database_new.ts` | Delete (empty temp file)               |

---

## CRITICAL BLOCKERS (Must Fix Before Deploy)

### C1. `database.ts` is truncated — Build fails

- **File:** `src/types/database.ts`
- **Impact:** TypeScript compilation fails, `npm run build` fails, cannot deploy
- **Fix:** Run `npx supabase gen types --linked > src/types/database.ts` or write the MCP-generated types (already retrieved during this audit — 101 tables, all enums, views, functions, and helper types)

### C2. Missing SPA rewrite in `vercel.json`

- **File:** `vercel.json`
- **Impact:** All client-side routes return 404 on direct navigation or page refresh
- **Fix:** Add `"rewrites": [{"source": "/(.*)", "destination": "/index.html"}]`

### C3. 33+ Edge Functions NOT deployed

- **Impact:** All backend logic (XP awards, streak processing, badge checks, attainment rollup, quiz generation, AI features, email notifications, etc.) will not work
- **Fix:** Deploy all edge functions via `supabase functions deploy` or the deploy script at `scripts/deploy-edge-functions.sh`

### C4. 6 migration tables NOT applied to live database

- **Tables:** `login_attempts`, `flow_check_ins`, `session_intents`, `review_schedules`, `reflection_digests`, `reflection_quality_scores`
- **Impact:** Features referencing these tables (server-side rate limiting, focus mode, spaced repetition, reflection digests) will fail at runtime
- **Fix:** Apply pending migrations via `supabase db push` or `supabase migration up`

---

## HIGH PRIORITY (Should Fix Before Deploy)

### H1. 12 SECURITY DEFINER functions callable by `anon` role

- **Functions:** `get_badge_spotlight`, `get_earn_spend_ratio`, `get_effective_price`, `get_leaderboard`, `get_xp_balance`, `process_marketplace_purchase`, `recalculate_dynamic_prices`, `recalculate_league_tiers`, `rls_auto_enable`, `seed_marketplace_items`, `trigger_attainment_rollup`
- **Impact:** Unauthenticated users can call these functions via PostgREST RPC, potentially manipulating marketplace purchases, league tiers, and XP balances
- **Fix:** `REVOKE EXECUTE ON FUNCTION <name> FROM anon;` for each function

### H2. Leaked password protection disabled

- **Impact:** Users can sign up with known compromised passwords
- **Fix:** Enable in Supabase Dashboard → Auth → Settings → Password Protection

### H3. Public bucket `avatars` allows file listing

- **Impact:** Anyone can enumerate all uploaded avatar files
- **Fix:** Remove or narrow the `avatars_public_read` SELECT policy on `storage.objects`

### H4. 8 ESLint errors (zero-warning policy violated)

- **Files:** `FlowCheckInDialog.tsx`, `FocusTimer.tsx`, `FocusModePage.tsx`, 3 test files
- **Impact:** CI pipeline will fail
- **Fix:** Refactor setState-in-effect patterns; remove unused variables in tests

### H5. `team_gamification` table missing from live DB

- **Impact:** `award-xp` edge function references this table for team XP — will throw runtime errors
- **Fix:** Create migration for `team_gamification` table or remove references

### H6. 1 property test failing (RLS `auth.uid()` pattern)

- **File:** `src/__tests__/properties/supabaseAuditFaults.property.test.ts`
- **Impact:** Migration uses bare `auth.uid()` instead of `(select auth.uid())` — performance issue on large tables
- **Fix:** Update migration to use subquery pattern

### H7. ~40 `as unknown as` casts remaining in hooks

- **Files:** 18+ hook files
- **Impact:** Type safety bypassed — column name mismatches won't be caught at compile time
- **Fix:** After regenerating `database.ts`, remove casts and use typed Supabase client directly

### H8. `exam-period-notify` cron not scheduled

- **File:** `api/cron/exam-period-notify.ts` exists but not in `vercel.json` crons
- **Impact:** Exam period notifications will never fire
- **Fix:** Add to vercel.json crons or remove the file

### H9. React Hook Form `watch()` incompatible with React Compiler

- **Files:** `CreateSessionDialog.tsx:82`, `SessionIntentDialog.tsx:154`
- **Impact:** Components may have stale UI when React Compiler is enabled
- **Fix:** Use `useWatch()` hook instead of `form.watch()`

### H10. Ref accessed during render in FocusTimer

- **File:** `src/components/shared/FocusTimer.tsx:465`
- **Impact:** Component may not update correctly
- **Fix:** Move ref access to effect or event handler

---

## MEDIUM PRIORITY (Fix Soon After Deploy)

### M1. i18n coverage incomplete

- Arabic locale files are partial; many components have hardcoded English strings
- **Impact:** Arabic users see mixed English/Arabic UI

### M2. `database_new.ts` temp file in source

- **File:** `src/types/database_new.ts`
- **Fix:** Delete

### M3. `tsc_check.txt` and `tsc_out.txt` in root

- Already covered by `.gitignore` patterns but should be deleted from working tree

### M4. `leaderboard-refresh` cron has no dedicated Edge Function

- The cron API route likely calls a Supabase function or does inline work
- Verify it works correctly

### M5. Residual `as unknown as` casts in hooks

- Even after type regeneration, some casts for JSON columns (`levels`, `options`, `target_outcomes`) may be needed
- Review each cast and replace with proper type narrowing where possible

### M6. setState in useEffect patterns

- 3 components call setState synchronously in effects
- Refactor to use state initialization or derived state

### M7. `score-reflection-quality` Edge Function referenced but not found

- Referenced in `reflection_quality_scores` table comments but no function folder exists

---

## LOW PRIORITY (Tech Debt)

### L1. Unused test variables

- 3 test files have unused variable warnings
- Quick fix: prefix with `_` or remove

### L2. Console.log debugging

- Not systematically checked but common in development
- Run `grep -r "console.log" src/ --include="*.ts" --include="*.tsx" | grep -v test | grep -v __tests__` before deploy

### L3. Bundle size unknown

- Cannot measure until build succeeds
- Performance budget config exists at `performance-budget.config.ts`

### L4. E2E tests not run

- `e2e/` folder has specs but Playwright tests were not executed in this audit
- Run before production launch

### L5. Load tests not validated

- `load-tests/submission.js` exists but was not executed

---

## Summary & Recommended Action Plan

### Immediate (Block Deploy):

1. **Regenerate `database.ts`** from Supabase MCP (types already retrieved)
2. **Add SPA rewrites** to `vercel.json`
3. **Deploy all Edge Functions** via `scripts/deploy-edge-functions.sh`
4. **Apply pending migrations** (`login_attempts`, `session_intents`, `flow_check_ins`, `review_schedules`, `reflection_digests`, `reflection_quality_scores`)

### Before Go-Live:

5. Revoke `anon` EXECUTE on 12 SECURITY DEFINER functions
6. Enable leaked password protection
7. Fix 8 ESLint errors
8. Fix or update the failing property test
9. Remove `as unknown as` casts after type regeneration
10. Schedule `exam-period-notify` cron or remove it

### Post-Launch:

11. Complete Arabic i18n coverage
12. Clean up temp files
13. Run E2E and load tests
14. Audit bundle size against performance budget
