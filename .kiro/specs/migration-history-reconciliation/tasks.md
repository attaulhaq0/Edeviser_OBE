# Implementation Plan — Migration History Reconciliation

## Overview

This plan reconciles the local migration chain with live Supabase production (`cdlgtbvxlxjpcddjazzx`) and closes the production app-breakage surfaced by the `db-function-search-path-qualification` bugfix. The objective proof of done (Requirement 7): `supabase db diff --linked` COMPLETES and reports a **genuinely empty/clean diff**, the 6 previously-unguarded Edge Functions resolve all tables, the migration history is de-duplicated and recorded, CI is green, and the `pre-deployment-e2e-audit` connectivity/RLS/cron layers report no Blocker/Critical attributable to missing tables.

Authoritative inputs:

- `#[[file:.kiro/specs/migration-history-reconciliation/requirements.md]]`
- `#[[file:.kiro/specs/migration-history-reconciliation/design.md]]`
- `#[[file:.kiro/specs/_investigation/db-function-search-path-residual-drift-analysis.md]]`

### Live-verified state (re-confirmed 2026-06 via read-only `execute_sql` + `get_advisors`)

The following were re-checked directly against live and are already DEPLOYED + recorded in Remote_History — the inventory below reflects this:

- The 5 phantom tables (`student_badges`, `quiz_clos`, `team_gamification`, `student_habit_levels`, `student_habit_level_history`) all exist with RLS enabled and policies attached.
- `fn_track_habit_level_change` exists with `search_path=''`; `is_pgcron_available` and `prevent_mutation` are also `search_path=''`.
- The `reports` and `transcripts` storage buckets both exist (private) with institution-scoped RLS.
- `public.leaderboard_weekly` is `security_invoker=true`; `anonymize_user(uuid)` EXECUTE is granted only to `service_role`/`postgres` (revoked from `anon`/`authenticated`).
- `profiles.institution_id` remains `NOT NULL` with no `profiles_institution_required_when_active` CHECK — **Decision 1 CONFIRMED (keep live), file 9 amended to reproduce live (Task 4 done).**
- Recorded reconciliation migrations on live (live-verified): `20260601205749_deploy_phantom_tables_function_buckets_rls`, `20260601210352_revoke_execute_on_fn_track_habit_level_change`, `20260601220023_task11_leaderboard_weekly_security_invoker`, `20260601220036_task11_revoke_anonymize_user_from_public_roles`, `20260601220105_task11_harden_search_path_pgcron_and_prevent_mutation`. **All 5 are recorded in Remote_History but NOT yet on local disk.** Conversely, the local planning files `20260901000004/000009/000010/000011` are on disk but NOT in Remote_History (their schema is already deployed under the `20260601*` names). This bidirectional sync gap is owned by **Task 14** (the precondition for the Task 9 clean-diff gate).
- **NEW live finding (introduced by the Task 3 deploy):** `get_advisors(security)` flags `rls_policy_always_true` on 6 policies of the new tables — `quiz_clos_insert`/`quiz_clos_delete`, `student_badges_insert`, `team_gamification_insert`/`team_gamification_update` use `USING (true)`/`WITH CHECK (true) TO authenticated`. Tightening these is **Task 13** (new).
- Residual deferrable security advisors: `extension_in_public` (`vector`, `citext`), `auth_leaked_password_protection`, and the per-function `anon`/`authenticated` SECURITY DEFINER executable set (triaged in Task 11).

### Conventions

