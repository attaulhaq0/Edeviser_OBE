# Task 8 — Iterative Replay Loop Log

> Spec: `db-function-search-path-qualification` (bugfix), Task 8 (Wave 4).
> Goal: drive `npx supabase db diff --linked` to a clean/empty diff, fixing each
> newly-surfaced abort/drift on disk (replay-only; **no production DDL**).
> Environment: Docker 29.2.1, Supabase CLI 2.102.0, linked project `cdlgtbvxlxjpcddjazzx`,
> CLI authenticated (SUPABASE_ACCESS_TOKEN present). 286 local migration files.

## Iteration 1

**Command:** `npx supabase db diff --linked`
**Result:** COMPLETES, exit 0 — **no abort**. Non-empty diff (~1498 lines / ~50 KB).

### Wins confirmed by this run

- **42883 abort GONE.** The replay proceeds past `20260504032936_fix_mutable_search_paths.sql`
  with no `could not find a function named "public.validate_sub_clo_weights"` error.
  → Task 6 (remove the 5 too-early ALTERs) is effective on a clean replay.
- **`social_challenges` drift RESOLVED.** The only `social_challenges` token left in the diff is
  inside the `enforce_max_active_challenges` function **body** (`FROM social_challenges`), not any
  `CREATE TABLE` / `ALTER TABLE` / column drift. No "does not exist, skipping" notices.
  → Task 7 (table reconciliation) is effective.

### Diff direction

The diff is **shadow(local-migrations) → live**: it lists the DDL that would transform the
replayed shadow schema INTO the live schema. Confirmed empirically (read-only against live):

- diff says `alter ... profiles.institution_id set not null` ⇒ live IS `NOT NULL`.
- diff recreates `badge_auto_archive`/`badge_spotlight_auto_rotate` **without** `search_path` ⇒
  live `proconfig IS NULL` (mutable) on both.

### Residual diff — categorized

