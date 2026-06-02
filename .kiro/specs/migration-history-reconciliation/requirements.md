# Requirements Document

## Introduction

This spec owns the **functional reconciliation of the local migration history with the live Supabase production schema** for the Edeviser platform, and the **closure of the production app-breakage** caused by undeployed schema. It is the dedicated owner of the "Category B" deployment gap and the out-of-scope drift that were surfaced — but explicitly carved out — by the `db-function-search-path-qualification` bugfix.

The authoritative investigation backing this spec is:

`#[[file:.kiro/specs/_investigation/db-function-search-path-residual-drift-analysis.md]]`

with supporting evidence in:

- `#[[file:.kiro/specs/_investigation/db-function-search-path-task8-replay-log.md]]`
- `#[[file:.kiro/specs/_investigation/db-function-search-path-preservation-baseline.md]]`
- `#[[file:.kiro/specs/_investigation/live-sql-validation-2026-06.md]]` — **live-SQL re-validation that confirms every finding below against the live project and CORRECTS the storage-bucket finding (live has `accreditation-reports`, not `reports`/`transcripts`) and adds new advisor findings. This is the most current source of truth and was produced by direct read-only live SQL rather than the cancellation-prone Docker `db diff`.**

### Problem statement (from the investigation)

When the `db-function-search-path-qualification` bugfix removed the historical `42883` clean-replay abort, a full `supabase db diff --linked` completed for the first time and exposed three classes of divergence between the recorded migrations and live production:

1. **Re-homed duplicate migrations.** The content of the unmerged `20260901000001`–`20260902000003` files was copied into back-dated `20260510*/20260526*/20260530*` timestamps to fix ordering, but the originals were left on disk. 11+ migrations now exist in duplicate. They survive a fresh replay only because every statement is `IF NOT EXISTS` / `DROP..CREATE` / `ON CONFLICT` idempotent. This is a maintenance hazard and a source of confusion, not (yet) a runtime defect.

2. **Genuinely-undeployed schema (the core gap).** Files `20260901000010_create_missing_phantom_tables` and `20260901000011_create_student_badges_quiz_clos_storage` create tables that **do not exist on production** (confirmed via live `to_regclass` = null): `student_badges`, `quiz_clos`, `team_gamification`, `student_habit_levels`, `student_habit_level_history`, and the `fn_track_habit_level_change` function + trigger. File `20260901000009_critical_pre_production_fixes` additionally defines a `profiles_institution_required_when_active` CHECK and an `institution_id` nullability change that were never applied to live (confirmed: live `profiles.institution_id` is still `NOT NULL`, no such CHECK).

2a. **Missing storage buckets — CORRECTED from the original investigation (live-SQL validated).** The Docker-diff analysis claimed migration `20260901000011` creates `reports` + `transcripts` buckets. Live `storage.buckets` actually contains `accreditation-reports`, `avatars`, `course-materials`, `session-evidence`, `submissions`, `tutor-attachments` — there is **NO `reports` bucket and NO `transcripts` bucket**. Three deployed Edge Functions upload to those non-existent names: `generate-transcript` → `.from("transcripts")`, `generate-accreditation-report` → `.from("reports")` (with a fragile inline `createBucket` fallback), and `export-student-data` → `.from("reports")`. So transcript generation and GDPR export fail on upload in production today; accreditation-report generation only survives by self-creating an unpoliced bucket at runtime. This is a genuine functional bug distinct from the table gap.

3. **App-breakage from the gap (Critical, live-validated).** The frontend hooks that read these tables were defensively patched and degrade quietly, but **six Edge Functions hard-query the missing tables with no guard** and fail at runtime in production today (confirmed by repo grep + live `list_edge_functions` showing all six ACTIVE): `check-badges`, `process-onboarding`, `export-student-data`, `weekly-summary-cron` (reference `student_badges`), and `process-streak`, `team-streak-risk-cron`, `check-badges` (reference `team_gamification`). Server-side badge awarding, team gamification, two cron jobs, and the GDPR data-export path are broken.

