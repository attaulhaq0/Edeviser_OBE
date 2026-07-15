# RLS Consolidation & Infra Health — Requirements

## Introduction

This spec was opened from a single support question: **"I upgraded to Supabase Pro
and my student profile still shows the same latency I had on the free tier — why?"**

The investigation that answered that question surfaced a cluster of related,
evidence-backed findings that did not have a single owning spec:

1. Why the Pro upgrade alone could never have fixed the latency (compute-tier billing
   mechanics), now persisted at `#[[file:docs/operations/supabase-compute-tiers.md]]`.
2. A reusable, re-runnable infra-health report (`scripts/infra-health-report.sql` +
   `.ps1`/`.sh`) so this class of question can be answered from committed evidence next
   time instead of re-derived from scratch, with a first dated snapshot at
   `audit/baselines/infra-health/2026-07-04.json`.
3. A **documentation-vs-reality mismatch**: migration `20260428000003_optimize_rls_policies.sql`
   and `.kiro/specs/supabase-audit-remediation/tasks.md` Task 3.4 both claim RLS
   policies were "consolidated," but the live database still carries 76
   `multiple_permissive_policies` groups — the migration only did the `(select ...)`
   initplan-wrapping half of the job, never the `OR`-merge half.
4. A **live security-advisory triage** covering every `SECURITY DEFINER` function
   exposed to `anon`/`authenticated`, most of which turned out to be intentional — but
   which also surfaced **two real, previously-undocumented authorization gaps**
   (Requirement 4) that no prior spec caught.
5. Several advisor findings that are correctly deferred (not gates) but need a
   recorded decision so they stop looking like unresolved mysteries.

**This spec is the evidence ledger and triage record, not the RLS consolidation
implementation.** The actual per-table permissive-policy merge is owned by
`.kiro/specs/rls-policy-consolidation/` (existing stub — do not duplicate its Tier 2/3
gated work here). Migration-ledger drift is owned by
`.kiro/specs/migration-history-reconciliation/` (already complete, 21/21 tasks — this
spec only cross-references its findings, does not redo them). Perceived-performance
work (dashboard aggregate RPCs, query-shape fixes) is owned by
`.kiro/specs/dashboard-and-ux-performance/`. This spec's own action items are the
things that fell through the cracks between those three: the docstring/reality
correction, the two new authorization bugs, the security-advisor triage record, and a
hygiene rule to stop the pattern that caused the authorization bugs from recurring.

## Glossary

- **Compute_Tier**: the per-project Postgres instance size (Nano/Micro/Small/Medium/
  Large/XL), billed hourly, independent of the org's Free/Pro/Team/Enterprise plan.
- **Org_Plan**: the Supabase organization-level billing plan (Free/Pro/Team/
  Enterprise), which controls limits/features, not per-project compute.
- **Permissive_Policy_Group**: a `(table, action)` pair with more than one PERMISSIVE
  RLS policy, each evaluated and `OR`-combined per row (advisor:
  `multiple_permissive_policies`).
- **Security_Definer_Exposure**: a `SECURITY DEFINER` function with `EXECUTE` granted
  to `anon` and/or `authenticated`, surfaced by advisor findings
  `anon_security_definer_function_executable` / `authenticated_security_definer_function_executable`.
- **Authorization_Gap**: a Security_Definer_Exposure whose function body performs a
  privileged action (write, cross-institution read) with no internal check that the
  caller is entitled to perform it for the given argument.
- **Infra_Health_Snapshot**: a dated JSON artifact under `audit/baselines/infra-health/`
  produced by `scripts/infra-health-report.ps1`/`.sh`, informational history (not an
  enforced regression gate).
- **Live_Schema**: the deployed schema/config of Supabase project `cdlgtbvxlxjpcddjazzx`.

## Requirements

### Requirement 1: Persist the compute-tier root-cause explanation

**User Story:** As anyone who asks "didn't Pro already fix this?", I want a
persistent, evidence-backed answer in the repo, so the org/compute-billing confusion
is never re-investigated from scratch.

#### Acceptance Criteria

