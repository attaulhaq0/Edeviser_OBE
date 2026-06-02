# Live-SQL Validation of Bugfix + Reconciliation Findings

> **Method:** READ-ONLY introspection of the LIVE Supabase project `cdlgtbvxlxjpcddjazzx` via
> Supabase MCP `execute_sql` / `get_advisors` / `list_edge_functions`, plus repo `grep`. No DDL,
> no `apply_migration`, no `db push`. Performed to double-check that every finding in the
> `db-function-search-path-qualification` bugfix and the `migration-history-reconciliation` spec
> is real and needed, and to revise the reconciliation plan to be validated from live SQL rather
> than from the cancellation-prone Docker `db diff`.
>
> This supersedes/corrects parts of `db-function-search-path-residual-drift-analysis.md` that were
> derived from the captured `task8_diff_run10.log` (a Docker shadow diff) rather than from live.

## A. db-function-search-path-qualification (bugfix) — VALIDATED ✅

### A1. Part C is recorded on production

`supabase_migrations.schema_migrations` contains `20260601110014_fix_function_search_path_qualification`
(applied when Task 10 ran MCP `apply_migration`; the platform assigned a timestamp at apply-time,
NOT the planned `20260903000001`). The recent remote head is `20260820100003`; the search_path
migrations recorded are `20260416193345`, `20260504032936`, `20260601110014`.

### A2. All 10 functions carry `search_path=''` and are SECURITY-correct on live

`pg_proc` scan confirms `proconfig=["search_path=\"\""]` for: `get_effective_price`,
`get_xp_balance`, `get_wellness_aggregate_stats` (DEFINER), `seed_marketplace_items`,
`delete_department_if_no_programs` (DEFINER), `validate_sub_clo_weights`,
`enforce_max_active_challenges`, `sync_tutor_conversation_stats`, `badge_auto_archive` (DEFINER),
`badge_spotlight_auto_rotate` (DEFINER). Security modes match the preservation baseline.

### A3. No additional same-class function bug exists

Scanned EVERY `public` function with a `search_path` GUC. Three functions with empty `search_path`
were NOT in the original 10 — `course_material_institution`, `rls_isolation_violations`,
`set_audit_log_institution` — but reading their `pg_get_functiondef` shows all three are already
fully `public.`-qualified (or use only `storage.`/`pg_catalog` builtins). **No new runtime-broken
function.** The original scope of 10 was complete. ✅

### A4. Advisor confirms badge functions cleared

`get_advisors(security)` lists `function_search_path_mutable` for ONLY `is_pgcron_available` and
`prevent_mutation` — both explicitly out of scope (carved to reconciliation). `badge_auto_archive`
and `badge_spotlight_auto_rotate` no longer warn. Task 13 holds. ✅

### A5. ACTION TAKEN — duplicate Part C migration removed

The `migration fetch` (Task 16) pulled down `20260601110014` (production's recorded copy). The
planned local-only `20260903000001_fix_function_search_path_qualification.sql` was a byte-equivalent
duplicate (same 10 functions). **Deleted `20260903000001`** to restore one-file-one-truth and avoid
re-emitting the same functions on a fresh replay. Production already has the fix under
`20260601110014`; nothing was applied or reverted on live.

## B. migration-history-reconciliation — VALIDATED + CORRECTED

### B1. Phantom tables genuinely absent on live (CONFIRMED) ✅

`to_regclass` returned `null` for all of: `student_badges`, `quiz_clos`, `team_gamification`,
`student_habit_levels`, `student_habit_level_history`; `to_regproc('fn_track_habit_level_change')`
= `null`. These are the true Category-B core (files `20260901000010` / `20260901000011`).

### B2. App-breakage is real and Critical (CONFIRMED via repo grep) ✅

Edge functions that hard-query the missing tables (no guard):

- `student_badges` → `weekly-summary-cron`, `process-onboarding`, `export-student-data`, `check-badges`
- `team_gamification` → `team-streak-risk-cron`, `process-streak`, `check-badges`
  All six are deployed and ACTIVE (per `list_edge_functions`). Server-side badge awarding, team
  gamification, two crons, weekly summary, and GDPR export error at runtime today.

### B3. **NEW / CORRECTED finding — storage buckets** ⚠️ (analysis was WRONG)

The residual-drift analysis claimed migration `20260901000011` creates `reports` + `transcripts`
buckets and that closing the gap deploys them. LIVE `storage.buckets` actually contains:
`accreditation-reports`, `avatars`, `course-materials`, `session-evidence`, `submissions`,
`tutor-attachments`. There is **NO `reports` bucket and NO `transcripts` bucket** on live.

Yet edge-function source uploads to those exact names:

- `generate-transcript/index.ts` → `supabase.storage.from("transcripts")` (upload + signed URL)
- `generate-accreditation-report/index.ts` → `.from("reports")` (with an inline
  `createBucket("reports")` fallback on failure)
- `export-student-data/index.ts` → `.from("reports")` (upload + signed URL)

**Impact:** transcript generation and student-data export fail on upload in production today
(missing bucket); accreditation-report generation only survives because it self-creates the bucket
at runtime (fragile, and the bucket it creates has no RLS policies). This is a **genuine functional
bug not previously tracked** — distinct from the phantom-table gap. The fix is to create the
`reports` and `transcripts` buckets (private) with institution-scoped RLS, OR repoint the three
functions at `accreditation-reports`. Recommended: create the two buckets to match the code
(least churn, matches intent of migration 11).

### B4. profiles file-9 drift (CONFIRMED) ✅

Live `profiles.institution_id` IS `NOT NULL`; there is NO `profiles_institution_required_when_active`
constraint. So file `20260901000009`'s nullability change + conditional CHECK were never applied.
Decision still required (Req 4): adopt on live (needed for open self-signup) vs amend migration to
match live.

### B5. notifications drift (CONFIRMED) ✅

`notifications_type_check` constraint = absent (0); `notifications_type_role_guard` function =
absent (0); `trg_notifications_type_role_guard` trigger = absent. Matches §3.3 of the analysis.

### B6. Re-homed duplicates already live (CONFIRMED) ✅

`invitations`, `rate_limit_events`, `blocked_ips` tables exist; `handle_new_user`,
`consume_invitation`, `prevent_profile_privilege_escalation` functions exist;
`trg_prevent_profile_privilege_escalation` trigger exists on `profiles`; columns
`teams.avatar_letter`, `profiles.tour_completed_at`, `profiles.language_preference`,
`tutor_conversations.recommended_persona`, `assignments.rubric_id` all exist. So replaying the
`20260901*`/`20260902*` originals is idempotent — they are duplicates to de-dup, not drift.

## C. NEW findings surfaced by the live advisor (not in any current spec)

These are real, live, and should be tracked (most fit `migration-history-reconciliation` or
`pre-deployment-e2e-audit`):

1. **ERROR — `security_definer_view` on `public.leaderboard_weekly`.** A SECURITY DEFINER view
   bypasses the querying user's RLS. ERROR-level. Needs review (likely should be `security_invoker`
   or rebuilt). Lint 0010.