4. **Out-of-scope function-body + policy/constraint drift.** ~22 functions show live↔migration drift (`auth_institution_id`, `auth_user_role`, `anonymize_user`, `emit_notification`, the five `trg_*_notify` functions, `trigger_attainment_rollup`, `get_leaderboard_page`, `get_xp_transactions_page`, the portfolio helpers, `rls_auto_enable`, `is_pgcron_available`, `prevent_mutation`, plus the deployment-gap functions), and several policies/constraints/triggers are present in the shadow but not on live (confirmed: `notifications_type_check` and `notifications_type_role_guard` are absent on live; plus policies on `habit_logs`, `notifications`, `onboarding_progress`, `badge_spotlight_schedule`, `invitations`, `audit_*`).

5. **Live security advisories not previously tracked (surfaced by `get_advisors`).** (a) ERROR `security_definer_view` on `public.leaderboard_weekly` (a SECURITY DEFINER view bypasses the querying user's RLS); (b) WARN `anon` can execute `anonymize_user(uuid)` (GDPR erasure) as SECURITY DEFINER via the REST RPC surface — should `REVOKE EXECUTE FROM anon`; (c) WARN several SECURITY DEFINER RPCs executable by `anon`/`authenticated` (some intentional — portfolio public access, invitation-by-token — each to be confirmed or revoked); (d) WARN `vector` and `citext` extensions installed in `public`; (e) WARN leaked-password protection disabled (Auth config).

### Goal

Drive `supabase db diff --linked` to a **genuinely empty/clean diff**, deploy the missing schema safely, eliminate the production app-breakage, de-duplicate the migration history, and leave local `supabase/migrations/` byte-for-byte reproducing live production — without destroying or rewriting any existing production data.

### Non-goals

- Re-fixing the 10 `search_path` functions (owned by `db-function-search-path-qualification`; this spec must not regress them).
- Building the E2E/connectivity/RLS audit suite (owned by `pre-deployment-e2e-audit`; this spec produces the schema state that audit will verify).
- Introducing new product features. All schema here already exists in prior specs (`edeviser-platform`, `xp-marketplace`, `habit-heatmap`, `ui-consistency-global-fixes`, `student-experience-remediation`); this spec only deploys/records it.

## Glossary

- **Live_Schema**: the deployed schema of Supabase project `cdlgtbvxlxjpcddjazzx`. The source of truth for what production currently runs.
- **Local_Chain**: the ordered set of files in `supabase/migrations/`.
- **Remote_History**: the rows in `supabase_migrations.schema_migrations` recording which migrations production has applied (head currently `20260820100003`).
- **Clean_Diff**: a `supabase db diff --linked` run that COMPLETES with exit 0 and reports no DDL (no `create`/`drop`/`alter`).
- **Phantom_Table**: a table built by the Local_Chain that does not exist in Live_Schema (`student_badges`, `quiz_clos`, `team_gamification`, `student_habit_levels`, `student_habit_level_history`).
- **Re-homed_Duplicate**: a migration file whose content was copied to a back-dated timestamp while the original was left in place (the `20260901*/20260902*` ⇄ `20260510*/20260526*/20260530*` pairs).
- **Unguarded_Edge_Function**: an Edge Function that queries a Phantom_Table directly with no fallback (`check-badges`, `process-onboarding`, `export-student-data`, `weekly-summary-cron`, `process-streak`, `team-streak-risk-cron`).
- **Source_Of_Truth_Decision**: for each drifted object, the explicit decision whether Live_Schema or the migration text is correct, and which side is changed to converge.

## Requirements

### Requirement 1: Migration de-duplication

**User Story:** As a Tech_Lead, I want the re-homed duplicate migrations resolved to a single canonical file each, so that the Local_Chain has exactly one source of truth per change.

#### Acceptance Criteria

1. THE system SHALL enumerate every Re-homed_Duplicate pair (the `20260901*/20260902*` originals and their back-dated `20260510*/20260526*/20260530*` copies) and confirm, by content comparison, which member is the canonical (correctly-ordered) file.
2. FOR each Re-homed_Duplicate pair, THE system SHALL retain exactly one file (the correctly-ordered copy) and remove the redundant member from the Local_Chain.
3. WHEN de-duplication is complete, THE system SHALL verify that a fresh `supabase db diff --linked` still COMPLETES with no abort and produces no NEW drift introduced by the removal.
4. THE system SHALL NOT alter any migration that is already recorded in Remote_History in a way that changes the schema a fresh replay produces relative to Live_Schema.
5. IF removing a duplicate would change the replayed end-state, THEN THE system SHALL keep both and instead make the later file an explicit idempotent no-op, documenting why.

### Requirement 2: Deploy genuinely-undeployed schema (the phantom tables)

**User Story:** As a Release_Engineer, I want the Phantom_Tables and missing storage buckets deployed to production, so that the schema the application code expects actually exists.

#### Acceptance Criteria

1. THE system SHALL deploy to Live_Schema, via Supabase MCP `apply_migration` (never manual file edits to recorded history), the tables `student_badges`, `quiz_clos`, `team_gamification`, `student_habit_levels`, and `student_habit_level_history` exactly as defined by `20260901000010` and `20260901000011`.
2. THE system SHALL deploy the `fn_track_habit_level_change` function and its trigger as defined, with `SET search_path = ''` and `public.`-qualified bodies consistent with the platform's function-hardening convention.
3. THE system SHALL create the `reports` and `transcripts` storage buckets (private) with institution-scoped RLS policies per `.kiro/steering/supabase-patterns.md`, because three deployed Edge Functions (`generate-transcript`, `generate-accreditation-report`, `export-student-data`) upload to those exact bucket names and they do NOT exist on live (live has `accreditation-reports`, not `reports`/`transcripts`). Alternatively, IF the team prefers to consolidate on the existing `accreditation-reports` bucket, THE system SHALL repoint those three Edge Functions instead — but SHALL NOT leave the code referencing a non-existent bucket.
4. THE system SHALL enable Row Level Security on every newly-deployed table and attach the RLS policies defined in the source migrations, with no table left RLS-disabled.
5. WHEN the phantom schema is deployed, THE system SHALL regenerate `src/types/database.ts` using the protected script `pwsh scripts/regen-types.ps1` ONLY, and verify the file contains `export type Database` and is larger than 1 KB.
6. THE system SHALL verify each newly-created table is empty or correctly back-filled and that no existing table or column was altered destructively by the deployment.
7. IF any deployed table or policy diverges from its source-migration definition, THEN THE deployment SHALL be marked as failed AND rolled forward with a corrective migration, not merely flagged.
8. THE system SHALL ensure every newly-deployed table's RLS policies are effective (least-privilege), NOT merely enabled: no policy on a newly-deployed table SHALL use `USING (true)` / `WITH CHECK (true)` for INSERT/UPDATE/DELETE granted to `authenticated`. IF the deploy introduced such a policy (live-confirmed `rls_policy_always_true` on `student_badges_insert`, `quiz_clos_insert`, `quiz_clos_delete`, `team_gamification_insert`, `team_gamification_update`), THEN THE system SHALL replace it with a least-privilege predicate per `.kiro/steering/supabase-patterns.md` (student-scoped, team-member-scoped, or staff/service-role as appropriate) and confirm the `get_advisors(security)` finding clears with no RLS access regression for the legitimate `service_role` writers.

### Requirement 3: Eliminate production app-breakage in Edge Functions

**User Story:** As a Release_Engineer, I want every Unguarded_Edge_Function to either rely on now-deployed tables or degrade gracefully, so that no server path fails at runtime due to missing schema.

#### Acceptance Criteria

1. THE system SHALL verify, after Requirement 2 is deployed, that each Unguarded_Edge_Function (`check-badges`, `process-onboarding`, `export-student-data`, `weekly-summary-cron`, `process-streak`, `team-streak-risk-cron`) resolves every table it references without a missing-relation error.
2. WHERE Requirement 2 deployment is not yet complete for a referenced table, THE system SHALL add a defensive guard to the Edge Function so a missing table degrades gracefully (logged, non-fatal) rather than throwing, mirroring the pattern already used in `src/hooks/useStudentHabitLevel.ts` and `src/hooks/useTeams.ts`.
3. THE system SHALL verify that badge awarding (`check-badges`, `process-onboarding`), the GDPR export (`export-student-data`), the weekly summary cron, and the team streak/XP paths (`process-streak`, `team-streak-risk-cron`) each complete successfully against the deployed schema for at least one representative input.
4. THE system SHALL confirm that every Edge Function continues to validate its request body against a Zod schema before side effects, consistent with `.kiro/steering/project-conventions.md`, and SHALL NOT remove existing validation while adding guards.
5. IF any Edge Function still references a non-existent relation after this requirement, THEN THE Audit_Report classification per `pre-deployment-e2e-audit` SHALL remain at least Critical (that is, Critical or any higher severity such as Blocker, not Critical only) and the requirement SHALL NOT be considered met.
6. THE system SHALL verify that every Edge Function `insert`/`update` against a table writes ONLY columns that exist on that table's live schema, and SHALL fix any column-contract mismatch that causes a silent runtime insert failure. (Live-confirmed: the `notifications` table has columns `user_id, type, title, body, metadata, is_read`, but `perfect-day-prompt`, `team-streak-risk-cron`, `process-streak`, `exam-period-notify`, `check-badges`, `challenge-progress-update`, and `embed-course-material` insert a non-existent `message` column — and some also `institution_id`/`reference_id` — so those notifications never persist; the corresponding notification types are absent from live, corroborating the failure.)
7. WHEN a notification-writing Edge Function is corrected, THE system SHALL map `message`→`body`, drop non-existent columns (`institution_id`, `reference_id`) into `metadata` where the value is still wanted, preserve the `type`/`title` semantics, and verify at least one representative insert of each affected type (`perfect_day_nudge`, `team_streak_risk`, `team_streak_milestone`, `exam_period_reminder`, `team_badge`, `challenge_90_percent`) now persists and is readable by the recipient under RLS.

### Requirement 4: Reconcile the `profiles` constraint/nullability drift (file 9)

**User Story:** As a Tech_Lead, I want the `profiles` institution constraint reconciled with an explicit Source_Of_Truth_Decision, so that self-signup behavior matches both the code and the deployed constraint.

#### Acceptance Criteria

1. THE system SHALL determine the intended `profiles.institution_id` state by checking the self-signup / invitation flows in `src/`, the `handle_new_user` trigger, and the generated `src/types/database.ts`. (Live-verified Decision 1: the codebase types `profiles.institution_id` as non-null `string` in both Row and Insert, live keeps it `NOT NULL` with no `profiles_institution_required_when_active` CHECK, and open self-signup without an institution is NOT a supported flow — so every profile must be institution-scoped to keep `auth_institution_id()` RLS scoping sound.)
2. THE system SHALL converge the repo to live by amending the local migration (`20260901000009` Section 1 is an intentional no-op) so a fresh replay reproduces live's `institution_id NOT NULL` with no CHECK and no `supabase db diff --linked` drift on `profiles`; this is a REPLAY-ONLY change and SHALL NOT alter live (live is already in the intended state).
3. THE system SHALL NOT apply the historical migration's nullable-`institution_id` + conditional-CHECK variant to live, because it contradicts both live and the codebase types; IF a future product decision reverses this, THEN it SHALL be a separate, user-confirmed change.
4. THE system SHALL verify that the retained state does not break existing profile inserts (invitation-driven signup supplies `institution_id`) or the privilege-escalation guard `prevent_profile_privilege_escalation` (live-confirmed present and preserved).
5. THE system SHALL ensure the `handle_new_user` replay text is converged to the live deployed definition (owned by Requirement 5 / Task 6) so the function body stays consistent with the retained NOT NULL constraint — the `pending_verification`-with-NULL-institution path must match live and not reintroduce a NULL-institution insert.
6. THE system SHALL surface the decision to the user for visibility; the direction is decided (keep live NOT NULL, converge the repo to it) and THE system SHALL NOT reverse it without explicit user instruction.

### Requirement 5: Reconcile out-of-scope function-body drift

**User Story:** As a Tech_Lead, I want the ~22 drifted function bodies reconciled to a single source of truth, so that the migration set reproduces the live functions exactly.

#### Acceptance Criteria

1. THE system SHALL enumerate every function that re-emits in `supabase db diff --linked` and is NOT one of the 12 functions owned by `db-function-search-path-qualification`.
2. FOR each enumerated function, THE system SHALL record a Source_Of_Truth_Decision (live `pg_get_functiondef` vs migration text) and converge the two — either by a forward migration that recreates the function to match the intended definition, or by amending the historical migration text so a fresh replay reproduces live.
3. THE system SHALL preserve each function's `prosecdef` (SECURITY DEFINER/INVOKER), volatility, ownership, grants, and trigger attachments across reconciliation, changing only what is required to converge.
4. THE system SHALL NOT regress the 12 functions owned by `db-function-search-path-qualification`, nor the already-fixed `process_marketplace_purchase`.
5. WHEN reconciliation is complete, THE system SHALL verify that no function re-emits in `supabase db diff --linked` except those still pending another requirement.
6. IF a drifted function is also on the advisor `function_search_path_mutable` backlog (`is_pgcron_available`, `prevent_mutation`), THEN THE system SHALL harden it (qualify + `search_path=''`) as part of convergence.

### Requirement 6: Reconcile policy, constraint, and trigger drift

**User Story:** As a Tech_Lead, I want every policy/constraint/trigger that differs between shadow and live reconciled, so that data-access rules in the repo match production exactly.

#### Acceptance Criteria

1. THE system SHALL enumerate every `create policy` / `drop policy` / `drop constraint` / `drop trigger` / `drop index` line in `supabase db diff --linked` and attribute each to its owning table.
2. FOR each enumerated item, THE system SHALL record a Source_Of_Truth_Decision and converge shadow with live, preserving existing RLS coverage (no table left without its intended policies).
3. THE system SHALL specifically reconcile the `notifications_type_check` constraint, the `notifications_type_role_guard` function + trigger, and the policy deltas on `habit_logs`, `notifications`, `onboarding_progress`, `badge_spotlight_schedule`, `invitations`, and `audit_*`.
4. THE system SHALL verify that no append-only invariant (`xp_transactions`, `xp_purchases`, `audit_logs`, evidence) is weakened by any policy change, AND SHALL close any existing append-only gap where an immutable-ledger table (e.g. `xp_purchases`) permits UPDATE of immutable columns (`xp_cost`, `item_id`, `student_id`, `purchased_at`) without a column-guard, by adding a `WITH CHECK` and/or `BEFORE UPDATE` reset trigger that leaves only the intended mutable columns (`status`, `consumed_at`, `metadata`) writable by non-service-role callers.
5. IF any reconciliation would remove a security control present on live, THEN THE system SHALL flag it as a security regression and require explicit confirmation before proceeding.
6. THE system SHALL verify there is exactly ONE active scheduler per recurring job and that every active cron references a working target: it SHALL reconcile the dual Vercel-Cron-vs-pg_cron duplication (live-confirmed: 10 Vercel `/api/cron/*` proxies overlap with 11 pg_cron jobs, several pg_cron HTTP jobs post to a NULL base URL and silently no-op, and `leaderboard-refresh` pg_cron targets a now-plain view) by adopting a single canonical scheduler and unscheduling the redundant/broken jobs, keeping the self-contained pure-SQL pg_cron jobs (`badge-auto-archive`, `badge-spotlight-rotate`, `fee-overdue-check`), and confirming `cron.job_run_details` shows no recurring failure and no job double-fires.
7. THE system SHALL verify, per role (admin, coordinator, teacher, student, parent), that RLS both ISOLATES correctly (no cross-student / cross-institution / non-linked-child leakage) AND GRANTS the access each role's UI legitimately needs, using a per-role positive+negative probe (impersonate via `request.jwt.claims`). IF a role can reach data it must not (leak) OR cannot reach data its sections require (functional gap), THEN THE system SHALL correct the policy set.
8. THE system SHALL close the live-confirmed parent-visibility gap: a verified parent can read its linked child's grades/attendance/gamification/submissions but CANNOT read the child's `profiles` row (no parent SELECT policy on `profiles`), so the parent "My Children" dashboard renders nameless/empty children. THE system SHALL add a parent SELECT policy on `profiles` scoped to verified `parent_student_links` (mirroring the parent pattern in `.kiro/steering/supabase-patterns.md`), exposing only the child rows the parent is linked to, and verify the parent dashboard query (`useParentDashboard`) now returns each linked child's profile.

### Requirement 7: Record the reconciled chain and prove a clean diff

**User Story:** As a Release_Engineer, I want the full Local_Chain recorded in Remote_History and a genuinely-empty `db diff`, so that production is reproducible from the repo.

#### Acceptance Criteria

1. WHEN all reconciliation requirements (1–6) are met, THE system SHALL ensure every applied migration is recorded in Remote_History and run `supabase migration list --linked` to confirm local head equals remote head.
2. THE system SHALL run `supabase db diff --linked` and confirm it COMPLETES with no abort and reports a genuinely empty/clean diff (no `create`/`drop`/`alter`).
3. THE system SHALL run `supabase migration fetch` so the local `supabase/migrations/` matches the remote history after all forward migrations are applied.
4. THE system SHALL run the local CI suite — `npm run lint` (zero warnings), `npx tsc --noEmit` (zero errors), `npm test` (Vitest `--run`) — and confirm all green.
5. THE system SHALL re-run the `pre-deployment-e2e-audit` connectivity, RLS, and cron-health layers (its Requirements 4, 5, 15) and confirm no Blocker/Critical finding remains attributable to missing tables.
6. IF the diff is not genuinely empty or any CI/audit gate fails, THEN this spec SHALL NOT be considered complete.

### Requirement 8: Safety, reversibility, and data preservation

**User Story:** As a Release_Engineer, I want every production change in this spec to be non-destructive and reversible, so that reconciliation cannot lose data.

#### Acceptance Criteria

1. THE system SHALL make every production change via additive, forward migrations through Supabase MCP `apply_migration`; because the live product data is disposable test data that can be reseeded, THE system SHALL NOT require explicit, itemized user confirmation solely to protect existing rows, but THE system SHALL preserve full application functionality, cross-table connectivity, and the complete `profiles`-chain linkage to the codebase as mandatory invariants.
2. THE system SHALL capture a pre-change snapshot of affected catalog metadata and row counts so any change can be verified and, if needed, reversed.
3. WHERE an operation has broad blast radius (mass `REVOKE`, recursive policy drop, constraint addition that could reject existing rows) and could break connectivity, functionality, or the `profiles`-chain linkage, THE system SHALL treat it as high-risk and confirm with the user before applying.
4. THE system SHALL verify after each deployment step that the 12 `search_path`-fixed functions and full application functionality remain intact.
5. THE system SHALL never edit `src/types/database.ts` by hand and SHALL regenerate it only via `pwsh scripts/regen-types.ps1`.
6. IF a deployment step fails midway, THEN THE system SHALL stop, report the exact state, and propose a corrective forward migration to complete the intended state, and THE system SHALL NOT attempt to auto-roll-back the partial changes.

### Requirement 9: Reconcile live security advisories

**User Story:** As a Tech_Lead, I want the live `get_advisors` security findings triaged and resolved, so that reconciliation also closes the security exposures the completed audit surfaced.

#### Acceptance Criteria

1. THE system SHALL re-run `get_advisors(security)` against Live_Schema and enumerate every finding, recording for each a decision: fix-now (this spec), defer (with owner + reason), or accept (with justification).
2. THE system SHALL resolve the ERROR-level `security_definer_view` finding on `public.leaderboard_weekly` by rebuilding the view as `security_invoker` (or otherwise ensuring it enforces the querying user's RLS), preserving its output shape and the leaderboard anonymity opt-out invariant from `.kiro/steering/domain-knowledge.md`.
3. THE system SHALL `REVOKE EXECUTE` on `public.anonymize_user(uuid)` from the `anon` role (and from `authenticated` unless an authenticated self-erasure flow is confirmed), because GDPR user-erasure must not be callable by unauthenticated/arbitrary callers via the REST RPC surface.
4. FOR every other `anon_security_definer_function_executable` / `authenticated_security_definer_function_executable` finding, THE system SHALL confirm the exposure is intentional (e.g. `get_invitation_by_token`, `portfolio_public_access`, `is_portfolio_publicly_accessible`, `auth_institution_id`, `auth_user_role`) or `REVOKE EXECUTE` accordingly, documenting the decision per function.
5. THE system SHALL record the `extension_in_public` (`vector`, `citext`) and `auth_leaked_password_protection` findings with an explicit fix-or-defer decision; these MAY be deferred to ops with justification rather than blocking this spec.
6. WHEN any advisor remediation changes a function's security or grants, THE system SHALL preserve its body behavior and re-run `get_advisors` to confirm the finding clears with no new finding introduced.
7. IF a SECURITY DEFINER → SECURITY INVOKER change would break a flow that depends on definer privileges, THEN THE system SHALL flag the tradeoff and confirm with the user before applying.

### Requirement 10: Reconcile live performance advisories

**User Story:** As a Release_Engineer, I want the live `get_advisors(performance)` findings triaged and the high-value ones fixed, so that production query performance does not silently degrade at scale and the repo converges with live at the same time.

#### Acceptance Criteria

1. THE system SHALL re-run `get_advisors(performance)` against Live_Schema and enumerate every finding by type: `auth_rls_initplan`, `duplicate_index`, `unindexed_foreign_keys`, `unused_index`, and `multiple_permissive_policies`.
2. FOR every `auth_rls_initplan` finding, THE system SHALL converge the live RLS policy to the optimized `(select auth.<fn>())` form via a forward migration, preserving each policy's exact `USING`/`WITH CHECK` predicate semantics and role set with no access change, and SHALL treat this as the Source_Of_Truth_Decision for the 6 historical files that re-emitted with the wrapper removed (`20260504041109`, `20260520063920`, `20260520063937`, `20260520064025`, `20260520102905`, `20260520113022`).
3. FOR every `duplicate_index` finding, THE system SHALL drop the redundant member of each identical-index pair via an additive forward migration, keeping the canonical FK-index name and confirming the kept index covers the same columns; THE system SHALL NOT drop a constraint-backing (unique/primary-key) index.
4. THE system SHALL add a covering index for the `assignments_rubric_id_fkey` foreign key (`unindexed_foreign_keys`) consistent with the project's FK-index convention.
5. THE system MAY defer `unused_index` and `multiple_permissive_policies` findings to a documented backlog with recorded rationale (these are not gates); WHERE a `multiple_permissive_policies` consolidation is low-risk and clears drift, THE system MAY include it, preserving the exact allowed/denied matrix per role.
6. WHEN any performance remediation changes a policy or index, THE system SHALL verify that RLS access outcomes are unchanged via a positive and a negative probe per affected table, and SHALL confirm no index drop removed a constraint-backing index.
7. WHEN performance remediations are applied, THE system SHALL re-run `get_advisors(performance)` and confirm the targeted findings (`auth_rls_initplan`, `duplicate_index`, the `assignments_rubric_id_fkey` index) clear with no new finding introduced.
8. IF a policy-consolidation or index change would alter the allowed/denied access matrix or otherwise has broad blast radius, THEN THE system SHALL flag it and confirm with the user before applying.

### Requirement 11: Production deployment & hosting health (Vercel)

**User Story:** As a Release_Engineer, I want the live Vercel production deployment verified and hardened, so that the hosted app is fast, reachable on the intended domain, and not double-scheduling work.

#### Acceptance Criteria

1. THE system SHALL verify the current production deployment of project `e-deviser` is in state READY and serving, and record its build time and region for a performance baseline (live-confirmed 2026-06: READY, ~80–89s Vite builds, served from `bom1` with edge-cache HIT).
2. THE system SHALL verify production response headers enforce the intended security + caching posture (HSTS, CSP, X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy, Permissions-Policy; `/assets/*` immutable 1-year cache; `index.html`/`sw.js` no-cache) per `vercel.json`, and flag any drift (live-confirmed present 2026-06).
3. THE system SHALL resolve the unverified custom domain `edeviser.com` (DNS not pointed → users are on `*.vercel.app`): either complete DNS verification so the branded domain serves, or document the decision to stay on the Vercel domain for now.
4. THE system SHALL ensure exactly one scheduler owns each recurring job across Vercel Cron and Supabase pg_cron (see Req 6.6) so no job double-fires or silently no-ops.
5. THE system SHALL capture a client-performance baseline (bundle size of the largest JS/CSS chunks, and a Lighthouse/Web-Vitals pass via the repo's `lighthouserc.cjs` / `performance-budget.config.ts`) and record any chunk that exceeds the performance budget as a follow-up, without blocking this spec.
6. IF any production header, domain, or scheduler change is required, THEN THE system SHALL treat it as a production change and confirm with the user before applying.
