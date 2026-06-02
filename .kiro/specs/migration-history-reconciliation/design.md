# Migration History Reconciliation — Design

## Overview

This design closes the gap between the local migration chain and live Supabase production that was surfaced (and deliberately carved out) by the `db-function-search-path-qualification` bugfix once its fix removed the historical `42883` clean-replay abort. The objective is a **genuinely empty `supabase db diff --linked`**, achieved by deploying genuinely-missing schema, de-duplicating re-homed migrations, reconciling function/policy/constraint drift, and eliminating the production app-breakage from six unguarded Edge Functions — all without destroying or rewriting existing production data.

The authoritative root-cause analysis is `#[[file:.kiro/specs/_investigation/db-function-search-path-residual-drift-analysis.md]]`. This design operationalizes its §7 proposed B-track.

### Guiding principles

1. **Live is the source of truth for what runs; the repo must reproduce it.** Where live and migration text disagree, we make an explicit Source_Of_Truth_Decision per object and converge — never a blind overwrite.
2. **Production changes are additive + forward-only; functionality — not rows — is the protected asset.** All live DDL ships as new forward migrations via Supabase MCP `apply_migration`. The live product data is disposable test data that can be reseeded, so itemized user confirmation is **not** required purely to protect existing rows. What **is** mandatory and non-negotiable is preserving full application functionality, cross-table connectivity, and the complete `profiles`-chain linkage exactly as the codebase intends (this is deploying into a real school). High-blast-radius operations that could break connectivity, functionality, or the `profiles`-chain linkage (e.g. `DROP TABLE`/`DROP COLUMN`, recursive policy drops, mass `REVOKE`) still require explicit user confirmation; a `DROP`/rewrite that merely discards reseedable rows without endangering those invariants does not.
3. **Replay-only edits never touch production.** De-duplication and historical-text reconciliation change only what a fresh replay builds; production has those timestamps recorded.
4. **Do no harm to the bugfix.** The 12 `search_path` functions owned by `db-function-search-path-qualification` and the already-fixed `process_marketplace_purchase` must not regress.

## Architecture

The work splits into three lanes that converge on a single clean-diff gate:

```
Lane 1 — Replay-only history hygiene (no production impact)
  ├─ De-duplicate re-homed migrations (Req 1)
  ├─ Reconcile historical function-body text where live is source of truth (Req 5, replay side)
  └─ Reconcile historical policy/constraint text where live is source of truth (Req 6, replay side)

Lane 2 — Forward production migrations (additive, confirmed)
  ├─ Deploy phantom tables + buckets + RLS (Req 2)
  ├─ Reconcile profiles constraint/nullability (Req 4)  [DECIDED: converge live → codebase intent; real production change]
  ├─ Forward-migrate any function where the repo is source of truth (Req 5, forward side)
  └─ Forward-migrate any policy/constraint where the repo is source of truth (Req 6, forward side)

Lane 3 — Application correctness
  └─ Harden / verify the 6 unguarded Edge Functions (Req 3)

           ▼ converge ▼
  Record chain + prove genuinely-empty diff + CI + e2e-audit re-run (Req 7)
  under continuous safety/reversibility controls (Req 8)
```

## Components and Interfaces

The reconciliation operates through these interfaces (no new application components are introduced; the "components" here are the tooling surfaces and the schema objects being reconciled):

- **`supabase db diff --linked`** — the master oracle. Input: the Local_Chain + linked live schema. Output: the DDL delta (direction shadow→live). Used to drive every lane to convergence.
- **Supabase MCP `apply_migration`** — the only interface for production DDL. Additive, forward-only. Each call is one named forward migration.
- **Supabase MCP `execute_sql`** — read-only introspection (`pg_proc`, `pg_get_functiondef`, `information_schema`, row counts) and rolled-back DML probes. Never used for production writes here.
- **`supabase migration list --linked` / `migration fetch`** — Remote_History reconciliation interface.
- **`pwsh scripts/regen-types.ps1`** — the only interface that writes `src/types/database.ts`.
- **Edge Function surface (Deno)** — the six Unguarded_Edge_Functions are the application interface that must resolve the deployed tables or degrade gracefully.

