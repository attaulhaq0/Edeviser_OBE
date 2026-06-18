# Production Bug Fixes — Design

## Overview

This design covers every item in `requirements.md`, grouped by the three risk tracks.
Guiding principles (unchanged across all tracks):

- Smallest change that fixes the defect; no refactors beyond the touched unit.
- No production gameplay/institutional data seeding. Empty-data cases are handled by
  clear empty states, not fabricated rows.
- Preserve public component props, hook return shapes, RPC signatures, and Edge
  Function contracts. Where a contract must change, the requirement says so explicitly.
- Add a regression test for each confirmed defect so it cannot silently return.
- Track A ships first (lowest blast radius). Track B is config + small guarded
  migrations. Track C is reproduce → preserve-baseline → fix → parity, and promotes
  large items to their own specs.

Cross-spec boundaries (do **not** re-solve here): function `search_path` hardening →
`db-function-search-path-qualification`; replay-order/history/phantom tables →
`migration-history-reconciliation` / `migration-replay-order-fix`.

---

## Track A — Confirmed surgical code defects

### Item 1 — ILO status badge (`columns.tsx`)

**File:** `src/pages/admin/outcomes/columns.tsx`

**Change:** In the `is_active` Status cell, treat a missing value as Active:

```tsx
const rawActive = row.getValue("is_active") as boolean | undefined;
const isActive = rawActive ?? true;
```

**Why safe:** `learning_outcomes` exposes no `is_active`, so today the value is always
`undefined`. Defaulting `undefined → true` matches the reorder view's hard-coded
"Active" and changes nothing for any row that _does_ carry an explicit boolean.

**Test:** unit test rendering the column cell with (a) no `is_active` key → "Active",
(b) `is_active: false` → "Inactive".

---

### Item 2 — Onboarding completion navigation (`OnboardingWizard.tsx`)

**File:** `src/pages/student/onboarding/OnboardingWizard.tsx`

**Change:** Move `navigate('/student')` out of the post-await success path into a
`finally` block so it always runs; keep `setIsProcessing(false)` there too. The
`processOnboarding.mutateAsync(...)` call and progress-flag write remain; only the
navigation is decoupled from the function's success.

```tsx
try {
  await processOnboarding.mutateAsync({
    /* unchanged */
  });
  updateProgress.mutate({
    /* completion flags, unchanged */
  });
} catch (err) {
  // logged via the mutation's onError (Sentry); navigation still proceeds below
} finally {
  setIsProcessing(false);
  navigate("/student"); // always leave the full-screen overlay
}
```

**Why safe:** On success, behaviour is identical (still navigates to `/student`). On
failure, the only change is that the student is no longer trapped. The Edge Function
still runs and writes the profile when healthy.

**Test:** component test where `mutateAsync` rejects → asserts `navigate` is still
called; and where it resolves → asserts navigate + completion flags.

---

### Item 3 — Honorific-aware display name (`WelcomeHero.tsx` + `ProfileDropdown.tsx`)

**Files:** `src/components/shared/WelcomeHero.tsx`,
`src/components/shared/ProfileDropdown.tsx`, plus a shared helper.

**Change:** Add one pure helper (e.g. in `src/lib/displayName.ts`) and use it in both
places (no duplicated logic — engineering-guardrails "no duplication"):

```ts
const HONORIFICS = new Set([
  "mr",
  "mrs",
  "ms",
  "miss",
  "dr",
  "prof",
  "mx",
  "sir",
]);

export const getDisplayFirstName = (name?: string | null): string | null => {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return null; // caller supplies its own fallback
  const head = parts[0].replace(/\.$/, "").toLowerCase();
  if (HONORIFICS.has(head) && parts.length > 1) return parts[1];
  return parts[0];
};
```

- `WelcomeHero`: `getDisplayFirstName(name) ?? t("greeting.there")`.
- `ProfileDropdown` (line 90): `getDisplayFirstName(profile.full_name) ?? "User"`.
- The avatar-initials logic in `ProfileDropdown` is unrelated and stays as-is.