1. THE repository SHALL contain `docs/operations/supabase-compute-tiers.md` explaining,
   in plain language, that the Org_Plan and Compute_Tier are billed independently, that
   the Pro plan's $10/month compute credit is why the billing dashboard shows "already
   paying for Micro" at $0 marginal cost, and that this is expected behavior, not a bug.
2. THE document SHALL record the live-confirmed Compute_Tier fingerprint
   (`max_connections`, `shared_buffers`, `effective_cache_size`, CPU model) for project
   `cdlgtbvxlxjpcddjazzx` and match it against the official Micro spec.
3. THE document SHALL record the measured evidence that the slowness is CPU-contention
   -bound, not query-plan-bound (warm `EXPLAIN ANALYZE` ~16-19ms vs. real
   `pg_stat_statements` mean 1.5-3.8s / max 6.9s against an 8s `statement_timeout`).
4. THE document SHALL provide a recommendation matrix keyed to traffic scenario
   (pilot/demo/production) rather than a single "just upgrade" answer, and SHALL state
   explicitly that compute resizing is a billing decision requiring a human with
   billing access, not an unattended engineering action.
5. THE document SHALL list what compute upgrades do NOT fix (RLS policy multiplicity,
   Auth's fixed absolute connection allocation) so a future resize is not mistaken for
   a fix to those separate issues.

### Requirement 2: Reusable, re-runnable infra-health reporting

**User Story:** As the team investigating a future "is this still slow / did this get
worse" question, I want a single script that re-derives the same evidence, so nobody
has to hand-write ad hoc SQL again.

#### Acceptance Criteria

1. THE repository SHALL contain `scripts/infra-health-report.sql` with a
   human-readable Part A (standalone `SELECT` sections: compute fingerprint, RLS bare
   -auth-call scan, multiple-permissive-policy groups, read amplification, table sizes,
   hot queries by call count and by total time, security-definer RPC exposure,
   extensions-in-public, connection headroom, role statement timeouts, realtime
   published-table count) and a Part B (single combined JSON query for automation).
2. THE repository SHALL contain `scripts/infra-health-report.ps1` (Windows) and
   `scripts/infra-health-report.sh` (macOS/Linux) wrapper scripts that run Part B
   against the live project and write a dated snapshot to
   `audit/baselines/infra-health/YYYY-MM-DD.json`.
3. THE bare-auth-call scan SHALL correctly distinguish a genuinely-bare `auth.uid()`
   call from Postgres's own deparse of an already-optimized `(select auth.uid())` (which
   prints as `( SELECT auth.uid() AS uid)`), so the report does not false-positive on
   nearly every policy in the database.
4. THE `audit/README.md` SHALL document the `baselines/infra-health/` subdirectory as
   informational history (not an enforced gate), consistent with how other baselines in
   that directory are documented.
5. WHEN the report is re-run in the future THEN it SHALL require no code changes to
   produce a new comparable dated snapshot.

### Requirement 3: Correct the RLS-consolidation documentation/reality mismatch

**User Story:** As a future engineer reading migration history, I want the migration
that claims to "consolidate" RLS policies to accurately describe what it did, so I
don't waste time re-discovering that the consolidation never happened.

#### Acceptance Criteria

1. THE system SHALL record, with live evidence, that migration
   `supabase/migrations/20260428000003_optimize_rls_policies.sql` performed the
   `(select auth.<fn>())` initplan-wrapping optimization across ~30+ tables but did
   **not** merge any multiple-permissive-policy group with `OR` — its header comment's
   claim of "consolidates redundant permissive policies where possible" does not match
   its executed SQL.
2. THE system SHALL record that `.kiro/specs/supabase-audit-remediation/tasks.md` Task
   3.4 is checked complete based on that docstring claim, and that the live database
   still carries 76 `multiple_permissive_policies` groups (re-confirmed via
   `get_advisors(performance)` and the Infra_Health_Snapshot) — this is a
   documentation-vs-reality mismatch, not a regression, and not evidence of a new bug.
3. THE system SHALL update the misleading docstring in
   `20260428000003_optimize_rls_policies.sql` to accurately describe only the
   initplan-wrapping it performed (a comment-only change; it SHALL NOT alter any `CREATE
   POLICY`/`DROP POLICY` statement, since that migration is already recorded in
   Remote_History and altering its DDL would violate `migration-replay-integrity`).
