# Migration History Reconciliation — Live-SQL Re-Baseline & Confirmed Worklist

> **Task 1** of `migration-history-reconciliation`. **READ-ONLY** re-confirmation of the design
> inventory against LIVE Supabase production `cdlgtbvxlxjpcddjazzx` (confirmed against
> `supabase/.temp/project-ref`). Oracle = direct live SQL introspection via MCP `execute_sql`
> (SELECT/catalog only) + `get_advisors(security)` + `supabase_migrations.schema_migrations`.
> No `apply_migration`, no `db push`, no DDL/DML, no writes of any kind were performed.
> Docker `db diff` was NOT used (unreliable in this environment, per the spec).
>
> Date of capture: this session, post-Part-C (`20260601110014_fix_function_search_path_qualification`
> recorded on live).
>
> **Classification legend:**
>
> - **deploy** — additive forward migration to create genuinely-missing live schema (Task 3).
> - **de-duplicate** — remove a redundant local migration file; replay-only, no production impact (Task 2).
> - **converge-replay** — live is source of truth; amend historical migration text so a fresh replay reproduces live (Tasks 6/7).
> - **converge-forward** — repo is source of truth; ship a forward migration to bring live into line (Tasks 6/7).
> - **revoke** — `REVOKE EXECUTE` / security-grant change (Task 11, HIGH-RISK gate).
> - **defer** — record to backlog with owner/justification; not a gate.

---

## 0. Headline confirmations

| Check                                             | Live result                                                                                                                         | Matches design inventory?                      |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| 5 phantom tables (`to_regclass`)                  | all **NULL** (absent)                                                                                                               | ✅ confirmed absent                            |
| `fn_track_habit_level_change` (`to_regproc`)      | **NULL** (absent)                                                                                                                   | ✅ confirmed absent                            |
| `reports` / `transcripts` buckets                 | **absent**; live has `accreditation-reports`, `avatars`, `course-materials`, `session-evidence`, `submissions`, `tutor-attachments` | ✅ confirmed (matches the live-SQL correction) |
| `profiles.institution_id`                         | `is_nullable = NO` (**NOT NULL**)                                                                                                   | ✅ confirmed (migration text wants nullable)   |
| `profiles_institution_required_when_active` CHECK | **absent** (`pg_constraint` empty)                                                                                                  | ✅ confirmed absent                            |
| `notifications_type_check` constraint             | **absent** (`pg_constraint` empty)                                                                                                  | ✅ confirmed absent                            |
| `notifications_type_role_guard` function          | **absent** (`pg_proc` empty)                                                                                                        | ✅ confirmed absent                            |
| Remote head                                       | `20260820100003_create_teacher_handoff_requests`                                                                                    | ✅ confirmed                                   |
| Part C duplicate `20260903000001`                 | **already removed** from local chain (not present on disk)                                                                          | ✅ resolved earlier                            |
| `get_advisors(security)`                          | 1 ERROR + many WARN (enumerated §7)                                                                                                 | ✅ confirmed                                   |

---

## 1. Phantom tables + function (Req 2 / Task 3) — classification: **deploy**

Live probe:

```
to_regclass('public.student_badges')              => NULL
to_regclass('public.quiz_clos')                   => NULL
to_regclass('public.team_gamification')           => NULL
to_regclass('public.student_habit_levels')        => NULL
to_regclass('public.student_habit_level_history') => NULL
to_regproc('public.fn_track_habit_level_change')  => NULL
```

| Object                                                         | Source migration | Live                        | Classification        | Source_Of_Truth_Decision (draft)                                                                                                                                                                          |
| -------------------------------------------------------------- | ---------------- | --------------------------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `student_habit_levels`                                         | `20260901000010` | absent                      | **deploy**            | Migration text (repo). Deploy exactly as defined (PK, `UNIQUE(student_id)`, `current_level 1..4 default 4`, 3 RLS policies).                                                                              |
| `student_habit_level_history`                                  | `20260901000010` | absent                      | **deploy**            | Migration text. Deploy with `idx_student_habit_level_history_student`, 2 RLS policies.                                                                                                                    |
| `team_gamification`                                            | `20260901000010` | absent                      | **deploy**            | Migration text. Deploy with `UNIQUE(team_id)`, `idx_team_gamification_team`, 3 RLS policies (currently `USING (true)` — see note).                                                                        |
| `fn_track_habit_level_change` + `trg_track_habit_level_change` | `20260901000010` | absent                      | **deploy** (+ harden) | Migration text, but **harden on deploy**: source defines it `SECURITY DEFINER` with **no `SET search_path`**. Req 2.2 mandates `SET search_path=''` + `public.`-qualified body. Deploy the hardened form. |
| `student_badges`                                               | `20260901000011` | absent                      | **deploy**            | Migration text. `badge_id text` (badge_key slug, NOT a UUID FK), `UNIQUE(student_id,badge_id)`, 2 indexes, 2 RLS policies.                                                                                |
| `quiz_clos`                                                    | `20260901000011` | absent                      | **deploy**            | Migration text. FK to `quizzes`+`learning_outcomes`, `UNIQUE(quiz_id,clo_id)`, 1 index, 3 RLS policies.                                                                                                   |
| `teams.avatar_letter` column                                   | `20260901000010` | **already present on live** | n/a                   | Live already has it (added via `20260526145520`). `ADD COLUMN IF NOT EXISTS` is a safe no-op; no action.                                                                                                  |

**Notes for Task 3:**

- The `fn_track_habit_level_change` source body is **not** `search_path=''`-hardened. Deploy the hardened variant to avoid immediately re-creating advisor debt.
- `team_gamification`, `quiz_clos`, and the `*_insert` policies use permissive `USING/WITH CHECK (true)`. These match the source migrations but are looser than the institution-scoped templates in `supabase-patterns.md`. Flag for Task 3: deploy-as-written vs tighten. Not a Task-1 blocker, but worth confirming the intent (the tables back gamification/quiz flows that are not strongly institution-partitioned in the source).

