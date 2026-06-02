# Residual `db diff --linked` Drift — Root-Cause & Remediation Analysis

> Senior-dev + QA investigation of the residual `supabase db diff --linked` drift surfaced
> by **Task 8** of the `db-function-search-path-qualification` bugfix.
> **READ-ONLY.** No migrations edited, no DDL run, no production change, nothing pushed/applied.
>
> Authoritative evidence used (all read-only):
>
> - `bugfix.md`, `design.md`, `tasks.md` of `db-function-search-path-qualification`
> - `_investigation/db-function-search-path-findings.md`
> - `_investigation/db-function-search-path-task8-replay-log.md` (Iteration 1)
> - `_investigation/db-function-search-path-preservation-baseline.md`
> - **`supabase/.temp/task8_diff_run10.log`** — the actual captured `db diff` output (2076 lines),
>   which is LATER than the Iteration-1 replay log and shows the loop has since evolved.
> - the 14 unmerged migration files + their `20260510*/20260526*/20260530*` name-twins on disk
> - `src/hooks/*` and `supabase/functions/*` that reference the phantom tables
>
> Linked project: `cdlgtbvxlxjpcddjazzx`.

---

## 0. TL;DR verdict

1. **Category A is only PARTIALLY benign.** The Iteration-1 log lumped "~30 `CREATE OR REPLACE
FUNCTION` re-emits" into one by-design bucket that "clears at Task 10/12". That is **true for
   only ~8 of them** (the 10 in-scope functions that appear, plus the 2 badge fns). The remaining
   **~22 re-emitted functions are OUT of the bugfix's Part C scope and will NOT be cleared by
   Task 10.** They are real shadow-vs-live drift that the old 42883 abort had been masking
   (design root-cause #5). This is the single biggest correction to the Task 8 record.

2. **The `20260901000001`–`08` files are re-timestamped DUPLICATES** of pre-existing
   `20260510*` migrations (and `20260902000001`–`03` duplicate `20260526*` ones). The duplication
   is now _idempotent-safe on replay_ but is a genuine maintenance hazard: the same DDL is applied
   twice on a fresh build, surviving only because every statement is `IF NOT EXISTS` /
   `DROP..CREATE` / `ON CONFLICT`.

3. **The genuinely-new, genuinely-undeployed objects** (the real "Category B") narrow to the
   `20260901000010` + `20260901000011` phantom tables (`student_badges`, `quiz_clos`,
   `team_gamification`, `student_habit_levels`, `student_habit_level_history`, `fn_track_habit_level_change`,
   `reports`/`transcripts` buckets) and the `20260901000009` `profiles` CHECK/nullability change.

4. **App-breakage risk is real and Critical.** Five edge functions hard-query `student_badges` /
   `team_gamification` with no fallback; those tables do not exist on live, so badge awarding,
   onboarding badge grants, team streak/XP, weekly summary, and data-export server paths fail at
   runtime today. (Frontend hooks were defensively patched and degrade quietly; edge functions
   were not.)

5. **Owner:** no spec currently owns deploying/reconciling these 14 migrations.
   `pre-deployment-e2e-audit` would _detect_ the gap (Req 4/5/15 → Critical/Blocker) but does not
   _own the fix_. Recommend a NEW dedicated spec.

6. **The bugfix's "empty diff" acceptance criterion CANNOT be met within its own scope** and must
   be explicitly re-scoped. See §6.

---

## 1. Important state change since the Iteration-1 replay log

The Iteration-1 log (`db-function-search-path-task8-replay-log.md`) describes a `~1498-line`
diff with "13 local migration files `20260901000001`–`20260902000002` … NOT in the remote
migration history". The **actual captured diff is `task8_diff_run10.log`** — i.e. the loop ran at
least 10 iterations after that note. Between Iteration 1 and run 10 the team **re-homed** the
content of the unmerged files into back-dated timestamps to fix ordering:

| Re-homed (back-dated) copy on disk                                                                                            | Original unmerged file (still on disk) |
| ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `20260510081412_add_tour_progress_and_theme_preference.sql`                                                                   | `20260901000001_*`                     |
| `20260510082038_add_handle_new_user_trigger.sql`                                                                              | `20260901000002_*`                     |
| `20260510082713_tighten_avatars_bucket_policies.sql`                                                                          | `20260901000003_*`                     |
| `20260510083245_create_invitations_table.sql`                                                                                 | `20260901000005_*`                     |
| `20260510084054_add_institution_join_modes.sql` (+ `20260510084433_add_institutions_anon_browse_policy.sql`)                  | `20260901000006_*`                     |
| `20260510084927_add_language_preference.sql`                                                                                  | `20260901000007_*`                     |
| `20260510085314_add_rate_limiting_audit.sql`                                                                                  | `20260901000008_*`                     |
| `20260530093213_add_profiles_portfolio_sharing_permitted_and_protect.sql` (re-creates `prevent_profile_privilege_escalation`) | `20260901000009_*` (partial)           |
| `20260526115401/115420_*` (realtime)                                                                                          | `20260902000001_*`                     |
| `20260526140413_add_weekly_goals_unique_constraint.sql`                                                                       | `20260902000002_*`                     |
| `20260526145432/145454/145520/145550_*` (email_prefs, dynamic_pricing, avatar_letter+persona, rubric_id)                      | `20260902000003_*`                     |

**Proof of copy direction:** every `20260510*` twin still carries the original's header comment
(e.g. `20260510081412_*` opens with `-- 20260901000001_add_tour_progress_and_theme_preference.sql`),
so the `20260510*` files were created by copying the `20260901*` originals to a back-dated name —
not the other way around. The originals were **left in place**, so both run on a fresh replay.

`run10` shows the consequence: e.g. `Applying migration 20260901000001…` logs
`column "tour_completed_at"/"theme_preference" of relation "profiles" already exists, skipping`
because `20260510081412` already created them. Idempotency saves the replay; the duplication is
still a defect (two files, one truth).

This re-homing is **outside Part B's documented charter** (42883 ordering + badge qualification +
`social_challenges`). It was a pragmatic ordering fix performed inside the Task 8 loop, but it
introduced 11+ duplicate migration files that should be reconciled (delete the originals or the
copies — see §7).

---

## 2. Category A — function re-emits: VERIFY & DEEPEN

`run10` re-emits **~30** `CREATE OR REPLACE FUNCTION` statements (diff direction
shadow(local) → live; each printed body is the **LIVE** target the shadow must become — i.e. each
is a function whose shadow definition ≠ live definition).

### 2.1 In-scope (TRUE Category A — clears at Task 10/12) — 8 functions

| Function                                | Why it is in the diff                                                                                          | Clears at                                                  |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `badge_auto_archive`                    | shadow hardened+qualified (Part B Task 5.6); live still mutable + `UPDATE badges` unqualified                  | Task 10 (Part C hardens on prod) → Task 12                 |
| `badge_spotlight_auto_rotate`           | shadow hardened+qualified (Part B Task 5.5); live still mutable + unqualified                                  | Task 10 → Task 12                                          |
| `get_wellness_aggregate_stats`          | live body drifted (SEC DEFINER/plpgsql, unqualified `auth_institution_id()`); shadow not yet qualified on prod | Task 10 → Task 12                                          |
| `enforce_max_active_challenges`         | shadow qualified `public.social_challenges` (Part B 5.3); live unqualified                                     | Task 10 → Task 12                                          |
| `sync_tutor_conversation_stats`         | shadow qualified `public.tutor_conversations` (Part B 5.4); live unqualified                                   | Task 10 → Task 12                                          |
| `validate_sub_clo_weights`              | shadow qualified `public.learning_outcomes` (Part B 5.1); live unqualified                                     | Task 10 → Task 12                                          |
| `set_tutor_conversations_updated_at`    | shadow gained `search_path=''` in CREATE (Part B 5.4); live differs                                            | Task 10 (only if Part C also re-emits it — see SURPRISE-2) |
| `update_graduate_attributes_updated_at` | shadow gained `search_path=''` in CREATE (Part B 5.2); live differs                                            | same caveat                                                |

For these, the "clears at Task 10/12" claim **holds** — once the Part C forward migration
`CREATE OR REPLACE`s them on production with the same qualified body the shadow has, shadow and
live converge.

### 2.2 SURPRISE-1 — ~22 OUT-OF-SCOPE function re-emits that Task 10 will NOT clear

These are re-emitted in `run10` but are **not in the bugfix's 10-function Part C list**, so
Task 10 does not touch them and they will remain in the diff after Task 10:

Deployment-gap functions (defined by the unmerged migrations; clear only when the gap is
reconciled AND the migration text matches live byte-for-byte):

- `handle_new_user` (20260901000002/06/09 + re-homed twins)
- `get_invitation_by_token`, `consume_invitation` (invitations migration)
- `check_rate_limit_approaching` (rate-limiting migration)
- `prevent_profile_privilege_escalation` (critical_pre_production_fixes / 20260530093213)
- `fn_track_habit_level_change` (phantom-tables migration; diff DROPs it — see §4)

Independent historical drift (older functions, in remote history, but live ≠ migration text —
the out-of-band hardening of root-cause #4 generalised to many functions, previously masked by
the 42883 abort = root-cause #5):

- `auth_institution_id`, `auth_user_role` (RLS helpers; live carries `SET search_path TO 'public'`)
- `anonymize_user`, `emit_notification`, `trigger_attainment_rollup`
- `trg_badge_earned_notify`, `trg_grade_released_notify`, `trg_new_assignment_notify`,
  `trg_outcome_attainment_drop_notify`, `trg_pending_approval_notify`
- `get_leaderboard_page`, `get_xp_transactions_page`
- `is_portfolio_publicly_accessible`, `portfolio_public_access`
- `rls_auto_enable`, `is_pgcron_available`, `prevent_mutation`

**Conclusion on the Iteration-1 assertion:** the statement _"Category A … ~30 re-emits … clears
at Task 10/12"_ is **overbroad and INCORRECT for ~22 of the ~30**. It is correct only for the
~8 in-scope functions. The remaining ~22 are downstream drift surfaced now that the replay
completes past the old abort, exactly as design §"Hypothesized Root Cause" #5 warned ("additional
ordering or drift failures may exist past that point and can only be found by iterating the
replay after the abort is removed"). The Task 8 loop discovered them but the log mislabelled them
benign.

### 2.3 SURPRISE-2 — Part B did NOT accidentally change these

Important for blame-assignment: Part B's edits touched only `20260504032936` (removed 5 ALTERs),
the 5 function CREATEs (Task 5), the 2 badge cron files (5.5/5.6), and `social_challenges`
(Task 7). **None of those touch** `auth_institution_id`, `auth_user_role`, `anonymize_user`,
`emit_notification`, the five `trg_*_notify` functions, `trigger_attainment_rollup`,
`get_leaderboard_page`, `get_xp_transactions_page`, the portfolio helpers, `rls_auto_enable`,
`is_pgcron_available`, or `prevent_mutation`. So Part B is **not** the cause of their re-emit —
they are pre-existing live↔migration drift. (`is_pgcron_available` and `prevent_mutation` are also
on the known advisor `function_search_path_mutable` backlog per findings.md / clause 1.12, which
is explicitly _out of scope_ for this bugfix.)

### 2.4 Category A verdict

- **Benign / by-design:** the 8 in-scope re-emits (§2.1). VERIFIED — they encode exactly the
  `public.`-qualification (+ the two badge `search_path=''` additions) and nothing else; no
  surprise object among them.
- **NOT benign for this gate:** the ~22 out-of-scope re-emits (§2.2). They block an empty diff and
  are owned by neither Part C nor Part B. They must be handled by the deployment-gap reconciliation
  (the gap-defined ones) and a broader function-drift reconciliation (the historical ones), OR the
  acceptance gate must be explicitly relaxed to exclude them (§6).

---

## 3. Category B — deployment gap: duplicate-vs-new determination

### 3.1 The 14 unmerged files (remote history ends at `20260820100003`; none of these are recorded)

The Iteration-1 log listed **13** files and omitted the 14th, `20260902000003_schema_drift_alignment.sql`.
It is now included below.

| #   | File                                                     | Category                                                       | Objects it builds                                                                                                                                                       | Exist on live?                                                                                  | In remote history? |
| --- | -------------------------------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------ |
| 1   | `20260901000001_add_tour_progress_and_theme_preference`  | (a) duplicate of `20260510081412`                              | `profiles.tour_completed_at`, `theme_preference`; `profiles_update_own` policy                                                                                          | YES                                                                                             | NO                 |
| 2   | `20260901000002_add_handle_new_user_trigger`             | (a) dup of `20260510082038` + (d)                              | `handle_new_user()`, `on_auth_user_created` trigger                                                                                                                     | YES                                                                                             | NO                 |
| 3   | `20260901000003_tighten_avatars_bucket_policies`         | (a) dup of `20260510082713` + (d) security                     | avatars INSERT/UPDATE/DELETE storage policies; 2 MB/mime bucket limits                                                                                                  | YES                                                                                             | NO                 |
| 4   | `20260901000004_seed_demo_data`                          | (c) data seed (GUC-gated no-op)                                | 3 demo institutions (idempotent); idempotent column adds                                                                                                                | cols YES; demo insts not required on prod                                                       | NO                 |
| 5   | `20260901000005_create_invitations_table`                | (b) new table + (a) dup of `20260510083245`                    | `invitations`, `get_invitation_by_token`, `consume_invitation`                                                                                                          | YES (hand-applied)                                                                              | NO                 |
| 6   | `20260901000006_add_institution_join_modes`              | (a) dup of `20260510084054` + (d)                              | `institutions.slug/join_mode/allowed_email_domains`, `profiles.status/email_verified_at`, `institutions_public` view, `handle_new_user` upgrade                         | YES                                                                                             | NO                 |
| 7   | `20260901000007_add_language_preference`                 | (a) dup of `20260510084927`                                    | `profiles.language_preference` default/CHECK normalisation                                                                                                              | YES                                                                                             | NO                 |
| 8   | `20260901000008_add_rate_limiting_audit`                 | (a) dup of `20260510085314` + (d)                              | `rate_limit_events`, `blocked_ips`, `check_rate_limit_approaching()`                                                                                                    | YES (hand-applied)                                                                              | NO                 |
| 9   | `20260901000009_critical_pre_production_fixes`           | (d) security/RLS; partial dup of `20260530093213`              | `profiles.institution_id` → nullable; `profiles_institution_required_when_active` CHECK; `prevent_profile_privilege_escalation` + trigger; `handle_new_user` hardening  | MIXED: trigger YES (hand-applied); CHECK **NO**; `institution_id` is still **NOT NULL** on live | NO                 |
| 10  | `20260901000010_create_missing_phantom_tables`           | (b) genuinely NEW                                              | `student_habit_levels`, `student_habit_level_history`, `team_gamification`, `teams.avatar_letter`, `fn_track_habit_level_change` + trigger                              | tables **NO**; `teams.avatar_letter` YES                                                        | NO                 |
| 11  | `20260901000011_create_student_badges_quiz_clos_storage` | (b) genuinely NEW + (d) storage                                | `student_badges`, `quiz_clos`, `reports`+`transcripts` buckets + policies                                                                                               | **NO**                                                                                          | NO                 |
| 12  | `20260902000001_add_realtime_tables`                     | (e) realtime/publication + (a) dup of `20260526115401/115420`  | `student_gamification` + `challenge_participants` on `supabase_realtime`                                                                                                | YES (published)                                                                                 | NO                 |
| 13  | `20260902000002_weekly_goals_unique_constraint`          | (b)/(d) constraint + (a) dup of `20260526140413`               | `uq_weekly_goals_student_week_type`; `week_start_date` NOT NULL                                                                                                         | YES (hand-applied; file says so)                                                                | NO                 |
| 14  | `20260902000003_schema_drift_alignment`                  | (d) schema alignment + (a) dup of `20260526145432/454/520/550` | `profiles.email_preferences`, `institution_settings.dynamic_pricing_enabled`, `teams.avatar_letter`, `tutor_conversations.recommended_persona`, `assignments.rubric_id` | YES (hand-applied; file says so)                                                                | NO                 |

Legend: (a) duplicate/idempotent on live, (b) genuinely new schema not on live, (c) data seed,
(d) security/RLS fix, (e) realtime/publication change.

### 3.2 Duplicate-vs-new determination

- **Files 1,2,3,5,6,7,8,12,13,14 are DUPLICATES** (re-timestamped copies). Their content was
  re-homed to `20260510*/20260526*` slots and (per the diff) the objects already exist on live —
  so replaying them is idempotent and they cause **no residual drift** after re-homing. The defect
  they represent is _file duplication_, not schema drift.
- **File 4** is a gated no-op seed (idempotent institution rows) — harmless, not a drift source.
- **File 9** is PART duplicate (its `prevent_profile_privilege_escalation` trigger was hand-applied
  to live and re-homed to `20260530093213`) and PART genuinely-undeployed: the
  `profiles_institution_required_when_active` CHECK and the `institution_id DROP NOT NULL` were
  **never applied to live** — the diff reverts them (`alter table profiles alter column