## Data Models

> **Live re-verification (2026-06, read-only `execute_sql` + `get_advisors`):** the inventory below was re-confirmed against live project `cdlgtbvxlxjpcddjazzx`. Most of Lane 2's deploy work is **already applied and recorded** — the tables below now exist; the "Exists on live?" column reflects the current truth, and the deploy migrations are recorded as `20260601205749_deploy_phantom_tables_function_buckets_rls`, `20260601210352_revoke_execute_on_fn_track_habit_level_change`, and `20260601220023_task11_leaderboard_weekly_security_invoker` (none of which are on local disk yet — Task 9 syncs them).

### Inventory (live-verified current state)

#### Phantom tables / objects — DEPLOYED (Req 2, Task 3 done)

| Object                                       | Source migration | Exists on live now?                        |
| -------------------------------------------- | ---------------- | ------------------------------------------ |
| `student_badges`                             | `20260901000011` | YES (RLS on, 2 policies)                   |
| `quiz_clos`                                  | `20260901000011` | YES (RLS on, 3 policies)                   |
| `team_gamification`                          | `20260901000010` | YES (RLS on, 3 policies)                   |
| `student_habit_levels`                       | `20260901000010` | YES (RLS on, 3 policies)                   |
| `student_habit_level_history`                | `20260901000010` | YES (RLS on, 2 policies)                   |
| `fn_track_habit_level_change` + trigger      | `20260901000010` | YES (`search_path=''`)                     |
| `reports` / `transcripts` buckets + policies | `20260901000011` | YES (both private, institution-scoped RLS) |

> **Bucket status (live-confirmed):** live `storage.buckets` now contains `accreditation-reports`, `avatars`, `course-materials`, `reports`, `session-evidence`, `submissions`, `transcripts`, `tutor-attachments`. Both `reports` and `transcripts` exist with RLS, so the three Edge Functions (`generate-transcript`→`transcripts`, `generate-accreditation-report`→`reports`, `export-student-data`→`reports`) now resolve their target bucket. Task 5 removes the now-redundant inline `createBucket("reports")` runtime fallback.

> **NEW finding (post-deploy, live-confirmed via `get_advisors(security)`):** the Task 3 deploy shipped overly-permissive `USING (true)`/`WITH CHECK (true)` policies for `authenticated` on `student_badges_insert`, `quiz_clos_insert`, `quiz_clos_delete`, `team_gamification_insert`, `team_gamification_update` (flagged `rls_policy_always_true`). These satisfy "RLS enabled" but not "RLS effective" — any signed-in student could self-award badges, mutate team XP, or delete quiz↔CLO links. **Task 13** tightens them to least-privilege predicates (Req 2.8). The legitimate writers are the Edge Functions running under `service_role`, which bypass RLS, so narrowing the `authenticated` grants is safe.

### Re-homed duplicate pairs to DE-DUPLICATE (Req 1)

| Original (likely remove)                                | Back-dated canonical (likely keep)        |
| ------------------------------------------------------- | ----------------------------------------- |
| `20260901000001_add_tour_progress_and_theme_preference` | `20260510081412_*`                        |
| `20260901000002_add_handle_new_user_trigger`            | `20260510082038_*`                        |
| `20260901000003_tighten_avatars_bucket_policies`        | `20260510082713_*`                        |
| `20260901000005_create_invitations_table`               | `20260510083245_*`                        |
| `20260901000006_add_institution_join_modes`             | `20260510084054_*` (+ `20260510084433_*`) |
| `20260901000007_add_language_preference`                | `20260510084927_*`                        |
| `20260901000008_add_rate_limiting_audit`                | `20260510085314_*`                        |
| `20260902000001_add_realtime_tables`                    | `20260526115401/115420_*`                 |
| `20260902000002_weekly_goals_unique_constraint`         | `20260526140413_*`                        |
| `20260902000003_schema_drift_alignment`                 | `20260526145432/454/520/550_*`            |
| `20260901000009` (partial: priv-escalation trigger)     | `20260530093213_*`                        |