---

## 2. Storage buckets (Req 2.3 / Task 3) — classification: **deploy** (draft) — OPEN DECISION

Live `storage.buckets`:

```
accreditation-reports  (private, 20 MB, application/pdf)
avatars                (public,  2 MB, png/jpeg/webp)
course-materials       (private, 100 MB, pdf/doc/.../mp4/...)
session-evidence       (private, 5 MB, jpeg/png/pdf/doc)
submissions            (private, 50 MB, pdf/doc/zip/txt/jpeg/png)
tutor-attachments      (private, 10 MB, jpeg/png/pdf/docx)
```

→ **NO `reports` bucket, NO `transcripts` bucket.**

Edge functions that upload to the missing names (functional bug today):

- `generate-transcript` → `.from("transcripts")`
- `generate-accreditation-report` → `.from("reports")` (has a fragile inline `createBucket("reports")` runtime fallback)
- `export-student-data` → `.from("reports")`

**Draft recommendation — create the two private buckets (Option A).** Rationale:

- Keeps the source migration (`20260901000011`) as source of truth → smaller diff, no Edge Function code churn beyond removing the fragile `createBucket` fallback (Task 5).
- `transcripts` needs **student self-read** (folder-based `auth.uid() = foldername[1]`), which is semantically different from the admin/coordinator-only `accreditation-reports`. Consolidating would force student transcript access and admin accreditation PDFs under one policy set — messier and higher RLS-leak risk.
- Consolidating (Option B) means repointing 3 functions onto `accreditation-reports` AND broadening that bucket's RLS to allow student transcript reads — a security-surface change to an existing, working bucket.

**Caveat to resolve in Task 3:** the source-migration bucket policies are **role-based** (admin/coordinator), not **institution-scoped** as Req 2.3 states. On deploy, decide: ship the role-based policies as written, or add `institution_id`/folder scoping to match Req 2.3 and the `accreditation-reports` precedent (`20260601010814_fix_reports_buckets_institution_scope` already institution-scopes a "reports" concept — confirm naming alignment).

> **OPEN DECISION #2 (user):** create `reports`+`transcripts` (Option A, recommended) vs consolidate onto `accreditation-reports` (Option B). If Option A, confirm role-based vs institution-scoped policy shape.

---

## 3. file-9 `profiles` drift (Req 4 / Task 4) — classification: **converge** — OPEN DECISION (HIGH-RISK)

Live:

- `profiles.institution_id` → `is_nullable = NO` (**NOT NULL**), no default, type `uuid`.
- `profiles_institution_required_when_active` CHECK → **absent**.

Migration `20260901000009_critical_pre_production_fixes` wants: `institution_id` **nullable** + a conditional CHECK `profiles_institution_required_when_active`.

| Object                                            | Live                                                      | Migration text                         | Classification                          | Source_Of_Truth_Decision (draft)                                                                                                                                                                                                                                                                                   |
| ------------------------------------------------- | --------------------------------------------------------- | -------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `profiles.institution_id` nullability             | NOT NULL                                                  | DROP NOT NULL                          | **converge — direction TBD**            | Needs the self-signup/`handle_new_user` analysis in Task 4. If open self-signup-without-institution is supported → adopt migration (converge-forward, make nullable + add CHECK). If every profile must belong to an institution → converge-replay (amend migration to keep NOT NULL, drop the CHECK from replay). |
| `profiles_institution_required_when_active` CHECK | absent                                                    | present                                | **converge — direction TBD**            | Same decision as above; the CHECK only makes sense if the column becomes nullable.                                                                                                                                                                                                                                 |
| `prevent_profile_privilege_escalation` trigger/fn | **present on live** (`prosecdef=t`, `search_path=public`) | present (re-homed to `20260530093213`) | converge-replay (function-body, see §5) | Already deployed; preserve. Body drift handled with the §5 function set.                                                                                                                                                                                                                                           |

> **OPEN DECISION #1 (user, HIGH-RISK):** adopt the migration's nullable `institution_id` + conditional CHECK on live, OR amend the migration to reproduce live's NOT NULL. Do **not** change this core constraint unilaterally (Req 4.5 / 8.3). Adding the CHECK to live is a constraint that could reject existing rows → must be validated against current data first.

---

## 4. Policy / constraint / trigger drift (Req 6 / Task 7)

### 4.1 notifications constraint + guard — classification: **converge-replay**

- `notifications_type_check` constraint: **absent on live**.
- `notifications_type_role_guard` function: **absent on live**.
- (By extension `trg_notifications_type_role_guard` trigger: absent — depends on the absent function.)

These objects exist ONLY in the **local-only, unrecorded** migration `20260510000001_notifications_role_aware_types.sql` (and `20260510000002_notification_emitter_triggers.sql`), which were never applied to live.

| Object                                       | Live   | Source                      | Classification               | Source_Of_Truth_Decision (draft)                                                                                                                                                                                                                                                                                                                                                   |
| -------------------------------------------- | ------ | --------------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `notifications_type_check`                   | absent | local-only `20260510000001` | **converge — direction TBD** | Live is source of truth for what runs (constraint never deployed). Default: converge-replay (make the local-only files reproduce live = no constraint) UNLESS the role-aware type union is a wanted control → then converge-forward (deploy it). The type union restricts `notifications.type`; deploying a CHECK could reject existing rows → validate first. **Flag (Req 6.5).** |
| `notifications_type_role_guard` fn + trigger | absent | local-only `20260510000001` | **converge — direction TBD** | Same as above. A guard trigger preventing cross-role notification delivery is a security-ish control; confirm intent before dropping from repo or deploying to live.                                                                                                                                                                                                               |

### 4.2 Spot-checked policy deltas (design §3.3) — live policy inventory captured

Live `pg_policies` for the named tables (all RLS-enabled, policies present):

