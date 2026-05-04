# Edeviser Pre-Deployment Audit — READ-ONLY Documentation Prompt

> **Hand this prompt to Claude Opus 4.7 (or any model with full codebase + Supabase MCP access).**
> It will produce a complete audit report document. It will NOT modify any code, files, configs, or database state.

---

## CRITICAL CONSTRAINT — READ ONLY

**You are in READ-ONLY audit mode. You MUST NOT:**
- Create, edit, delete, or modify ANY file in the codebase
- Run any command that writes to disk (no `npm install`, no `git commit`, no file writes)
- Execute any Supabase MCP mutation (no `apply_migration`, no `execute_sql` that modifies data)
- Suggest or apply any code fix inline — all findings go into the report only
- Create branches, commits, PRs, or any git operations that modify state

**You MAY:**
- Read any file in the codebase
- Run read-only commands: `npm run lint`, `npx tsc --noEmit`, `npm test -- --run`, `npm run build`, `git ls-files`, `git status`, `git log`
- Use Supabase MCP read-only tools: `list_tables`, `get_advisors`, `list_edge_functions`, `generate_typescript_types`
- Search the codebase with grep/find
- Count files, lines, sizes

**Your ONLY output is a single comprehensive markdown document: the audit report.**

---

## Project Context

| Field | Value |
|---|---|
| **App** | Edeviser — OBE + Gamification education platform |
| **Stack** | React 18, TypeScript strict, Vite 6, Tailwind CSS v4, Shadcn/ui, TanStack Query v5, React Router v7, Zustand, i18next |
| **Backend** | Supabase (Postgres + RLS + Edge Functions + Realtime + Storage) |
| **Supabase Project** | `cdlgtbvxlxjpcddjazzx` (region: `ap-northeast-1`) |
| **Hosting** | Vercel (SPA mode, Vite framework preset) |
| **Roles** | admin, coordinator, teacher, student, parent |
| **CI Pipeline** | `npm run lint` → `npx tsc --noEmit` → `npm test` (vitest --run) → `npm run build` |
| **Node** | ≥20.0.0 |

---

## INSTRUCTIONS

Execute every part below in order. Do NOT skip any part. For each check, classify findings as:
- 🚫 **BLOCKER** — will cause deploy failure or runtime crash
- ⚠️ **WARNING** — won't crash but should be fixed before or shortly after deploy
- ✅ **PASS** — no issues found

Collect ALL findings and produce ONE final report document at the end. Do not output partial results as you go — only the final complete report.

---

## PART 1: CI Pipeline Verification

Run all four commands (these are read-only build/check commands, allowed):

```bash
npm run lint
npx tsc --noEmit
npm test -- --run
npm run build
```

**Document:**
- Pass/fail status for each command
- If any fail, capture the full error output in the report
- If `npm run build` succeeds, record the total bundle size from `dist/` output
- Record chunk sizes for: `vendor-react`, `vendor-query`, `vendor-charts`, `vendor-motion`
- Flag any single chunk over 500KB gzipped as a warning

---

## PART 2: Vercel Deployment Configuration

### 2.1 — vercel.json
Read `vercel.json` and verify:
- SPA rewrite rule exists: `"source": "/((?!assets/).*)"` → `"/index.html"`
- API rewrite: `"/api/(.*)"` → `"/api/$1"`
- Security headers present: `Strict-Transport-Security`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, `Content-Security-Policy`
- CSP `connect-src` includes `https://*.supabase.co`, `wss://*.supabase.co`, `https://*.sentry.io`
- Cache headers: `/assets/*` = `immutable`, `/index.html` = `no-cache`, `/sw.js` = `no-cache`
- Framework = `vite`, buildCommand = `npm run build`, outputDirectory = `dist`

### 2.2 — Vercel Cron ↔ File Cross-Reference
Every cron path in `vercel.json` must have a matching file in `api/cron/`:

| Cron Path | Expected File | Status |
|---|---|---|
| `/api/cron/streak-risk` | `api/cron/streak-risk.ts` | ? |
| `/api/cron/weekly-summary` | `api/cron/weekly-summary.ts` | ? |
| `/api/cron/compute-at-risk` | `api/cron/compute-at-risk.ts` | ? |
| `/api/cron/perfect-day-prompt` | `api/cron/perfect-day-prompt.ts` | ? |
| `/api/cron/streak-reset` | `api/cron/streak-reset.ts` | ? |
| `/api/cron/leaderboard-refresh` | `api/cron/leaderboard-refresh.ts` | ? |
| `/api/cron/ai-at-risk-prediction` | `api/cron/ai-at-risk-prediction.ts` | ? |
| `/api/cron/notification-digest` | `api/cron/notification-digest.ts` | ? |
| `/api/cron/fee-overdue-check` | `api/cron/fee-overdue-check.ts` | ? |

Also check: are there files in `api/cron/` NOT listed in `vercel.json` crons? (e.g. `exam-period-notify.ts` exists on disk — is it intentionally excluded or missing from crons?)

Check each cron handler uses `CRON_SECRET` for authentication.

### 2.3 — vite.config.ts
- `base` is not set (defaults to `'/'`) or explicitly `'/'`
- `@` alias resolves to `./src`
- Test environment is `happy-dom`

### 2.4 — Environment Variables
Verify `.env.example` documents all required vars. Document which must be set in Vercel:

**Client-side (VITE_ prefix):** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SENTRY_DSN` (optional)

**Server-side (cron routes):** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`

**Edge Function secrets (supabase secrets set):** `RESEND_API_KEY`, `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`

Verify `.env` and `.env.local` are in `.gitignore`. Run `git ls-files .env*` — should return only `.env.example`.

---

## PART 3: Route ↔ Component Integrity

### 3.1 — Route File Resolution
Read `src/router/AppRouter.tsx`. For EVERY `lazy(() => import(...))` call, verify the target file exists on disk. List any missing files — these cause runtime chunk-load failures.

### 3.2 — Role Coverage
Verify each role has: layout component, dashboard route, `RouteGuard` wrapper with correct `allowedRoles`.

| Role | Layout | Dashboard Route | RouteGuard | Status |
|---|---|---|---|---|
| admin | AdminLayout | /admin/dashboard | allowedRoles=["admin"] | ? |
| coordinator | CoordinatorLayout | /coordinator/dashboard | allowedRoles=["coordinator"] | ? |
| teacher | TeacherLayout | /teacher/dashboard | allowedRoles=["teacher"] | ? |
| student | StudentLayout | /student/dashboard | allowedRoles=["student"] | ? |
| parent | ParentLayout | /parent/dashboard | allowedRoles=["parent"] | ? |

### 3.3 — Public Routes (No Auth Guard)
Verify NO `RouteGuard` on: `/login`, `/reset-password`, `/update-password`, `/portfolio/:student_id`, `/terms`, `/privacy`

### 3.4 — Orphaned Pages
Check for page files in `src/pages/` that are NOT imported in `AppRouter.tsx`. List them — they may be features built but never wired up.

---

## PART 4: Edge Function ↔ Frontend Sync

### 4.1 — Edge Function Inventory
List every folder in `supabase/functions/` (excluding `_shared/`). Record total count.

### 4.2 — Caller Cross-Reference
For each Edge Function, search `src/` for `supabase.functions.invoke('function-name')` or equivalent. Classify each as:
- **Has frontend caller** — OK
- **Called by cron/trigger only** — OK (document which cron/trigger)
- **Orphaned** — no caller found anywhere (flag as warning)

Also search for frontend code invoking functions that DON'T exist in `supabase/functions/` (flag as blocker).

### 4.3 — Edge Function Quality Spot-Check
Read at least 10 Edge Function `index.ts` files and verify:
- CORS preflight handling (`OPTIONS` → `'ok'`)
- JSON error responses with status codes
- `Deno.env.get()` for secrets (never hardcoded)
- Deno imports (esm.sh), not npm

### 4.4 — Shared Utilities
Check `supabase/functions/_shared/` — verify shared modules are imported correctly by functions that use them.

---

## PART 5: Database ↔ Frontend Type Sync

### 5.1 — File Health
- Record `src/types/database.ts` file size (must be >50KB)
- Verify it starts with `export type Json =` and contains `export type Database =`
- Count tables in the `Tables` section

### 5.2 — Live DB Comparison
Use Supabase MCP `list_tables` to count tables in live DB. Compare with `database.ts`:
- If counts differ, list every discrepancy (table in DB but not types, or vice versa)
- Flag as blocker if frontend code references missing tables