4. THE system SHALL add a note to `.kiro/specs/supabase-audit-remediation/tasks.md`
   Task 3.4 cross-referencing this finding and `.kiro/specs/rls-policy-consolidation/`
   as the spec that owns the actual, still-pending consolidation — without re-opening
   or duplicating that stub spec's scope here.
5. THE system SHALL NOT attempt the actual policy consolidation in this spec; that
   remains gated, table-by-table, deny-side-tested work owned exclusively by
   `rls-policy-consolidation`.

### Requirement 4: Close the two newly-discovered SECURITY DEFINER authorization gaps

**User Story:** As the platform owner, I want the two live authorization gaps found
during this investigation fixed, so an arbitrary authenticated user cannot delete
institutional data or read another institution's financial-style metrics.

#### Acceptance Criteria

1. THE system SHALL fix `public.delete_department_if_no_programs(dept_id uuid)`, which
   is `SECURITY DEFINER`, granted `EXECUTE` to `authenticated`, and performs a `DELETE
   FROM public.departments` with **no role check and no institution check at all** —
   confirmed via live `pg_get_functiondef`. ANY authenticated user (including a
   student account) can currently call this RPC directly
   (`/rest/v1/rpc/delete_department_if_no_programs`) with an arbitrary `dept_id` and
   delete any department that has no programs, regardless of their role or
   institution.
2. THE fix for Acceptance Criterion 1 SHALL add an internal guard requiring
   `(select auth_user_role()) = 'admin'` AND the target department's `institution_id`
   matching `(select auth_institution_id())`, consistent with
   `.kiro/steering/supabase-patterns.md`'s admin-scoping convention, and SHALL preserve
   the function's existing return contract (`boolean`: true iff deleted).
3. THE system SHALL fix `public.get_earn_spend_ratio(p_institution_id uuid)`, which is
   `SECURITY DEFINER`, granted `EXECUTE` to `authenticated`, and returns
   institution-wide XP-economy totals (`total_earned`, `total_spent`, `ratio`,
   `status`) for **whatever `p_institution_id` the caller passes**, with no check that
   it matches the caller's own institution — confirmed via live `pg_get_functiondef`
   (contrast with the correctly-scoped sibling `get_wellness_aggregate_stats`, which
   raises `unauthorized: institution mismatch` on exactly this pattern). ANY
   authenticated user at Institution A can currently read Institution B's XP-economy
   rollup.
4. THE fix for Acceptance Criterion 3 SHALL add the same
   `IF (select auth_institution_id()) != p_institution_id THEN RAISE EXCEPTION ...`
   guard already used by `get_wellness_aggregate_stats` and `get_leaderboard_page`,
   preserving the function's existing return shape.
5. Both fixes SHALL ship as an additive forward migration via Supabase MCP
   `apply_migration` (never a manual edit to already-recorded migration history),
   SHALL pass `npm run db:check-replay`, and SHALL be verified by a rolled-back
   `execute_sql` probe confirming a non-admin/wrong-institution caller is now rejected
   and a legitimate admin/same-institution caller is unaffected.
6. Because these are live production authorization changes, THE system SHALL treat
   them as HIGH-RISK per the workspace safety guardrails and SHALL confirm with the
   user before applying, even though the change is strictly additive (narrowing an
   over-broad grant, not removing a legitimate one).
7. THE system SHALL verify, via grep of `src/` and `supabase/functions/`, whether
   either RPC has any existing caller; at investigation time neither had one, which
   SHALL be recorded so the fix is understood as closing a latent API-surface exposure,
   not as fixing an observed incident.

### Requirement 5: Record the SECURITY DEFINER exposure triage

**User Story:** As a future security reviewer, I want a recorded decision for every
`SECURITY DEFINER` function currently exposed to `anon`/`authenticated`, so the
advisor's WARN list stops looking like an undifferentiated pile of unresolved risk.

#### Acceptance Criteria

1. THE system SHALL classify every function in the live
   `anon_security_definer_function_executable` /
   `authenticated_security_definer_function_executable` advisor output into exactly one
   category: **intentional-public**, **intentional-internal-guard**, **fix-now** (→
   Requirement 4), or **hygiene-only** (functionally harmless exposure that should still
   be narrowed per Requirement 6).
