# Live Findings — DB Function search_path Spec + Reconciliation

> Senior-dev + QA deep dive via **direct read-only live introspection** of Supabase project
> `cdlgtbvxlxjpcddjazzx` (MCP `execute_sql` + `get_advisors`), run AFTER Part C
> (`fix_function_search_path_qualification`) was applied. Pivoted away from the Docker
> `db diff` (which kept getting cancelled) to query live directly — the approach that worked
> for the Task 11/13 verification.
>
> Purpose: surface the FULL, concrete finding set so the fixes are real and complete.
> READ-ONLY. No DDL/data changes were made during this investigation.

## 0. Headline confirmations (the bugfix worked on live)

- **Part C is recorded in remote history as `20260601110014_fix_function_search_path_qualification`** — NOT the planned `20260903000001`. When Task 10 applied it via MCP `apply_migration`, the platform assigned a timestamp in the June-01 slot. `migration fetch` then pulled the recorded copy down, so the repo now has **two identical Part C files** (`20260601110014_*` recorded-remote + `20260903000001_*` local-only). De-duplication target.
- **All 10 in-scope functions carry `proconfig = ["search_path=\"\""]` on live**, including the 2 badge functions (`badge_auto_archive`, `badge_spotlight_auto_rotate`) — previously `proconfig=null`/mutable. Part C hardening verified directly against the catalog.
- **No NEW same-class runtime bugs.** A full scan of every `public` function carrying empty `search_path` found 3 beyond the original 10 (`course_material_institution`, `rls_isolation_violations`, `set_audit_log_institution`); reading their `pg_get_functiondef` confirmed all three are **already fully `public.`-qualified** — no undefined_table/function risk. The original 10 were the complete set of the runtime defect.

## 1. Security advisor (live, post-Part-C) — FINDINGS

### 1.1 `function_search_path_mutable` (WARN) — only 2 remain

- `public.is_pgcron_available`
- `public.prevent_mutation`

The 2 badge functions NO LONGER appear (Part C cleared them ✓). These 2 are the documented out-of-scope backlog (bugfix clause 1.12) → **owned by `migration-history-reconciliation` Req 5/6**. Fix = qualify (if needed) + `SET search_path = ''`.

### 1.2 `security_definer_view` (ERROR) — NEW finding, not previously tracked

- View `public.leaderboard_weekly` is `SECURITY DEFINER` → enforces the _view creator's_ RLS, not the querying user's. This is an ERROR-level security finding and a potential cross-institution leaderboard leak vector.
- Remediation: recreate the view as `security_invoker = true` (Postgres 15+) OR justify and document. **New task for the reconciliation spec.**

### 1.3 `anon_security_definer_function_executable` (WARN) — anon can call SECURITY DEFINER RPCs

`anon` role can execute these via `/rest/v1/rpc/...`:
`anonymize_user`, `auth_institution_id`, `auth_user_role`, `consume_invitation`, `get_invitation_by_token`, `is_portfolio_publicly_accessible`, `portfolio_public_access`.

- Some are intentional (portfolio public access, invitation lookup for signup). Others (`anonymize_user`, `auth_user_role`, `auth_institution_id`) should likely NOT be anon-executable.
- Remediation: `REVOKE EXECUTE ... FROM anon` on the ones that should not be public; document the intentional ones. **New task — security review.**

### 1.4 `authenticated_security_definer_function_executable` (WARN) — ~17 functions

Signed-in users can call a broad set of SECURITY DEFINER RPCs (`delete_department_if_no_programs`, `get_wellness_aggregate_stats`, `get_leaderboard*`, `get_earn_spend_ratio`, `get_badge_spotlight`, the auth/invitation/rate-limit helpers, portfolio helpers, etc.). Mostly intentional (they self-guard), but warrants a per-function EXECUTE-grant audit. **Reconciliation spec — security review.**

### 1.5 `extension_in_public` (WARN)

- `vector` and `citext` are installed in `public`. Recommended: move to a dedicated `extensions` schema. Low priority; flagged.

### 1.6 `auth_leaked_password_protection` (WARN) — Auth config

- Leaked-password protection (HaveIBeenPwned) is disabled. One-click enable in Auth settings. **Config task.**

## 2. Performance advisor (live) — FINDINGS

### 2.1 `auth_rls_initplan` (WARN) — ~40 policies — CONFIRMS the user's fetch observation

Policies re-evaluate `auth.<fn>()` / `current_setting()` **per row** because they use bare `auth.uid()` instead of `(select auth.uid())`. This is exactly the live↔migration drift the `migration fetch` exposed: the 6 historical files (`20260504041109`, `20260520063920/063937/064025/102905/113022`) re-emitted with `(select auth.uid())` → `auth.uid()`, i.e. **live dropped the `(select ...)` optimization wrapper**.