### 5.3 — Hook Spot-Check (10 hooks)
For each of these hooks, verify table names and column names match `database.ts`:
`useUsers`, `useStudentDashboard`, `useLeaderboard`, `useXPHistory`, `useChallenges`, `useTeams`, `useMarketplace`, `useJournal`, `useAttendance`, `useGradebook`

---

## PART 6: Security Checklist

### 6.1 — Hardcoded Secrets Scan
Search entire `src/` for:
- Strings containing `supabase.co` (should only be env var references)
- Strings starting with `sb-`, `sbp_`, `eyJ`, `sk-`, `sk-ant-`
- Any `SUPABASE_SERVICE_ROLE_KEY` reference in `src/` (MUST NOT exist)

### 6.2 — Route Guard Verification
Verify in `AppRouter.tsx` every protected route block has correct `RouteGuard`:
- `/admin/*` → `allowedRoles={["admin"]}`
- `/coordinator/*` → `allowedRoles={["coordinator"]}`
- `/teacher/*` → `allowedRoles={["teacher"]}`
- `/student/*` → `allowedRoles={["student"]}`
- `/parent/*` → `allowedRoles={["parent"]}`
- `/student/focus/:sessionId` → also has RouteGuard

### 6.3 — RLS Verification
Use Supabase MCP `get_advisors` type `security`. Report ALL warnings. Every table must have RLS enabled.

### 6.4 — Sensitive Console Logging
Search `src/` (excluding `src/__tests__/`) for `console.log` containing variables named `password`, `token`, `key`, `secret`, `credential`. Report total `console.log` count in production code.

### 6.5 — CSP Validation
Review CSP header in `vercel.json`:
- `script-src 'self'` (no `unsafe-eval`)
- `frame-ancestors 'none'`
- `connect-src` includes all required domains

---

## PART 7: Supabase Production Readiness

### 7.1 — Performance Advisors
Use Supabase MCP `get_advisors` type `performance`. List every warning with severity.

### 7.2 — Security Advisors
Use Supabase MCP `get_advisors` type `security`. List every warning with severity.

### 7.3 — Critical DB Functions
Verify these exist: `auth_user_role()`, `auth_institution_id()`. Verify `supabase/functions/health/` exists.

### 7.4 — Deployed vs Code Functions
Use Supabase MCP `list_edge_functions`. Compare with `supabase/functions/` folders:
- Functions in code but NOT deployed
- Deployed functions NOT in code (stale)

### 7.5 — Migration Integrity
Check `supabase/migrations/` — verify chronological order, no duplicate timestamps.

---

## PART 8: Cleanup & Hygiene

### 8.1 — Temp/Debug Files
Search project root for: `tsc_out.txt`, `tsc_check.txt`, `tsc_errors.txt`, `tsc_summary.txt`, `lint_out.txt`, `test_out.txt`, `.supabase-types-temp.txt`, `scripts/write-db-types.js`, `scripts/pipe-types.js`, `*.log`, `nul`

### 8.2 — TODO/FIXME/HACK Comments
Search `src/` for `TODO`, `FIXME`, `HACK`, `XXX`:
- Total count per category
- Top 10 most critical (in core business logic)
- Flag any saying "temporary", "remove before production", "workaround"

### 8.3 — Console Statement Count
Count `console.log`, `console.warn`, `console.error` in `src/` (excluding tests):
- Counts per type
- Flag `console.log` as warnings

### 8.4 — Package.json Audit
- No `file:` or `link:` dependencies
- All versions pinned (exact or `^`, no `*` or `latest`)
- `node_modules/` in `.gitignore`
- Run `npm audit` — report high/critical vulnerabilities

### 8.5 — Git Cleanliness
- `git ls-files .env*` → should return only `.env.example`
- `git status` → report untracked files that should be gitignored
- `.claude/worktrees/` in `.gitignore`
- Any tracked files >1MB that shouldn't be

---

## PART 9: Runtime Sanity Checks