**Why safe:** Pure display-string derivation; no prop/layout change. Names without
titles keep first-token behaviour; empty names keep each caller's existing fallback.

**Test:** unit-test the helper: "Mr. David Okonkwo" → "David", "Dr. Aisha Al-Mansoori"
→ "Aisha", "Sara Imran" → "Sara", "" / null → null (fallback). One render test per
consumer confirming the fallback string.

---

### Item 4 — `.single()` → `.maybeSingle()` on zero-row reads

**Files:** `src/pages/auth/AcceptInvitePage.tsx` (~128-132),
`src/hooks/useSessionCompletion.ts` (~289-293),
`src/hooks/useReflectionDigest.ts` (~75-78, ~131-134),
`src/hooks/useTeamProfile.ts` (~63-65).

**Change:** Swap `.single()` for `.maybeSingle()` on each flagged **read** and handle
`data === null` as a clean empty/not-found state. Leave all `insert/update …
.select().single()` calls untouched (those legitimately expect exactly one row).

**Why safe:** `.maybeSingle()` returns `{ data: null, error: null }` on zero rows
instead of throwing `PGRST116`. Each call site is updated to treat `null` as
empty/not-found. One-row behaviour is identical.

**Test:** per call site, a hook/component test mocking a zero-row response → asserts no
throw and the empty/fallback branch; and a one-row response → asserts identical
behaviour to before.

---

### Item 5 — Signup role dropdown (`LoginPage.tsx`)

**File:** `src/pages/LoginPage.tsx` (~597-611).

**Change (pick one, smallest):** either restrict the register-tab role `<select>` to
`student` only (matching `SignUpPage.tsx`), or relabel it "Requested role (subject to
approval)" and keep the options. No server/AuthProvider change.

**Why safe:** Purely client UX. The server already forces `student` for self-signup, so
no role assignment changes. Removing privileged options also removes the misleading
affordance entirely.

**Test:** component test asserting the register tab no longer offers a silently-ignored
privileged role (or shows the clarifying label).

---

### Item 6 — Global query/mutation error safety net (`App.tsx`)

**File:** `src/App.tsx` (QueryClient config, ~36-69).

**Change:** Add `queryCache`/`mutationCache` with an `onError` that logs (console +
Sentry) and optionally toasts, **dedup-aware** so hooks that already toast don't
double-toast (e.g. only toast when no `meta.suppressGlobalError` flag is set).

**Why safe:** Additive fallback; existing per-hook handling stays primary. No change to
success paths or query keys.

**Test:** unit test that a query error with no consumer handler triggers the global
log/toast; and that a hook opting out (meta flag) does not double-toast.

---

## Track B — Supabase platform hardening

> All Track B migrations obey `migration-replay-integrity`: any `REVOKE`/`GRANT`/`ALTER`
> that could precede the target's CREATE on a fresh replay is guarded with
> `to_regprocedure(...) IS NOT NULL` (functions) or `to_regclass(...) IS NOT NULL`
> (relations). Run `npm run db:check-replay` before push. Regenerate types via
> `scripts/regen-types.ps1` if any object signature changes.

### Item 7 — Restrict EXECUTE on internal SECURITY DEFINER functions

**Approach:**