> The keep/remove direction MUST be re-verified by content comparison before deletion (Req 1.1). The default is to keep the correctly-ordered back-dated copy and remove the `20260901*/20260902*` original, but only where the replayed end-state is provably unchanged (Req 1.3–1.5).

### Genuinely-undeployed parts of file 9 (Req 4) — RESOLVED (keep live NOT NULL)

- `profiles.institution_id`: **kept NOT NULL on live** (live-confirmed `is_nullable = NO`).
- `profiles_institution_required_when_active` CHECK: **intentionally NOT created** (live-confirmed absent; only `profiles_institution_id_fkey` exists).
- `prevent_profile_privilege_escalation` trigger: already on live (re-homed to `20260530093213`), preserved.

**Decided direction (Source_Of_Truth_Decision = LIVE, which the codebase already matches).** Live-verification settles this: the generated `src/types/database.ts` types `profiles.institution_id` as non-null `string` in BOTH `Row` and `Insert`, live keeps the column `NOT NULL` with no CHECK, and open self-signup without an institution is **not a supported flow** (every profile must be institution-scoped so `auth_institution_id()` RLS scoping stays sound). So the repo converges **to live**, not the reverse. The `20260901000009` Section 1 is an intentional **replay-only no-op** (the historical nullable + conditional-CHECK variant is removed from the replay text so a fresh replay reproduces live exactly, with no `db diff` drift on `profiles`). Nothing is applied to production — live is already in the intended state.

Verification after the replay-only edit:

- a fresh replay reproduces `institution_id NOT NULL` with no CHECK (no `profiles` drift),
- invitation-driven signup inserts still succeed (the flow always supplies `institution_id`),
- the `prevent_profile_privilege_escalation` guard is preserved,
- `handle_new_user`'s `pending_verification`-with-NULL-institution branch is converged to the live definition by Req 5 / Task 6 so it cannot reintroduce a NULL-institution insert.

### Function-body drift, NOT owned by the bugfix (Req 5)

Deployment-gap functions: `handle_new_user`, `get_invitation_by_token`, `consume_invitation`, `check_rate_limit_approaching`, `prevent_profile_privilege_escalation`, `fn_track_habit_level_change`.

Historical drift (in remote history, but live ≠ migration text): `auth_institution_id`, `auth_user_role`, `anonymize_user`, `emit_notification`, `trg_badge_earned_notify`, `trg_grade_released_notify`, `trg_new_assignment_notify`, `trg_outcome_attainment_drop_notify`, `trg_pending_approval_notify`, `trigger_attainment_rollup`, `get_leaderboard_page`, `get_xp_transactions_page`, `is_portfolio_publicly_accessible`, `portfolio_public_access`, `rls_auto_enable`, `is_pgcron_available`, `prevent_mutation`.

### Policy/constraint/trigger drift (Req 6)

`notifications_type_check` constraint; `notifications_type_role_guard` function + `trg_notifications_type_role_guard` trigger; policies on `habit_logs` (×5), `notifications` (×3), `onboarding_progress` (×1), `badge_spotlight_schedule` (×2), `invitations` (`staff_read_invitations`), `audit_findings`, `audit_runs`; `notifications_user_unread_idx` index.

### Unguarded Edge Functions to fix (Req 3)

| Edge function           | Missing table                         | Fix path                       |
| ----------------------- | ------------------------------------- | ------------------------------ |
| `check-badges`          | `student_badges`, `team_gamification` | rely on Req 2 deploy (primary) |
| `process-onboarding`    | `student_badges`                      | rely on Req 2 deploy           |
| `export-student-data`   | `student_badges`                      | rely on Req 2 deploy           |
| `weekly-summary-cron`   | `student_badges`                      | rely on Req 2 deploy           |
| `process-streak`        | `team_gamification`                   | rely on Req 2 deploy           |
| `team-streak-risk-cron` | `team_gamification`                   | rely on Req 2 deploy           |

Primary remediation is to deploy the tables (Req 2) so these functions resolve. A defensive guard (Req 3.2) is the fallback only where deployment is deferred.