### 9.1 — Supabase Client (`src/lib/supabase.ts`)
- Uses `createClient<Database>(url, key)` with `import.meta.env.VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- `Database` type imported from `@/types/database`
- No hardcoded fallback values

### 9.2 — Auth Provider (`src/providers/AuthProvider.tsx`)
- Handles `onAuthStateChange`
- Handles session refresh
- Provides user role
- Has loading state during auth init

### 9.3 — Theme Provider (`src/providers/ThemeProvider.tsx`)
- Dark mode class on `<html>`
- Persists to localStorage
- Respects `prefers-color-scheme`

### 9.4 — Language Provider (`src/providers/LanguageProvider.tsx`)
- i18next init with `en` fallback
- Arabic (`ar`) supported
- RTL `dir` attribute set when Arabic active
- Translation files exist in `public/locales/` or `src/locales/`

### 9.5 — PWA Assets
- `public/manifest.json` exists with correct `name`, `start_url`, `display`
- `public/sw.js` exists
- `index.html` has `<link rel="manifest">` and `<meta name="theme-color">`
- Icons referenced in manifest exist

### 9.6 — Error Monitoring
- Sentry initialized in `src/main.tsx` or a provider
- `ErrorBoundary` exists at `src/components/shared/ErrorBoundary.tsx`
- Used as top-level wrapper

### 9.7 — Font Loading
- `index.html` has `<link rel="preconnect">` for Google Fonts
- Both `Noto Sans` and `Noto Sans Arabic` loaded with `display=swap`

---

## PART 10: Feature Completeness — Dashboard Imports

For each dashboard, read the file and verify every imported hook/component exists on disk:

| Dashboard | File | Status |
|---|---|---|
| Admin | `src/pages/admin/AdminDashboard.tsx` | ? |
| Coordinator | `src/pages/coordinator/CoordinatorDashboard.tsx` | ? |
| Teacher | `src/pages/teacher/TeacherDashboard.tsx` | ? |
| Student | `src/pages/student/StudentDashboard.tsx` | ? |
| Parent | `src/pages/parent/ParentDashboard.tsx` | ? |

List every import that resolves to a missing file.

---

## PART 11: Cross-Cutting Concerns

### 11.1 — Realtime
- `src/hooks/useRealtime.ts` exists and provides centralized subscription management
- Components don't create per-component Supabase channels directly
- Reconnection/fallback logic exists

### 11.2 — Offline Support
- `useOfflineQueue` hook exists and is used
- Service worker handles offline gracefully

### 11.3 — Accessibility
- `index.html` has `lang="en"`
- `<main id="main-content" tabIndex={-1}>` in AppRouter
- Shadcn/ui components used (include ARIA)
- `eslint-plugin-jsx-a11y` in devDependencies and ESLint config

### 11.4 — i18n Completeness
- Compare `src/locales/en/` and `src/locales/ar/` file structure
- Flag translation keys in English but missing in Arabic
- Spot-check 5 pages for `t()` usage

### 11.5 — Performance Patterns
- N+1 query patterns in hooks
- Large lists use pagination (`useUsers`, `useAuditLogs`, `useLeaderboard`)
- React.memo / useMemo for expensive computations

---

## PART 12: Deployment Checklist Generation

### 12.1 — Build Output
After `npm run build`, record:
- Total `dist/` folder size
- `dist/index.html` exists
- `dist/assets/` contains JS and CSS chunks
- Flag if total >10MB (warning) or >25MB (blocker)

### 12.2 — Vercel Environment Variable Checklist
Generate this checklist for the report:

```
[ ] VITE_SUPABASE_URL = https://cdlgtbvxlxjpcddjazzx.supabase.co
[ ] VITE_SUPABASE_ANON_KEY = (from Supabase Dashboard → Settings → API)
[ ] VITE_SENTRY_DSN = (from Sentry, optional)
[ ] SUPABASE_URL = https://cdlgtbvxlxjpcddjazzx.supabase.co
[ ] SUPABASE_SERVICE_ROLE_KEY = (from Supabase Dashboard → Settings → API → service_role)
[ ] CRON_SECRET = (generate random 32+ char string)
```

### 12.3 — Supabase Edge Function Secrets Checklist

```
[ ] RESEND_API_KEY
[ ] OPENAI_API_KEY or ANTHROPIC_API_KEY
```

---

## PART 13: Post-Deploy Smoke Test Plan

Include this manual checklist in the report:

```
[ ] Visit production URL — page loads, no blank screen
[ ] Login as admin → redirects to /admin/dashboard, data loads
[ ] Login as student → redirects to /student/dashboard, data loads
[ ] Admin: Users page — table renders with data
[ ] Admin: Audit Log — entries appear
[ ] Student: Leaderboard — data loads
[ ] Student: Habits page — heatmap renders
[ ] Student: Marketplace — items load
[ ] Teacher: Grading queue — submissions appear
[ ] Teacher: Create quiz — form submits
[ ] Coordinator: Curriculum matrix — data renders
[ ] Parent: Login → see linked student data
[ ] Password reset flow — email arrives via Resend
[ ] Browser console — no errors
[ ] Mobile viewport — responsive layout works
[ ] Switch to Arabic — RTL layout activates
[ ] Dark mode toggle — theme switches
[ ] Sentry receiving events (trigger test error)
[ ] Vercel Dashboard → Cron Jobs — all 9 scheduled
```

---

## FINAL OUTPUT FORMAT

Produce exactly ONE markdown document with this structure. Nothing else.

```markdown
═══════════════════════════════════════════════════════════════
  EDEVISER PRE-DEPLOYMENT AUDIT REPORT
  Date: [today's date]
  Auditor: Claude Opus 4.7
  Mode: READ-ONLY (no code changes made)
═══════════════════════════════════════════════════════════════

## Executive Summary
[2-3 sentence overview of findings]

## 🚫 DEPLOY BLOCKERS
[Issues that will cause deploy failure or runtime crash. Must fix before deploy.]

1. [Part X.Y] Description
   → Impact: what breaks
   → Suggested fix: what the developer should do (DO NOT apply it yourself)

## ⚠️ WARNINGS
[Non-blocking issues. Fix soon after deploy.]

1. [Part X.Y] Description
   → Impact: what could go wrong
   → Suggested fix: recommendation

## ✅ PASSED CHECKS
[Areas that passed cleanly]

- Part 1: CI Pipeline — [status]
- Part 2: Vercel Config — [status]
- Part 3: Route Integrity — [status]
- Part 4: Edge Functions — [status]
- Part 5: DB Type Sync — [status]
- Part 6: Security — [status]
- Part 7: Supabase Readiness — [status]
- Part 8: Cleanup — [status]
- Part 9: Runtime — [status]
- Part 10: Dashboards — [status]
- Part 11: Cross-Cutting — [status]

## 📊 METRICS

| Metric | Value |
|---|---|
| Bundle size (total) | X.XX MB |
| Bundle size (gzipped) | X.XX MB |
| Largest chunk | name — X.XX KB |
| Route count | XXX |
| Edge Functions (code) | XX |
| Edge Functions (deployed) | XX |
| DB Tables (types file) | XX |
| DB Tables (live DB) | XX |
| Hooks total | XXX |
| console.log count (prod) | XX |
| TODO/FIXME count | XX |
| npm audit high/critical | XX |
| Test count | XX passed / XX failed |
| Lint warnings | XX |
| TypeScript errors | XX |

## 📋 DETAILED FINDINGS BY PART

### Part 1: CI Pipeline
[Full details]

### Part 2: Vercel Configuration
[Full details including cron cross-reference table]

### Part 3: Route ↔ Component Integrity
[Full details including missing files if any]

### Part 4: Edge Function ↔ Frontend Sync
[Full details including orphaned/missing function lists]

### Part 5: Database ↔ Frontend Type Sync
[Full details including discrepancy list]

### Part 6: Security
[Full details including secret scan results]

### Part 7: Supabase Production Readiness
[Full details including advisor warnings]

### Part 8: Cleanup & Hygiene
[Full details including temp files, TODO list]

### Part 9: Runtime Sanity
[Full details for each provider/config check]

### Part 10: Dashboard Import Verification
[Full details per dashboard]

### Part 11: Cross-Cutting Concerns
[Full details]

## 📋 PRE-DEPLOY CHECKLISTS

### Vercel Environment Variables
[Checklist from Part 12.2]

### Supabase Secrets
[Checklist from Part 12.3]

### Post-Deploy Smoke Tests
[Checklist from Part 13]

## 🏁 VERDICT: GO / NO-GO

[Clear recommendation with reasoning]
[If NO-GO: list the specific blockers that must be resolved first]
[If GO: note any warnings to address post-deploy]
```

---

**REMINDER: You are in READ-ONLY mode. Produce the report document above as your complete output. Do not modify any files.**