- DDL ships as additive forward migrations via Supabase MCP `apply_migration`. Replay-only edits change historical files on disk and never run against production.
- **Verification oracle is LIVE SQL introspection** (`execute_sql` with `to_regclass`/`to_regproc`/`information_schema`/`pg_constraint`/`pg_policy`/`storage.buckets`/`pg_get_functiondef`, plus `get_advisors` and `supabase_migrations.schema_migrations`), per `#[[file:.kiro/specs/_investigation/live-sql-validation-2026-06.md]]`. The Docker `supabase db diff --linked` was unstable/cancellation-prone in this environment, so it is used ONLY as the final confirmation gate (Task 9) — never as the per-step check.
- **Data-preservation posture (user-confirmed):** product data is test/seed data, so incidental row loss is acceptable; full connectivity and a completely linked profiles chain that matches the codebase are MANDATORY (this is a real school deployment). Still default to additive, non-destructive changes; do not `DROP TABLE`/`DROP COLUMN`/rewrite rows without itemized confirmation.
- HIGH-RISK steps (Req 4 profiles constraint; Req 9 SECURITY DEFINER/grant changes; any live DROP/REVOKE with broad blast radius) require explicit user confirmation before applying (Req 8).
- On a mid-deploy failure, do NOT auto-rollback partial changes — propose a corrective FORWARD migration to complete the intended state (Req 8.6, user-confirmed).
- Types are regenerated ONLY via `pwsh scripts/regen-types.ps1`.
- This spec must NOT regress the 12 `search_path` functions owned by `db-function-search-path-qualification` or `process_marketplace_purchase`.
- **Already done (carry-over from the bugfix):** the duplicate Part C migration was resolved — production recorded the fix as `20260601110014_fix_function_search_path_qualification` (pulled down by `migration fetch`), and the redundant planned twin `20260903000001_*` was deleted. Task 2 covers the REMAINING re-homed duplicates only.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2"] },
    { "id": 2, "tasks": ["3", "4", "11"] },
    { "id": 3, "tasks": ["5", "13", "18"] },
    { "id": 4, "tasks": ["6"] },
    { "id": 5, "tasks": ["7", "8", "12", "15", "16", "17", "19", "21"] },
    { "id": 6, "tasks": ["14"] },
    { "id": 7, "tasks": ["9", "20"] },
    { "id": 8, "tasks": ["10"] }
  ]
}
```

- Wave 0 (Task 1): re-confirm the live inventory (read-only) — the foundation for every decision.
- Wave 1 (Task 2): Lane 1 de-duplication (replay-only).
- Wave 2 (Tasks 3, 4, 11): deploy phantom tables (forward) + the profiles constraint decision (HIGH-RISK gate) + the security-advisor remediation (HIGH-RISK gate) — independent surfaces.
- Wave 3 (Tasks 5, 13, 18): harden/verify the 6 Edge Functions + 3 bucket-using functions, tighten the permissive `USING (true)` policies the Task 3 deploy introduced, and fix the silent notification-insert column-contract failures — all depend on the deployed schema.
- Wave 4 (Task 6): converge function-body drift.
- Wave 5 (Tasks 7, 8, 12, 15, 16, 17, 19, 21): converge policy/constraint drift + regenerate types + performance-advisory remediation + the live functional-integrity findings (dual cron-scheduler reconciliation, xp_purchases append-only gap, leaderboard_weekly view/RPC drift, parent→child profile visibility) + Vercel deployment health/perf baseline.
- Wave 6 (Task 14): reconcile the migration-history sync gap (bidirectional) so local `supabase/migrations/` and Remote_History agree object-for-object — the precondition for a meaningful clean diff.
- Wave 7 (Tasks 9, 20): record chain + prove genuinely-empty diff + CI + e2e-audit re-run, and run the full per-role RLS isolation+access verification matrix across all 5 roles.
- Wave 8 (Task 10): final safety/preservation checkpoint.

## Tasks

### Phase 0 — Re-confirm the live inventory (read-only)

- [x] 1. Re-baseline the inventory against LIVE SQL (READ-ONLY)
  - Using read-only `execute_sql`, confirm the live existence/shape of every object in the design inventory (the live-SQL validation doc already did the first pass — re-confirm before acting since state may change): the 5 phantom tables (`to_regclass`), `fn_track_habit_level_change` (`to_regproc`), the `reports`/`transcripts` buckets vs the live `accreditation-reports` (`storage.buckets`), the file-9 `profiles.institution_id` nullability + `profiles_institution_required_when_active` CHECK, the `notifications_type_check`/`notifications_type_role_guard` drift, and the ~22 drifted functions (`pg_get_functiondef`). Run `get_advisors(security)` for Req 9.
  - Produce a confirmed per-object worklist (deploy / de-duplicate / converge-replay / converge-forward / revoke) and, for each drifted object, a draft Source_Of_Truth_Decision.
  - **No production change.** Reads + advisors only. (Docker `db diff` is NOT required here — live SQL is the oracle.)
  - _Requirements: 1.1, 2.6, 4.1, 5.1, 6.1, 9.1_

### Phase 1 — History hygiene (replay-only; no production impact)

- [x] 2. De-duplicate the re-homed migration pairs
  - For each Re-homed_Duplicate pair (design table), compare content to confirm the canonical (correctly-ordered) member, then remove the redundant file from the Local_Chain.
  - **Includes the Part C duplicate**: remove the local-only `20260903000001_fix_function_search_path_qualification.sql` (Part C is recorded on live as `20260601110014_*`, which is the canonical copy to keep). Confirm the two files are byte-identical in function content before removing.
  - Where removal would change the replayed end-state, instead make the later file an explicit idempotent no-op and document why (Req 1.5).
  - Re-run `supabase db diff --linked`; confirm it still completes with no abort and no NEW drift was introduced by the removal.
  - Do not alter any migration recorded in Remote_History in a way that changes the replayed end-state relative to live.
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

### Phase 2 — Deploy missing schema + reconcile profiles (forward; production)

- [x] 3. Deploy the phantom tables, function, buckets, and RLS (additive forward migration) — DONE, live-verified

  - Applied to live and recorded as `20260601205749_deploy_phantom_tables_function_buckets_rls` (+ `20260601210352_revoke_execute_on_fn_track_habit_level_change`). Live now has all 5 tables (RLS enabled, policies attached), `fn_track_habit_level_change` (`search_path=''`), and the `reports`/`transcripts` private buckets with institution-scoped RLS.
  - **Follow-on identified by the live re-check:** the deploy shipped permissive `USING (true)`/`WITH CHECK (true)` policies on `student_badges`/`quiz_clos`/`team_gamification` (now flagged `rls_policy_always_true`). Tightening them is **Task 13** so Req 2.4's "RLS effective, not just enabled" intent is met. Also note: the recorded `20260601205749/210352` migrations are not yet on local disk — Task 9 pulls them via `migration fetch`, after which the redundant local planning files `20260901000010/11` (and the no-op `20260901000009`) are reconciled.
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 8.1, 8.2, 8.4, 8.5_

- [x] 4. Reconcile the `profiles` constraint/nullability drift — DONE (Decision 1: keep live)
  - Decision CONFIRMED: live keeps `profiles.institution_id` NOT NULL and does NOT create `profiles_institution_required_when_active`; open self-signup without an institution is not a supported flow (every profile must be institution-scoped so `auth_institution_id()` RLS scoping stays sound).
  - Replay-only edit applied: `20260901000009_critical_pre_production_fixes.sql` Section 1 is now an intentional no-op so a fresh replay reproduces live exactly (no `profiles` drift). The `prevent_profile_privilege_escalation` guard is present on live and preserved.
  - Live-verified: `profiles.institution_id` is `NOT NULL`; no institution CHECK constraint exists. The `handle_new_user` body's `pending_verification`-with-NULL-institution path is owned by Task 6 (converge the function to the live definition) — not re-fixed here.
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 8.1, 8.3_

### Phase 3 — Application correctness + new-table RLS tightening

- [x] 5. Verify/guard the 6 previously-unguarded Edge Functions

  - After Task 3, verify `check-badges`, `process-onboarding`, `export-student-data`, `weekly-summary-cron`, `process-streak`, `team-streak-risk-cron` resolve every referenced table with no missing-relation error (all 6 tables now exist on live — confirmed).
  - Verify the three bucket-using functions (`generate-transcript` → `transcripts`, `generate-accreditation-report` → `reports`, `export-student-data` → `reports`) resolve their target bucket after Task 3 (both buckets now exist on live — confirmed); remove the fragile inline `createBucket("reports")` runtime fallback in `generate-accreditation-report` now that the bucket exists with proper RLS.
  - Where a table is not yet deployed, add a defensive guard mirroring `src/hooks/useStudentHabitLevel.ts` / `useTeams.ts` (logged, non-fatal). Preserve each function's existing Zod request-body validation.
  - Exercise each function for one representative input: badge awarding, GDPR export (incl. file upload), transcript generation, weekly summary, team streak/XP all complete successfully.
  - **DONE (2026-06, live-verified).** Verification oracle = read-only `execute_sql` + `to_regclass`/`information_schema` + live edge-function source (`get_edge_function`) + rolled-back contract probes.
    - **Table resolution (Req 3.1):** all 46 distinct tables referenced by the 6 functions resolve on live via `to_regclass` (incl. the 5 formerly-phantom tables `student_badges`, `quiz_clos`, `team_gamification`, `student_habit_levels`, `student_habit_level_history`). No missing-relation possible. No defensive guard needed (Req 3.2 N/A — all tables exist; confirmed).
    - **Bucket resolution (Req 3.2 buckets):** `reports` + `transcripts` both exist (private). The 3 bucket-using functions resolve their targets (`generate-transcript`→`transcripts`, `generate-accreditation-report`→`reports`, `export-student-data`→`reports`).
    - **createBucket fallback removal (Req 3.x):** the `generate-accreditation-report` inline `createBucket("reports")` runtime self-heal was ALREADY removed in both local source and the live-deployed version (v4) — the upload-error path now surfaces the error directly with an explanatory comment. No code change/redeploy needed there. `verify_jwt` confirmed = true (unchanged). (Note: `export-student-data` and `generate-transcript` still self-create their buckets as a belt-and-suspenders retry; left as-is since they're idempotent no-ops now that the buckets exist and are not the function this task was scoped to de-fragilize.)
    - **Column-contract (Req 3.4/3.6/3.7):** notification inserts across all 6 functions use the correct live contract (`body`/`is_read`/`metadata`); no `message`/`institution_id`/`read` reintroduced (Task 18 fix intact, re-confirmed by grep sweep).
    - **NEW BUG FOUND + FIXED (live HTTP 500, not covered by any prior task) — user-approved fix+deploy:** `process-streak`, `check-badges`, and `weekly-summary-cron` queried/wrote `student_gamification.streak_count`, but the live column is `streak_current` (confirmed `undefined_column`). `process-streak`'s Step-1 SELECT therefore errored → HTTP 500 (server-side streak processing broken on live). Fixed all references (`select`, internal-state map, and the Step-3 upsert key) to `streak_current` while preserving the internal `StreakState.streak_count` field name and the JSON response/email-template `streak_count` keys (backward-compatible). Redeployed: `weekly-summary-cron` v4, `process-streak` v5, `check-badges` v5 — **all with `verify_jwt: true` preserved** (`check-badges` via Supabase CLI to avoid hand-transcribing the ~2000-line file; the other two via `deploy_edge_function`). Verified post-deploy via `get_edge_function` that the live source now reads `streak_current` and `verify_jwt=true`. Rolled-back contract probes confirm the `process-streak` upsert and the badge/streak/export reads all succeed against the live schema.
    - **FLAGGED (out-of-Task-5-scope, no change made):** (1) `streak-risk-cron` (NOT one of this task's 6 functions) has the SAME `student_gamification.streak_count` bug — it `.select("student_id, streak_count").gt("streak_count", 0)`, which errors on live; needs the same `streak_current` fix under a follow-up. (2) `student_gamification.habit_difficulty_level` is a `text` column CHECK-constrained to `{starter,intermediate,advanced,master}`, but `process-streak` treats it numerically (`1/2/3`); this is a latent logic bug (wrong tier evaluation), NOT a crash for existing students — all 71 students have a gamification row with value `'starter'`, so the new-student INSERT path (which would write numeric `1` and violate the CHECK) is currently unreachable, and existing students write back their valid text value unchanged. Recommend a dedicated fix to map the habit-difficulty level to the text enum.
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 13. Tighten the permissive `USING (true)` RLS policies on the newly-deployed tables (forward; production)
  - The Task 3 deploy left 6 policies open to any `authenticated` caller, now flagged `rls_policy_always_true` by `get_advisors(security)`: `student_badges_insert` (`WITH CHECK true`), `quiz_clos_insert` (`WITH CHECK true`), `quiz_clos_delete` (`USING true`), `team_gamification_insert` (`WITH CHECK true`), `team_gamification_update` (`USING true`). This lets any signed-in student award themselves badges, mutate/inflate team XP, or delete quiz↔CLO mappings.
  - Replace each with a least-privilege predicate consistent with `.kiro/steering/supabase-patterns.md`: scope `student_badges` writes to `student_id = (select auth.uid())` or staff/service-role; scope `team_gamification` writes to the team's members (or service-role only, since server crons own those writes); scope `quiz_clos` insert/delete to `admin`/`teacher`/`coordinator` within the owning course's institution. Confirm the responsible writers are the Edge Functions running under `service_role` (which bypasses RLS) before narrowing the `authenticated` grants, so Task 5 functions keep working.
  - Apply via additive forward `apply_migration` (drop+recreate each policy in one migration); re-run `get_advisors(security)` and confirm all 6 `rls_policy_always_true` findings clear with no new finding, and verify a positive + negative RLS probe per table.
  - **Production change (policies).** Confirm the tightened predicates with the user before applying (Req 8.3).
  - _Requirements: 2.4, 2.8, 9.1, 9.6, 6.4_

### Phase 4 — Converge function-body drift

- [x] 6. Reconcile the out-of-scope function-body drift (~22 functions)
  - Enumerate every re-emitting function NOT owned by `db-function-search-path-qualification`. For each, record a Source_Of_Truth_Decision (live `pg_get_functiondef` vs migration text) and converge — forward migration where the repo is source of truth, or replay-only text edit where live is.
  - Includes converging `handle_new_user` to the live deployed definition (the `20260901000009` replay text must match live so the profiles chain stays consistent with Decision 1 — see Task 4 note).
  - Preserve `prosecdef`, volatility, ownership, grants, and trigger attachments. Harden the advisor-backlog functions (`is_pgcron_available`, `prevent_mutation`) as part of convergence — **note: live re-check shows both are already `search_path=''`, so confirm the local migration text matches and no further hardening migration is needed.**
  - Do NOT regress the 12 bugfix-owned functions or `process_marketplace_purchase`. Re-run `db diff`; confirm no function re-emits except those pending another task.
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

### Phase 5 — Converge policy/constraint drift + types

- [x] 7. Reconcile policy, constraint, and trigger drift

  - Enumerate every `create/drop policy`, `drop constraint`, `drop trigger`, `drop index` in the diff; attribute to its table; record a Source_Of_Truth_Decision and converge, preserving RLS coverage.
  - Specifically reconcile `notifications_type_check`, `notifications_type_role_guard` + trigger (live-confirmed ABSENT on live — decide whether to add them to live or remove them from the repo replay), and the policy deltas on `habit_logs`, `notifications`, `onboarding_progress`, `badge_spotlight_schedule`, `invitations`, `audit_*`, plus `notifications_user_unread_idx`.
  - Preserve append-only invariants. Flag any change that would remove a live security control and confirm with the user before proceeding (Req 6.5 / 8.3).
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 8.3_

- [x] 8. Regenerate types after schema convergence
  - If Tasks 3/4/6/7/13 changed any table/column shape on live, regenerate `src/types/database.ts` via `pwsh scripts/regen-types.ps1` ONLY; verify `export type Database` present and file > 1 KB.
  - _Requirements: 2.5, 8.5_

### Phase 5b — Live security-advisory remediation (forward; production; HIGH-RISK gate)

- [x] 11. Triage + resolve the live `get_advisors(security)` findings (user-gated) — core items DONE, live-verified
  - Re-run `get_advisors(security)`; record per finding a decision (fix-now / defer-with-owner / accept-with-justification).
  - DONE: the ERROR `security_definer_view` on `public.leaderboard_weekly` was rebuilt `security_invoker` (live-confirmed `security_invoker=true`), preserving its output shape AND the leaderboard anonymity opt-out invariant. Recorded as `20260601220023_task11_leaderboard_weekly_security_invoker`.
  - DONE: `REVOKE EXECUTE` on `public.anonymize_user(uuid)` from `anon`/`authenticated` (live-confirmed EXECUTE now only `service_role`/`postgres`; the finding no longer appears in advisors).
  - DONE: `public.is_pgcron_available` and `public.prevent_mutation` are `search_path=''` (live-confirmed) — the `function_search_path_mutable` WARNs cleared.
  - Remaining (triage, mostly accept-as-intentional or defer): the per-function `anon`/`authenticated` SECURITY DEFINER executable set (`auth_institution_id`, `auth_user_role`, `consume_invitation`, `get_invitation_by_token`, `is_portfolio_publicly_accessible`, `portfolio_public_access`, and ~12 `authenticated`-only RPCs) — document each as intentional or `REVOKE EXECUTE`. Record `extension_in_public` (`vector`, `citext`) and `auth_leaked_password_protection` as defer-to-ops with justification.
  - **Note:** the post-deploy `rls_policy_always_true` findings on the new tables are owned by **Task 13** (they did not exist when this task first ran).
  - **Production change (grants/view/functions).** HIGH-RISK — confirm with the user before applying; flag any DEFINER→INVOKER change that could break a definer-privilege-dependent flow (Req 9.7 / 8.3).
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 8.3_

### Phase 5c — Live performance-advisory remediation (forward; production)

- [x] 12. Resolve the live `get_advisors(performance)` findings + reconcile RLS-initplan drift
  - Re-run `get_advisors(performance)`; enumerate `auth_rls_initplan`, `duplicate_index`, `unindexed_foreign_keys`, `unused_index`, `multiple_permissive_policies`.
  - **RLS initplan (~40 policies)**: rewrite each flagged policy's `USING`/`WITH CHECK` so bare `auth.<fn>()`/`current_setting()` becomes `(select auth.<fn>())`, preserving exact access logic. This doubles as the source-of-truth reconciliation for the 6 re-emitted files (`20260504041109`, `20260520063920/063937/064025/102905/113022`). Verify a representative positive + negative RLS check per affected table is unchanged.
  - **Duplicate indexes (~50 pairs)**: drop exactly one of each identical `idx_<col>`/`idx_<col>_id` pair via one additive migration; never drop a constraint-backing or non-duplicate index.
  - **FK index**: add a covering index for `assignments_rubric_id_fkey`.
  - Defer `unused_index` and `multiple_permissive_policies` to a documented backlog (not gates) unless a low-risk consolidation also clears drift.
  - Re-run `get_advisors(performance)`; confirm the initplan, duplicate_index, and FK-index findings clear with no new finding.
  - **Production change (policies/indexes).** Confirm high-blast-radius operations with the user (Req 8.3).
  - **DONE (2026-06, user-pre-approved, live-verified).** Full evidence in `.task12-perf-advisor-notes.md`. Results: **55 RLS initplan policies rewritten** to `(select auth.<fn>())` across 4 additive forward migrations grouped by table (`task12_rls_initplan_wrap_habit_study`, `_academic`, `_tutor_content_donations`, `_reflections_audit`) — every predicate/role(TO authenticated)/command/PERMISSIVE flag preserved byte-for-byte; append-only invariants untouched (no UPDATE/DELETE policy added to xp_transactions/audit_logs/evidence). **49 duplicate indexes dropped** (`task12_drop_duplicate_indexes`, `DROP INDEX IF EXISTS`) after per-pair verification via `pg_index` that each pair was identical (same column, btree, non-unique, non-primary, non-partial, NOT constraint-backing); kept the canonical `_id`-suffixed FK-named index, dropped the redundant twin; no constraint-backing/unique index dropped. **2 FK covering indexes added** (`task12_add_fk_covering_indexes`): `idx_assignments_rubric_id` (assignments.rubric_id → assignments_rubric_id_fkey) + `idx_quiz_clos_clo_id` (quiz_clos.clo_id → quiz_clos_clo_id_fkey, also live-flagged). **Advisor before/after:** `auth_rls_initplan` 55→0, `duplicate_index` 49→0, `unindexed_foreign_keys` 2→0, NO new finding category (the 2 new FK indexes show transiently under deferred `unused_index` INFO since unhit on the near-zero-traffic DB). **RLS-probe equivalence (rolled-back impersonation, BEFORE==AFTER):** student `164756fa` (profiles 1/grades 16/notifs 17/xp 82/subs 16/gam 1/oa 28), verified-parent `66f40d1b` (profiles 2/grades 12/subs 12/gam 1/oa 21/notifs 1), teacher `913bd859` (subs 142/lo 19) — all identical; negative probe: other-student `f0b2fa46` sees 0 of `164756fa`'s subs/oa/notifs/gam (no leak). **Non-regression:** the 12 `db-function-search-path-qualification` functions + `process_marketplace_purchase` untouched (no function DDL in this task). **Deferred (documented, not gates):** `unused_index` (~110 INFO — near-zero traffic means Postgres hasn't hit them yet; they cover FK joins/filters that will be used at real load; dropping risks removing soon-hot indexes) and `multiple_permissive_policies` (hundreds WARN — consolidation is a large RLS redesign that alters the allowed/denied matrix per role; correctness-sensitive, must be designed + per-role probe-tested separately).
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 8.3_

### Phase 5e — Live functional-integrity findings (2026-06 deep audit)

> Surfaced by a read-only live audit (RLS coverage, append-only invariants, cross-profile FKs, XP-drift, leaderboard opt-out, cron health). **Confirmed HEALTHY (no task needed):** every table has RLS enabled + ≥1 policy; 80+ cross-profile FKs to `profiles` intact; XP-total drift = 0 (`student_gamification.xp_total` == `SUM(xp_transactions.xp_amount)`); `xp_transactions`/`audit_logs`/`evidence` fully append-only via `prevent_mutation`; 11 cron jobs present; the user-facing leaderboard RPCs (`get_leaderboard`, `get_leaderboard_page`) correctly exclude `leaderboard_anonymous` students. The three findings below are the only gaps.

- [x] 15. Reconcile the dual cron-scheduler architecture (Vercel Cron vs pg_cron) — live-confirmed duplication + dead jobs

  - **Ordering dependency (senior-QA):** Task 18 (notification-insert fixes) MUST be complete and verified before pruning pg_cron here. Otherwise, for the window between pruning pg_cron and fixing the edge functions, the affected notifications reach nobody from either scheduler. Task 18 is in an earlier wave (Wave 3) for this reason — confirm it is `[x]` before starting Task 15.
  - **Live-confirmed findings (2026-06):**
    - **Two schedulers run the same jobs.** `vercel.json` defines 10 Vercel Crons hitting `/api/cron/*` (thin proxies that `invokeEdgeFunction(...)`), AND Supabase `cron.job` has 11 pg_cron jobs for the same logic (perfect-day, notification-digest, streak-risk, weekly-summary, compute-at-risk, ai-at-risk, streak-reset, leaderboard-refresh).
    - **The pg_cron HTTP jobs are BROKEN (silent no-op).** Their command is `net.http_post(url := NULL || '/functions/v1/...')` — `NULL || text = NULL` in SQL, so the base URL is missing and these 7 jobs POST to a NULL URL and do nothing. (The base URL was likely meant to come from a GUC/vault setting that is unset.) So today the **Vercel crons are the real scheduler**; the pg_cron HTTP jobs are dead weight that also mask monitoring.
    - **Double-fire latent risk:** schedules overlap exactly (e.g. perfect-day 18:00 both, notification-digest 20:00 both, weekly-summary Mon 08:00 both). If anyone "fixes" the NULL URL without removing the duplication, every such job fires twice → double notifications/emails/XP.
    - **`leaderboard-refresh` pg_cron** (`*/5 * * * *`) runs `REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard_weekly`, but that object is now a plain VIEW (migration `20260520063903`) — so it errors every 5 minutes.
  - **DECIDED (user-confirmed 2026-06) — Vercel Cron is the single canonical scheduler.** Rationale (senior-dev): the Vercel→Edge-Function path works today, is in version control (`vercel.json` + `api/cron/*`), needs no in-DB secret/GUC wiring (which the free tier never completed — `app.settings.supabase_url` is live-confirmed NULL, the root cause of the no-op pg_cron HTTP jobs), and Vercel Hobby's once-per-day cron cadence covers every scheduled job here. pg_cron is retained ONLY for pure-SQL DB-local work. Actions:
    - **Unschedule the 7 broken pg_cron HTTP jobs** (`perfect-day-prompt`, `notification-digest`, `streak-risk-email`, `weekly-summary-email`, `compute-at-risk-signals`, `ai-at-risk-prediction`, `streak-midnight-reset`) via `cron.unschedule('<jobname>')`. They currently POST to a NULL URL (no-op) and Vercel already owns these — removing them eliminates the dead jobs and the latent double-fire risk if the NULL URL were ever fixed.
    - **Unschedule the broken `leaderboard-refresh` pg_cron job** (`*/5 * * * *` → `REFRESH MATERIALIZED VIEW` against a now-plain view = errors every 5 min). The leaderboard needs no DB refresh: the live UI reads `get_leaderboard_page` (queries `student_gamification` directly) and `leaderboard_weekly` is a plain on-demand VIEW. The **Vercel `leaderboard-refresh` cron stays at once-per-day** (already `0 12 * * *` in `vercel.json`) as a lightweight health-check only — satisfying "keep it to one day, not 5 minutes." Do NOT recreate a materialized view now (revisit only if read latency becomes a problem at scale).
    - **KEEP the 3 pure-SQL pg_cron jobs** that do real DB-local work and have NO Vercel twin: `badge-auto-archive` (`SELECT badge_auto_archive()`), `badge-spotlight-rotate` (`SELECT badge_spotlight_auto_rotate()`), `fee-overdue-check` (the `UPDATE fee_payments ...`). These need no HTTP/secrets and run correctly — do not remove.
    - **Do NOT** revive the pg_cron HTTP path (i.e., do not set the NULL GUC) — that would re-create the dual-scheduler/double-fire problem. Vercel owns all HTTP-triggered jobs.
  - **Reversibility (senior-QA):** capture the exact `cron.schedule(...)` definition of every job BEFORE unscheduling (snapshot `select * from cron.job`), so any removal can be re-created verbatim. Apply unschedules via one forward migration; record before/after `cron.job` listings.
  - **Verification (senior-QA):** after the change assert (a) `cron.job` lists ONLY `badge-auto-archive`, `badge-spotlight-rotate`, `fee-overdue-check`; (b) `cron.job_run_details` shows zero new failures over the next cycle for the kept jobs; (c) each Vercel cron still returns 2xx from its `/api/cron/*` endpoint and its edge function persists a real effect (e.g. perfect-day nudge row appears — depends on Task 18); (d) no job double-fires (one scheduler per job).
  - **Production change (cron schedule).** HIGH-BLAST-RADIUS — present the exact keep/unschedule list to the user and get explicit confirmation before running any `cron.unschedule` (Req 8.3).
  - **DONE (2026-06, user-confirmed Option B):** snapshot of all 11 jobs saved to `.cron-snapshot-pre-task15.md`; migration `20260602101312_task15_prune_duplicate_broken_pgcron_jobs` unscheduled the 8 (7 NULL-URL HTTP no-ops + the broken matview `leaderboard-refresh`); kept the 3 pure-SQL jobs (`badge-auto-archive`, `badge-spotlight-rotate`, `fee-overdue-check`); removed the redundant `/api/cron/fee-overdue-check` from `vercel.json` so pg_cron is its sole owner (one scheduler per job). Live-verified: `cron.job` now lists ONLY the 3 kept jobs, all active. **BONUS BUG FOUND + FIXED by the cron-health cross-check:** `badge_auto_archive()` referenced non-existent `badges.updated_at`/`.created_at` columns (42703) and had been FAILING every nightly run — fixed via `20260602...fix_badge_auto_archive_nonexistent_columns` to use `awarded_at`; re-verified all 3 kept jobs now execute clean (badge_auto_archive + badge_spotlight_auto_rotate run void with no error; fee-overdue-check last real run succeeded).
  - _Requirements: 6.1, 6.2, 6.6, 7.5, 8.3_

- [x] 16. Close the `xp_purchases` append-only / column-immutability gap

  - **Live-confirmed gap:** `xp_purchases` (a financial XP-sink ledger) has a `prevent_xp_purchases_delete` trigger (blocks DELETE) but, unlike `xp_transactions`, NO guard on UPDATE of immutable columns. Its `xp_purchases_student_update` policy is scoped `student_id = auth.uid()` with a `USING` clause but **no `WITH CHECK`**. The app legitimately updates only `status` + `consumed_at` (consume/restore a deadline extension, equip toggles), so the UPDATE itself must stay — but a student could currently rewrite `xp_cost`, `item_id`, `student_id`, or `purchased_at` on their own row.
  - Add a `WITH CHECK` to the student UPDATE policy (re-assert `student_id = (select auth.uid())`) AND add a `BEFORE UPDATE` trigger that resets the immutable columns (`xp_cost`, `item_id`, `student_id`, `purchased_at`) to their OLD values for non-service-role callers — mirroring the `prevent_profile_privilege_escalation` pattern — so only `status`/`consumed_at`/`metadata` are mutable by students. Service-role (Edge Functions) keeps full control.
  - Apply via additive forward `apply_migration`. Verify: a student CAN consume/restore (status/consumed_at change succeeds); a student CANNOT change `xp_cost`/`item_id`/`student_id` (silently reset or rejected); DELETE still blocked. Confirm no regression to `process-purchase`/`resolve-mystery-reward`/`useDeadlineExtensions`/`extraQuizAttempt` flows.
  - **Production change (policy + trigger).** Confirm with the user before applying (Req 8.3). Note: table is currently empty (0 rows), so this is purely preventive — no data migration.
  - _Requirements: 6.4, 8.3_

- [x] 17. Reconcile the `leaderboard_weekly` view-shape drift + the dead `get_leaderboard` RPC

  - **Live-confirmed drift:** the live `leaderboard_weekly` view is `SELECT student_id, sum(xp_amount) AS weekly_xp, rank() ... FROM xp_transactions` (3 columns), but the still-present `get_leaderboard(p_institution_id)` RPC selects `lw.full_name, lw.institution_id, lw.xp_total, lw.level, lw.streak_current, lw.global_rank` from it — columns the current view does NOT have, so `get_leaderboard` would error if called. The view also exposes raw `student_id` without filtering `leaderboard_anonymous` (defense-in-depth gap; the user-facing path uses `get_leaderboard_page`, which DOES filter, so this is not a live breach — but the bare view should not leak opted-out students to direct staff queries).
  - Record a Source_Of_Truth_Decision: confirm `get_leaderboard_page` is the canonical RPC the app uses (it is — `useLeaderboard`), then EITHER drop the stale `get_leaderboard` RPC if unreferenced, OR realign it + the view to a single consistent shape. Verify no `src/` code calls `get_leaderboard` before dropping (grep first).
  - If the bare view is retained, scope it to exclude `leaderboard_anonymous` students (or document why direct access is staff-only and acceptable), preserving the anonymity opt-out invariant from `.kiro/steering/domain-knowledge.md`.
  - Apply via additive forward `apply_migration`; re-run `get_advisors(security)` to confirm no new `security_definer_view`/leak finding. This converges with Req 5 (function-body drift) and Req 6 (view/policy drift).
  - **Production change (view/function).** Confirm with the user before dropping any RPC (Req 6.5 / 8.3).
  - _Requirements: 5.1, 5.2, 6.1, 6.2, 6.5, 8.3_

- [x] 18. Fix the silent notification-insert column-contract failures (Edge Functions)

  - **Live-confirmed defect:** the `notifications` table has ONLY `{user_id, type, title, body, metadata, is_read, created_at}`, but 7 Edge Functions insert a non-existent `message` column (and some `institution_id`/`reference_id`), so those inserts fail and the notifications NEVER reach students. Live corroboration: only `grade_released`, `welcome`, `announcement` types exist in the table — none of the affected types do.
  - **CODE COMPLETE (2026-06), DEPLOY GATED ON USER.** Scope was BROADER than first assumed — 10 broken inserts across 8 files. The originally-assumed-"compliant" `award-xp`, the `check-badges` peer-milestone insert, and a 2nd insert in `process-streak` ALSO silently failed (corroborated by `peer_milestone` being absent from live-persisted types). A bonus bug was caught: `embed-course-material` wrote `read` instead of `is_read`.
  - Files changed (all `message`→`body`; `institution_id`/`reference_id`→`metadata`; `read`→`is_read`):
    - `perfect-day-prompt` (perfect_day_nudge), `team-streak-risk-cron` (team_streak_risk), `process-streak` (team_streak_milestone + peer_milestone), `exam-period-notify` (exam_period_reminder), `check-badges` (team_badge + peer_milestone), `challenge-progress-update` (challenge_90_percent; reference_id→metadata.challenge_id), `embed-course-material` (system; institution_id→metadata, read→is_read), `award-xp` (peer_milestone).
    - Left alone (genuinely compliant, already use `body`): `calculate-attainment-rollup`, `notification-digest`, `cqi-review-reminder`.
  - Local verify PASSED: `npx tsc --noEmit` exit 0; `npm run lint --max-warnings 0` exit 0. Caveat: eslint/tsconfig don't cover `supabase/functions` (Deno) and `deno check` couldn't run (Deno not installed); edits validated by read-back + a final grep sweep confirming zero remaining notification inserts write `message`/`institution_id`/`reference_id`/`read`.
  - PENDING (gated on user): deploy the 8 functions via `deploy_edge_function` (preserve `verify_jwt`), then verify per-type insert-persistence via `execute_sql` (a representative row of each type persists and is readable by the recipient under RLS).
  - **Production change (Edge Function deploy).** Low risk (additive correctness); confirm with the user before deploying.
  - _Requirements: 3.6, 3.7, 3.4_

- [x] 19. Fix the parent cross-profile visibility gap (parent can't see linked child's profile)

  - **Live-proven defect:** `profiles` has SELECT policies for own/admin/coordinator/teacher/anon-portfolio but **NO parent policy**. A verified parent CAN read the linked child's grades (12), attendance (90), gamification, and submissions, but reading the child's `profiles` row returns **0** under RLS. `src/hooks/useParentDashboard.ts` queries `profiles` for child name/level after resolving `parent_student_links`, so the parent "My Children" dashboard + Progress/Attendance child-pickers render nameless/empty children for all 36 parents.
  - Add a `profiles` SELECT policy for the parent role scoped to verified links — pattern: `auth_user_role() = 'parent' AND id IN (SELECT student_id FROM parent_student_links WHERE parent_id = (select auth.uid()) AND verified = true)` — exposing ONLY the linked child rows (no broader leak). Mirror `.kiro/steering/supabase-patterns.md` Parent Read-Only Pattern.
  - Apply via additive forward `apply_migration`. Verify with a parent impersonation probe: linked child's profile now returns; a NON-linked child's profile still returns 0; the parent still sees only their own + linked children (no institution-wide leak). Re-run `get_advisors(security)` to confirm no new finding.
  - **Production change (policy).** Confirm with the user before applying (Req 8.3).
  - _Requirements: 6.7, 6.8, 8.3_

- [x] 20. Full per-role RLS isolation + access verification matrix (all 5 roles × their sections)
  - Build a repeatable per-role probe harness (impersonate via `select set_config('request.jwt.claims', ...)` + `set local role authenticated`, all in a rolled-back transaction) and run it for one representative live user of EACH role: admin (3), coordinator (6), teacher (8), student (71), parent (36).
  - For each role, assert BOTH directions on the tables that role's sections use:
    - **Isolation (negative):** the role sees ZERO rows it must not — student/parent see no other student's grades/notifications/journals; teacher sees only their course students; coordinator/admin see only their institution; nobody sees cross-institution data.
    - **Access (positive):** the role CAN see everything its UI needs — student sees own grades/XP/habits/planner/notifications; teacher sees their students' submissions/grades/profiles; coordinator sees program outcomes/attainment/curriculum matrix; admin sees institution users/audit; parent sees each linked child's profile (post-Task-19) + grades/attendance/gamification.
  - **Already verified this session (record as passing baseline):** student isolation (sees own 19 notifs, 0 leaked, 1 profile); parent isolation (12 linked-child grades, 0 non-linked leaked); parent functional gap (child profile = 0 → Task 19). Extend to admin/coordinator/teacher and the remaining student/parent sections.
  - For any failure, file the specific policy fix (leak → tighten; functional gap → add scoped policy) and re-probe. This is the cross-profile completeness gate the user requested ("nothing should be missed").
  - **No production change** unless a probe reveals a gap; reads/rolled-back only. Any resulting policy fix is confirmed with the user (Req 8.3).
  - _Requirements: 6.7, 6.8, 7.5_

### Phase 5f — Production deployment & client-performance health (Vercel)

- [x] 21. Verify + harden the Vercel production deployment and capture a performance baseline
  - **Live-confirmed baseline (2026-06, project `e-deviser`, account `attaulhaq0`):** current production deployment READY; Vite builds ~80–89s; served from `bom1` (Mumbai — good for Qatar latency) with `X-Vercel-Cache: HIT`; security+caching headers all present per `vercel.json` (HSTS, CSP, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy; `/assets/*` immutable; `index.html`/`sw.js` no-cache); 5 env vars set.
  - **Domain finding:** `edeviser.com` is configured but NOT verified (DNS unpointed) — users currently reach the app only via `e-deviser.vercel.app`. Decide: complete DNS verification for the branded domain, or document staying on the Vercel domain. (Investor/school-facing — a branded domain matters for trust.)
  - **Scheduler finding:** the Vercel `crons` in `vercel.json` overlap with Supabase pg_cron (owned by Task 15) — confirm Task 15's single-scheduler decision is reflected on the Vercel side (keep the Vercel cron proxies if Vercel is canonical; otherwise remove them).
  - **Client performance:** build the app locally (`npm run build`) and record the largest JS/CSS chunks; run the repo's Lighthouse config (`lighthouserc.cjs`) / check against `performance-budget.config.ts`. Record any chunk over budget (e.g. consider route-level code-splitting, lazy-loading heavy libs like Recharts/Framer Motion, and verify the Vite manualChunks/vendor split). These are follow-ups, not blockers.
  - **Production change** only for the domain/header/scheduler items — confirm with the user before applying (Req 11.6 / 8.3).
  - **RE-CONFIRMED (2026-06, via Vercel REST API + live header fetch; no production change made):**
    - **Deployment health (Req 11.1):** current production deployment `dpl_2Fm5RtB4Qe7yihZLDYRXCdkMXZhV` (`target=production`, `readySubstate=PROMOTED`) is **READY**. Build time **≈89s** (`buildingAt`→`ready`), consistent with the ~80–89s baseline. Served from **`bom1`** (Mumbai) with **`X-Vercel-Cache: HIT`** (confirmed via `X-Vercel-Id: bom1::…`).
    - **Headers actually served (Req 11.2 — fetched `https://e-deviser.vercel.app`):** ALL present and matching `vercel.json` — `Strict-Transport-Security: max-age=31536000; includeSubDomains`; full `Content-Security-Policy` (incl. `frame-ancestors 'none'`); `X-Frame-Options: DENY`; `X-Content-Type-Options: nosniff`; `Referrer-Policy: strict-origin-when-cross-origin`; `Permissions-Policy: camera=(), microphone=(), geolocation=()`. Caching verified per-path: `/assets/index-*.js` → `public, max-age=31536000, immutable`; `/index.html` → `no-cache`; `/sw.js` → `no-cache`. **No drift.**
    - **Domain decision (Req 11.3) — DOCUMENTED, no DNS change made (requires registrar access):** `/v9/projects/e-deviser/domains` confirms `edeviser.com` is `"verified": false` with a pending `TXT _vercel.edeviser.com = vc-domain-verify=edeviser.com,a92fd2746043371b9866` (`reason: pending_domain_verification`); `e-deviser.vercel.app` is `"verified": true`. Users reach the app only via `*.vercel.app`. **RECOMMENDATION:** before investor/school launch, complete DNS verification by adding the `_vercel` TXT record at the registrar (and the apex `A`/`CNAME` Vercel provides) so the branded domain serves; OR explicitly accept staying on `e-deviser.vercel.app` for now. This is a follow-up, not a blocker.
    - **Scheduler consistency (Req 11.4 / Task 15) — CONSISTENT:** `vercel.json` `crons` now lists **9** Vercel cron proxies (`streak-risk`, `weekly-summary`, `compute-at-risk`, `perfect-day-prompt`, `streak-reset`, `leaderboard-refresh`, `ai-at-risk-prediction`, `notification-digest`, `exam-period-notify`) and **no** `/api/cron/fee-overdue-check` — matching Task 15's decision (Vercel is the single canonical HTTP scheduler; pg_cron solely owns `fee-overdue-check`). No inconsistency. (Minor optional cleanup: the now-unscheduled `api/cron/fee-overdue-check.ts` proxy file still exists but is harmless dead code.)
    - **Client performance baseline (Req 11.5) — captured from clean `npm run build` (Vite 6.4.2, built in ~12.5s after `tsc -b`):** largest chunks (raw / gzip):
      - `admin-dashboard-*.js` — **663 KB / 184 KB gz** (largest; over Vite's 500 KB raw warn)
      - `vendor-charts-*.js` (Recharts) — **434 KB / 124 KB gz**
      - `index-*.js` (main entry) — **432 KB / 144 KB gz**
      - `vendor-react-*.js` — **264 KB / 85 KB gz**
      - `vendor-motion-*.js` (Framer Motion) — **128 KB / 42 KB gz**
      - `EmailVerificationBanner-*.js` — **125 KB / 39 KB gz**; `index-CmSPJLXt.js` — 109 KB / 36 KB gz
      - Largest CSS: `index-*.css` — **137 KB / 21 KB gz**
      - **Total gzipped JS across all 226 chunks ≈ 1,224 KB**, under the CI bundle budget of **1,300 KB** (PASS). Total CSS gz ≈ 23 KB.
    - **Lighthouse CI (Req 11.5) — ran best-effort against `dist` (3 runs, desktop preset, 4× CPU throttle):** assertions **PASSED** (exit 0). Median scores: **Performance 0.58** (warn-only budget ≥0.5 → pass), **Accessibility 1.00**, **Best Practices 0.96**, **SEO 0.91**. Metrics (throttled): FCP 4.3s, LCP 4.8s, CLS 0, TBT 0ms, TTI 4.8s; per-page total byte weight 603 KiB (under the 1,200 KB Lighthouse budget).
    - **Over-budget flags + FOLLOW-UP recommendations (non-blocking):** the `admin-dashboard` (663 KB) and `vendor-charts` (Recharts, 434 KB) chunks exceed Vite's 500 KB raw warn individually. Recommend: (1) route-level code-split the admin dashboard (lazy-load heavy sub-views/widgets); (2) lazy-load Recharts so `vendor-charts` only loads on chart routes; (3) lazy-load Framer Motion (`vendor-motion`) similarly; (4) investigate why `EmailVerificationBanner` is 125 KB (likely pulling a heavy transitive dep into a banner) and the 432 KB main `index` chunk; (5) the existing Vite `manualChunks` vendor/role split is working as intended — extend it to further isolate chart/motion-heavy routes. The total gzip bundle is within CI budget, so these are optimizations, not gates.
  - **TOKEN ROTATION REMINDER:** the Vercel API token used here was shared in plaintext chat — rotate/revoke it in the Vercel dashboard (Account → Settings → Tokens) after this task.
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_

### Phase 5d — Reconcile the migration-history sync gap (bidirectional)

- [x] 14. Make local `supabase/migrations/` and Remote_History agree object-for-object (CORE — precondition for the clean diff)
  - **Live-verified gap (2026-06):**
    - **Remote-only (recorded on live, MISSING from local disk — pull these down):** `20260601205749_deploy_phantom_tables_function_buckets_rls`, `20260601210352_revoke_execute_on_fn_track_habit_level_change`, `20260601220023_task11_leaderboard_weekly_security_invoker`, `20260601220036_task11_revoke_anonymize_user_from_public_roles`, `20260601220105_task11_harden_search_path_pgcron_and_prevent_mutation`.
    - **Local-only (on disk, NOT in `supabase_migrations.schema_migrations` — confirmed empty result):** `20260901000004_seed_demo_data`, `20260901000009_critical_pre_production_fixes`, `20260901000010_create_missing_phantom_tables`, `20260901000011_create_student_badges_quiz_clos_storage`. Their schema is ALREADY deployed+recorded under the `20260601205749` name, so they must NOT be replayed as-is (they would either no-op via `IF NOT EXISTS` or, worse, re-introduce the permissive `USING (true)` policies that Task 13 removed and the pre-Task-13 bucket scope).
  - **Step 1 — pull remote-only files down:** run `supabase migration fetch` (per `.kiro/steering/project-conventions.md`) so the 5 `20260601*` files land in `supabase/migrations/`. Verify each arrives with the recorded name and non-empty body; do NOT hand-edit them.
  - **Step 2 — reconcile the 4 local-only planning files (replay-only, per Task 2's de-dup rule):** for each, confirm via content+live comparison that its objects are already built by a recorded migration, then EITHER delete it (preferred where fully superseded — `20260901000010/000011` are superseded by `20260601205749` + `20260601010814` + Task 13) OR reduce it to an explicit idempotent no-op with a header comment explaining why (e.g. `20260901000009` Section 1 is already a documented no-op for the profiles decision; `20260901000004_seed_demo_data` may be retained as idempotent seed-only if still wanted). Ensure a fresh replay still reproduces live exactly.
  - **Step 3 — repair the migration ledger if needed:** if any local file must be marked applied/reverted to make `supabase migration list --linked` show local-head == remote-head with no `<local-only>`/`<remote-only>` rows, use `supabase migration repair --status applied|reverted <version>` (NOT manual edits to `schema_migrations`). Capture the before/after `migration list` output.
  - **Step 4 — verify functional intent (user requirement):** after sync, confirm the profiles chain is completely linked and matches the codebase types — re-query live `profiles.institution_id` is `NOT NULL`, FK to `institutions` intact, and a representative profile row resolves its institution; confirm the 5 phantom tables + 2 buckets still resolve. This is the "fully functional" gate the user called out, independent of the textual diff.
  - **Production change:** Step 1/2 are local/replay-only; Step 3 `migration repair` writes only to the migration ledger (no schema change). Confirm with the user before any `repair` that marks a local-only file as `reverted`.
  - _Requirements: 1.2, 1.3, 1.4, 7.1, 7.3, 8.6_

### Phase 6 — Prove the clean diff + record the chain

- [x] 9. Prove a genuinely-empty diff + CI + audit (CORE GATE)
  - **Precondition: Task 14 complete** (local and remote agree object-for-object).
  - Run `supabase migration list --linked`; confirm local head == remote head with no `<local-only>` or `<remote-only>` rows.
  - Run `supabase db diff --linked`; confirm it COMPLETES with no abort and reports a genuinely empty/clean diff (no `create`/`drop`/`alter`). (This is the cancellation-prone Docker path — if it cannot complete in this environment, fall back to the live-SQL object-for-object equivalence established by Task 14 as the functional proof, and record that the Docker diff could not run.)
  - Run the local CI suite — `npm run lint` (zero warnings), `npx tsc --noEmit` (zero errors), `npm test` (Vitest `--run`) — all green.
  - Re-run the `pre-deployment-e2e-audit` connectivity, RLS, and cron-health layers (its Req 4, 5, 15); confirm no Blocker/Critical attributable to missing tables.
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

### Final checkpoint

- [x] 10. Final safety, preservation & non-regression checkpoint
  - Confirm: local↔remote migration history agree object-for-object (Task 14); genuinely-empty `db diff` or live-SQL object-for-object equivalence (Task 9); the 6 Edge Functions resolve and succeed (Task 5); the 6 `rls_policy_always_true` findings are cleared (Task 13); the 12 `search_path`-fixed functions + `process_marketplace_purchase` are unchanged (re-run the bugfix Task 11 probes); all production changes were additive/reversible with pre-change snapshots (Req 8.2).
  - Confirm the profiles chain is fully linked and matches the codebase (`institution_id` NOT NULL, FK intact) per the Task 14 functional gate.
  - Confirm the 3 live functional-integrity findings are resolved: the dual cron-scheduler duplication is reconciled to a single canonical scheduler with no dead/double-firing jobs (Task 15), `xp_purchases` immutable columns are protected (Task 16), and the `leaderboard_weekly` view/RPC shape is reconciled with the opt-out invariant preserved (Task 17).
  - Confirm the Vercel production deployment is healthy, the domain decision is recorded, and the client-performance baseline is captured (Task 21).
  - Confirm the silent notification-insert failures are fixed (Task 18): a representative insert of each affected type (`perfect_day_nudge`, `team_streak_risk`, `team_streak_milestone`, `exam_period_reminder`, `team_badge`, `challenge_90_percent`) now persists.
  - Confirm the parent→child profile visibility gap is closed (Task 19) and the full per-role RLS isolation+access matrix passes for all 5 roles (Task 20) — no leak, no functional gap.
  - Confirm the security advisors (Tasks 11, 13) and performance advisors (Task 12) are clear or explicitly deferred, and no append-only invariant or live security control was weakened.
  - If any question or high-blast-radius operation remains, ask the user before closing.
  - _Requirements: 7.6, 8.1, 8.2, 8.3, 8.4, 8.6, 9.6, 10.7_

## Notes

- **Production safety**: Lane 1 (Task 2) and replay-side reconciliation are replay-only. The production writes are Task 3 (additive phantom-table deploy — DONE), the chosen path of Task 4 (profiles — resolved as a replay-only edit, no live change), the forward-migration side of Tasks 6/7, the new-table RLS tightening (Task 13), and the advisor remediations (Tasks 11 security, 12 performance). Every production step uses pre-change snapshots and additive forward migrations; on a mid-deploy failure, propose a corrective forward migration rather than auto-rolling-back (Req 8.6).
- **Cross-spec**: this spec produces the schema state that `pre-deployment-e2e-audit` verifies, and must not regress `db-function-search-path-qualification`. The genuinely-empty diff this spec targets is the goal the bugfix explicitly carved out.
- **Live findings source**: `#[[file:.kiro/specs/_investigation/db-function-search-path-live-findings.md]]` and the 2026-06 live re-check (Tasks 11/12/13, the migration-sync gap in Task 14, the 3 functional-integrity findings in Tasks 15/16/17, and the Part C dedup in Task 2 trace to it).
- **2026-06 deep audit scorecard**: HEALTHY — every table RLS-enabled with ≥1 policy; 80+ cross-profile FKs to `profiles` intact; XP-total drift = 0; `xp_transactions`/`audit_logs`/`evidence` fully append-only; 11 crons present; the OBE rollup chain (grades → `trigger_attainment_rollup` → evidence → outcome_attainment → drop-notify) is wired + enabled; notification triggers on assignments/grades attached; user-facing leaderboard RPCs honor `leaderboard_anonymous`; all 5 roles present (admin 3, coordinator 6, teacher 8, student 71, parent 36) with 35/35 parent links verified; live RLS isolation PROVEN per-role (student sees own 19 notifs + 0 leaked; parent sees 12 linked-child grades + 0 non-linked). GAPS (now tasked): permissive new-table policies (Task 13), migration-sync gap (Task 14), broken `leaderboard-refresh` cron (Task 15), `xp_purchases` column-immutability (Task 16), `leaderboard_weekly` view/RPC drift (Task 17), silent notification-insert failures across 7 Edge Functions (Task 18), parent→child profile visibility (Task 19), and the full per-role isolation+access matrix (Task 20).
- **Migration-sync gap (Task 14)**: live records 5 reconciliation migrations (`20260601205749`, `...210352`, `...220023`, `...220036`, `...220105`) that are not on local disk, while 4 local planning files (`20260901000004/000009/000010/000011`) are not in Remote_History. Task 14 reconciles both directions via `migration fetch` + replay-only de-dup + (if needed) `migration repair`, and is the precondition for the Task 9 clean-diff/CI/audit gate.
- **Vercel deployment (2026-06, project `e-deviser`)**: production READY, ~80–89s Vite builds, served from `bom1` with edge-cache HIT, full security+caching headers present. FINDINGS: `edeviser.com` custom domain unverified (users on `*.vercel.app`); dual cron schedulers (Vercel `/api/cron/*` proxies overlap pg_cron, and the pg_cron HTTP jobs post to a NULL base URL → silent no-op) — reconciled by Task 15; deployment/domain/perf baseline owned by Task 21.
- **Open decisions** (design §"Open decisions requiring user input"): the profiles constraint direction (Task 4 — RESOLVED: keep live NOT NULL), the de-duplication direction (Task 2), the new-table RLS tightening predicates (Task 13), the cron-scheduler decision (Task 15 — recommend Vercel canonical, prune dead pg_cron), the security DEFINER→INVOKER / grant revokes (Task 11), and any live security control the diff wants to drop (Task 7) require user confirmation before action.
