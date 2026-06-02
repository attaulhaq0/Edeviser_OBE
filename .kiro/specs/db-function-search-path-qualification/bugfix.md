# Bugfix Requirements Document

## Introduction

A past hardening migration, `supabase/migrations/20260504032936_fix_mutable_search_paths.sql`, applied `SET search_path = ''` to 17 `public`-schema Postgres functions in order to remove the `function_search_path_mutable` security warning. Several of those functions reference database tables and helper functions with **unqualified** names (for example `social_challenges` instead of `public.social_challenges`). Under an empty `search_path`, Postgres cannot resolve bare identifiers, so those functions raise `undefined_table` (SQLSTATE `42P01`) — or an equivalent "function does not exist" error — when invoked at runtime. This is the same root cause already fixed for `process_marketplace_purchase` (the "Buy Freeze" bug, fixed in `supabase/migrations/20260601004718_*`).

The defect was confirmed against the live Supabase project `cdlgtbvxlxjpcddjazzx` by probing each function under `set search_path = ''`. The user-visible impact spans multiple features: creating and activating course-wide social challenges fails, creating Sub-CLOs fails, AI tutor message and conversation writes fail (the `message_count` trigger), the badge archive and badge spotlight cron jobs fail, and the marketplace effective-price, XP-balance, and item-seeding routines fail.

There is also a second class of defect in the same migration, now **authoritatively reproduced** by a full from-scratch migration replay into a Supabase shadow database (`supabase db diff --linked`, Supabase CLI 2.102.0). The replay applied ~150 migrations and then **aborted hard** at `20260504032936_fix_mutable_search_paths.sql` with `ERROR: could not find a function named "public.validate_sub_clo_weights" (SQLSTATE 42883)` at statement 6 — the exact failure the Supabase Preview CI check reports, now reproduced locally. The migration runs `ALTER FUNCTION` against 5 functions (`validate_sub_clo_weights`, `update_graduate_attributes_updated_at`, `enforce_max_active_challenges`, `sync_tutor_conversation_stats`, `set_tutor_conversations_updated_at`) before they are `CREATE`d by later-timestamped migrations. Because the replay aborts here, **no clean environment** (preview branch, disaster recovery, new region, or local `supabase db reset`) can be provisioned from the current migrations.

The same replay also exposed **schema drift**: `20260502103758_align_social_challenges_with_design_spec.sql` logs "does not exist, skipping" on a fresh database for `social_challenges` columns `reward_type`, `reward_value`, and `notification_sent_90`, and for function `enforce_max_active_challenges()` and trigger `trg_enforce_max_active_challenges`. The LIVE `social_challenges` schema (`goal_target`, `participation_mode`, `reward_xp`, `reward_badge_id`, `institution_id`) does not match what the migration set builds, so the recorded migrations are internally inconsistent and do not reproduce production.

This bugfix therefore has three parts:

- **Part A — Function qualification (runtime correctness):** recreate the 10 confirmed runtime-broken functions with fully schema-qualified bodies while retaining `SET search_path = ''`. The 10 broken functions, and the functions that are safe under an empty `search_path`, were probe-verified against the live database (including firing a real trigger via DML). `process_marketplace_purchase` was already fixed in `20260601004718`.
- **Part B — Migration replay integrity:** correct the `ALTER`-before-`CREATE` ordering in `20260504032936` and reconcile drifted tables (starting with `social_challenges`) so that a clean `supabase db diff --linked` completes without error AND reports no drift. Reconciliation means editing the migration files so a fresh replay reproduces the ALREADY-LIVE schema — the live schema is the source of truth. It does NOT alter, drop, or rewrite production data or the live schema.
- **Part C — Production forward migration:** because production has already recorded these historical migrations as applied (in `supabase_migrations.schema_migrations`), production will not re-run the historical files. The live runtime fixes must therefore ship as a **new forward migration**; the historical files are corrected only so fresh replays end in the same state as production.