1. Build the inventory from the advisor output and classify each function:
   - **Keep (public-by-design):** `auth_user_role()`, `auth_institution_id()` (RLS —
     must stay `authenticated`-executable), `consume_invitation(text)`,
     `get_invitation_by_token(text)`, `is_portfolio_publicly_accessible(uuid)`,
     `portfolio_public_access(uuid)` (public invite/portfolio flows).
   - **Candidate internal (revoke `anon`/unnecessary `authenticated`):** confirm no
     client/RPC caller, then revoke — e.g. `delete_department_if_no_programs(uuid)`,
     `fan_out_announcement_notifications(uuid)`, `send_teacher_nudge(uuid,text)`,
     `check_rate_limit_approaching(...)`, `course_material_institution(text)`,
     `get_badge_spotlight(uuid,int)`, `get_earn_spend_ratio(uuid)`,
     `get_leaderboard_page(uuid,int,int)`, `get_wellness_aggregate_stats(uuid)`,
     `parent_has_verified_link(uuid)` — **only** after grep confirms each is reached
     solely via service-role/edge/trigger, not a client `rpc()` call.
2. For each confirmed-internal function, emit a guarded
   `REVOKE EXECUTE ON FUNCTION public.<fn>(...) FROM anon` (and `authenticated` where
   it has no client caller) inside a `DO $$ … IF to_regprocedure(...) IS NOT NULL …`.

**Why safe:** Each revoke is preceded by a caller audit; functions with a real client
`rpc()` caller are kept. The RLS helpers are explicitly excluded. Guarded so a fresh
replay never aborts.

**Verification:** after apply, re-run `get_advisors(security)` to confirm the targeted
warnings clear; smoke-test the kept flows (invite acceptance, public portfolio,
leaderboard, wellness stats) still work as their real callers.

### Item 8 — Enable leaked-password protection

**Approach:** Dashboard/config change in Auth settings (Password security → enable
HaveIBeenPwned check). No migration. Document the toggle in `docs/MANUAL-STEPS.md`.

**Why safe:** Only affects new/changed passwords; no code path changes.

### Item 9 — Move `vector`/`citext` out of `public`

**Approach:** Investigate dependents first
(`SELECT … FROM pg_depend`/`information_schema.columns` for `citext` columns and
`vector` columns/indexes such as `idx_embeddings_hnsw`). If safe, migrate to an
`extensions` schema with `ALTER EXTENSION … SET SCHEMA extensions` and adjust
`search_path` where needed. **If dependents make relocation risky, document and accept
as-is** (this is the likely outcome — embeddings depend on `vector`).

**Why gated:** Relocating an extension that backs live columns/indexes can break those
objects; the senior-dev default here is "measure dependents, prefer accept-as-is over a
risky move just to clear a WARN."

### Item 10 — Restrict `mv_historical_evidence` from the API

**Approach:** Prefer revoking direct API access
(`REVOKE SELECT ON public.mv_historical_evidence FROM anon, authenticated`) and serving
the Historical Evidence dashboard through an authorised, institution-scoped path (an
existing/`SECURITY INVOKER` or scoped `SECURITY DEFINER` RPC). Confirm the dashboard's
current reader before revoking.

**Why safe:** The dashboard keeps working through an authorised path; the raw MV is no
longer anonymously selectable.

### Item 11 — Index the two FKs

**Approach:** One migration:

```sql
CREATE INDEX IF NOT EXISTS idx_announcement_attachments_announcement_id
  ON public.announcement_attachments (announcement_id);
CREATE INDEX IF NOT EXISTS idx_announcement_reads_student_id
  ON public.announcement_reads (student_id);
```

**Why safe:** Additive indexes; improve FK joins/cascade deletes; no behaviour change.

### Item 12 — Triage unused indexes & multiple permissive policies

**Approach:** Documentation only in this spec.

- Produce a table of the ~50 unused indexes with a keep/candidate recommendation; do
  **not** drop any without real-data query-pattern analysis (most are unused only
  because the demo DB has little traffic).
- Carve `multiple_permissive_policies` into a dedicated **RLS-policy-consolidation**
  spec; each table needs a per-policy correctness proof before merging. Record the
  finding and risk here; take no action.

---

## Track C — Higher-risk correctness defects

### Item 13 — `process-onboarding` Edge Function health