## Sequence & Risk (lowest-risk-first)

1. **Re-confirm the inventory live (read-only).** Re-run `supabase db diff --linked`, capture the current diff, and verify every object's live existence via read-only `execute_sql`. Risk: none.
2. **Lane 1 — de-duplicate re-homed files (replay-only).** Remove redundant originals where the replayed end-state is provably unchanged; re-run `db diff` to confirm no new drift. Risk: low (no production impact).
3. **Lane 2 — deploy phantom tables + buckets + RLS (additive forward migration) — DONE, live-verified.** Recorded as `20260601205749`/`20260601210352`. Follow-on: tighten the permissive `USING (true)` policies the deploy introduced (Task 13). Regenerate types. Risk: medium (new objects, but additive).
4. **Lane 3 — verify/guard the 6 Edge Functions** against the now-deployed schema; remove the redundant `createBucket("reports")` fallback. Risk: low–medium.
5. **Req 4 — profiles constraint reconciliation (DECIDED: keep live NOT NULL) — DONE.** Live-verified: the codebase types `institution_id` as non-null, live keeps it `NOT NULL` with no CHECK, so the repo converges TO live via a **replay-only no-op** in `20260901000009` Section 1. No production change. Risk: none (replay-only; live already correct). `handle_new_user` body convergence to live is owned by Lane 2/Req 5 (Task 6).
6. **Req 5 + 6 — converge function/policy/constraint drift** (mix of replay-only text fixes and additive forward migrations), preserving security mode and RLS coverage.
7. **Req 7 — record the chain, prove genuinely-empty diff, CI green, e2e-audit re-run.** Final gate.

Each production step is wrapped by the Req 8 safety controls: pre-change snapshot, additive-only, confirm high-blast-radius operations, post-step verification, types via protected script only.

## Correctness Properties

### Property 1: Convergence

After all lanes, `supabase db diff --linked` reports no `create`/`drop`/`alter` (genuinely-empty diff). This is the terminal property. **Validates: Requirements 7.2, 7.6**

### Property 2: Functionality & connectivity preservation

For every table touched, schema changes are additive and forward-only (new tables/columns/policies, plus the decided `profiles` convergence). The terminal invariant is preservation of **application functionality, cross-table connectivity, and the complete `profiles`-chain linkage to the codebase** — not strict row preservation, because the live data is disposable test data that may be reseeded. No change may break connectivity, functionality, or the `profiles`-chain linkage; high-blast-radius operations that could do so require user confirmation. **Validates: Requirements 2.6, 8.1, 8.4**

### Property 3: Function non-regression

The 12 functions owned by `db-function-search-path-qualification` and `process_marketplace_purchase` are byte-for-byte unchanged by this spec (verified via catalog snapshot + the bugfix Task 11 probes). **Validates: Requirements 5.4**

### Property 4: Security-posture preservation

Every reconciled function keeps its `prosecdef`, volatility, ownership, grants; every table keeps RLS enabled with its intended policies; append-only invariants (`xp_transactions`, `xp_purchases`, `audit_logs`, evidence) are not weakened. **Validates: Requirements 5.3, 6.4, 8.3**

### Property 5: App-correctness

Each of the six previously-unguarded Edge Functions resolves every referenced table and completes successfully for a representative input. **Validates: Requirements 3.1, 3.3**

## Error Handling

- **Partial deployment failure:** if an `apply_migration` step fails midway, stop, capture the exact state, and ship a corrective forward migration rather than leaving the schema partially changed (Req 8.6).
- **Diff regression:** if a lane introduces NEW drift, revert that lane's change (replay-only edits are trivially reversible; forward migrations get a corrective forward migration) before proceeding.
- **High-blast-radius guard:** mass `REVOKE`, recursive policy drops, and constraint additions that could reject existing rows are confirmed with the user before applying (Req 8.3); a constraint that would reject existing rows is validated against current data first.
- **Edge Function guard fallback:** where a table deploy is deferred, the function degrades gracefully (logged, non-fatal) rather than throwing, preserving existing Zod validation.
- **Types corruption guard:** `src/types/database.ts` is regenerated only via the protected script; a post-generation check (`export type Database` present, > 1 KB) gates the commit.