**Category A — EXPECTED, by-design; clears only at Task 10 (Part C) / verified at Task 12.**
`db diff` re-emits ~30 `CREATE OR REPLACE FUNCTION` statements with the **LIVE (unqualified)**
bodies because Part B (Tasks 5/5.5/5.6) qualified those bodies **in the shadow** while production
still runs the unqualified bodies. This includes the in-scope set
(`validate_sub_clo_weights`, `enforce_max_active_challenges`, `sync_tutor_conversation_stats`,
`get_wellness_aggregate_stats`, `badge_auto_archive`, `badge_spotlight_auto_rotate`,
`set_tutor_conversations_updated_at`, `update_graduate_attributes_updated_at`).
This delta is structurally **impossible to clear by replay-only edits** — it closes when the
Part C forward migration (Task 10) qualifies the functions **on production** too. The spec
reserves the empty-diff-on-functions gate for **Task 12** ("after Task 10's forward migration is
also in the chain").

**Category B — OUT OF SCOPE deployment gap (the dominant, blocking drift).**
13 local migration files exist on disk but are **NOT** in the remote migration history
(remote history ends at `20260820100003`; these are unrecorded):

```
20260901000001_add_tour_progress_and_theme_preference
20260901000002_add_handle_new_user_trigger
20260901000003_tighten_avatars_bucket_policies
20260901000004_seed_demo_data
20260901000005_create_invitations_table
20260901000006_add_institution_join_modes
20260901000007_add_language_preference
20260901000008_add_rate_limiting_audit
20260901000009_critical_pre_production_fixes
20260901000010_create_missing_phantom_tables
20260901000011_create_student_badges_quiz_clos_storage
20260902000001_add_realtime_tables
20260902000002_weekly_goals_unique_constraint
```

The shadow replays them (creating tables/buckets/constraints); production never received most of
them, so the diff wants to DROP/REVOKE all of it. Confirmed against live (read-only):

| object built by the unmerged migrations                | exists on live?                |
| ------------------------------------------------------ | ------------------------------ |
| table `quiz_clos`                                      | NO                             |
| table `student_badges`                                 | NO                             |
| table `student_habit_level_history`                    | NO                             |
| table `student_habit_levels`                           | NO                             |
| table `team_gamification`                              | NO                             |
| function `fn_track_habit_level_change`                 | NO                             |
| bucket `reports` / `transcripts`                       | NO                             |
| constraint `profiles_institution_required_when_active` | NO                             |
| `teams.avatar_letter` column                           | YES (hand-applied out-of-band) |
| trigger `trg_prevent_profile_privilege_escalation`     | YES (hand-applied out-of-band) |

So these migrations were **partially hand-applied** to live and never recorded. This accounts for
the bulk of the diff: 5 `drop table`, 20 `drop constraint`, 15 `drop index`, 32 `drop policy`,
105 `revoke` (7 privileges × 3 roles × 5 phantom tables), 12 `create policy`, 2 `drop trigger`,
2 `drop function`, plus the `profiles`/`notifications` constraint deltas and the storage-bucket
policies.

### Why the loop cannot reach an empty diff here (scope boundary)

- Category A only clears after **Task 10 (production forward migration)** — not a Task 8 edit.
- Category B is a **deployment gap**, not an ordering/drift defect in this bugfix's charter
  (Part B = the 42883 ordering + badge qualification + `social_challenges`). Forcing an empty
  diff would require either (a) applying the 13 migrations to production (**forbidden** here:
  no `db push`/`apply_migration`; also a different spec — see `pre-deployment-e2e-audit`), or
  (b) deleting/neutering legitimate forward migrations (would remove phantom tables the app code
  references and the pre-production security fixes — wrong and app-breaking).

**Conclusion:** Task 8's two in-charter objectives are met (no abort; `social_challenges`
reconciled) and the previously-"unknown downstream drift" (design root-cause #5) has been
discovered and precisely characterized: it is a 13-migration deployment gap that is out of this
bugfix's replay-only scope, plus the by-design pre-Part-C function-qualification delta. A fully
empty diff is not reachable by replay-only edits at Wave 4 and requires a user decision.

---

## Correction / Re-scope addendum — 2026-06-01

> Added by `db-function-search-path-qualification` Task 19.2 (A-track re-scope reconciliation).
> The original Iteration-1 log above is **left intact**; this section corrects and narrows its
> "Category A" claim and reassigns ownership of the residual drift.
> Authoritative source for this correction:
> `#[[file:.kiro/specs/_investigation/db-function-search-path-residual-drift-analysis.md]]`
> (senior-dev + QA analysis of the captured `supabase/.temp/task8_diff_run10.log`, which is a
> LATER run than the Iteration-1 diff this log was originally written against).

### (a) Scope the "Category A clears at Task 10/12" claim to the IN-SCOPE functions only

The Iteration-1 "Category A" bucket above lumped **~30** `CREATE OR REPLACE FUNCTION` re-emits
into one by-design group that "clears only at Task 10 (Part C) / verified at Task 12." **That is
correct for ONLY the in-scope functions, not all ~30.** The residual-drift analysis (§2.1) pins
the genuinely by-design, Part-C-clearing set to **12 distinct functions**:

- the **10 in-scope Part C functions** — `get_effective_price`, `get_xp_balance`,
  `get_wellness_aggregate_stats`, `seed_marketplace_items`, `delete_department_if_no_programs`,
  `validate_sub_clo_weights`, `enforce_max_active_challenges`, `sync_tutor_conversation_stats`,
  `badge_auto_archive`, `badge_spotlight_auto_rotate` (the last two badge functions are part of
  this 10, not a separate pair), **plus**
- the **2 Part-B-reordered runtime-safe trigger functions** — `set_tutor_conversations_updated_at`
  and `update_graduate_attributes_updated_at` (they gained `SET search_path = ''` in their CREATEs
  via Part B Tasks 5.2 / 5.4; they re-emit only because the shadow CREATE now differs from the
  still-mutable live definition, and they converge once Part C ships).

For these 12, the original "clears at Task 10/12" statement **holds**: when the Part C forward
migration `CREATE OR REPLACE`s the in-scope functions on production with the same qualified/
hardened bodies the shadow has, shadow and live converge and they drop out of the diff.

### (b) Reclassify the ~22 OUT-OF-SCOPE re-emits + phantom-table/policy/constraint drift

The remaining **~22** re-emitted functions in `run10` are **NOT** in this bugfix's Part C list, so
**Task 10 does not touch them and Task 12 will NOT clear them.** They are pre-existing
live↔migration drift that the old `42883` abort had been masking (design root-cause #5), now
surfaced because the replay completes. They are the responsibility of the new
**`migration-history-reconciliation`** spec, **not** this bugfix:

- **Deployment-gap functions** (defined by the 14 unmerged/duplicated migration files; clear only
  when the gap is reconciled and recorded): `handle_new_user`, `get_invitation_by_token`,
  `consume_invitation`, `check_rate_limit_approaching`, `prevent_profile_privilege_escalation`,
  `fn_track_habit_level_change`.
- **Independent historical function-body drift** (older functions in remote history whose live
  body ≠ migration text): `auth_institution_id`, `auth_user_role`, `anonymize_user`,
  `emit_notification`, `trigger_attainment_rollup`, the five `trg_*_notify` functions
  (`trg_badge_earned_notify`, `trg_grade_released_notify`, `trg_new_assignment_notify`,
  `trg_outcome_attainment_drop_notify`, `trg_pending_approval_notify`), `get_leaderboard_page`,
  `get_xp_transactions_page`, `is_portfolio_publicly_accessible`, `portfolio_public_access`,
  `rls_auto_enable`, `is_pgcron_available`, `prevent_mutation`.

Likewise, the **Category B** deployment gap documented above is refined by the analysis (§3): the
13 files listed in Iteration 1 are actually **14** (the log omitted
`20260902000003_schema_drift_alignment`), and most are **re-timestamped DUPLICATES** of
back-dated `20260510*/20260526*/20260530*` twins (idempotent on replay) rather than novel drift.
The genuinely-new, genuinely-undeployed core narrows to **files 10 and 11** — the phantom tables
`student_badges`, `quiz_clos`, `team_gamification`, `student_habit_levels`,
`student_habit_level_history` (+ `fn_track_habit_level_change`) and the `reports`/`transcripts`
buckets — plus the **file-9** `profiles` CHECK/nullability change
(`profiles_institution_required_when_active`, `institution_id` nullability). The §3.3
policy/constraint/trigger drift (`notifications_type_check`, `notifications_type_role_guard`, and
the `habit_logs`/`notifications`/`onboarding_progress`/`badge_spotlight_schedule`/`invitations`/
`audit_*` policy drops) is also out of this bugfix's scope. All of the above are carved out to
`migration-history-reconciliation`.

### (c) Net effect on this bugfix's acceptance gate

Because the empty-diff goal cannot be met within this bugfix's replay-only + single-forward-
migration charter, `bugfix.md`'s Acceptance / Verification Criterion was **re-scoped** (Task 19.1,
Option 1 of the analysis §6): the gate is now _"`db diff --linked` COMPLETES with no `42883`
abort; `social_challenges` shows no drift; the 12 in-scope function re-emits are cleared by
Part C; the 10 functions probe OK under `search_path=''`; advisor clean on the 2 badge fns"_ —
with the deployment gap, the ~22 out-of-scope function re-emits, and the policy/constraint drift
explicitly handed to `migration-history-reconciliation`. **Task 8's two in-charter objectives are
unchanged and remain met:** the `42883` abort is gone and `social_challenges` drift is reconciled.

### QA confirmation — SURPRISE-2 (Part B did NOT introduce the carved-out drift) — Task 19.3

A QA cross-check was performed to confirm the re-scope is **defensible** — i.e. that the carved-out
drift is pre-existing live↔migration drift and **not a regression this bugfix introduced**. The
analysis's **SURPRISE-2** finding (§2.3) was verified against the actual Part B edits made in
Tasks 5–7:

**The complete set of Part B (replay-only) edits was:**

1. **Task 5** — baked `SET search_path = ''` (+ `public.`-qualified the in-scope bodies) into the
   CREATEs of exactly 5 functions in their own migration files:
   - `20260620000001_add_sub_clo_support.sql` → `validate_sub_clo_weights()` (qualified
     `public.learning_outcomes`)
   - `20260620000002_create_graduate_attributes.sql` → `update_graduate_attributes_updated_at()`
     (`search_path=''` only; body unchanged — `NEW`/`now()` only)
   - `20260720000003_create_social_challenges.sql` → `enforce_max_active_challenges()` (qualified
     `public.social_challenges`)
   - `20260820000003_create_tutor_conversations.sql` → `sync_tutor_conversation_stats()` (qualified
     `public.tutor_conversations`) + `set_tutor_conversations_updated_at()` (`search_path=''` only)
   - `20260720000007_badge_spotlight_rotate_cron.sql` → `badge_spotlight_auto_rotate()`
   - `20260720000008_badge_archive_cron.sql` → `badge_auto_archive()`
2. **Task 6** — removed the 5 too-early `ALTER FUNCTION ... SET search_path = ''` lines from
   `20260504032936_fix_mutable_search_paths.sql` (for the same 5 mis-ordered functions above).
3. **Task 7** — reconciled the `social_challenges` table shape across
   `20260720000003_create_social_challenges.sql` and
   `20260502103758_align_social_challenges_with_design_spec.sql` to match the LIVE column set.

**Cross-check verdict (CONFIRMED):** None of the carved-out items can be attributed to Part B —

- **The ~22 out-of-scope function re-emits** — Part B touched **only** the 7 functions named above
  (`validate_sub_clo_weights`, `update_graduate_attributes_updated_at`,
  `enforce_max_active_challenges`, `sync_tutor_conversation_stats`,
  `set_tutor_conversations_updated_at`, `badge_spotlight_auto_rotate`, `badge_auto_archive`). It
  did **not** edit `auth_institution_id`, `auth_user_role`, `anonymize_user`, `emit_notification`,
  any `trg_*_notify`, `trigger_attainment_rollup`, `get_leaderboard_page`,
  `get_xp_transactions_page`, the portfolio helpers, `rls_auto_enable`, `is_pgcron_available`,
  `prevent_mutation`, or any deployment-gap function (`handle_new_user`, the invitation/rate-limit
  helpers, `prevent_profile_privilege_escalation`, `fn_track_habit_level_change`). Their re-emit is
  pre-existing live↔migration drift, surfaced (not caused) by removing the `42883` abort.
- **The phantom tables + buckets** (`student_badges`, `quiz_clos`, `team_gamification`,
  `student_habit_levels`, `student_habit_level_history`, `reports`/`transcripts`) — created by the
  unmerged files `20260901000010`/`20260901000011`, which Part B **never touched**. They are a
  deployment gap (built in the shadow, never recorded/applied to live), not a Part B artifact.
- **The policy / constraint / trigger drift** (§3.3: `notifications_type_check`,
  `notifications_type_role_guard`, the file-9 `profiles` CHECK/nullability, and the
  `habit_logs`/`notifications`/`onboarding_progress`/`badge_spotlight_schedule`/`invitations`/
  `audit_*` policies) — none of these objects appear in any Part B edit. The only table Part B
  reshaped was `social_challenges` (Task 7), which `run10` confirms shows **no** residual
  table/column drift.

**Conclusion:** SURPRISE-2 holds. Part B's edits are confined to the 7 functions + the
`social_challenges` table; the carved-out residual drift is independent, pre-existing live↔
migration drift (design root-cause #5) that the completed replay merely _revealed_. The re-scope
in Task 19.1 is therefore **defensible**: the bugfix is not being narrowed to hide a regression it
caused — it is being narrowed to exclude drift it neither caused nor owns, which is correctly
assigned to `migration-history-reconciliation`.