2. **WARN — `anon` can execute `anonymize_user(uuid)`** (GDPR user-erasure) as SECURITY DEFINER via
   `/rest/v1/rpc/anonymize_user`. Should `REVOKE EXECUTE FROM anon`. Lint 0028 — genuine security
   exposure.
3. **WARN — many SECURITY DEFINER RPCs executable by `anon`/`authenticated`** (`auth_institution_id`,
   `auth_user_role`, `consume_invitation`, `get_invitation_by_token`, `portfolio_public_access`,
   `is_portfolio_publicly_accessible`, plus the authenticated set). Some are intentional (portfolio
   public access, invitation lookup by token); each should be confirmed or revoked. Lints 0028/0029.
4. **WARN — `extension_in_public`** for `vector` and `citext` (should move out of `public`).
5. **WARN — `is_pgcron_available`, `prevent_mutation` still mutable search_path** (already tracked,
   out of scope for the bugfix; belongs to reconciliation Req 5.6).
6. **WARN — leaked-password protection disabled** (Auth config; ops toggle).

## C2. NEW finding — RLS auth-initplan drift (live-confirmed via performance advisor)

`get_advisors(performance)` reports **`auth_rls_initplan` WARNs on ~45 live policies** that call bare
`auth.uid()` / `auth.<fn>()` and re-evaluate per row (suboptimal at scale). Confirmed examples:
`habit_logs.{student_select_own,student_insert_own,student_update_own,parent_select_linked,users_read_own_habit_logs}`,
`notifications.users_read_own_notifications`, `tutor_conversations.users_read_own_tutor_conversations`,
`teacher_handoff_requests.teachers_read_own_handoffs`, `submissions.*`, `evidence.*`, `grades`/`outcome_attainment`
parent reads, etc. The Supabase docs fix is `(select auth.<fn>())`.

This is a **real, live-confirmed performance issue** AND it intersects this spec's history:

- The committed repo (HEAD) had 6 post-corrective migrations (`20260504041109`, `20260520063920/063937/064025/102905/113022`)
  already using the optimized `(select auth.uid())` form.
- The bugfix's Task 16 `migration fetch` overwrote those 6 files with remote's BARE `auth.uid()` (21 ins/21 del),
  which both de-optimized the repo and tripped the `supabaseAuditFaults` RLS-initplan guard test.
- **Action taken (this session):** restored the 6 files to HEAD via `git checkout HEAD -- <files>` (repo now
  green; the optimized form is back in the local chain). This is a repo-only fix; it did NOT change live.

**Still-open (belongs to `migration-history-reconciliation`):** LIVE policies remain unoptimized (advisor still
WARNs). Converging live to the optimized form is an additional, large RLS change — folded into reconciliation
Req 6 / a new performance-advisor task, not applied unilaterally here.

The performance advisor also reports (live, for the reconciliation backlog): `unindexed_foreign_keys`
(`assignments.rubric_id`), **~60 `duplicate_index` WARNs** (the fetch/back-dating + FK-index migrations created
`idx_<table>_<col>` and `idx_<table>_<col_without_id>` pairs), many `unused_index` INFOs, and pervasive
`multiple_permissive_policies` WARNs. These are performance hygiene, not correctness; triage in reconciliation.

## D. Revised verification approach (pivot away from Docker `db diff`)

`supabase db diff --linked` was cancelled 3× (Docker shadow build is slow/unstable in this env).
For the reconciliation spec, the master oracle is therefore **live SQL introspection** (the queries
in this doc), which is fast and deterministic:

- existence: `to_regclass` / `to_regproc` / `information_schema.columns` / `pg_constraint` /
  `storage.buckets` / `pg_policy`.
- function bodies: `pg_get_functiondef`.
- security: `get_advisors`.
- migration history: `supabase_migrations.schema_migrations`.
  `db diff` remains the FINAL confirmation gate (run once in CI / Supabase Preview), but per-step
  validation is done from live SQL.

## E. Production-safety confirmation for this validation

READ-ONLY. The only filesystem change was deleting the redundant local duplicate
`20260903000001_fix_function_search_path_qualification.sql`. No `apply_migration`, no `db push`,
no DDL/DML against production.