## Testing Strategy

- **Diff-driven verification:** `supabase db diff --linked` after each lane; targeted drift cleared, no new drift. Terminal gate (Req 7.2) = genuinely-empty diff.
- **App-correctness tests:** invoke each previously-unguarded Edge Function against the deployed schema for one representative input; assert no missing-relation error and a correct success shape (Req 3.3).
- **Preservation snapshots:** before/after catalog metadata (`prosecdef`, `provolatile`, `proconfig`, `proowner`, `proacl`, trigger metadata) for every function touched; row-count + column snapshots for every table touched (Req 8.2, 8.4).
- **Cross-spec non-regression:** re-run the `db-function-search-path-qualification` Task 11 probes and the `pre-deployment-e2e-audit` connectivity/RLS/cron layers (Req 7.5).
- **CI:** `npm run lint` + `npx tsc --noEmit` + `npm test` green (Req 7.4).

## Verification strategy (summary)

- **Diff-driven:** `supabase db diff --linked` is the master oracle. After each lane, re-run and confirm the targeted drift cleared and no new drift appeared. The terminal gate (Req 7.2) is a genuinely-empty diff.
- **App-correctness:** invoke each previously-unguarded Edge Function against the deployed schema for one representative input; confirm no missing-relation error and a correct success shape (Req 3.3).
- **Preservation:** before/after catalog snapshots (`prosecdef`, `provolatile`, `proconfig`, `proowner`, `proacl`, trigger metadata) for every function touched; row-count + column snapshots for every table touched (Req 8.2, 8.4).
- **Cross-spec non-regression:** re-run the `db-function-search-path-qualification` Task 11 probes and the `pre-deployment-e2e-audit` connectivity/RLS/cron layers (Req 7.5) to confirm the reconciliation didn't break the bugfix or re-open a Critical finding.
- **CI:** `npm run lint` + `npx tsc --noEmit` + `npm test` green (Req 7.4); types regenerated via `pwsh scripts/regen-types.ps1` only.

## Tooling & guardrails

- DDL → Supabase MCP `apply_migration`; reads → `execute_sql` (read-only, rolled-back where DML is needed to observe).
- Replay gate → `supabase db diff --linked` (Docker + Supabase CLI 2.102.0).
- History → `supabase migration list --linked` / `supabase migration fetch`.
- Types → `pwsh scripts/regen-types.ps1` ONLY (never `>` redirection; per `.kiro/steering/types-regeneration.md`).
- Edge Functions → Deno runtime, Zod-validated bodies preserved; guards mirror `src/hooks/useStudentHabitLevel.ts` / `useTeams.ts`.
- All RLS/append-only invariants from `.kiro/steering/supabase-patterns.md` and `domain-knowledge.md` upheld.

## Live advisory findings (from `_investigation/db-function-search-path-live-findings.md`)

A post-Part-C, read-only live introspection (MCP `execute_sql` + `get_advisors`) surfaced concrete findings now chartered by Requirements 9 and 10. Summary:

### Security (Req 9)

- **ERROR** `security_definer_view` on `public.leaderboard_weekly` — enforces creator RLS, not the querying user's; potential cross-institution leaderboard leak. Rebuild as `security_invoker`. **[CLEARED — live-confirmed `security_invoker=true`, recorded `20260601220023`.]**
- **WARN** `function_search_path_mutable` — only `public.is_pgcron_available` and `public.prevent_mutation` remain (the 2 badge functions cleared by Part C). Harden with `SET search_path=''`. **[CLEARED — live-confirmed both `search_path=''`.]**
- **WARN** `anon_security_definer_function_executable` — `anon` can call `anonymize_user`, `auth_institution_id`, `auth_user_role`, `consume_invitation`, `get_invitation_by_token`, `is_portfolio_publicly_accessible`, `portfolio_public_access`. `anonymize_user` (GDPR erasure) must be revoked from `anon`; others triaged per-function. **[`anonymize_user` CLEARED — EXECUTE now only `service_role`/`postgres`. The remaining `auth_*`/invitation/portfolio RPCs persist and are triaged as intentional in Task 11.]**
- **WARN** `authenticated_security_definer_function_executable` — ~14 functions persist (live re-count); per-function EXECUTE-grant audit (Task 11).
- **NEW — WARN** `rls_policy_always_true` (introduced by the Task 3 deploy, live-confirmed) on `student_badges_insert`, `quiz_clos_insert`, `quiz_clos_delete`, `team_gamification_insert`, `team_gamification_update` — `USING (true)`/`WITH CHECK (true)` for `authenticated`. Tighten to least-privilege (**Task 13**, Req 2.8).
- **WARN** `extension_in_public` (`vector`, `citext`) and `auth_leaked_password_protection` — defer to ops with justification (still present, live-confirmed).

