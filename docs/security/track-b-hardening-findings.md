# Track B — Supabase Hardening: Findings & Decisions

Source: live `get_advisors(security|performance)` on project `cdlgtbvxlxjpcddjazzx`
(Edeviser-Kiro), captured during the `production-bug-fixes` spec, Track B. All
security findings are **WARN-level** (no ERRORs).

This document records the items that are **configuration- or decision-only** (no
code change ships for them in this track). The actionable items shipped as
migrations are listed at the bottom for traceability.

---

## Item 8 — Leaked-password protection (Req 8) — DOCUMENTED / DEFERRED

Advisor `auth_leaked_password_protection` (HaveIBeenPwned check) is **disabled**.
This is a Supabase **Auth dashboard toggle**, not a migration, and the toggle is
only available on the **Pro plan**.

Already documented in [`docs/MANUAL-STEPS.md` §1](../MANUAL-STEPS.md). Action:
enable it when the production project is on Pro. No code change.

---

## Item 9 — `vector` / `citext` extensions in `public` (Req 9) — ACCEPT AS-IS

Advisor `extension_in_public` flags `vector` and `citext` installed in the
`public` schema (recommended location is a dedicated `extensions` schema).

**Dependents (live count):** `vector` backs **2** columns (embedding columns +
their HNSW index) and `citext` backs **2** columns.

**Decision: accept as-is (do not relocate).** `ALTER EXTENSION … SET SCHEMA
extensions` rewrites the dependent column types and indexes; with live embedding
(`vector`) and `citext` columns this is **high-risk** for a WARN-level hygiene
finding, and every `search_path`-pinned function already `public.`-qualifies its
references (so there is no functional name-resolution exposure today). Revisit
only if the extensions are needed in a non-`public` search path.

---

## Item 12 — Unused indexes & multiple permissive policies (Req 12) — DOCUMENT ONLY

### Unused indexes (`unused_index`)

**59** non-unique indexes report zero scans (`pg_stat_user_indexes.idx_scan = 0`).
On a low-traffic demo/early-production DB this is largely an **artifact of little
traffic**, not proof an index is useless (e.g. indexes backing rare admin queries
or cascade deletes may legitimately show zero scans).

**Decision: drop nothing under this spec.** Each candidate must be assessed
against real query patterns / a load test before removal; dropping an index that
backs a rare-but-important query is a silent latency regression. The live advisor
output is the source of truth for the current list. (Note: the two FK indexes
added in Track B Item 11 are intentional and expected to show zero scans until
the related joins run under load.)

### Multiple permissive policies (`multiple_permissive_policies`)

**69** `(table, action, role)` groups across the **131** policy-bearing tables
have more than one PERMISSIVE policy. Each permissive policy is evaluated per
query (a real per-row cost), but **consolidating is high-risk for RLS
correctness** — merging two policies can subtly widen or narrow access.

**Decision: carve out a dedicated, gated effort.** Recorded as a new spec stub
[`.kiro/specs/rls-policy-consolidation`](../../.kiro/specs/rls-policy-consolidation/requirements.md).
No policy is changed under `production-bug-fixes`; that work proceeds
table-by-table behind full deny-side `test:rls` proof (allowed AND denied per
role × table) per the `preview-and-test-gate`.

---

## Actionable Track B items that shipped as migrations

| Item | Migration                                                          | Effect                                                                                       |
| ---- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| 11   | `20260821000007_index_announcement_fks.sql`                        | btree indexes on `announcement_attachments.announcement_id`, `announcement_reads.student_id` |
| 10   | `20260821000008_restrict_mv_historical_evidence.sql`               | admin-gated `get_historical_evidence` RPC + REVOKE direct API SELECT on the MV               |
| 7    | `20260821000009_revoke_authenticated_execute_check_rate_limit.sql` | REVOKE `authenticated` EXECUTE on the internal `check_rate_limit_approaching` helper         |