**Approach:** Check deployment status; invoke with a representative real payload in a
non-destructive way (preview/staging student, not production seeding). If unhealthy,
redeploy per `docs/Edge-Function-Deployment-Guide.md` without changing its contract.
Ensure client errors route to Sentry. Complements Item 2.

### Item 14 — `student_profiles` uniqueness

**Approach:**

1. Audit (read-only): `SELECT student_id, count(*) FROM student_profiles GROUP BY
student_id HAVING count(*) > 1;`
2. If duplicates: migration to de-dupe (keep most recent `completed_at`/`created_at`)
   then `ALTER TABLE … ADD CONSTRAINT … UNIQUE (student_id)`.
3. Switch the writer to upsert on `student_id`.
4. Migration obeys replay/history rules; `db:check-replay` clean; Supabase Preview
   green. If no duplicates/risk, document "no change" and close.

### Item 15 — Coordinator analytics: empty-state + performance

**Files (read-first):** `src/pages/coordinator/**` analytics pages + hooks
(`useCurriculumMatrix`, Sankey, Coverage Heatmap, Gap Analysis, Cohort Comparison,
Semester Trends, Section Comparison).

**Approach:**

1. **Empty vs loading:** ensure a resolved-but-empty result renders the shared
   `EmptyState` with guidance ("Map outcomes to see this analysis"), never an
   indefinite spinner; confirm finite `enabled`/`staleTime` and no never-resolving
   dependency.
2. **Performance:** profile each hook; collapse confirmed waterfalls to a single joined
   query/RPC; prefer explicit `.select('a,b,…')` over `*` on wide tables.
3. **Placeholders (audit 04 §4):** Semester Trends and Cohort Comparison are
   placeholders — either implement against real data or clearly label "coming soon"/
   hide from nav (no fabricated data).
4. **Parity:** snapshot non-empty output before/after to guarantee identical results.

**Why safe:** Empty-state/skeleton changes are additive; query consolidation validated
by parity tests; RLS unchanged (same scoping predicates).

### Item 16 — Parent attendance query chain

**File:** `src/pages/parent/ParentAttendancePage.tsx` (`useChildAttendance`).

**Approach:** Replace the 4-step waterfall + large `.in(sessionIds)` with either a
single joined query (`attendance_records` → `class_sessions` → `course_sections` →
`courses`, filtered by `student_id`, aggregated per course) or a `SECURITY INVOKER` RPC
`get_child_attendance_summary(p_student_id)`. Keep the returned `AttendanceSummary[]`
shape identical so the component is unchanged below the hook.

**Why safe:** Output contract preserved; `SECURITY INVOKER`/inline query keeps parent
RLS enforcement. Fewer round-trips; no oversized `in` list.

**Verification:** linked parent → child summary renders with real numbers; unlinked
parent sees nothing; empty child shows the existing empty state.

### Item 17 — Cron schedule mismatch & `fee-overdue-check` duplication

**Approach:**

- `exam-period-notify`: decide the intended hour, set `vercel.json` and the function
  header to match, document it.
- `fee-overdue-check`: keep **one** scheduler. Per the repo's own prune note ("Vercel
  Cron is the canonical scheduler"), prefer keeping the Vercel→edge path and retiring
  the pg_cron SQL job via a guarded migration (or, if Vercel is intentionally
  unscheduled, delete the orphan handler and keep pg_cron) — never both live.

**Why safe:** No new behaviour; removes drift/duplication. The chosen single owner
performs the identical idempotent sweep.

### Item 18 — Service-role Edge Functions missing caller checks

**Files:** `supabase/functions/{check-bonus-question,generate-fee-receipt,
import-competency-csv,resolve-mystery-reward,score-reflection-quality}/index.ts`.

**Approach:** Add an explicit in-handler caller check before any service-role op
(validate JWT, then role/ownership appropriate to the action — e.g. admin for
`import-competency-csv`, the owning student/teacher for the others), mirroring
`bulk-import-users`. Fix the `score-reflection-quality` CORS header typo.