- Affected tables include: `habit_logs` (×5 policies), `evidence`, `submissions`, `learning_outcomes`, `notifications`, `student_gamification`, `tutor_*`, `session_*`, `weekly_goals`, `planner_tasks`, `review_schedules`, `reflection_*`, `class_donation*`, `student_content`, `student_quest_progress`, `audit_runs`, `audit_findings`, `invitations`, `session_intents`, `flow_check_ins`, and more.
- Remediation: rewrite each flagged policy's `USING`/`WITH CHECK` to wrap auth calls in `(select ...)`. This is **both** a perf fix AND the source-of-truth reconciliation for the 6 re-emitted files. **Reconciliation spec — Req 6 (policy drift) extended.**

### 2.2 `duplicate_index` (WARN) — ~50 identical index pairs

Pervasive `idx_<table>_<col>` vs `idx_<table>_<col>_id` duplicate pairs across `courses`, `evidence`, `learning_outcomes`, `programs`, `cqi_action_plans`, `assignments`, `discussion_*`, `fee_*`, `question_bank`, `quiz_*`, `outcome_mappings`, `learning_path_nodes`, `academic_calendar_events`, `announcements`, `departments`, `audit_logs`, `course_*`, `grade_categories`, `journal_entries`, `mastery_recovery_pathways`, `onboarding_*`, `rubric*`, etc.

- Cause: a later migration added `_id`-suffixed FK indexes without dropping the originals (or vice versa). Each pair wastes storage + slows writes.
- Remediation: drop one of each identical pair (additive-safe: keep the canonical name). **New task — index cleanup migration.**

### 2.3 `unused_index` (INFO) — ~100 indexes never used

Low priority (many are FK indexes on low-traffic tables). Document; defer unless storage pressure. NOT a gate.

### 2.4 `unindexed_foreign_keys` (INFO)

- `assignments.assignments_rubric_id_fkey` lacks a covering index. Minor; add `idx_assignments_rubric_id`. **Small task.**

### 2.5 `multiple_permissive_policies` (WARN) — hundreds

Largely by-design (role-split read policies) and partly noise (advisor lists `anon`/`authenticator`/`cli_login_postgres`/`dashboard_user`/`supabase_privileged_role` rows for the same policy). Consolidating is a large, low-ROI effort. Document as a backlog; NOT a gate.

## 3. Migration history (live)

- Remote head: `20260820100003_create_teacher_handoff_requests`.
- Part C recorded at `20260601110014` (mid-history, in the June-01 slot — NOT after the tutor migrations). The body matches the 10-function Part C content.
- Local-only-after-remote-head migrations remain: `20260901000001`–`20260901000011`, `20260902000001`–`20260902000003`, `20260903000001` (the planned Part C dup), plus a handful of mid-history local-only entries (`20260510000001/000002/040000/050000`). These are the deployment-gap + dedup targets already chartered in `migration-history-reconciliation`.

## 4. What this adds to the reconciliation spec (new, concrete tasks)

1. **De-duplicate the Part C pair**: remove local-only `20260903000001_fix_function_search_path_qualification.sql` (keep the recorded `20260601110014_*`). (Req 1 — extends the dedup list.)
2. **Reconcile RLS-initplan drift (~40 policies)**: rewrite bare `auth.<fn>()` → `(select auth.<fn>())` to match the optimized intent AND clear the perf advisor; this also reconciles the 6 re-emitted historical files. (Req 6, extended — perf + drift.)
3. **Fix `security_definer_view` on `leaderboard_weekly`** (ERROR): recreate `security_invoker`. (New security task.)
4. **EXECUTE-grant audit** for the `anon`/`authenticated` SECURITY DEFINER RPCs (§1.3/§1.4): revoke where unintended, document where intentional. (New security task.)
5. **Drop ~50 duplicate indexes** (§2.2): one additive migration. (New perf task.)
6. **Harden `is_pgcron_available` + `prevent_mutation`** with `SET search_path=''` (§1.1). (Req 5/6.)
7. **Add covering index** for `assignments_rubric_id_fkey`; enable Auth leaked-password protection; (optionally) move `vector`/`citext` out of `public`. (Minor backlog.)

## 5. Production-safety confirmation for this investigation

- READ-ONLY: only `execute_sql` SELECT/catalog reads + `get_advisors`. No `apply_migration`, no `db push`, no DDL/DML, no function or data modified.