2. THE system SHALL classify `auth_institution_id()` and `auth_user_role()` as
   intentional-public: these are the RLS helper functions themselves, invoked from
   inside policy predicates, and their exposure is required for RLS to function.
3. THE system SHALL classify `consume_invitation(text)` and
   `get_invitation_by_token(text)` as intentional-public: both are token-gated
   (require possession of a valid, unexpired, unused invitation token as the sole
   credential) by design, matching the self-signup/invitation flow.
4. THE system SHALL classify `is_portfolio_publicly_accessible(uuid)` and
   `portfolio_public_access(uuid)` as intentional-public: both gate on the student's own
   `portfolio_public`/`portfolio_sharing_permitted` opt-in flags and reveal only a
   boolean/status, matching the public-portfolio-sharing feature.
5. THE system SHALL classify `get_student_dashboard(uuid)` and
   `get_teacher_dashboard(uuid)` as intentional-internal-guard: both are `STABLE
   SECURITY DEFINER` with a fail-closed body guard (`if v_id is distinct from (select
   auth.uid()) then v_id := null`) that neutralizes any mismatched or anonymous caller
   to an empty/zero result — confirmed via live `pg_get_functiondef`. Their grant to
   `anon` is functionally harmless (an anonymous caller always gets an empty payload)
   but SHALL still be narrowed per Requirement 6 (least-privilege hygiene, not a
   behavior change).
6. THE system SHALL classify `fan_out_announcement_notifications(uuid)` and
   `send_teacher_nudge(uuid, text)` as intentional-internal-guard: both perform an
   explicit ownership check (`author_id = caller`, `caller teaches the target student`
   respectively) before any write, raising `42501` on failure — confirmed via live
   `pg_get_functiondef`.
7. THE system SHALL classify `get_leaderboard_page(uuid, int, int)` and
   `get_wellness_aggregate_stats(uuid)` as intentional-internal-guard: both already
   raise on an institution mismatch — confirmed via live `pg_get_functiondef`. These
   are the reference pattern that Requirement 4's fixes SHALL follow.
8. THE system SHALL classify `get_badge_spotlight(uuid, int)`,
   `course_material_institution(text)`, and `get_historical_evidence(text, text)` as
   intentional-public or intentional-internal-guard: the first two are low-sensitivity
   reads (a deterministic badge-rotation pick; an institution-id lookup used inside
   storage RLS predicates, not a data leak by itself), and the third already gates on
   `public.auth_user_role() <> 'admin'` returning zero rows — confirmed via live
   `pg_get_functiondef`.
9. THE triage SHALL be recorded in `docs/operations/supabase-compute-tiers.md` or a
   sibling ops doc referenced from this spec, so it is discoverable without re-running
   the investigation.

### Requirement 6: Least-privilege grant hygiene for SECURITY DEFINER functions

**User Story:** As the engineer who will write the next `SECURITY DEFINER` function, I
want a documented convention that prevents accidentally repeating the Requirement 4
mistakes, so the same class of gap does not recur.

#### Acceptance Criteria

1. THE system SHALL document, in `.kiro/steering/supabase-patterns.md` or this spec's
   design doc, that PostgreSQL grants `EXECUTE` on a newly created function to `PUBLIC`
   by default (which cascades to both `anon` and `authenticated` via their `PUBLIC`
   membership) unless the migration explicitly narrows it — and that this default,
   left unexamined, is the proximate cause of both the harmless-but-sloppy `anon`
   grants on `get_student_dashboard`/`get_teacher_dashboard` and the two real gaps in
   Requirement 4.
2. THE system SHALL establish the convention that every new migration creating a
   `SECURITY DEFINER` function SHALL either (a) immediately follow the `CREATE
   FUNCTION` with an explicit `REVOKE EXECUTE ... FROM PUBLIC` + `GRANT EXECUTE ... TO
   <intended roles>`, or (b) include an internal authorization guard sufficient that
   the exposure is safe by construction (the `auth.uid()`/`auth_institution_id()`
   fail-closed pattern already used correctly elsewhere in this codebase) — and SHALL
   NOT rely on the PostgreSQL default silently.
