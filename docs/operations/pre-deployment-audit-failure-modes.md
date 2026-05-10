# Pre-Deployment Audit — CI Failure Modes Runbook

Triage guide for when the audit stage fails in CI. Each entry describes
the symptom, likely cause, and fix. Stages are listed in pipeline order.

For the overall audit how-to, see
[`pre-deployment-audit-howto.md`](./pre-deployment-audit-howto.md).

---

## Stage: `lint`

### Symptom

```
[audit] stage lint → failed in Xms
  ESLint reported one or more errors or warnings.
```

### Likely causes

1. A new file has an ESLint violation that slipped past local checks.
2. A dependency upgrade changed a shared rule's severity.
3. `npm install` wasn't run after a lockfile change — new peer-deps missing.

### Fix

Run `npm run lint` locally. Paste the first error into your favourite
search. The zero-warning policy means treat warnings as errors.

### Most-likely breakage point

A newly-added React hook missing an `exhaustive-deps` entry, or a `console.log`
left in a PR. Both are fast to fix.

---

## Stage: `tsc`

### Symptom

```
[audit] stage tsc → failed in Xms
  TypeScript compilation reported one or more errors.
```

### Likely causes

1. Missing type import after a refactor.
2. Supabase types out of sync after a migration. Regenerate via
   `pwsh scripts/regen-types.ps1` or `bash scripts/regen-types.sh`.
3. A union type narrowed incorrectly — often a `.select()` result from
   Supabase that's typed as `never`.

### Fix

Run `npx tsc --noEmit` locally. Do NOT silence with `@ts-ignore` or
`any` — the engineering guardrails forbid it. Use `unknown` + a type
guard if the shape is truly dynamic.

---

## Stage: `propertyTests`

### Symptom

```
[audit] stage propertyTests → failed in Xms
  Property tests failed. Domain invariants are broken — deploy must not proceed.
```

### Likely causes

This is the most serious non-Blocker failure. A property test failing
means the codebase broke a documented domain invariant. Look at the
counterexample in the stderr tail of the finding.

Common real failures:

- Outcome mapping weights no longer sum to 100 (someone bypassed the
  validation layer).
- XP ledger sum ≠ xp_total (a new XP source skipped the ledger write).
- Streak reducer transition bug (off-by-one in date math).
- Classifier totality regression (threshold config missing a value).

### Fix

Read the counterexample in `audit/output/property-tests-findings.json`.
Reproduce locally:

```bash
npx vitest run src/__tests__/properties/<suite>.property.test.ts
```

The failing property test's comment block names the requirement (e.g.
"Property 7: XP ledger sum identity, Req 8.1") and the domain rule. Fix
the code so the invariant holds. Do NOT adjust the property to match
the broken code — that's exactly what this gate prevents.

### Known Windows flake

On Windows + Node 22 + Vitest 4.x, the fork-pool can fail to terminate a
worker with `kill EPERM` even when tests passed. The audit runner
detects this specific signature (`kill EPERM` + `errno: -4048` + a
fork-pool stack trace) and classifies it as a Minor runner-infrastructure
finding instead of Blocker. Upstream: vitest#4562.

---

## Stage: `build`

### Symptom

```
[audit] stage build → failed in Xms
  Vite production build failed.
```

### Likely causes

1. Circular imports.
2. Missing env var referenced at module top-level.
3. A dynamic `import()` path that resolves at dev-time but not at build-time
   (e.g., case-sensitivity on Linux after the PR was tested only on macOS).

### Fix

Run `npm run build` locally. The Vite error usually names the file. For
env-var issues, check `vite-env.d.ts` and `.env.example` match.

---

## Stage: `security`

### Symptom

```
[audit] stage security → failed in Xms
  N finding(s) — worst severity: Blocker.
```

### Most common finding: service-role key in bundle

Someone referenced `SUPABASE_SERVICE_ROLE_KEY` from client code, or
a `VITE_` env var contains a secret token that Vite bundled into `dist/`.

**Fix**:

1. Move the server-side logic into an Edge Function.
2. Have the client call `supabase.functions.invoke('your-fn')` instead.
3. Never prefix server secrets with `VITE_`.

### Common finding: admin mutation missing `logAuditEvent`

An `src/hooks/admin*.ts` file exports a mutation that writes to the DB
but doesn't call `logAuditEvent()`. This silently breaks the audit trail.

