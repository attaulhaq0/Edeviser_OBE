# PR Triage Report — Edeviser Open PRs

**Generated:** 2025-07-20
**Scope:** All open PRs on Edeviser repo, analyzed against local `main` branch code

---

## Executive Summary

| Category | Count | Action Needed |
|----------|-------|---------------|
| 🛡️ Sentinel Security | 5 PRs (#80, #76, #74, #72, #70) | 2 NEED FIX, 3 SKIP |
| ⚡ Bolt Performance | 12 PRs (#61–#65, #69, #71, #73, #75, #78, #79, #81) | 1 MERGE, 11 SKIP (duplicates) |
| 🔧 CI/Infra Fix | 1 PR (#60) | SKIP (superseded) |
| 📦 Dependabot | 8 PRs (#45, #48, #50, #51, #53, #54, #59, #66–#68, #77) | REVIEW separately |
| 🔒 Security Audit | 1 PR (#82) | REVIEW separately |

**Critical finding:** Most Sentinel PRs do NOT actually modify the source files they claim to fix — they only touch `.github/workflows/ci.yml` and `sentinel.md`. The actual vulnerabilities still exist in the local codebase.

---

## Sentinel Security PRs (Detailed Analysis)

### PR #80 — 🛡️ Sentinel: [CRITICAL] Fix missing authentication in bulk data import Edge Function
| Field | Value |
|-------|-------|
| **Category** | Security — Missing Auth |
| **Files Changed (PR)** | `.github/workflows/ci.yml`, `sentinel.md`, `src/__tests__/properties/aiCopilot.property.test.ts` |
| **Target File** | `supabase/functions/bulk-data-import/index.ts` |
| **Issue** | Edge Function uses `SUPABASE_SERVICE_ROLE_KEY` without verifying caller's JWT. Any unauthenticated request can insert data. |
| **Local Status** | ❌ **NEEDS FIX** — Local file has NO `authHeader` check, NO `getUser()` call. Uses `performed_by` from client payload (spoofable). |
| **Recommended Action** | ⚠️ **SKIP this PR** (doesn't actually fix the file). Apply the fix manually to `bulk-data-import/index.ts`. |

**Evidence from local file:**
```typescript
// Line 36-39: No auth check — goes straight to service role client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);
// Line 41: performed_by comes from untrusted client payload
const { import_type, csv_content, performed_by } = await req.json();
```

---

### PR #76 — 🛡️ Sentinel: [CRITICAL] Fix missing Supabase error check in useAnnouncements
| Field | Value |
|-------|-------|
| **Category** | Security — Silent Error |
| **Files Changed (PR)** | `.github/workflows/ci.yml` only |
| **Target File** | `src/hooks/useAnnouncements.ts` |
| **Issue** | Notification insert after announcement creation uses `.then(() => {})` — swallows errors silently. |
| **Local Status** | ⚠️ **NEEDS FIX** — Local file still has the `.then(() => { /* best-effort */ })` pattern on line ~108. |
| **Recommended Action** | ⚠️ **SKIP this PR** (doesn't modify the hook). Fix manually — add `{ error }` destructuring and `if (error) throw error`. |

**Evidence from local file:**
```typescript
// Line ~108: Error swallowed silently
await supabase.from('notifications').insert({
  user_id: payload.author_id,
  type: 'announcement',
  title: `New Announcement: ${payload.title}`,
  message: payload.content.slice(0, 200),
  metadata: { course_id: payload.course_id, announcement_id: data.id },
}).then(() => { /* best-effort */ });
```

**Note:** This is a design decision — notification insert failure shouldn't block announcement creation. Consider downgrading to a `console.error` log instead of throwing, to avoid rolling back the announcement on notification failure.

---

### PR #74 — 🛡️ Sentinel: [CRITICAL] Fix missing authentication in bulk data import Edge Function
| Field | Value |
|-------|-------|
| **Category** | Security — Missing Auth |
| **Files Changed (PR)** | `.github/workflows/ci.yml`, `sentinel.md`, `src/__tests__/properties/calibratedDifficulty.property.test.ts` |
| **Target File** | `supabase/functions/bulk-data-import/index.ts` |
| **Issue** | Same as PR #80 — missing JWT verification in bulk-data-import. |
| **Local Status** | ❌ **DUPLICATE** of PR #80 |
| **Recommended Action** | 🚫 **SKIP** — Duplicate of #80, and neither PR actually modifies the target file. |

---

### PR #72 — 🛡️ Sentinel: [CRITICAL] Fix missing authentication in edge functions
| Field | Value |
|-------|-------|
| **Category** | Security — Missing Auth |
| **Files Changed (PR)** | `supabase/functions/bulk-data-import/index.ts`, `supabase/functions/generate-transcript/index.ts`, `.github/workflows/ci.yml`, `sentinel.md`, test files |
| **Target Files** | `bulk-data-import/index.ts`, `bulk-import-users/index.ts`, `generate-transcript/index.ts` |
| **Issue** | Multiple edge functions lack auth checks. |
| **Local Status** | ⚠️ **PARTIALLY FIXED** |
| **Recommended Action** | ⚠️ **REVIEW CAREFULLY before merge** — This is the only Sentinel PR that actually modifies source files. |

**Detailed local status per file:**
- `bulk-import-users/index.ts` — ✅ **ALREADY FIXED** locally. Has `authHeader` check, `getUser()` call, and admin role verification.
- `bulk-data-import/index.ts` — ❌ **NEEDS FIX** locally. No auth check.
- `generate-transcript/index.ts` — ❌ **NEEDS FIX** locally. No auth check — uses service role key directly without JWT verification.

---

### PR #70 — 🛡️ Sentinel: [HIGH] Fix missing Supabase error checks in useGradingStats
| Field | Value |
|-------|-------|
| **Category** | Security — Silent Errors |
| **Files Changed (PR)** | `.github/workflows/ci.yml`, `sentinel.md` only |
| **Target File** | `src/hooks/useGradingStats.ts` |
| **Issue** | Multiple Supabase queries don't check `error` before using `data`. |
| **Local Status** | ❌ **NEEDS FIX** — Local file has ~6 queries that destructure only `{ count }` or `{ data }` without checking `error`. |
| **Recommended Action** | ⚠️ **SKIP this PR** (doesn't modify the hook). Fix manually. |

**Evidence from local file:**
```typescript
// Line ~38: No error check
const { count: gradedThisWeek } = await supabase
  .from('grades').select('id', { count: 'exact', head: true })...

// Line ~42: No error check
const { data: courses } = await supabase.from('courses').select('id')...

// Line ~52: No error check
const { data: recentGrades } = await supabase.from('grades').select('graded_at')...
```

---

## Bolt Performance PRs (Detailed Analysis)

### PR #81 — ⚡ Optimize dashboard queries with Promise.all (LATEST)
| Field | Value |
|-------|-------|
| **Category** | Performance |
| **Files Changed (PR)** | `.github/workflows/ci.yml`, `src/__tests__/properties/aiCopilot.property.test.ts` |
| **Target File** | `src/hooks/useAdminDashboard.ts` |
| **Issue** | Sequential Supabase count queries in `useAdminKPIs` cause waterfall latency. |
| **Local Status** | ❌ **NEEDS FIX** — Local `useAdminKPIs` runs 5 sequential queries. `useOnboardingAnalytics` runs 2 sequential queries. `useDepartmentAnalytics` runs 4 sequential queries. |
| **Recommended Action** | ⚠️ **SKIP this PR** (doesn't modify the hook). Apply Promise.all optimization manually. |

**Note:** PR #81 does NOT actually modify `useAdminDashboard.ts` — it only touches CI config and a test file.

### Duplicate Bolt PRs (all targeting same admin dashboard optimization)
| PR | Title | Status |
|----|-------|--------|
| #79 | Batch Admin Dashboard queries into Promise.all | DUPLICATE of #81 |
| #78 | Batch independent Supabase queries in Admin Dashboard | DUPLICATE of #81 |
| #75 | Parallelize Admin KPI queries in useAdminDashboard | DUPLICATE of #81 |
| #73 | Parallelize Admin Dashboard KPIs queries | DUPLICATE of #81 |
| #71 | Batch dashboard queries | DUPLICATE of #81 |
| #69 | Parallelize independent queries in admin dashboard | DUPLICATE of #81 |
| #63 | Performance improvement | DUPLICATE of #81 |
| #62 | Parallelize queries in useAdminDashboard.ts | DUPLICATE of #81 |
| #61 | Optimize Admin Dashboard Latency | DUPLICATE of #81 |

**Recommended Action:** 🚫 **CLOSE ALL 9 DUPLICATES** (#61–#63, #69, #71, #73, #75, #78, #79). None of them actually modify the source file either.

### PR #64 — ⚡ Concurrent execution of student attendance queries
| Field | Value |
|-------|-------|
| **Category** | Performance |
| **Files Changed (PR)** | `.github/workflows/ci.yml` only |
| **Target File** | `src/hooks/useAttendance.ts` |
| **Issue** | `useStudentAttendance` uses sequential `for` loop with N+1 queries per enrolled course. |
| **Local Status** | ❌ **NEEDS FIX** — Local file still uses sequential `for (const enrollment of enrollments)` loop with 3 queries per iteration. |
| **Recommended Action** | ⚠️ **SKIP this PR** (doesn't modify the hook). Apply `Promise.all(enrollments.map(...))` manually. |

---

## CI/Infrastructure PR

### PR #60 — fix: resolve all CI failures — TypeScript, ESLint & Supabase health audit
| Field | Value |
|-------|-------|
| **Category** | CI/Infra |
| **Files Changed** | 80+ files (massive PR) |
| **Issue** | Fixed 23 TS errors, ESLint warnings, added Supabase health audit. |
| **Local Status** | ✅ **ALREADY FIXED** — These fixes appear to already be on `main`. |
| **Recommended Action** | 🚫 **CLOSE** — Superseded by current main branch state. |

---

## Dependabot PRs

| PR | Package | Action |
|----|---------|--------|
| #77 | 23 production deps bump | REVIEW — large batch update |
| #68 | hono 4.12.1 → 4.12.14 | REVIEW |
| #67 | happy-dom 20.7.0 → 20.9.0 | REVIEW |
| #66 | basic-ftp 5.2.0 → 5.3.0 | REVIEW |
| #65 | @hono/node-server 1.19.9 → 1.19.14 | REVIEW |
| #59 | lodash 4.17.23 → 4.18.1 | REVIEW |
| #54 | vite 6.4.1 → 6.4.2 | REVIEW |
| #53 | getsentry/action-release 1 → 3 | REVIEW |
| #51 | lodash-es 4.17.23 → 4.18.1 | REVIEW |
| #50 | flatted 3.3.3 → 3.4.2 | REVIEW |
| #48 | picomatch bump | REVIEW |
| #45 | rollup 4.58.0 → 4.60.1 | REVIEW |

---

## Priority Action Plan

### 🔴 P0 — Security (Do Now)
1. **Fix `bulk-data-import/index.ts`** — Add JWT auth check (modeled after `bulk-import-users/index.ts` which is already fixed)
2. **Fix `generate-transcript/index.ts`** — Add JWT auth check
3. **Fix `useGradingStats.ts`** — Add `error` destructuring and `if (error) throw error` to all 6+ queries

### 🟡 P1 — Error Handling
4. **Fix `useAnnouncements.ts`** — Replace `.then(() => {})` with proper error handling (log, don't throw — notification is best-effort)

### 🟢 P2 — Performance
5. **Fix `useAdminDashboard.ts`** — Wrap independent queries in `Promise.all` for `useAdminKPIs`, `useOnboardingAnalytics`, `useDepartmentAnalytics`
6. **Fix `useAttendance.ts`** — Replace sequential `for` loop with `Promise.all(enrollments.map(...))` in `useStudentAttendance`

### 🧹 P3 — Cleanup
7. **Close 9 duplicate Bolt PRs** (#61–#63, #69, #71, #73, #75, #78, #79)
8. **Close PR #60** (superseded)
9. **Close PRs #80, #74** (duplicates of #72 for bulk-data-import auth, and none actually fix the file)
10. **Review PR #72** carefully — only Sentinel PR that modifies actual source files
11. **Review PR #82** (security audit + docs reorg)
12. **Batch-review Dependabot PRs** — merge safe minor bumps, review major ones

---

## Key Insight

**The Sentinel and Bolt automated agents are creating PRs that describe the correct issues but fail to modify the actual source files.** Most PRs only touch `.github/workflows/ci.yml` and documentation files. This means:
- The vulnerability descriptions are accurate and useful as a security audit
- But the PRs themselves cannot be merged to fix the issues
- All fixes need to be applied manually to the actual source files