| Table                      | Live policies (name / cmd)                                                                                                                                                                       | Classification                                                                                                                                                                                            |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `habit_logs`               | `admin_all`/ALL, `parent_select_linked`/SELECT, `staff_select`/SELECT, `student_insert_own`/INSERT, `student_select_own`/SELECT, `student_update_own`/UPDATE, `users_read_own_habit_logs`/SELECT | **converge-replay** — live has 7 policies; `users_read_own_habit_logs` overlaps `student_select_own` (also feeds the `multiple_permissive_policies` perf finding). Reconcile repo text to match live set. |
| `notifications`            | `notifications_own`/ALL, `users_read_own_notifications`/SELECT                                                                                                                                   | **converge-replay** — no `type_role_guard` trigger live (see 4.1).                                                                                                                                        |
| `onboarding_progress`      | `progress_student_own`/ALL, `users_read_own_onboarding`/SELECT                                                                                                                                   | **converge-replay**                                                                                                                                                                                       |
| `badge_spotlight_schedule` | `admin_manage_spotlight`/ALL, `authenticated_read_spotlight`/SELECT                                                                                                                              | **converge-replay** — live carries `authenticated_read_spotlight` (design referenced an older `all_read_spotlight`; live is the current truth).                                                           |
| `invitations`              | `invitations_admin_delete`/DELETE, `invitations_admin_insert`/INSERT, `invitations_admin_select`/SELECT, `staff_read_invitations`/SELECT                                                         | **converge-replay** — `staff_read_invitations` present on live.                                                                                                                                           |
| `audit_findings`           | `admin_all_audit_findings`/ALL, `admins_read_audit_findings`/SELECT                                                                                                                              | **converge-replay**                                                                                                                                                                                       |
| `audit_runs`               | `admin_all_audit_runs`/ALL, `admins_read_audit_runs`/SELECT                                                                                                                                      | **converge-replay**                                                                                                                                                                                       |

All these tables **have** their policies on live → the drift is in migration _text_ (shadow), so the default direction is **converge-replay** (amend historical text to reproduce live). The full per-policy USING/WITH-CHECK diff is deferred to Task 7 (needs the `db diff` body capture); Task 1 confirms presence + the source-of-truth direction. Many of these policies also appear in the `auth_rls_initplan` perf finding (bare `auth.<fn>()` vs `(select auth.<fn>())`) → Task 12 reconciles that wrapper, which is the same drift.

> **OPEN DECISION #3 (user):** the `notifications_type_check` + `notifications_type_role_guard` direction (deploy-to-live vs drop-from-repo). Both are absent on live; if the role-aware guard is a wanted control, deploying is a constraint/trigger addition (Req 6.5 / 8.3 confirmation).

---

## 5. ~22 drifted functions (Req 5 / Task 6) — `prosecdef` / `provolatile` / `proconfig` captured

Live catalog (`pg_proc`), historical-drift set + deployment-gap set:

| Function                             | prosecdef   | provolatile | proconfig (live)         | search_path class | Classification (draft)                                                     |
| ------------------------------------ | ----------- | ----------- | ------------------------ | ----------------- | -------------------------------------------------------------------------- |
| `auth_institution_id`                | DEFINER     | stable      | `search_path=public`     | **`public`**      | converge — direction TBD (live carries `TO 'public'`; repo likely differs) |
| `auth_user_role`                     | DEFINER     | stable      | `search_path=public`     | **`public`**      | converge — direction TBD                                                   |
| `anonymize_user`                     | DEFINER     | volatile    | `search_path=public`     | **`public`**      | converge + **revoke** (see §7)                                             |
| `emit_notification`                  | DEFINER     | volatile    | `search_path=public`     | **`public`**      | converge — direction TBD                                                   |
| `trg_badge_earned_notify`            | DEFINER     | volatile    | `search_path=public`     | **`public`**      | converge-replay (live truth)                                               |
| `trg_grade_released_notify`          | DEFINER     | volatile    | `search_path=public`     | **`public`**      | converge-replay                                                            |
| `trg_new_assignment_notify`          | DEFINER     | volatile    | `search_path=public`     | **`public`**      | converge-replay                                                            |
| `trg_outcome_attainment_drop_notify` | DEFINER     | volatile    | `search_path=public`     | **`public`**      | converge-replay                                                            |
| `trg_pending_approval_notify`        | DEFINER     | volatile    | `search_path=public`     | **`public`**      | converge-replay                                                            |
| `trigger_attainment_rollup`          | DEFINER     | volatile    | `search_path=public`     | **`public`**      | converge-replay                                                            |
| `get_leaderboard_page`               | DEFINER     | stable      | `search_path=public`     | **`public`**      | converge-replay                                                            |
| `get_xp_transactions_page`           | **INVOKER** | stable      | `search_path=public`     | **`public`**      | converge-replay (note: NOT security definer)                               |
| `is_portfolio_publicly_accessible`   | DEFINER     | stable      | `search_path=public`     | **`public`**      | converge-replay (intentional anon — see §7)                                |
| `portfolio_public_access`            | DEFINER     | stable      | `search_path=public`     | **`public`**      | converge-replay (intentional anon — see §7)                                |
| `rls_auto_enable`                    | DEFINER     | volatile    | `search_path=pg_catalog` | **`pg_catalog`**  | converge — direction TBD (distinct search_path)                            |
| `is_pgcron_available`                | DEFINER     | volatile    | **null (MUTABLE)**       | **none**          | converge + **harden** (`SET search_path=''`) → clears advisor WARN         |
| `prevent_mutation`                   | **INVOKER** | volatile    | **null (MUTABLE)**       | **none**          | converge + **harden** (`SET search_path=''`) → clears advisor WARN         |

Deployment-gap functions (also drifted; same convergence rules):