**Fix**: add the log call. See `src/hooks/useILOs.ts::useCreateILO` for
the canonical pattern.

Legitimate student-scoped exceptions belong in
`audit/baselines/audit-log-coverage-exceptions.json` with a rationale.

### Common finding: unauthorized VITE\_\* var

A new env var was added without updating
`audit/baselines/vite-env.allowlist.json`.

**Fix**: if the var is genuinely client-safe, add it to the allowlist.
If it's a secret, the PR shouldn't land — use an Edge Function instead.

---

## Stage: `designTokens`

### Symptom

Major findings around physical margins or full-page skeletons.

### Fix

- Replace `ml-*` / `mr-*` / `pl-*` / `pr-*` with the logical equivalents
  (`ms-*`, `me-*`, `ps-*`, `pe-*`).
- Replace `left-*` / `right-*` with `start-*` / `end-*`.
- Replace full-page `<Skeleton>` / `<Shimmer>` with component-level
  loading states.

Exceptions for the rare legitimate case (e.g., `ml-auto` used as a
flexbox spacer) live in `audit/baselines/i18n-allowlist.json`.

---

## Stage: `i18n`

### Symptom

Major findings for missing translation keys.

### Fix

The finding lists each key present in one locale but missing from the
other. Add the missing key to `src/locales/{ar,en}/{namespace}.json`.

The locale files are the single source of truth; any key referenced in
code MUST exist in both locales.

---

## Stage: `a11y`

### Symptom

Major findings for icon-only buttons without `aria-label`, or WCAG 2.1
AA color-contrast failures on badge color pairs.

### Fix

For icon-only buttons, pick one:

```tsx
<Button aria-label="Next page"><ChevronRight /></Button>
<Button><ChevronRight /><span className="sr-only">Next page</span></Button>
```

For contrast failures, either:

- Darken the foreground / lighten the background until the ratio passes.
- Change the text size to "large" (≥ 18pt or ≥ 14pt bold) and mark the
  pair with `isLargeText: true` in `scripts/audit/color-contrast-check.ts`.

---

## Stage: `perf`

### Symptom 1: bundle size regression

```
Gzipped bundle size X KB exceeds baseline + 10% cap.
```

### Fix

Check the `largestChunks` array in `audit/output/perf-findings.json` to
see which chunk grew. Options:

- A new dependency pushed a chunk over the threshold — check
  `npm run analyze` to see what's in it.
- Lazy-load the feature via `React.lazy()` so it ships in a separate
  route chunk.
- Legitimate growth (new major feature) → update the baseline in a
  dedicated PR with a rationale.

### Symptom 2: unfiltered realtime subscription

### Fix

Pass a `filter` clause to `useRealtime()` so the subscription is scoped
to the visible tenant/user/entity. See `src/hooks/useTeamLeaderboard.ts`
for the canonical pattern. Unfiltered subscriptions on tenant-scoped
tables (e.g., `notifications`, `xp_transactions`) are Critical, not
Major.

### Symptom 3: list page without pagination

### Fix

Pass `{ page }` to the hook or use `useVirtualizer` / `useInfiniteQuery`.
For genuinely bounded user-scoped lists, add an entry to
`audit/baselines/pagination-exceptions.json` with rationale.

---

## Stage: `report`

### Symptom

```
[audit] stage report → failed in Xms
  verdict.json missing reproducibility stamps
```

### Likely causes

1. Missing git metadata — running outside a git checkout.
2. `supabase/migrations/` is empty (no migration head to stamp).
3. Manifest not produced by upstream stages.

### Fix

All four stamps (commit SHA, migration head, env ID, run ID) are
required. If you're testing the audit outside a git checkout, set
`AUDIT_ENV_ID` explicitly and either copy a `manifest.json` in or run
from a real checkout.

---

## Aggregator warnings

If `audit-report.md` has an "Aggregator Warnings" section, one of the
`*-findings.json` files is malformed. This usually means a scanner
crashed mid-write. Check the stage's stderr tail in the manifest; fix
the scanner; re-run.

---

## When in doubt

1. Read `audit/output/audit-report.md` — human-readable, every finding
   linked to a requirement ID.
2. Read the per-stage artifact under `audit/output/*-findings.json` for
   the full detail.
3. Run the single stage locally: `npm run audit -- --stage=<name>`.
4. If the scanner itself seems wrong (false positive), file an issue
   with the counterexample; the scanner will be fixed, not the source.