### Performance (Req 10)

- **WARN** `auth_rls_initplan` — ~40 policies call bare `auth.<fn>()` per row (the `(select ...)` wrapper was dropped on live). This IS the drift the `migration fetch` exposed in the 6 re-emitted files. Rewrite to `(select auth.<fn>())`.
- **WARN** `duplicate_index` — ~50 identical `idx_<col>` / `idx_<col>_id` pairs. Drop one of each.
- **INFO** `unindexed_foreign_keys` — add covering index for `assignments_rubric_id_fkey`.
- **INFO/WARN** `unused_index` (~100) and `multiple_permissive_policies` (hundreds) — documented backlog, not gates.

### Part C duplicate

- Part C is recorded on live as `20260601110014_fix_function_search_path_qualification`; the planned `20260903000001_*` is a local-only duplicate to remove (Req 1 dedup list).

## Open decisions requiring user input

### Resolved decisions

- **Req 4 — profiles constraint (DECIDED, live-verified):** keep live's `profiles.institution_id` **NOT NULL** with **no** `profiles_institution_required_when_active` CHECK, and converge the **repo → live** via a replay-only no-op in `20260901000009` Section 1. Live-verification settles the direction: `src/types/database.ts` types `institution_id` as non-null `string` (Row + Insert), live is `NOT NULL` with no CHECK, and open self-signup without an institution is not a supported flow (every profile must be institution-scoped so `auth_institution_id()` RLS scoping holds). The earlier "make it nullable + add CHECK" framing contradicted live and the codebase and has been corrected. No production change. This is no longer an open decision.
- **Req 2/Task 13 — new-table RLS tightening (DECIDED):** the permissive `USING (true)` policies the Task 3 deploy introduced will be tightened to least-privilege predicates (student-/team-/staff-scoped), since the legitimate writers are `service_role` Edge Functions that bypass RLS. The exact predicates are confirmed with the user before applying (Req 8.3).
- **Task 15 — cron scheduler (DECIDED, user-confirmed):** Vercel Cron is the single canonical scheduler (works today, version-controlled, no in-DB secrets needed, Hobby once-per-day cadence fits all jobs). Prune the 7 dead pg_cron HTTP jobs (NULL-URL no-ops) + the broken `leaderboard-refresh` pg_cron; keep `leaderboard-refresh` on Vercel at once-per-day (not every 5 min); keep only the 3 pure-SQL pg_cron jobs (`badge-auto-archive`, `badge-spotlight-rotate`, `fee-overdue-check`). Do not revive the pg_cron HTTP path. Root cause of the no-op jobs is the live-confirmed NULL `app.settings.supabase_url` GUC (free-tier setup never completed).

### Still open

1. **De-duplication direction (Req 1):** confirm removing the `20260901*/20260902*` originals (keeping the back-dated copies) is acceptable, or whether the originals should be the canonical files. (Also covers the local-only planning files `20260901000004/9/10/11`, whose schema is already deployed+recorded via `20260601205749` — Task 9 reconciles them.)
2. **Any live policy/constraint the diff wants to DROP** that represents a real security control (Req 6.5) — confirm before removing from live or re-adding to the repo. Includes the live-confirmed-absent `notifications_type_check` / `notifications_type_role_guard` (add to live, or remove from the repo replay?).
