# RLS Policy Consolidation — Requirements (STUB)

> Status: **stub / not started.** Carved out of `production-bug-fixes` Item 12
> (Req 12) so the high-risk RLS work is not rushed inside an unrelated track.

## Introduction

The Supabase performance advisor `multiple_permissive_policies` flags **69**
`(table, action, role)` groups (across **131** policy-bearing tables in
`public`) that have more than one PERMISSIVE policy. PostgreSQL evaluates every
permissive policy for a query and `OR`s the results, so each extra policy is a
per-row cost on hot tables. Consolidating them to one policy per
`(table, action)` (via `OR` / `auth_user_role()`) reduces that cost.

**Why this is its own spec:** merging RLS policies is **correctness-critical** —
a careless merge can silently widen access (data leak) or narrow it (break a
role). It must proceed table-by-table with full deny-side proof, which is too
risky to bundle into a surgical-fix track.

## Scope rules (non-negotiable)

- **No behavioural change to access.** For every `(table, role, action)`, the
  set of rows visible/writable after consolidation MUST equal the set before.
- Preserve the `(SELECT auth_fn())` initplan-wrapping optimisation and helper
  predicates (e.g. `parent_has_verified_link`) verbatim in the merged policy.
- One table per PR; **never** ship a table without its deny-side `test:rls`
  (allowed AND denied per role × table) green.
- Obey `migration-replay-integrity` + `preview-and-test-gate`; regenerate types
  if signatures change (they should not).

## Candidate hot tables (assess first)

`profiles`, `student_gamification`, `outcome_attainment`, `habit_logs`,
`team_members`, `announcements`, `submissions` — re-derive the live list from the
advisor before starting.

## Acceptance Criteria

1. WHEN a table's permissive policies are consolidated THEN there SHALL be one
   policy per `(table, action)` whose `USING`/`WITH CHECK` is the `OR` of the
   originals, with identical effective access.
2. WHEN a table is consolidated THEN a deny-side `test:rls` suite SHALL prove the
   allowed AND denied cases for every role, and `EXPLAIN ANALYZE` before/after
   SHALL be captured.
3. WHEN any table's deny-side tests are not green THEN that table SHALL NOT ship.

## Out of scope

Function `search_path` hardening (→ `db-function-search-path-qualification`),
index changes (→ `production-bug-fixes` Item 11/12), and any non-RLS advisor
finding.