The objective proof of done is a clean `supabase db diff --linked` that COMPLETES and reports an empty/clean diff, each of the 10 functions resolving under an empty `search_path` (probe returns OK), and the Supabase Preview CI check passing for the right reason — a genuine clean replay, not a silenced check.

The authoritative investigation record for this bug is:

#[[file:.kiro/specs/_investigation/db-function-search-path-findings.md]]

### Key Definitions

- **F** — the original (unfixed) function: a `public` function carrying `SET search_path = ''` whose body uses unqualified object references.
- **F'** — the fixed function: the same function recreated with every user object schema-qualified (`public.`), while retaining `SET search_path = ''`.
- **C(X)** — the bug condition: an invocation that forces name resolution of an unqualified user object under the empty `search_path`, OR a clean from-scratch migration replay that reaches an `ALTER FUNCTION` before that function's `CREATE`.

### Bug Condition C(X)

```pascal
FUNCTION isBugCondition(X)
  INPUT: X is either a runtime function invocation or a migration-replay event
  OUTPUT: boolean

  // Runtime-correctness defect (Part A): a hardened function must resolve a bare
  // (unqualified) user object while search_path is empty.
  runtimeBug ←
        X is an invocation of a public function F
    AND F has SET search_path = ''
    AND F's body references at least one user table/function by an unqualified name
    AND the invocation reaches that reference

  // Migration-replay ordering defect (Part B): an ALTER targets a function that
  // has not yet been CREATEd on a clean database, so the replay aborts.
  replayOrderingBug ←
        X is a clean from-scratch migration replay
    AND migration 20260504032936 runs ALTER FUNCTION f
    AND f has not yet been CREATEd at that point in the replay

  // Migration drift defect (Part B): the recorded migrations do not reproduce the
  // live schema, so a clean replay diverges from production (non-empty diff).
  replayDriftBug ←
        X is a clean from-scratch migration replay
    AND final_state(X) ≠ live_production_schema
    // e.g. social_challenges built without live columns goal_target,
    // participation_mode, reward_xp, reward_badge_id, institution_id

  RETURN runtimeBug OR replayOrderingBug OR replayDriftBug
END FUNCTION
```

### Property Specification (Fix Checking)

```pascal
// Property: every hardened function resolves correctly under the secure search_path.
FOR ALL X WHERE isBugCondition(X) AND X is a runtime invocation DO
  result ← F'(X)
  ASSERT no_error(result)                       // no 42P01 / undefined_table / undefined_function
    AND result = the functionally-correct value for X
    AND F' still has SET search_path = ''        // security posture preserved
END FOR

// Property: a clean from-scratch replay completes AND reproduces production exactly.
FOR ALL X WHERE isBugCondition(X) AND X is a migration replay DO
  ASSERT replay_completes_without_error(X)              // no 42883 abort at 20260504032936
    AND final_state(X) = live_production_schema         // no drift (social_challenges etc.)
    AND supabase_db_diff_linked(X) reports empty/clean diff
END FOR
```

### Acceptance / Verification Criterion (objective proof of done)