| Function                               | prosecdef      | provolatile | proconfig (live)     | Classification                              |
| -------------------------------------- | -------------- | ----------- | -------------------- | ------------------------------------------- |
| `handle_new_user`                      | DEFINER        | volatile    | `search_path=public` | converge-replay (live deployed; preserve)   |
| `get_invitation_by_token`              | DEFINER        | stable      | `search_path=public` | converge-replay (intentional anon — §7)     |
| `consume_invitation`                   | DEFINER        | volatile    | `search_path=public` | converge-replay (intentional anon — §7)     |
| `check_rate_limit_approaching`         | DEFINER        | stable      | `search_path=public` | converge-replay                             |
| `prevent_profile_privilege_escalation` | DEFINER        | volatile    | `search_path=public` | converge-replay (preserve guard — Req 4.4)  |
| `fn_track_habit_level_change`          | absent on live | —           | —                    | **deploy** (§1; harden to `search_path=''`) |

**Key classification signal:** the entire historical-drift set carries **`search_path TO 'public'`** on live (NOT `''`). The 12 bugfix-owned functions + `process_marketplace_purchase` carry `search_path=''`. So this set is cleanly separable from the bugfix's scope — **do not regress those 12** (Property 3). For most of this set live is the deployed truth → **converge-replay** (amend migration text to match live's `pg_get_functiondef`), preserving `prosecdef`/volatility/owner/grants. The two MUTABLE functions (`is_pgcron_available`, `prevent_mutation`) and `rls_auto_enable` (pg_catalog) are the exceptions that may warrant **converge-forward** hardening (Task 6 + Task 11).

