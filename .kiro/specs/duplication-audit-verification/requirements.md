# Requirements — Duplication Audit Verification & Remediation

## Background

An external "Principal Engineering Duplication & Redundancy Audit" was submitted
covering DB, backend/edge, frontend, AI tutor, auth, realtime, and dead code. Given
the audit's severity claims (multiple "Critical") and specific remediation
prescriptions, every finding was independently re-verified against the live
Supabase database (project `cdlgtbvxlxjpcddjazzx`) and the actual repository source
before any of it is acted on. This spec is the verification record and the
remediation plan for what verification confirmed is real.

**Method:** live SQL against `pg_policies`, `pg_cron.job`, `pg_extension`,
`information_schema`; direct full-file reads of every function/hook the audit
named (not just the audit's quoted snippets); `git ls-files`/`.gitignore` diffing;
and running the repo's own existing checker scripts (`db:check-replay`,
`db:check-dup-names`) rather than assuming their absence.

## Requirement 1 — Verification ledger

**User Story:** As the engineering owner, I want every audit claim marked
CONFIRMED / PARTIAL / REFUTED with the actual evidence, so I act on facts, not on
an unverified third-party report.

### Acceptance Criteria

1. WHEN a claim is CONFIRMED THEN the record SHALL cite the exact file:line or SQL
   result that proves it, and SHALL correct any wrong specifics (line numbers,
   counts, table names) even when the substance holds.
2. WHEN a claim is REFUTED THEN the record SHALL state what is actually true and
   why the audit was wrong (e.g., a file/mechanism doesn't exist, or already-passing
   tooling contradicts the claim).
3. WHEN a claim is PARTIAL THEN the record SHALL state precisely which part holds
   and which part doesn't.
4. WHEN live runtime state cannot be fully observed from a single snapshot (e.g.
   whether a GUC has ever been set historically) THEN the record SHALL say so
   explicitly rather than assert certainty.

## Requirement 2 — No duplicate remediation work

**User Story:** As the engineering owner, I don't want a new spec re-planning work
that existing specs or checker scripts already cover.

### Acceptance Criteria

1. WHEN a finding is already covered by an existing spec (`rls-consolidation-and-infra-health`,
   `dashboard-and-ux-performance`, etc.) or an existing script
   (`db:check-dup-names`, `db:check-replay`) THEN this spec SHALL reference that
   coverage instead of duplicating it.
2. WHEN a finding has NO existing spec or script coverage (confirmed by checking)
   THEN this spec SHALL be the first place it is planned.

## Requirement 3 — Remediation follows the workspace's own gates

**User Story:** As the engineering owner, I want any fix that comes out of this
audit to follow the same rules as everything else in this repo.

### Acceptance Criteria

1. WHEN a migration is added or changed THEN it SHALL never edit an already-applied
   migration file in place; it SHALL be a new, additive migration, and
   `npm run db:check-replay` SHALL be CLEAN before merge.
2. WHEN an RLS policy is consolidated THEN the change SHALL ship with a deny-side
   test (allowed-and-denied per role) proving identical access to the pre-merge
   policy set, per table, before merge.
3. WHEN any fix is proposed THEN it SHALL go through a feature branch + PR with a
   green Supabase Preview before merge — never a direct edit assumed "safe" because
   it looks small.
4. WHEN a "dead code" removal is proposed THEN it SHALL be re-confirmed against
   `src/App.tsx`'s provider tree / real (non-test) importers immediately before
   deletion, since dead-code status can change between audit and action.