**Why safe:** Adds authorization only; request/response contracts unchanged. Each check
mirrors an already-compliant function.

**Verification:** a legitimate caller still succeeds; an unauthorized caller is rejected
(401/403); CORS preflight works after the typo fix.

### Item 19 — OBE accreditation report & course file schema drift (highest-value Track C)

**Files:** `supabase/functions/generate-accreditation-report/index.ts`,
`supabase/functions/generate-course-file/index.ts`.

**Approach (data-access layer only; PDF/storage contract preserved):**

- Accreditation report: replace `scope === 'PLO'/'ILO'` with the real scope enum used
  by the writer (verify live: PLO/ILO aggregate scopes), and `score_percent` →
  `attainment_percent`. Confirm against live `outcome_attainment` rows that the chosen
  scope filters return data.
- Course file: `outcome_mappings` → `source_outcome_id`/`target_outcome_id`;
  `assignments.clo_ids` → `clo_weights`; `scope='CLO'` → the real CLO scope; CQI select
  → real columns (`action_description`, `root_cause`, `responsible_person`, …). Remove
  the non-existent `title/gap_description/corrective_actions`.

**Why safe but verify-first:** these are runtime column references — the fix is
mechanical but MUST be checked against the live schema + a real-data generation, because
the writer's exact scope values must be confirmed (tie to Req 20's scope audit).

**Prevention:** land the CI schema-contract check (Item 22) in the same PR so the class
can't regress.

### Item 20 — Attainment scope mismatch & outcome-weight invariant

**Approach:**

1. **Live scope audit (read-only):** `SELECT scope, count(*) FROM outcome_attainment
GROUP BY scope;` and confirm what each reader expects vs what the trigger writes.
2. **Align** readers to the writer's scopes (lowest-risk) — or extend the trigger to
   also write the aggregate scopes the heatmap/CLO headline need — with parity on the
   already-working student-facing reads.
3. **Weight invariant:** choose 0–100 (matches docs/cascade/tests); add a shared zod
   `superRefine` sum check (`src/lib/schemas/{plo,clo}.ts`) AND a DB CHECK/trigger per
   `target_outcome_id` group; provide a normalisation migration for existing 0–1 data
   so saved mappings don't break.

**Why own-spec if non-trivial:** this changes a core data contract; if alignment +
weight enforcement is more than a couple of guarded edits, promote to its own spec with
full reproduce/baseline/parity coverage. Nothing changes until the live scope audit
confirms the mismatch.

### Item 21 — Gamification engine defects

**Approach:** Triage + promote. Record each sub-item (B-1, H-1, H-2, H-3, H-4, H-5,
M-1) with severity and fix direction here, then create a dedicated
**`gamification-engine-remediation`** spec for the interdependent high-risk set (badge
table unification + `award-xp`→`check-badges` fan-out [B-1]; `xp_total` single source
of truth [H-1]; streak driver batch mode / per-login invoke [H-2]; `badge_definitions`
seeding for spotlight [H-3]; team-gamification consolidation [H-4]; Perfect Day payout
[H-5]).

**Quick wins that may ship here** (only if safe in isolation, each with a test):

- M-1: align streak-freeze cap to 2 across `process_marketplace_purchase`,
  `process-purchase`, `useStreakFreeze` (or update the domain doc if 3 is intended) —
  small, bounded.
- H-2 partial: give `process-streak` an "all active students" batch branch and point
  the midnight cron at it (the cron currently calls it with no `student_id` and is
  rejected) — but this touches streak correctness, so validate carefully; if risky,
  defer to the promoted spec.

**No seeding:** `badge_definitions` catalog seeding is a per-institution configuration
step in the promoted spec, not fixture data.

### Item 22 — CI schema-contract check for Edge Functions