> Full `pg_get_functiondef` body diff for each is deferred to Task 6 (per the task's "you do NOT need to diff full bodies for all 22 here"). Task 1 establishes: all present on live, security/volatility/search-path class captured above, default direction = converge-replay except the 3 hardening candidates.

---

## 6. Migration history (Req 1 / Req 7)

Remote head: **`20260820100003_create_teacher_handoff_requests`**. Part C recorded at **`20260601110014`** (mid-history June-01 slot, NOT after the tutor migrations).

### 6.1 Local-only files NOT in `supabase_migrations.schema_migrations`

| Local file                                             | In remote history? | Classification                                   | Notes                                                                                                                                                       |
| ------------------------------------------------------ | ------------------ | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `20260510000001_notifications_role_aware_types`        | **NO**             | converge-replay / de-duplicate                   | Defines the absent `notifications_type_check` + `notifications_type_role_guard` (§4.1). Never deployed.                                                     |
| `20260510000002_notification_emitter_triggers`         | **NO**             | converge-replay                                  | Companion to above; reconcile with live notification triggers.                                                                                              |
| `20260510040000_fix_pgcron_connection_exhaustion`      | **NO**             | **de-duplicate**                                 | Remote records the equivalent at `20260520063903_fix_pgcron_connection_exhaustion`. Local-only earlier copy → likely redundant.                             |
| `20260510050000_fix_auth_user_role_infinite_recursion` | **NO**             | **de-duplicate**                                 | Exact-name **duplicate** of recorded `20260510045956_fix_auth_user_role_infinite_recursion`. Confirm byte-content then remove the local-only `050000` copy. |
| `20260901000001`–`20260901000011` (11 files)           | **NO**             | de-duplicate (1–9 partial) / **deploy** (10, 11) | See §6.2.                                                                                                                                                   |
| `20260902000001`–`20260902000003` (3 files)            | **NO**             | **de-duplicate**                                 | Re-homed twins of `20260526*` (recorded).                                                                                                                   |

### 6.2 Re-homed duplicate pairs (Req 1 / Task 2) — classification: **de-duplicate**

Each `20260901*/20260902*` original is a back-dated copy of a **recorded** `20260510*/20260526*/20260530*` migration. Default: keep the recorded (back-dated) copy, remove the local-only original — **only where replay end-state is provably unchanged** (Req 1.3–1.5). Confirm by content comparison in Task 2.

| Local-only original (remove)                            | Recorded canonical (keep)                           | Recorded on live?                                                                                              |
| ------------------------------------------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `20260901000001_add_tour_progress_and_theme_preference` | `20260510081412_*`                                  | ✅                                                                                                             |
| `20260901000002_add_handle_new_user_trigger`            | `20260510082038_*`                                  | ✅                                                                                                             |
| `20260901000003_tighten_avatars_bucket_policies`        | `20260510082713_*`                                  | ✅                                                                                                             |
| `20260901000004_seed_demo_data`                         | (gated no-op seed; no recorded twin)                | n/a — evaluate keep-as-noop                                                                                    |
| `20260901000005_create_invitations_table`               | `20260510083245_*`                                  | ✅                                                                                                             |
| `20260901000006_add_institution_join_modes`             | `20260510084054_*` (+ `20260510084433_*`)           | ✅                                                                                                             |
| `20260901000007_add_language_preference`                | `20260510084927_*`                                  | ✅                                                                                                             |
| `20260901000008_add_rate_limiting_audit`                | `20260510085314_*`                                  | ✅                                                                                                             |
| `20260901000009_critical_pre_production_fixes`          | partial dup of `20260530093213_*` (priv-escalation) | ✅ (trigger) — **but the profiles CHECK/nullability is genuinely undeployed → §3 (Task 4), NOT a pure de-dup** |
| `20260902000001_add_realtime_tables`                    | `20260526115401_*` / `20260526115420_*`             | ✅                                                                                                             |
| `20260902000002_weekly_goals_unique_constraint`         | `20260526140413_*`                                  | ✅                                                                                                             |
| `20260902000003_schema_drift_alignment`                 | `20260526145432/454/520/550_*`                      | ✅                                                                                                             |

### 6.3 Part C duplicate (Req 1 / live-findings) — classification: **already resolved**

- `20260601110014_fix_function_search_path_qualification` → **recorded on live AND present locally** (canonical, keep).
- `20260903000001_fix_function_search_path_qualification` → **NOT present in the local chain** (already deleted as carry-over per the tasks.md overview). **No action needed** — confirmed by directory listing; no `20260903000001` file exists.

---

## 7. Security advisors (Req 9 / Task 11) — `get_advisors(security)` enumerated

| #    | Finding                                              | Level     | Object(s)                                                                                                                                                                                                                                                                                                                                                                                                       | Classification (draft)                                            | Decision                                                                                                                                                   |
| ---- | ---------------------------------------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 9.1  | `security_definer_view`                              | **ERROR** | `public.leaderboard_weekly`                                                                                                                                                                                                                                                                                                                                                                                     | **converge-forward (rebuild `security_invoker`)**                 | Fix-now (Task 11). Preserve output shape + leaderboard anonymity opt-out invariant. HIGH-RISK gate.                                                        |
| 9.2  | `function_search_path_mutable`                       | WARN      | `public.is_pgcron_available`                                                                                                                                                                                                                                                                                                                                                                                    | **converge-forward (harden `search_path=''`)**                    | Fix-now (Task 6/11).                                                                                                                                       |
| 9.3  | `function_search_path_mutable`                       | WARN      | `public.prevent_mutation`                                                                                                                                                                                                                                                                                                                                                                                       | **converge-forward (harden `search_path=''`)**                    | Fix-now (Task 6/11).                                                                                                                                       |
| 9.4  | `anon_security_definer_function_executable`          | WARN      | `anonymize_user(uuid)`                                                                                                                                                                                                                                                                                                                                                                                          | **revoke**                                                        | Fix-now: `REVOKE EXECUTE FROM anon` (and from `authenticated` unless self-erasure flow confirmed). GDPR erasure must not be REST-callable. HIGH-RISK gate. |
| 9.5  | `anon_security_definer_function_executable`          | WARN      | `auth_institution_id()`                                                                                                                                                                                                                                                                                                                                                                                         | **revoke** (likely)                                               | Confirm: RLS helpers should not be anon-RPC-callable. `REVOKE EXECUTE FROM anon`.                                                                          |
| 9.6  | `anon_security_definer_function_executable`          | WARN      | `auth_user_role()`                                                                                                                                                                                                                                                                                                                                                                                              | **revoke** (likely)                                               | Same as 9.5.                                                                                                                                               |
| 9.7  | `anon_security_definer_function_executable`          | WARN      | `consume_invitation(text)`                                                                                                                                                                                                                                                                                                                                                                                      | **accept** (likely intentional)                                   | Signup flow needs anon. Document + confirm.                                                                                                                |
| 9.8  | `anon_security_definer_function_executable`          | WARN      | `get_invitation_by_token(text)`                                                                                                                                                                                                                                                                                                                                                                                 | **accept** (intentional)                                          | Invitation lookup for signup. Document.                                                                                                                    |
| 9.9  | `anon_security_definer_function_executable`          | WARN      | `is_portfolio_publicly_accessible(uuid)`                                                                                                                                                                                                                                                                                                                                                                        | **accept** (intentional)                                          | Public portfolio access. Document.                                                                                                                         |
| 9.10 | `anon_security_definer_function_executable`          | WARN      | `portfolio_public_access(uuid)`                                                                                                                                                                                                                                                                                                                                                                                 | **accept** (intentional)                                          | Public portfolio access. Document.                                                                                                                         |
| 9.11 | `authenticated_security_definer_function_executable` | WARN      | ~17 fns: `anonymize_user`, `auth_institution_id`, `auth_user_role`, `check_rate_limit_approaching`, `consume_invitation`, `course_material_institution`, `delete_department_if_no_programs`, `get_badge_spotlight`, `get_earn_spend_ratio`, `get_invitation_by_token`, `get_leaderboard`, `get_leaderboard_page`, `get_wellness_aggregate_stats`, `is_portfolio_publicly_accessible`, `portfolio_public_access` | **per-function audit** (mostly accept; `anonymize_user` → revoke) | Task 11: confirm each self-guards; revoke `anonymize_user` from authenticated unless self-erasure flow confirmed.                                          |
| 9.12 | `extension_in_public`                                | WARN      | `vector`                                                                                                                                                                                                                                                                                                                                                                                                        | **defer** (ops)                                                   | Move to `extensions` schema; low priority, may break references.                                                                                           |
| 9.13 | `extension_in_public`                                | WARN      | `citext`                                                                                                                                                                                                                                                                                                                                                                                                        | **defer** (ops)                                                   | Same.                                                                                                                                                      |
| 9.14 | `auth_leaked_password_protection`                    | WARN      | Auth config                                                                                                                                                                                                                                                                                                                                                                                                     | **defer** (ops)                                                   | One-click enable in Auth settings; not a schema gate.                                                                                                      |

> **OPEN DECISION #4 (user, HIGH-RISK):** any DEFINER→INVOKER change (esp. `leaderboard_weekly` view) and the `REVOKE EXECUTE` set (`anonymize_user`, `auth_institution_id`, `auth_user_role`) must be confirmed before applying — could break a definer-privilege-dependent flow or an RLS path that calls the helper as an RPC (Req 9.7 / 8.3). The view rebuild must preserve the anonymity opt-out invariant.

> Performance advisors (Req 10 / Task 12) were **not** run in this Task-1 pass (Task 1 scope = security advisors for Req 9). Task 12 will run `get_advisors(performance)` for the initplan/duplicate-index/FK-index work; the `auth_rls_initplan` set overlaps the §4.2 policy reconciliation.

---

## 8. Consolidated open decisions requiring user input

1. **Profiles constraint direction (Req 4 / Task 4, HIGH-RISK):** adopt migration's nullable `institution_id` + `profiles_institution_required_when_active` CHECK on live, OR amend migration to reproduce live's NOT NULL. Hinges on whether self-signup-without-institution is supported.
2. **Buckets (Req 2.3 / Task 3):** create `reports`+`transcripts` (Option A, recommended) vs consolidate onto `accreditation-reports` (Option B). If A, confirm role-based vs institution-scoped policy shape.
3. **notifications type guard (Req 6 / Task 7):** deploy `notifications_type_check` + `notifications_type_role_guard` to live (converge-forward, constraint/trigger addition) vs drop from repo (converge-replay). Both currently absent on live.
4. **Security DEFINER→INVOKER + grant revokes (Req 9 / Task 11, HIGH-RISK):** confirm the `leaderboard_weekly` invoker rebuild and the `REVOKE EXECUTE` set before applying.

---

## 9. Production-safety confirmation

**READ-ONLY.** This Task-1 pass executed only `execute_sql` SELECT/catalog reads
(`to_regclass`, `to_regproc`, `information_schema.columns`, `pg_constraint`, `pg_proc`,
`pg_policies`, `storage.buckets`, `supabase_migrations.schema_migrations`) plus
`get_advisors(security)`. **No `apply_migration`, no `db push`, no DDL/DML, no file writes to
`supabase/migrations/`, no `src/types/database.ts` regeneration, no production change of any kind.**
The only file written is this investigation document under `.kiro/specs/_investigation/`.

---

## 10. Task 2 — De-duplication execution log (REPLAY-ONLY)

> Executed in Task 2 of `migration-history-reconciliation`. **REPLAY-ONLY**: only local migration FILES on disk were removed. **No production DDL, no `apply_migration`, no `db push`, no live database change of any kind.** Production already recorded the canonical migrations (remote head `20260820100003`) and will not re-run them.

### 10.1 Method & global safety argument

Remote head is `20260820100003_create_teacher_handoff_requests`. Every `20260901*`/`20260902*` file — and the two May-extra duplicates — is an **unrecorded on-disk tail** (none appears in `supabase_migrations.schema_migrations`). For each pair, the **recorded canonical twin replays earlier in the chain and establishes the end-state**; the local-only original only re-asserts that same end-state with idempotent statements (`ADD COLUMN IF NOT EXISTS`, `CREATE TABLE/INDEX IF NOT EXISTS`, `DROP POLICY IF EXISTS … CREATE POLICY`, `CREATE OR REPLACE FUNCTION`, guarded `DO $$ … $$`, `ON CONFLICT`). Therefore removing the local-only original **cannot change the end-state a fresh replay produces**, and **no recorded-history file was edited**. Each original was read and compared against its canonical twin before deletion (per Req 1.1).

### 10.2 Files removed (12) — per-pair equivalence rationale

| Removed (local-only original)                           | Kept (recorded canonical)                                                         | Equivalence rationale                                                                                                                                                                                                                                                                                                                         |
| ------------------------------------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `20260901000001_add_tour_progress_and_theme_preference` | `20260510081412_*`                                                                | Byte-identical body (canonical has one extra trailing `;`). `ADD COLUMN IF NOT EXISTS tour_completed_at, theme_preference` + `DROP/CREATE POLICY profiles_update_own`. Fully idempotent.                                                                                                                                                      |
| `20260901000002_add_handle_new_user_trigger`            | `20260510082038_*`                                                                | Same `CREATE OR REPLACE FUNCTION handle_new_user` baseline body + `DROP/CREATE TRIGGER on_auth_user_created`. Original carried two extra `REVOKE EXECUTE … FROM anon/authenticated` lines (idempotent, and superseded anyway by the join-modes twin `20260510084054`). End-state unchanged.                                                   |
| `20260901000003_tighten_avatars_bucket_policies`        | `20260510082713_*`                                                                | Byte-identical (canonical has extra trailing `;`). `DROP/CREATE POLICY` ×3 + `UPDATE storage.buckets` for avatars. Idempotent.                                                                                                                                                                                                                |
| `20260901000005_create_invitations_table`               | `20260510083245_*`                                                                | Functionally identical: `CREATE TABLE/INDEX IF NOT EXISTS invitations`, `DROP/CREATE POLICY` ×3, `CREATE OR REPLACE` `get_invitation_by_token`/`consume_invitation`, identical REVOKE/GRANT. Canonical is a comment-trimmed copy.                                                                                                             |
| `20260901000006_add_institution_join_modes`             | `20260510084054_*` (+ `20260510084433_*`)                                         | Canonical `20260510084054` is the full migration **including** the `institutions_anon_browse` policy; `20260510084433` is a redundant follow-up re-asserting that same policy (`DROP/CREATE POLICY … USING (true)`). All `ADD COLUMN IF NOT EXISTS`, guarded `DO $$` constraint adds, `CREATE OR REPLACE VIEW/FUNCTION`. End-state identical. |
| `20260901000007_add_language_preference`                | `20260510084927_*`                                                                | Identical statements: `DROP CONSTRAINT IF EXISTS` ×2 + `ALTER COLUMN … SET DEFAULT 'auto'` + `ADD CONSTRAINT profiles_language_preference_check` (fixed name). Re-run safe; end-state identical.                                                                                                                                              |
| `20260901000008_add_rate_limiting_audit`                | `20260510085314_*`                                                                | Functionally identical: `CREATE TABLE/INDEX IF NOT EXISTS rate_limit_events`/`blocked_ips`, `DROP/CREATE POLICY`, `CREATE OR REPLACE check_rate_limit_approaching`, identical REVOKE/GRANT.                                                                                                                                                   |
| `20260902000001_add_realtime_tables`                    | `20260526115401_*` + `20260526115420_*`                                           | Original wraps the two `ALTER PUBLICATION supabase_realtime ADD TABLE …` (student_gamification, challenge_participants) in `IF NOT EXISTS` guards; canonicals do the bare ADD. Same two tables end up on the publication.                                                                                                                     |
| `20260902000002_weekly_goals_unique_constraint`         | `20260526140413_*`                                                                | Identical statements (backfill `UPDATE`, `ALTER COLUMN week_start_date SET NOT NULL`, `CREATE UNIQUE INDEX IF NOT EXISTS uq_weekly_goals_student_week_type`); canonical is single-line. End-state identical.                                                                                                                                  |
| `20260902000003_schema_drift_alignment`                 | `20260526145432_*` + `20260526145454_*` + `20260526145520_*` + `20260526145550_*` | All 5 statements covered: `profiles.email_preferences` (…432), `institution_settings.dynamic_pricing_enabled` (…454), `teams.avatar_letter` + backfill + `tutor_conversations.recommended_persona` (…520), `assignments.rubric_id` FK (…550). All `ADD COLUMN IF NOT EXISTS` + guarded backfill. End-state identical.                         |
| `20260510050000_fix_auth_user_role_infinite_recursion`  | `20260510045956_*`                                                                | Exact-name duplicate. Same `CREATE OR REPLACE` of `auth_user_role()` + `auth_institution_id()` (identical bodies, `SECURITY DEFINER`, `search_path TO 'public'`) + identical GRANTs. The `045956` copy is recorded-canonical; `050000` is the local-only later copy.                                                                          |
| `20260510040000_fix_pgcron_connection_exhaustion`       | `20260520063903_*`                                                                | Equivalent: both unschedule all `cron.job` rows (guarded by extension/regclass check), `DROP MATERIALIZED VIEW IF EXISTS leaderboard_weekly CASCADE`, and `CREATE OR REPLACE VIEW leaderboard_weekly` with the identical SELECT (weekly XP rank). Final end-state (regular view, no cron jobs) identical to live.                             |

### 10.3 Files deliberately KEPT (not pure de-dup)

| Kept file                                                | Reason                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `20260901000004_seed_demo_data`                          | **Guarded no-op seed, no recorded twin.** Reduced to (a) idempotent `ADD COLUMN IF NOT EXISTS` prerequisites and (b) an `INSERT … ON CONFLICT (id) DO NOTHING` of 3 demo institution rows referenced by the test suite slugs. The 680-line full seed body was already removed; the remainder is safe/idempotent and has no canonical twin to de-dup against. Deleting it would drop the demo-institution rows that tests reference (a potential replay end-state change), so per Req 1.5 it is retained as-is. No edit needed. |
| `20260901000009_critical_pre_production_fixes`           | **PARTIAL dup — owned by Task 4.** Its `prevent_profile_privilege_escalation` trigger is recorded (`20260530093213`), BUT its `profiles.institution_id` nullability change + `profiles_institution_required_when_active` CHECK are genuinely undeployed (live is NOT NULL, no CHECK) and are a HIGH-RISK gated decision owned by Task 4. Removing it now could change a fresh replay's end-state (would drop the undeployed CHECK/nullability intent). Left intact for Task 4.                                                 |
| `20260901000010_create_missing_phantom_tables`           | **Genuinely-new schema — owned by Task 3.** Creates `team_gamification`, `student_habit_levels`, `student_habit_level_history`, `fn_track_habit_level_change` + trigger, all absent on live. Not a duplicate.                                                                                                                                                                                                                                                                                                                  |
| `20260901000011_create_student_badges_quiz_clos_storage` | **Genuinely-new schema — owned by Task 3.** Creates `student_badges`, `quiz_clos`, and bucket/storage objects absent on live. Not a duplicate.                                                                                                                                                                                                                                                                                                                                                                                 |

### 10.4 Verification & production-safety confirmation

- Directory re-listed after removals: the `20260901*`/`20260902*` tail now contains ONLY the 4 deliberately-kept files (`…004`, `…009`, `…010`, `…011`). All 12 removed originals are absent.
- All recorded canonical twins remain present and unmodified (`20260510045956/081412/082038/082713/083245/084054/084433/084927/085314`, `20260520063903`, `20260526115401/115420/140413/145432/145454/145520/145550`).
- The `20260903000001_*` Part C duplicate was already absent (confirmed in §6.3 — no action).
- **No production DDL/`apply_migration`/`db push` was run. No recorded-history migration file was edited. No recorded migration's replay end-state was changed.** Docker `db diff` was intentionally NOT run (unreliable here, per the spec); the per-pair content-equivalence argument above is the proof that a fresh replay's end-state is unchanged.

### 10.5 Independent re-verification (this session)

The §10 removals were independently re-verified end-to-end before sign-off:

1. **On-disk state** — `supabase/migrations/` confirmed to contain only the 4 deliberately-kept `20260901*` files (`…004`, `…009`, `…010`, `…011`); all 12 local-only originals absent. Git working tree shows them staged as `D` (deletions), uncommitted. Total chain = 275 files, in correct lexical/chronological order (no ordering breakage).
2. **Remote-history confirmation (READ-ONLY MCP `execute_sql` on `cdlgtbvxlxjpcddjazzx`)** —
   - All 19 recorded canonical twins (`20260510045956/081412/082038/082713/083245/084054/084433/084927/085314`, `20260520063903`, `20260526115401/115420/140413/145432/145454/145520/145550`, `20260530093213`, `20260601110014`) are present in `supabase_migrations.schema_migrations`.
   - None of the 12 removed originals — nor the Part C `20260903000001` — appear in `schema_migrations` (query returned empty). They were genuinely local-only; removal has **zero** production impact.
3. **Content-equivalence proof** — each removed original was recovered from git HEAD and compared (whitespace/comment-normalized) against its canonical twin(s). 5 pairs were exact statement-set supersets. The remaining flagged pairs differed ONLY in cosmetic ways that do not change the replayed end-state:
   - **multi-line vs single-line statements** (`20260902000001` realtime `DO $$…$$` guards, `20260902000002` weekly_goals, `20260902000003` schema-drift `ALTER…ADD COLUMN`, `20260510040000` pgcron `DO $$` guard) — the canonical twins carry the identical `ALTER PUBLICATION` / `ALTER COLUMN SET NOT NULL` / `CREATE UNIQUE INDEX` / `ADD COLUMN IF NOT EXISTS` / matview→view conversion effects (verified by direct file read).
   - **COMMENT text + multi-line VIEW/FUNCTION bodies** (`20260901000006` join_modes: all key objects — `slug`/`allowed_email_domains`/`join_mode`/`status`/`email_verified_at` columns, `institutions_public` view, `institutions_anon_browse` policy, `handle_new_user` upgrade — confirmed PRESENT in the kept twins `20260510084054`+`20260510084433`).
   - **REVOKEs re-applied later** (`20260901000002`: the two `REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon/authenticated` lines are re-asserted by the kept canonical `20260510084054`, which recreates `handle_new_user` and re-applies those exact REVOKEs — end-state identical).
   - **No in-window migration depends on `leaderboard_weekly` being a materialized view** (grep of the `20260510040001`–`20260520063903` window returned no references), so moving the pgcron/matview→view conversion to the recorded `20260520063903` is replay-equivalent.
4. **Docker `db diff` deferred** — per the spec, the Docker replay diff is unreliable here and its re-confirmation is deferred to Task 9. The per-pair content-equivalence argument above is the proof that a fresh replay's end-state is unchanged.

**Production-safety sign-off (this session):** READ-ONLY `execute_sql` SELECTs against `schema_migrations` only. **No `apply_migration`, no `db push`, no DDL/DML, no live database write of any kind. No recorded-history migration file was edited.** Only local-only, unrecorded migration files were removed (replay-only).

---

## 11. Task 4 — `profiles` constraint reconciliation execution log (REPLAY-ONLY)

> Executed in Task 4 of `migration-history-reconciliation`. **REPLAY-ONLY**: only the local
> migration FILE `supabase/migrations/20260901000009_critical_pre_production_fixes.sql` was edited
> (Section 1). **No `apply_migration`, no `db push`, no DDL/DML, no live database write of any
> kind.** Live already matches the target state, so the edit changes only what a fresh replay builds.

### 11.1 Decision

**Decision 1 (CONFIRMED by user): KEEP live `profiles.institution_id` NOT NULL and amend the
migration to match (converge-replay).** Open self-signup-without-institution is NOT a supported
flow, so keeping NOT NULL is safe and every profile remains institution-scoped (downstream RLS via
`auth_institution_id()` stays sound). Per the design principle "live is the source of truth for what
runs; the repo must reproduce it," the repo (migration text) is the side that changes.

### 11.2 Live re-confirmation (READ-ONLY `execute_sql` on `cdlgtbvxlxjpcddjazzx`)

```
information_schema.columns.is_nullable for public.profiles.institution_id  => 'NO'  (NOT NULL)
count(pg_constraint WHERE conname='profiles_institution_required_when_active'
       AND conrelid='public.profiles'::regclass)                            => 0    (absent)
```

Both confirmed — matches §0 / §3. No production change made; reads only.

### 11.3 Edit applied (Section 1 ONLY)

Removed from `20260901000009_critical_pre_production_fixes.sql` Section 1:

| Before (removed)                                                                                                                                                                                                                                      | After                                                             |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `DO $$ … IF EXISTS (…is_nullable='NO') THEN ALTER TABLE public.profiles ALTER COLUMN institution_id DROP NOT NULL; END IF; END $$;`                                                                                                                   | Removed (replaced by SQL-comment documenting Decision 1 / Req 4). |
| `DO $$ … IF NOT EXISTS (…'profiles_institution_required_when_active') THEN ALTER TABLE public.profiles ADD CONSTRAINT profiles_institution_required_when_active CHECK (status='pending_verification' OR institution_id IS NOT NULL); END IF; END $$;` | Removed.                                                          |
| `COMMENT ON CONSTRAINT profiles_institution_required_when_active ON public.profiles IS '…';`                                                                                                                                                          | Removed (constraint no longer created).                           |

The Section-1 body is now a documentation-only comment block recording the decision: live keeps
`institution_id NOT NULL`, the CHECK is intentionally not created, reconciliation honors live as the
source of truth (Decision 1 / Req 4). The header docblock item 1 was updated to match (no longer
claims the constraint is relaxed). A fresh replay now reproduces live (`institution_id` NOT NULL, no
CHECK) with no `db diff` drift on `profiles`.

### 11.4 Scope confirmation — Sections 2/3/4 UNTOUCHED

- **Section 2** (`prevent_profile_privilege_escalation` function + `trg_prevent_profile_privilege_escalation` trigger): byte-for-byte unchanged (owned by the function-body convergence in Task 6 if any drift remains; preserve guard per Req 4.4).
- **Sections 3+4** (`handle_new_user` body): byte-for-byte unchanged. Owned by Task 6 (function-drift convergence to the LIVE deployed body).
- `getDiagnostics` on the edited file: **No diagnostics found** (syntactically well-formed).

### 11.5 Task-6 coupling note (documented, NOT fixed here)

The replayed `handle_new_user` body (Sections 3+4) still contains a `pending_verification` path that
INSERTs a NULL `institution_id` (the `join_mode='open'` branch and the no-`institution_id` `ELSE`
branch both set `final_status := 'pending_verification'` and pass `meta_institution_id` which may be
NULL). With `institution_id` NOT NULL retained on live, that path would fail at INSERT time — but per
Decision 1 it is the **non-supported open-self-signup flow**, so this is acceptable. There is also a
now-stale inline comment inside the `handle_new_user` body (≈ lines 279–282) that still references
the `profiles_institution_required_when_active` CHECK; it was intentionally left as-is because it
lives in the Section 3/4 function body owned by **Task 6**.

**Task 6 (handle_new_user body convergence to live) MUST converge the replayed `handle_new_user`
definition to the LIVE deployed body** so the migration text, the live function, and the retained
NOT NULL constraint are mutually consistent (and to refresh/remove the stale CHECK comment). This
Task-4 edit deliberately did NOT touch `handle_new_user`.

### 11.6 Production-safety sign-off (this session)

READ-ONLY `execute_sql` SELECT against `information_schema.columns` + `pg_constraint` only, plus one
local file edit (Section 1 of `20260901000009`). **No `apply_migration`, no `db push`, no DDL/DML,
no live database write of any kind. No recorded-history migration's replay end-state was changed in
a way that diverges from live — the edit converges the repo TO live.** Docker `db diff` re-confirmation
is deferred to Task 9 per the spec.