3. WHEN Requirement 4's fixes are applied THEN the same migration SHALL also
   `REVOKE EXECUTE ON FUNCTION public.get_student_dashboard(uuid),
   public.get_teacher_dashboard(uuid) FROM anon` (hygiene-only narrowing per
   Requirement 5.5 — functionally a no-op since `anon` calls already return empty, but
   removes a needless attack-surface listing from future advisor scans).
4. THE system MAY defer applying this convention retroactively to every existing
   intentional-public/intentional-internal-guard function catalogued in Requirement 5,
   since each already has an equivalent internal safeguard; retroactive tightening is
   OPTIONAL cleanup, not a gate.

### Requirement 7: Record defer/accept decisions for remaining advisor findings

**User Story:** As anyone re-running the security or performance advisors later, I want
a recorded reason for every finding that is not being fixed now, so it reads as a
decision, not an oversight.

#### Acceptance Criteria

1. THE system SHALL record `extension_in_public` (`vector` v0.8.0, `citext` v1.6) as
   **defer-to-ops**: moving an in-use extension to a dedicated schema is a
   higher-risk, low-value change for a project this size, and both extensions are
   currently referenced by application code/migrations that would need coordinated
   updates; revisit only if a future security review specifically requires it.
2. THE system SHALL record `auth_leaked_password_protection` (HaveIBeenPwned check
   disabled) as **fix-now-manual**: this is a single Dashboard toggle (Auth → Settings
   → Enable "Leaked password protection"), not a migration, and SHALL be listed as an
   explicit manual step for whoever has Dashboard access, mirroring how
   `supabase-audit-remediation` Task 3.7 already documented the same category of
   manual step.
3. THE system SHALL record `auth_db_connections_absolute` (GoTrue's fixed 10-connection
   allocation, independent of Compute_Tier) as **defer-to-billing-decision**:
   cross-referenced from `docs/operations/supabase-compute-tiers.md`, actionable only
   if/when a Compute_Tier upsize is chosen, at which point switching Auth's allocation
   to percentage-based should be requested at the same time.
4. THE system SHALL record `unused_index` (~70-110 INFO-level entries) as
   **defer-no-action**: at current near-zero production traffic, Postgres has not yet
   exercised many legitimately-needed indexes (FK joins, filter predicates); dropping
   any now risks removing a soon-to-be-hot index for no measurable benefit, consistent
   with the same conclusion already reached in `migration-history-reconciliation` Task
   12.
5. THE system SHALL NOT re-open any finding already resolved by
   `migration-history-reconciliation` (`security_definer_view` on
   `leaderboard_weekly`, `anonymize_user` anon/authenticated revoke, `pgcron`/
   `prevent_mutation` search_path) — those SHALL be cross-referenced as already-done,
   not re-triaged.

### Requirement 8: Cross-reference the phased roadmap without duplicating it

**User Story:** As someone reading this spec in isolation, I want clear pointers to
where the actual performance and RLS remediation work lives, so I don't start
duplicate work.

#### Acceptance Criteria

1. THE system SHALL cross-reference `.kiro/specs/dashboard-and-ux-performance/` as the
   owner of all query-shape and perceived-performance remediation (dashboard aggregate
   RPCs, `keepPreviousData`, auth round-trip trimming, etc.) and SHALL NOT duplicate
   its Tier 1/1.5/2/3 task list here.
2. THE system SHALL cross-reference `.kiro/specs/rls-policy-consolidation/` as the sole
   owner of the actual multiple-permissive-policy merge (the 76-group finding from
   Requirement 3) and SHALL NOT attempt that merge in this spec's tasks.
3. THE system SHALL cross-reference `.kiro/specs/migration-history-reconciliation/`
   (complete, 21/21) as the owner of migration-ledger drift and the already-resolved
   security-advisor items, and SHALL NOT re-litigate its closed findings.
4. THE system SHALL present, in its design document, a single phased Tier 1/2/3 summary
   table that shows how this spec's own tasks (Requirements 3, 4, 5, 6, 7) fit alongside
   the three cross-referenced specs' phases, so a reader gets the full picture from one
   place without the content being duplicated in four places.