**Approach:** Add a Node script (e.g. `scripts/check-edge-fn-schema.mjs`) run in CI that
parses `supabase/functions/**` for `.from('<table>')` / `.select('<cols>')` /
`scope` literals and validates table/column/enum names against `src/types/database.ts`
(or live introspection). Fail CI on unknown references; allow an explicit ignore list
for dynamic/RPC calls it cannot resolve. Wire into `.github/workflows/ci.yml` next to
lint/types/tests.

**Why safe:** Pure CI addition; no runtime change. Catches the Req 19 drift class and
future regressions. Keep it pragmatic to avoid false-positive friction.

---

## Testing & rollout

- **Track A:** unit/component regression tests for Items 1–6; ship first as its own PR.
- **Track B:** apply guarded migrations (Items 7, 10, 11; 9 only if safe), config
  toggle (Item 8), documentation (Item 12). Re-run `get_advisors` to confirm targeted
  warnings clear; `db:check-replay` + Supabase Preview green.
- **Track C:** each item is reproduce → capture preservation baseline → fix → parity.
  Item 19 includes a real-data generation inspection. Items 20 and 21 (the large ones)
  are promoted to their own specs once their live audits confirm scope/shape; only
  isolated quick wins ship under this spec.
- **Local gate before every push:** `npm run lint` → `npx tsc --noEmit` → `npm test`
  (+ `npm run db:check-replay` when a migration is added).
- One feature branch per track (or per item for Track C), focused commits, PR with CI +
  Supabase Preview green. No direct pushes to `main`; never merge with a required check
  red.
- The dev-only quick-login panel (`LoginPage.tsx`) remains `import.meta.env.DEV`-gated
  and out of scope for production behaviour.

## Risk register (senior-dev summary)

| Item                         | Severity | Blast radius               | Confidence | Disposition                               |
| ---------------------------- | -------- | -------------------------- | ---------- | ----------------------------------------- |
| 1 ILO badge                  | P1       | 1 file                     | High       | Ship (Track A)                            |
| 2 Onboarding trap            | P1       | 1 file                     | High       | Ship (Track A)                            |
| 3 Honorific name             | P2       | 2 files + helper           | High       | Ship (Track A)                            |
| 4 `.single()`→maybeSingle    | P2       | 4 reads                    | High       | Ship (Track A)                            |
| 5 Signup role dropdown       | P3       | 1 file                     | High       | Ship (Track A)                            |
| 6 Global query onError       | P3       | 1 file                     | Med        | Ship (Track A)                            |
| 7 EXECUTE revokes            | P2       | guarded migration          | Med        | Ship after caller audit                   |
| 8 Leaked-password            | P2       | config                     | High       | Ship (config)                             |
| 9 Extensions schema          | P3       | extension deps             | Low        | Investigate; likely accept                |
| 10 MV in API                 | P2       | 1 grant + reader           | Med        | Ship after reader check                   |
| 11 FK indexes                | P3       | additive                   | High       | Ship                                      |
| 12 Unused idx / policies     | P3       | docs only                  | High       | Document + carve out                      |
| 13 process-onboarding health | P2       | ops                        | Med        | Investigate                               |
| 14 student_profiles unique   | P3       | migration                  | Med        | Audit then maybe migrate                  |
| 15 Coordinator analytics     | P3       | several pages              | Med        | Scoped fix                                |
| 16 Parent attendance         | P3       | 1 hook                     | Med        | Scoped fix                                |
| 17 Cron mismatch/dup         | P2/P3    | config + migration         | High       | Ship                                      |
| 18 Edge caller checks        | P2       | 5 functions                | High       | Ship                                      |
| 19 OBE export drift          | P0       | 2 functions                | High       | Verify-then-fix (high value)              |
| 20 Scope/weight              | P1       | trigger + readers + schema | Med        | Live-audit; promote if non-trivial        |
| 21 Gamification engines      | P0–P2    | engines                    | Med        | Promote to own spec; quick wins only here |
| 22 Edge schema CI check      | P2       | CI                         | High       | Ship with Item 19                         |