> **RE-SCOPED (see `#[[file:.kiro/specs/_investigation/db-function-search-path-residual-drift-analysis.md]]`).** The original gate required a literally empty `supabase db diff --linked`. The Task 8 replay completing past the historical `42883` abort unmasked pre-existing downstream drift (design root-cause #5) that this bugfix neither caused nor owns: ~22 out-of-scope function-body re-emits (historical live↔migration drift), genuinely-undeployed phantom tables (`student_badges`, `quiz_clos`, `team_gamification`, `student_habit_levels`, `student_habit_level_history`) + `reports`/`transcripts` buckets, the file-9 `profiles` CHECK/nullability, and assorted policy/constraint/trigger drift. These are carved out to the new `migration-history-reconciliation` spec. The bugfix is accepted on its IN-SCOPE objectives below.

The fix is accepted when ALL of the following hold simultaneously:

```pascal
ASSERT supabase_db_diff_linked() COMPLETES with no error (no 42883 abort)
   AND social_challenges shows NO table/column drift in the diff
   AND the ONLY function delta attributable to THIS bugfix — the pre-Part-C
       qualification re-emits for the 10 in-scope Part C functions (which ALREADY
       include the 2 badge functions badge_auto_archive + badge_spotlight_auto_rotate)
       PLUS the 2 Part-B-reordered runtime-safe trigger functions
       (set_tutor_conversations_updated_at, update_graduate_attributes_updated_at,
       which gained SET search_path = '' in their CREATEs per Part B Tasks 5.2/5.4) —
       is CLEARED once the Part C forward migration is in the chain (these 12 distinct
       functions no longer appear in the diff after Part C)
   AND Part B introduced NONE of the carved-out deltas (verified per investigation)
   AND FOR EACH f IN {get_effective_price, get_xp_balance,
                      get_wellness_aggregate_stats, seed_marketplace_items,
                      delete_department_if_no_programs, validate_sub_clo_weights,
                      enforce_max_active_challenges, sync_tutor_conversation_stats,
                      badge_auto_archive, badge_spotlight_auto_rotate}:
         probe(f) under search_path = '' returns OK   // resolves, no undefined_table/function
   AND advisor reports no function_search_path_mutable WARN for the 2 badge functions
   AND Supabase_Preview_CI_check passes for the right reason (genuine clean replay
       PAST the abort, NOT a silenced or skipped check)
```

> **Carved out to `migration-history-reconciliation` (NOT a gate here):** a genuinely-empty
> `db diff`; deploying the phantom tables; hardening the 6 unguarded edge functions
> (`check-badges`, `process-onboarding`, `export-student-data`, `weekly-summary-cron`,
> `process-streak`, `team-streak-risk-cron`); de-duplicating the re-homed migration files; and
> reconciling the ~22 out-of-scope function-body drifts + the policy/constraint/trigger drift.

### Preservation Goal (Preservation Checking)

```pascal
// Property: for every non-buggy input, the fixed code behaves identically to the original.
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT F(X) = F'(X)
END FOR
```

## Bug Analysis

### Current Behavior (Defect)

The following functions were hardened with `SET search_path = ''` in `20260504032936_fix_mutable_search_paths.sql` but reference user objects with unqualified names, so they fail when invoked. Clauses 1.1–1.10 are the **Part A** runtime-correctness defects (all 10 probe-verified against the live database, `enforce_max_active_challenges` verified by firing a real trigger via DML); clause 1.11 is the **Part B** migration-replay ordering defect (the hard abort); clause 1.12 is the residual security-advisor warning; clause 1.13 is the **Part B** schema-drift defect.

1.1 WHEN `public.get_effective_price(uuid, uuid)` is invoked under the empty `search_path` THEN the system raises `undefined_table` (42P01) because the body references `marketplace_items`, `sale_event_items`, and `sale_events` unqualified, so marketplace effective-price resolution fails.

1.2 WHEN `public.get_xp_balance(uuid)` is invoked under the empty `search_path` THEN the system raises `undefined_table` because the body references `xp_transactions` and `xp_purchases` unqualified, so XP-balance reads fail.

1.3 WHEN `public.get_wellness_aggregate_stats(uuid)` is invoked under the empty `search_path` THEN the system raises an undefined-object error because the body references `wellness_habit_logs`, `profiles`, and the helper `auth_institution_id()` unqualified, so wellness aggregate stats fail.

1.4 WHEN `public.seed_marketplace_items(uuid)` is invoked under the empty `search_path` THEN the system raises `undefined_table` because the body references `marketplace_items` unqualified, so marketplace item seeding fails.

1.5 WHEN `public.delete_department_if_no_programs(uuid)` is invoked under the empty `search_path` THEN the system raises `undefined_table` because the body references `departments` and `programs` unqualified, so the department-delete guard fails.

1.6 WHEN the `public.validate_sub_clo_weights()` trigger fires (on Sub-CLO create/update) under the empty `search_path` THEN the system raises `undefined_table` because the body references `learning_outcomes` unqualified, so creating Sub-CLOs fails.

1.7 WHEN the `public.enforce_max_active_challenges()` trigger fires (on creating/activating a course-wide challenge) under the empty `search_path` THEN the system raises `undefined_table` because the body references `social_challenges` unqualified, so creating/activating course-wide challenges fails.

1.8 WHEN the `public.sync_tutor_conversation_stats()` trigger fires (on AI tutor message/conversation writes that update `message_count`) under the empty `search_path` THEN the system raises `undefined_table` because the body references `tutor_conversations` unqualified, so AI tutor message and conversation writes fail.

1.9 WHEN the `public.badge_auto_archive()` cron job runs under the empty `search_path` THEN the system raises `undefined_table` because the body references `badges` and `institutions` unqualified, so the badge auto-archive cron job fails. (Note: in production this function currently carries no `search_path` because later migrations `20260720000007`/`20260720000008` re-`CREATE OR REPLACE` it without hardening — see clause 1.12.)

1.10 WHEN the `public.badge_spotlight_auto_rotate()` cron job runs under the empty `search_path` THEN the system raises `undefined_table` because the body references `badge_spotlight_schedule`, `badges`, and `institutions` unqualified, so the badge spotlight rotation cron job fails. (Same production caveat as 1.9.)

1.11 WHEN a clean from-scratch migration replay runs (Supabase Preview branch, `supabase db reset`, disaster recovery, or `supabase db diff --linked` into a shadow database) THEN migration `20260504032936_fix_mutable_search_paths.sql` aborts at statement 6 with `ERROR: could not find a function named "public.validate_sub_clo_weights" (SQLSTATE 42883)` because it `ALTER`s `validate_sub_clo_weights`, `update_graduate_attributes_updated_at`, `enforce_max_active_challenges`, `sync_tutor_conversation_stats`, and `set_tutor_conversations_updated_at` before they are `CREATE`d by later migrations (`20260620000001`, `20260620000002`, `20260720000003`, `20260820000003`); the replay therefore cannot complete, so no clean environment (preview branch, disaster recovery, new region, local `db reset`) can be provisioned, and the Supabase Preview CI check fails.

1.12 WHEN the Supabase database linter runs THEN the system reports `function_search_path_mutable` WARNs on `public.badge_auto_archive`, `public.badge_spotlight_auto_rotate`, `public.is_pgcron_available`, and `public.prevent_mutation`, because these functions have a mutable (unset) `search_path` and so do not meet the intended non-mutable security posture.

1.13 WHEN a clean from-scratch migration replay runs THEN migration `20260502103758_align_social_challenges_with_design_spec.sql` logs "does not exist, skipping" for `social_challenges` columns `reward_type`, `reward_value`, and `notification_sent_90`, and for function `enforce_max_active_challenges()` and trigger `trg_enforce_max_active_challenges`, because the recorded migrations build a `social_challenges` table that does not match the LIVE schema (`goal_target`, `participation_mode`, `reward_xp`, `reward_badge_id`, `institution_id`); the migration set is therefore internally inconsistent and a fresh replay produces a different `social_challenges` than production, so `supabase db diff --linked` reports drift rather than a clean/empty diff.

### Expected Behavior (Correct)

Each clause pairs with the same-indexed Current Behavior clause. Across all clauses, the fix qualifies identifiers and preserves (does not revert) the `SET search_path = ''` hardening.

2.1 WHEN `public.get_effective_price(uuid, uuid)` is invoked under the empty `search_path` THEN the system SHALL resolve all objects schema-qualified (`public.marketplace_items`, `public.sale_event_items`, `public.sale_events`) and return the correct effective price without error.

2.2 WHEN `public.get_xp_balance(uuid)` is invoked under the empty `search_path` THEN the system SHALL resolve `public.xp_transactions` and `public.xp_purchases` schema-qualified and return the correct XP balance without error.

2.3 WHEN `public.get_wellness_aggregate_stats(uuid)` is invoked under the empty `search_path` THEN the system SHALL resolve `public.wellness_habit_logs`, `public.profiles`, and `public.auth_institution_id()` schema-qualified and return the correct aggregate stats without error.

2.4 WHEN `public.seed_marketplace_items(uuid)` is invoked under the empty `search_path` THEN the system SHALL resolve `public.marketplace_items` schema-qualified and seed items without error.

2.5 WHEN `public.delete_department_if_no_programs(uuid)` is invoked under the empty `search_path` THEN the system SHALL resolve `public.departments` and `public.programs` schema-qualified and apply the delete guard without error.

2.6 WHEN the `public.validate_sub_clo_weights()` trigger fires under the empty `search_path` THEN the system SHALL resolve `public.learning_outcomes` schema-qualified and validate Sub-CLO weights without error, so Sub-CLO creation succeeds.

2.7 WHEN the `public.enforce_max_active_challenges()` trigger fires under the empty `search_path` THEN the system SHALL resolve `public.social_challenges` schema-qualified and enforce the active-challenge limit without error, so creating/activating course-wide challenges succeeds.

2.8 WHEN the `public.sync_tutor_conversation_stats()` trigger fires under the empty `search_path` THEN the system SHALL resolve `public.tutor_conversations` schema-qualified and update conversation stats without error, so AI tutor message/conversation writes succeed.

2.9 WHEN the `public.badge_auto_archive()` cron job runs THEN the system SHALL resolve `public.badges` and `public.institutions` schema-qualified AND carry `SET search_path = ''`, so the job runs without error under the hardened search_path.

2.10 WHEN the `public.badge_spotlight_auto_rotate()` cron job runs THEN the system SHALL resolve `public.badge_spotlight_schedule`, `public.badges`, and `public.institutions` schema-qualified AND carry `SET search_path = ''`, so the job runs without error under the hardened search_path.

2.11 WHEN a clean from-scratch migration replay runs (Supabase Preview branch, `supabase db reset`, disaster recovery, or `supabase db diff --linked` into a shadow database) THEN the system SHALL complete the replay without error and reach the SAME hardened-and-working state as production, with each affected function created in `CREATE`-before-`ALTER` order (the fix SHALL bake `SET search_path = ''` into the `CREATE OR REPLACE` of the 5 mis-ordered functions — `validate_sub_clo_weights`, `update_graduate_attributes_updated_at`, `enforce_max_active_challenges`, `sync_tutor_conversation_stats`, `set_tutor_conversations_updated_at` — and remove their too-early `ALTER`s from `20260504032936`), so the 42883 abort no longer occurs.

2.12 WHEN the Supabase database linter runs after the fix THEN the system SHALL report no `function_search_path_mutable` WARN for `public.badge_auto_archive`, `public.badge_spotlight_auto_rotate`, `public.is_pgcron_available`, or `public.prevent_mutation`, because each is qualified first and then hardened with a non-mutable `search_path`.

2.13 WHEN a clean from-scratch migration replay runs THEN the system SHALL reconcile the drifted migration files (starting with `social_challenges`) so the rebuilt schema matches the LIVE production schema exactly (`goal_target`, `participation_mode`, `reward_xp`, `reward_badge_id`, `institution_id`), eliminating the "does not exist, skipping" notices in `20260502103758_align_social_challenges_with_design_spec.sql`, so that `supabase db diff --linked` COMPLETES and reports an empty/clean diff (no drift). The reconciliation SHALL edit only the migration files so they reproduce the already-live schema; it SHALL NOT alter, drop, or rewrite production data or the live schema (the live schema is the source of truth).

2.14 WHEN the runtime function fixes are deployed to production THEN the system SHALL ship them as a NEW forward migration (not by re-running historical files, which production has already recorded as applied), so the 10 currently-broken live functions are recreated with schema-qualified bodies under `SET search_path = ''` while the historical-file corrections (2.11, 2.13) bring fresh replays to the same state.

### Unchanged Behavior (Regression Prevention)

These clauses capture behavior that must be preserved for inputs that do NOT trigger the bug (`NOT isBugCondition(X)`): the fixed function must behave identically to the original.

3.1 WHEN any affected function is invoked with valid, well-formed inputs THEN the system SHALL CONTINUE TO return the same functionally-correct results it produced before the fix (correct effective price, XP balance, wellness stats, seeded items, department-delete guard outcome, Sub-CLO weight validation, active-challenge enforcement, tutor stat sync, badge archive/rotation results).

3.2 WHEN a `SECURITY DEFINER` function (including the RLS helper functions and institution-scoped, multi-tenant functions) is invoked THEN the system SHALL CONTINUE TO run with its existing security model unchanged — the fix qualifies identifiers only and SHALL NOT change `SECURITY DEFINER`/`SECURITY INVOKER`, ownership, or granted privileges.

3.3 WHEN an append-only table (`xp_transactions`, `xp_purchases`, `audit_logs`, evidence records) is accessed by an affected function THEN the system SHALL CONTINUE TO honor append-only semantics (no UPDATE or DELETE introduced by the fix).

3.4 WHEN a trigger-backed function fires (`validate_sub_clo_weights`, `enforce_max_active_challenges`, `sync_tutor_conversation_stats`, `set_tutor_conversations_updated_at`, `update_graduate_attributes_updated_at`, `update_marketplace_items_updated_at`, `trg_review_schedules_set_updated_at`, `trigger_attainment_rollup`, `prevent_xp_purchases_delete`) THEN the system SHALL CONTINUE TO preserve its exact trigger semantics (BEFORE/AFTER timing, row/statement level, `NEW`/`OLD` handling, and `RAISE` behavior).

3.5 WHEN the security posture is evaluated after the fix THEN the system SHALL CONTINUE TO enforce the non-mutable `search_path` hardening introduced by `20260504032936` — the fix SHALL NOT revert or weaken `SET search_path = ''` on any function that already had it.

3.6 WHEN production applies the fix THEN the system SHALL CONTINUE TO treat the historical migrations already recorded in `supabase_migrations.schema_migrations` as applied (production does not re-run them); the live fix SHALL ship as a NEW forward migration, and edits to historical migration files SHALL only affect fresh replays.

3.7 WHEN a runtime-safe function that references no user tables runs (`set_tutor_conversations_updated_at`, `trg_review_schedules_set_updated_at`, `update_graduate_attributes_updated_at`, `update_marketplace_items_updated_at`, `prevent_xp_purchases_delete` — bodies use only `NEW`, `now()`, or `RAISE`) THEN the system SHALL CONTINUE TO behave exactly as before; these are only adjusted to resolve the replay-ordering defect (clause 1.11), not their runtime behavior.

3.8 WHEN `public.process_marketplace_purchase(uuid, uuid, uuid)` is invoked THEN the system SHALL CONTINUE TO work as it does after its prior fix (`20260601004718`); this bugfix SHALL NOT regress the already-fixed Buy Freeze behavior.

3.9 WHEN any database object NOT listed in this document is used (other functions, tables, RLS policies, indexes, cron schedules) THEN the system SHALL CONTINUE TO behave exactly as before; the fix is scoped to qualifying identifiers and correcting migration ordering only.

3.10 WHEN the migration files are reconciled to remove replay drift (clause 2.13) THEN the system SHALL CONTINUE TO preserve all existing production data and the LIVE production schema unchanged — the live schema is the source of truth, and reconciliation edits ONLY the migration files so a fresh replay reproduces what is already live; it SHALL NOT run any `ALTER`/`DROP`/data-rewriting DDL against production. In particular the live `social_challenges` columns (`goal_target`, `participation_mode`, `reward_xp`, `reward_badge_id`, `institution_id`) and their data SHALL CONTINUE TO exist exactly as deployed.

3.11 WHEN the fix is applied THEN the system SHALL CONTINUE TO enforce all existing RLS and multi-tenant security models, the append-only invariants on `xp_transactions`, `xp_purchases`, `audit_logs`, and evidence records, and the already-fixed `process_marketplace_purchase` behavior from `20260601004718`; none of these SHALL be regressed by Part A, Part B, or Part C of this fix.
