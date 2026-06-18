---
inclusion: always
---

# Preview & Test Gate (Mandatory)

Every change ships only after it is _proven_ safe. This gate is non-negotiable and
applies to all work — most strictly to DB migrations and Tier 2/3 RLS / performance
changes. If a change cannot be proven safe by a test **plus** a green Supabase Preview,
it does not ship.

## The gate, in order

### 1. Local checks (run before every push)

Run, in this exact order, and do not push until all pass:

1. `npm run lint` — ESLint with **zero warnings** tolerance.
2. `npx tsc --noEmit` — TypeScript type checking.
3. `npm test` — the Vitest suite.
4. `npm run db:check-replay` — **required for any migration** (static replay-order oracle;
   catches out-of-order function references before the Supabase Preview does).

### 2. A regression/parity test accompanies every behavioral change

No behavioral change merges without a test that locks in its behavior:

- **Aggregate / data-consolidation work** → a **parity test** proving the new path returns
  exactly the same data as the path it replaces (no data change).
- **RLS work** → a **deny-side test** (assert both the allowed _and_ the denied cases per
  role × table), e.g. `npm run test:rls`.
- **Optimistic UI work** → an **apply / rollback / settle test** (optimistic apply,
  `onError` rollback, `onSettled` invalidate).

### 3. Feature branch + PR — never push `main`, never apply DDL directly to production

- All changes go through a feature branch and a pull request.
- **Never** push directly to `main`.
- **Never** apply DDL / migrations directly to the production database. Migrations are
  validated only by the Supabase Preview check on a PR.

### 4. CI + Supabase Preview must be green before merge

- Both CI and the **Supabase Preview** check must be green before a merge.
- The Supabase Preview replays **all** migrations from scratch on a fresh database. A red
  Preview means the migration chain is broken — even if production looks healthy.
- **Never merge a red Preview. Never mark it ignored / neutral / skipped, and never merge
  around it.**

### 5. DB changes reach production only by merging a green PR

Production schema changes happen exclusively as the result of merging a green PR — never
by a direct apply.

## Tiering: Tier 2/3 are gated behind re-measurement + their own test

Tier 2/3 work — **RLS permissive-policy consolidation** and **per-user query-cache
persistence** — ships only **after** Tier 1 has landed **and** has been re-measured, and
only behind its dedicated gating test:

- **RLS consolidation** → ships table-by-table, each behind a full **deny-side
  `test:rls`** (allowed and denied per role × table). Do not ship any table without its
  deny-side tests green.
- **Query-cache persistence** → ships only behind a **cross-profile cache-leak test**
  (sign in as A → persist → sign in as B → assert no A data is visible). Ship only if
  green; otherwise defer.

## Bottom line

Tests + a green Supabase Preview are the proof. No proof, no ship.