institution_id set not null;` and `drop constraint profiles_institution_required_when_active`).
- **Files 10 and 11 are GENUINELY NEW and GENUINELY UNDEPLOYED.** This is the true Category-B core.
  The `run10` diff DROPs exactly these objects (shadow has them, live does not):
  `drop table quiz_clos, student_badges, student_habit_level_history, student_habit_levels,
team_gamification`; `drop function fn_track_habit_level_change()`; plus their PKs, FKs, CHECKs,
  unique keys, indexes, RLS policies, and 105 `revoke` lines (7 privileges × 3 roles × 5 tables).
  The `reports`/`transcripts` buckets + policies from file 11 are likewise shadow-only.

### 3.3 Additional residual drift in `run10` not attributable to the 14 files

The diff also drops a set of policies/triggers/constraints that indicate **further independent
live↔migration drift** (again unmasked by the completed replay):

- triggers: `trg_notifications_type_role_guard` on `notifications`; (and `trg_track_habit_level_change` — from file 10)
- `notifications_type_check` constraint dropped; `notifications_type_role_guard()` function dropped
- policies dropped on `habit_logs` (×5), `notifications` (×3), `onboarding_progress` (×1),
  `badge_spotlight_schedule` (×2: `all_read_spotlight`, `admin_manage_spotlight`),
  `invitations` (`staff_read_invitations`), `audit_findings`, `audit_runs`
- `notifications_user_unread_idx` index dropped

These are neither the 14 files nor the function bodies; they are policy/constraint drift that the
deployment-gap spec (or a dedicated drift-reconciliation effort) must also resolve to reach a truly
empty diff. They are **out of the bugfix's scope**.

---

## 4. App-breakage / release-readiness risk

**Frontend (degrades quietly — was defensively patched):**

- `src/hooks/useStudentHabitLevel.ts` short-circuits to Level 4 and an empty history, with an
  explicit comment that the tables "have not been applied to production".
- `src/hooks/useHeatmapData.ts` queries `student_habit_level_history as never` inside a `try`
  with no throw on failure.
- `src/hooks/useTeams.ts` reads XP/streak from `teams` directly and documents that
  `team_gamification` "does not exist in production".

So the **client** will not crash on the missing tables.

**Edge functions (HARD failures — NOT guarded):** these query the missing tables directly and
will error at runtime in production:

| Edge function              | Missing table referenced                                              | Guarded?                                  | Production impact                                           |
| -------------------------- | --------------------------------------------------------------------- | ----------------------------------------- | ----------------------------------------------------------- |
| `check-badges`             | `student_badges` (select+insert), `team_gamification` (select+update) | NO                                        | Badge awarding + team badges fail; gamification core broken |
| `process-onboarding`       | `student_badges` (upsert)                                             | NO                                        | Onboarding badge grants fail                                |
| `export-student-data`      | `student_badges` (select)                                             | NO                                        | GDPR/data-export path errors                                |
| `weekly-summary-cron`      | `student_badges` (count)                                              | NO                                        | Weekly summary cron fails (Req 15 → Critical)               |
| `process-streak`           | `team_gamification` (select/upsert/update)                            | NO                                        | Team streak + team XP broken                                |
| `team-streak-risk-cron`    | `team_gamification` (select)                                          | NO                                        | Team streak-risk cron fails (Req 15 → Critical)             |
| `select-adaptive-question` | `quiz_clos` (select)                                                  | **YES** (falls back to `quizzes.clo_ids`) | Degrades gracefully                                         |

**Risk rating (against `pre-deployment-e2e-audit` Severity_Ladder):** **Blocker/Critical.**

- Req 4.7: "IF any hook references a backend endpoint that does not exist … at least **Critical**."
- Req 15.4: a Cron_Endpoint returning non-success → at least **Critical**.
- Req 5.7 / 8.8: RLS/gamification correctness failures → **Blocker**/**Critical**.

Because multiple server paths (badges, team gamification, two crons, data export) reference
tables that **do not exist on live**, the platform's gamification + accreditation export are
silently broken server-side **today**. This is a No-Go condition under Go_No_Go_Matrix Req 16.3/16.4
until either the tables are deployed (files 10/11) or the edge functions are hardened with the
same defensive guards the frontend already has.

> Caveat (read-only honesty): I confirmed the table references statically and confirmed via the
> diff + Iteration-1 live check that the tables are absent on live. I did **not** invoke the edge
> functions, so the exact error surface (PGRST205 vs 42P01 vs swallowed) is inferred, not observed.

---

## 5. Owner spec for closing the gap

- The duplicated migrations (files 1–3,5–8) are authored for **`ui-consistency-global-fixes`**
  (their headers cite that spec's ADR-01..16). File 9's privilege-escalation logic is referenced
  by **`student-experience-remediation`** (its design extends the `critical_pre_production_fixes`
  trigger). The phantom tables (files 10/11) trace to **`edeviser-platform`** (canonical
  `team_gamification`, `student_badges`, `student_habit_levels` definitions),
  **`xp-marketplace`** (`student_badges.tier`), and **`habit-heatmap`** (`student_habit_levels`).
- **`pre-deployment-e2e-audit` does NOT own deploying these.** Its `tasks.md` explicitly states
  "Schema/migration changes go through Supabase MCP `apply_migration`, never manual edits to
  `supabase/migrations/`" and it is a _verification gate_ — it would **detect** the gap as
  Critical/Blocker findings (Req 4/5/15) but contains no task to deploy the backlog or reconcile
  the remote migration history.
- **No existing spec owns "deploy + record these 14 migrations and reconcile the remote history".**

**Recommendation:** create a NEW dedicated spec — e.g. `migration-history-reconciliation`
(a.k.a. `production-deployment-reconciliation`) — that owns: (a) de-duplicating the re-homed files,
(b) deploying files 9/10/11 to production, (c) recording the full local chain into
`supabase_migrations.schema_migrations`, and (d) reconciling the §3.3 policy/constraint drift and
the §2.2 function-body drift. This is distinct from the bugfix.

---

## 6. Can the bugfix's "empty diff" acceptance criterion be met within its own scope?

**No.** `bugfix.md` Acceptance requires `supabase db diff --linked` to COMPLETE **and report an
empty/clean diff**. The bugfix's own Tasks 5–17:

- fix the 42883 abort ✔ (`run10` completes, exit 0),
- reconcile `social_challenges` ✔ (no `social_challenges` table drift in `run10`),
- qualify the 10 functions on prod (Task 10, Part C) — which clears only the ~8 in-scope re-emits.

They do **not** and **cannot** clear:

- the ~22 out-of-scope function re-emits (§2.2),
- the genuinely-undeployed phantom tables + file-9 CHECK (§3.2),
- the §3.3 policy/constraint/trigger drift,
  without doing work the bugfix forbids itself (no `db push`/`apply_migration` of the backlog; no
  deleting legitimate forward migrations).

**Therefore the criterion must be explicitly RE-SCOPED.** Two options:

- **Option 1 (recommended): relax the bugfix gate.** Redefine "done" for
  `db-function-search-path-qualification` as: _`db diff --linked` COMPLETES with no abort; the
  ONLY residual diff is the by-design pre-Part-C qualification delta for the 10 in-scope functions
  (which Task 12 confirms cleared after Part C); `social_challenges` shows no drift; all 10
  functions probe OK under `search_path=''`; advisor clean on the two badge fns._ Everything else
  (the deployment gap, the ~22 out-of-scope function re-emits, the §3.3 drift) is explicitly
  carved out to the new reconciliation spec. Update `bugfix.md` Acceptance + Task 12's stop
  condition accordingly.
- **Option 2: make the bugfix depend on the reconciliation spec.** Block Task 12 until the new
  spec has deployed files 9/10/11, de-duplicated the re-homed files, and reconciled the function +
  policy drift, so that a genuinely-empty diff is achievable. Higher coupling; not recommended for
  a focused bugfix.

---

## 7. Proposed task list (senior-dev + QA)

> Distinguishes tasks that belong to **THIS bugfix** vs a **separate reconciliation spec**.
> This is a PROPOSAL only — `tasks.md` is NOT modified by this investigation.

### A. Belongs to `db-function-search-path-qualification` (this bugfix)

- [ ] A1. **Re-scope the acceptance criterion** (Option 1, §6). Edit `bugfix.md` Acceptance and
      Task 8/Task 12 stop-conditions so "empty diff" means "empty **except** the carved-out
      deployment-gap + out-of-scope function/policy drift". (depends on: user decision)
- [ ] A2. **Complete Task 10 (Part C)** — ship the new forward migration that `CREATE OR REPLACE`s
      the 10 in-scope functions on production (bodies from `pg_get_functiondef`, then
      `public.`-qualified, `search_path=''`, security/volatility/owner/grants preserved). File
      does not yet exist on disk (`20260903000001_*` not found). (depends on: A1; Tasks 5–9 ✔)
- [ ] A3. **Task 11/13 probes + advisor** — re-run the 10 function probes under `search_path=''`
      and the advisor on the 2 badge fns. (depends on: A2)
- [ ] A4. **Task 12 (re-scoped)** — re-run `db diff --linked`; assert it completes and the only
      residual function delta is the 8 in-scope re-emits now cleared by A2; document the carved-out
      remainder as belonging to the reconciliation spec. (depends on: A2, A1)
- [ ] A5. **Task 14 preservation** — re-run the §1/§2 baseline snapshots from
      `db-function-search-path-preservation-baseline.md`; assert catalog + golden-value equality.
      (depends on: A2)
- [ ] A6. **QA: correct the Task 8 replay log** — annotate
      `db-function-search-path-task8-replay-log.md` so the "Category A clears at Task 10/12" claim
      is scoped to the 8 in-scope functions and the ~22 out-of-scope re-emits are reclassified as
      the new spec's responsibility. (depends on: this analysis)

### B. Belongs to a NEW `migration-history-reconciliation` spec (separate effort)

- [ ] B1. **De-duplicate the re-homed migrations.** Decide canonical home for each duplicated pair
      (§1 table) and remove the redundant file (the `20260901*/20260902*` originals, keeping the
      back-dated `20260510*/20260526*/20260530*` copies, since those fix ordering). Verify a fresh
      `db diff` still completes. (READ-WRITE on migration files; replay-only) (depends on: —)
- [ ] B2. **Reconcile `profiles` (file 9).** Decide whether live should adopt
      `institution_id` nullable + `profiles_institution_required_when_active` CHECK (needed for
      open self-signup) or whether the migration should be amended to match live. Apply via
      `apply_migration` if live should change. (HIGH-RISK: touches a core constraint — confirm
      with user) (depends on: B1)
- [ ] B3. **Deploy phantom tables (files 10/11)** to production via `apply_migration`:
      `student_habit_levels`, `student_habit_level_history`, `team_gamification`, `student_badges`,
      `quiz_clos`, `fn_track_habit_level_change` + trigger, `reports`/`transcripts` buckets +
      policies. Regenerate `src/types/database.ts` via `pwsh scripts/regen-types.ps1`.
      (MEDIUM-RISK: new tables, additive) (depends on: B1)
- [ ] B4. **Harden the edge functions** that hard-query the phantom tables
      (`check-badges`, `process-onboarding`, `export-student-data`, `weekly-summary-cron`,
      `process-streak`, `team-streak-risk-cron`) — either guard like the frontend OR make B3 a hard
      prerequisite + redeploy. (depends on: B3) — _parallelizable with B3 if guards are added._
- [ ] B5. **Reconcile §3.3 policy/constraint/trigger drift** (`notifications_type_check`,
      `notifications_type_role_guard`, `habit_logs`/`notifications`/`onboarding`/`badge_spotlight`/
      `invitations`/`audit_*` policies) so shadow = live. (depends on: B1)
- [ ] B6. **Reconcile the ~22 out-of-scope function-body drifts** (§2.2 historical set:
      `auth_*`, `anonymize_user`, `emit_notification`, the `trg_*_notify`, `trigger_attainment_rollup`,
      `get_leaderboard_page`, `get_xp_transactions_page`, portfolio helpers, `rls_auto_enable`,
      `is_pgcron_available`, `prevent_mutation`). For each, decide source of truth (live vs
      migration) and converge. (depends on: B1)
- [ ] B7. **Record the full local chain** into `supabase_migrations.schema_migrations` and run
      `supabase migration list --linked` to confirm local = remote head. (depends on: B2–B6)
- [ ] B8. **Final gate:** `db diff --linked` reports a genuinely empty/clean diff; rerun the
      `pre-deployment-e2e-audit` connectivity + RLS + cron-health layers (Req 4/5/15) and confirm
      no Blocker/Critical from missing tables. (depends on: B2–B7)

### Cross-spec dependency

```
A1 ──► A2 ──► A3
        └───► A4 (re-scoped empty-diff gate for THIS bugfix)
        └───► A5
A6 (doc correction, parallel)

B1 ──► B2,B3,B5,B6 ──► B7 ──► B8 (true empty diff)
        B3 ──► B4
```

This bugfix can complete (A1–A6) **independently**; the genuinely-empty diff and the app-breakage
fix are deferred to the B-track reconciliation spec.

---

## 8. Production-safety confirmation for this investigation

- READ-ONLY. No migration files edited; no `apply_migration`/`db push`; no DDL/DML against
  production. Evidence came from reading repo files + the previously-captured `task8_diff_run10.log`.
- The one CLI call attempted (`supabase migration list --linked`, read-only) timed out and was not
  relied upon; the remote-history conclusions rest on the `run10` diff (which the CLI produced by
  comparing the linked live DB) and the Iteration-1 live read-only checks.
