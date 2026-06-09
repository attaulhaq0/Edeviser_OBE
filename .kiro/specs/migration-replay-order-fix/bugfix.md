# Bugfix Requirements Document

## Introduction

The Supabase migration chain in `supabase/migrations/` aborts on a from-scratch replay
(the required, non-ignorable "Supabase Preview" PR check, a clean rebuild, or a
disaster-recovery restore). The static oracle `scripts/check-migration-replay-order.mjs`
reports **35 too-early references (13 function, 22 table)**: statements that
ALTER/REVOKE/GRANT/COMMENT/CREATE-INDEX/CREATE-POLICY/ALTER-TABLE/ALTER-PUBLICATION against
an object in a migration that runs EARLIER (by filename timestamp) than the migration that
CREATEs that object.

Production is unaffected because objects already exist there incrementally, so the defect
is invisible until a clean replay runs. On a fresh replay each too-early statement aborts
with Postgres `42883` (function does not exist) or `42P01` (relation does not exist), and
every subsequent migration never runs.

The Vitest guard `scripts/audit/__tests__/migration-replay-order.test.ts` is currently RED
because it asserts the checker exits CLEAN (0 findings).

A special sub-case exists: `rls_auto_enable()` is REVOKEd by three early migrations but is
NEVER created anywhere in the chain, so those REVOKEs always abort on a fresh replay.

The fix must make a from-scratch replay succeed with zero too-early references while
keeping production behavior unchanged. Fixes must be idempotent and replay-safe, preferring
the established guard patterns (`DROP ... IF EXISTS` or a
`DO $$ ... to_regprocedure(...) IS NOT NULL ... $$` block) or hardening the object at its
CREATE site, rather than reordering historical migration files.

## Bug Analysis

### Current Behavior (Defect)

On a from-scratch replay of `supabase/migrations/` in filename-timestamp order, the
following too-early references abort the replay.

**Too-early FUNCTION references (abort with 42883):**

1.1 WHEN `20260504032936_fix_mutable_search_paths.sql:7` runs `ALTER FUNCTION validate_sub_clo_weights()` (function CREATEd at `20260601110014`) THEN the replay aborts with 42883 because the function does not yet exist
1.2 WHEN `20260504032936_fix_mutable_search_paths.sql:9` runs `ALTER FUNCTION enforce_max_active_challenges()` (CREATEd at `20260601110014`) THEN the replay aborts with 42883
1.3 WHEN `20260504032936_fix_mutable_search_paths.sql:12` runs `ALTER FUNCTION update_graduate_attributes_updated_at()` (CREATEd at `20260620000002`) THEN the replay aborts with 42883
1.4 WHEN `20260504032936_fix_mutable_search_paths.sql:14` runs `ALTER FUNCTION sync_tutor_conversation_stats()` (CREATEd at `20260601110014`) THEN the replay aborts with 42883
1.5 WHEN `20260504032936_fix_mutable_search_paths.sql:15` runs `ALTER FUNCTION set_tutor_conversations_updated_at()` (CREATEd at `20260820000003`) THEN the replay aborts with 42883
1.6 WHEN `20260504032951_revoke_anon_execute_on_security_definer_functions.sql:9` runs `REVOKE EXECUTE ON FUNCTION increment_team_xp()` (CREATEd at `20260720000012`) THEN the replay aborts with 42883
1.7 WHEN `20260504032951_revoke_anon_execute_on_security_definer_functions.sql:13` runs `REVOKE EXECUTE ON FUNCTION rls_auto_enable()` (NEVER created in chain) THEN the replay aborts with 42883
1.8 WHEN `20260504033048_revoke_public_execute_on_security_definer_functions.sql:7` runs `REVOKE EXECUTE ON FUNCTION rls_auto_enable()` (NEVER created in chain) THEN the replay aborts with 42883
1.9 WHEN `20260504033048_revoke_public_execute_on_security_definer_functions.sql:23` runs `REVOKE EXECUTE ON FUNCTION increment_team_xp()` (CREATEd at `20260720000012`) THEN the replay aborts with 42883
1.10 WHEN `20260504033048_revoke_public_execute_on_security_definer_functions.sql:24` runs `GRANT EXECUTE ON FUNCTION increment_team_xp()` (CREATEd at `20260720000012`) THEN the replay aborts with 42883
1.11 WHEN `20260504041233_revoke_authenticated_execute_internal_functions.sql:6` runs `REVOKE EXECUTE ON FUNCTION increment_team_xp()` (CREATEd at `20260720000012`) THEN the replay aborts with 42883
1.12 WHEN `20260504041233_revoke_authenticated_execute_internal_functions.sql:17` runs `REVOKE EXECUTE ON FUNCTION rls_auto_enable()` (NEVER created in chain) THEN the replay aborts with 42883
1.13 WHEN `20260504041233_revoke_authenticated_execute_internal_functions.sql:24` runs `REVOKE EXECUTE ON FUNCTION rls_auto_enable()` (NEVER created in chain) THEN the replay aborts with 42883

**Too-early TABLE references (abort with 42P01):**

1.14 WHEN `20260504033325_add_missing_fk_indexes.sql:7-9` runs `CREATE INDEX` on `teacher_handoff_requests` (CREATEd at `20260820100003`) THEN the replay aborts with 42P01 because the relation does not yet exist
1.15 WHEN `20260504033325_add_missing_fk_indexes.sql:10` runs `CREATE INDEX` on `tutor_llm_logs` (CREATEd at `20260820000006`) THEN the replay aborts with 42P01
1.16 WHEN `20260504033325_add_missing_fk_indexes.sql:11-13` runs `CREATE INDEX` on `tutor_plan_updates` (CREATEd at `20260820100002`) THEN the replay aborts with 42P01
1.17 WHEN `20260520063920_add_missing_select_rls_policies_batch1.sql:15` runs `CREATE POLICY` on `tutor_conversations` (CREATEd at `20260820000003`) THEN the replay aborts with 42P01
1.18 WHEN `20260520063920_add_missing_select_rls_policies_batch1.sql:20` runs `CREATE POLICY` on `tutor_messages` (CREATEd at `20260820000004`) THEN the replay aborts with 42P01
1.19 WHEN `20260520063920_add_missing_select_rls_policies_batch1.sql:29` runs `CREATE POLICY` on `tutor_usage_limits` (CREATEd at `20260820000005`) THEN the replay aborts with 42P01
1.20 WHEN `20260520063937_add_missing_select_rls_policies_batch2.sql:2` runs `CREATE POLICY` on `tutor_llm_logs` (CREATEd at `20260820000006`) THEN the replay aborts with 42P01
1.21 WHEN `20260520063937_add_missing_select_rls_policies_batch2.sql:12` runs `CREATE POLICY` on `tutor_plan_updates` (CREATEd at `20260820100002`) THEN the replay aborts with 42P01
1.22 WHEN `20260520063937_add_missing_select_rls_policies_batch2.sql:17` runs `CREATE POLICY` on `teacher_handoff_requests` (CREATEd at `20260820100003`) THEN the replay aborts with 42P01
1.23 WHEN `20260520063937_add_missing_select_rls_policies_batch2.sql:22` runs `CREATE POLICY` on `course_material_embeddings` (CREATEd at `20260820000002`) THEN the replay aborts with 42P01
1.24 WHEN `20260526115420_add_challenge_participants_to_realtime.sql:1` runs `ALTER PUBLICATION supabase_realtime ADD TABLE challenge_participants` (CREATEd at `20260720000003`) THEN the replay aborts with 42P01
1.25 WHEN `20260526145520_add_teams_avatar_letter_and_tutor_recommended_persona.sql:1` runs `ALTER TABLE ADD COLUMN` on `tutor_conversations` (CREATEd at `20260820000003`) THEN the replay aborts with 42P01
1.26 WHEN `20260602103939_task12_rls_initplan_wrap_tutor_content_donations.sql:5` runs `CREATE POLICY` on `tutor_conversations` (CREATEd at `20260820000003`) THEN the replay aborts with 42P01
1.27 WHEN `20260602103939_task12_rls_initplan_wrap_tutor_content_donations.sql:9` runs `CREATE POLICY` on `tutor_messages` (CREATEd at `20260820000004`) THEN the replay aborts with 42P01
1.28 WHEN `20260602103939_task12_rls_initplan_wrap_tutor_content_donations.sql:13` runs `CREATE POLICY` on `tutor_usage_limits` (CREATEd at `20260820000005`) THEN the replay aborts with 42P01
1.29 WHEN `20260602103939_task12_rls_initplan_wrap_tutor_content_donations.sql:17` runs `CREATE POLICY` on `tutor_llm_logs` (CREATEd at `20260820000006`) THEN the replay aborts with 42P01
1.30 WHEN `20260602103939_task12_rls_initplan_wrap_tutor_content_donations.sql:21` runs `CREATE POLICY` on `tutor_plan_updates` (CREATEd at `20260820100002`) THEN the replay aborts with 42P01
1.31 WHEN `20260602103939_task12_rls_initplan_wrap_tutor_content_donations.sql:25` runs `CREATE POLICY` on `teacher_handoff_requests` (CREATEd at `20260820100003`) THEN the replay aborts with 42P01

**Aggregate symptom and guard state:**

1.32 WHEN `node scripts/check-migration-replay-order.mjs` runs against the current chain THEN it reports 35 too-early references (13 function, 22 table) and exits with code 1
1.33 WHEN the Vitest guard `scripts/audit/__tests__/migration-replay-order.test.ts` runs THEN it is RED because the checker does not print CLEAN and does not exit 0

### Expected Behavior (Correct)

Each too-early statement must become replay-safe so a fresh replay no longer aborts, while
remaining effective on production (where the object already exists). The corresponding
expected behaviors mirror the defects above.

**FUNCTION references — must no-op on a fresh replay, still apply on production:**

2.1 WHEN `20260504032936_fix_mutable_search_paths.sql:7` is reached on a fresh replay THEN the system SHALL NOT abort on missing `validate_sub_clo_weights()` — either the hardening is baked into the function's CREATE site, or the ALTER is guarded by `to_regprocedure(...) IS NOT NULL`
2.2 WHEN `20260504032936_fix_mutable_search_paths.sql:9` is reached THEN the system SHALL NOT abort on missing `enforce_max_active_challenges()` (harden at CREATE site or guard)
2.3 WHEN `20260504032936_fix_mutable_search_paths.sql:12` is reached THEN the system SHALL NOT abort on missing `update_graduate_attributes_updated_at()` (harden at CREATE site or guard)
2.4 WHEN `20260504032936_fix_mutable_search_paths.sql:14` is reached THEN the system SHALL NOT abort on missing `sync_tutor_conversation_stats()` (harden at CREATE site or guard)
2.5 WHEN `20260504032936_fix_mutable_search_paths.sql:15` is reached THEN the system SHALL NOT abort on missing `set_tutor_conversations_updated_at()` (harden at CREATE site or guard)
2.6 WHEN `20260504032951...sql:9` is reached THEN the system SHALL NOT abort on missing `increment_team_xp()` — the REVOKE SHALL be guarded so it no-ops on a fresh replay
2.7 WHEN `20260504032951...sql:13` is reached THEN the system SHALL NOT abort on missing `rls_auto_enable()` — the REVOKE SHALL be guarded with the `to_regprocedure(...) IS NOT NULL` DO-block
2.8 WHEN `20260504033048...sql:7` is reached THEN the system SHALL NOT abort on missing `rls_auto_enable()` (guard with `to_regprocedure(...) IS NOT NULL`)
2.9 WHEN `20260504033048...sql:23` is reached THEN the system SHALL NOT abort on missing `increment_team_xp()` (guard the REVOKE)
2.10 WHEN `20260504033048...sql:24` is reached THEN the system SHALL NOT abort on missing `increment_team_xp()` (guard the GRANT)
2.11 WHEN `20260504041233...sql:6` is reached THEN the system SHALL NOT abort on missing `increment_team_xp()` (guard the REVOKE)
2.12 WHEN `20260504041233...sql:17` is reached THEN the system SHALL NOT abort on missing `rls_auto_enable()` (guard with `to_regprocedure(...) IS NOT NULL`)
2.13 WHEN `20260504041233...sql:24` is reached THEN the system SHALL NOT abort on missing `rls_auto_enable()` (guard with `to_regprocedure(...) IS NOT NULL`)

**TABLE references — must no-op or correctly resolve on a fresh replay:**

2.14 WHEN `20260504033325...sql:7-9` is reached THEN the system SHALL NOT abort on missing `teacher_handoff_requests` — the CREATE INDEX SHALL be guarded, or moved to run after the table CREATE
2.15 WHEN `20260504033325...sql:10` is reached THEN the system SHALL NOT abort on missing `tutor_llm_logs` (guard or relocate the CREATE INDEX)
2.16 WHEN `20260504033325...sql:11-13` is reached THEN the system SHALL NOT abort on missing `tutor_plan_updates` (guard or relocate the CREATE INDEX)
2.17 WHEN `20260520063920...batch1.sql:15` is reached THEN the system SHALL NOT abort on missing `tutor_conversations` (guard or relocate the CREATE POLICY)
2.18 WHEN `20260520063920...batch1.sql:20` is reached THEN the system SHALL NOT abort on missing `tutor_messages` (guard or relocate the CREATE POLICY)
2.19 WHEN `20260520063920...batch1.sql:29` is reached THEN the system SHALL NOT abort on missing `tutor_usage_limits` (guard or relocate the CREATE POLICY)
2.20 WHEN `20260520063937...batch2.sql:2` is reached THEN the system SHALL NOT abort on missing `tutor_llm_logs` (guard or relocate the CREATE POLICY)
2.21 WHEN `20260520063937...batch2.sql:12` is reached THEN the system SHALL NOT abort on missing `tutor_plan_updates` (guard or relocate the CREATE POLICY)
2.22 WHEN `20260520063937...batch2.sql:17` is reached THEN the system SHALL NOT abort on missing `teacher_handoff_requests` (guard or relocate the CREATE POLICY)
2.23 WHEN `20260520063937...batch2.sql:22` is reached THEN the system SHALL NOT abort on missing `course_material_embeddings` (guard or relocate the CREATE POLICY)
2.24 WHEN `20260526115420...sql:1` is reached THEN the system SHALL NOT abort on missing `challenge_participants` — the `ALTER PUBLICATION ... ADD TABLE` SHALL be guarded or relocated
2.25 WHEN `20260526145520...sql:1` is reached THEN the system SHALL NOT abort on missing `tutor_conversations` — the `ALTER TABLE ADD COLUMN` SHALL be guarded or relocated
2.26 WHEN `20260602103939...sql:5` is reached THEN the system SHALL NOT abort on missing `tutor_conversations` (guard or relocate the CREATE POLICY)
2.27 WHEN `20260602103939...sql:9` is reached THEN the system SHALL NOT abort on missing `tutor_messages` (guard or relocate the CREATE POLICY)
2.28 WHEN `20260602103939...sql:13` is reached THEN the system SHALL NOT abort on missing `tutor_usage_limits` (guard or relocate the CREATE POLICY)
2.29 WHEN `20260602103939...sql:17` is reached THEN the system SHALL NOT abort on missing `tutor_llm_logs` (guard or relocate the CREATE POLICY)
2.30 WHEN `20260602103939...sql:21` is reached THEN the system SHALL NOT abort on missing `tutor_plan_updates` (guard or relocate the CREATE POLICY)
2.31 WHEN `20260602103939...sql:25` is reached THEN the system SHALL NOT abort on missing `teacher_handoff_requests` (guard or relocate the CREATE POLICY)

**Aggregate fix outcome:**

2.32 WHEN `node scripts/check-migration-replay-order.mjs` runs against the fixed chain THEN it SHALL print CLEAN and exit with code 0 (zero too-early references)
2.33 WHEN the Vitest guard `scripts/audit/__tests__/migration-replay-order.test.ts` runs THEN it SHALL pass (both the CLEAN assertion and the non-vacuous synthetic-violation assertion)
2.34 WHEN a too-early statement references `rls_auto_enable()` (never created in the chain) THEN it SHALL be wrapped in a `DO $$ BEGIN IF to_regprocedure('public.rls_auto_enable(...)') IS NOT NULL THEN EXECUTE '...'; END IF; END $$;` block so it no-ops on a clean replay yet still applies on production where the function may exist

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a migration statement references an object that already exists at its point in the chain (the object is CREATEd in an earlier-or-equal migration) THEN the system SHALL CONTINUE TO apply that statement unchanged
3.2 WHEN the fixed migrations are applied on production (where every referenced function and table already exists) THEN the system SHALL CONTINUE TO produce the same logical effect — guarded REVOKE/GRANT/ALTER/COMMENT/INDEX/POLICY statements SHALL still execute because the `to_regprocedure(...) IS NOT NULL` / object-exists condition is true on production
3.3 WHEN the checker encounters a `DROP ... IF EXISTS` statement THEN the system SHALL CONTINUE TO treat it as safe (never flagged)
3.4 WHEN the checker encounters a statement already wrapped in a `DO $$ ... to_regprocedure(...) IS NOT NULL ... $$` guard block THEN the system SHALL CONTINUE TO treat it as safe (never flagged)
3.5 WHEN the checker encounters references to platform/extension tables (`auth.*`, `storage.*`, `cron.*`, `realtime.*`) THEN the system SHALL CONTINUE TO leave them untracked and never flag them
3.6 WHEN a migration references an object created LATER but the reference is genuinely guarded or relocated THEN already-passing migrations elsewhere in the chain SHALL CONTINUE TO replay without new errors
3.7 WHEN the full Vitest suite and `npm run lint` / `npx tsc --noEmit` run THEN the system SHALL CONTINUE TO pass for all unrelated tests and checks
3.8 WHEN `src/types/database.ts` is involved THEN it SHALL CONTINUE TO be left unmodified (never hand-edited) — the fix touches only `supabase/migrations/` files (and, if necessary, new replay-safe corrective migrations)
3.9 WHEN historical migration files that have already been applied to production are fixed THEN their logical effect on production SHALL CONTINUE TO be unchanged — they only become replay-safe, never reordered in a way that changes applied history
3.10 WHEN the function objects are hardened at their CREATE site (baking `SET search_path` / `public.`-qualification into the final `CREATE OR REPLACE FUNCTION`) THEN the runtime behavior of those functions on production SHALL CONTINUE TO be equivalent to the prior `ALTER FUNCTION` result

## Bug Condition and Properties

### Bug Condition

```pascal
FUNCTION isBugCondition(stmt)
  INPUT: stmt — a migration statement at (file, line) with filename timestamp stmt.fileTs
  OUTPUT: boolean

  // A hard-aborting statement that references an object created later (or never)
  // in the chain, and is NOT already guarded (DROP ... IF EXISTS or DO-block guard).

  IF isGuarded(stmt) THEN RETURN false   // DROP IF EXISTS / to_regprocedure DO-block

  IF stmt matches { ALTER FUNCTION | REVOKE EXECUTE ON FUNCTION
                  | GRANT EXECUTE ON FUNCTION | COMMENT ON FUNCTION
                  | CREATE TRIGGER ... EXECUTE FUNCTION } targeting fn THEN
     createdAt ← earliestCreateTimestamp(fn)
     RETURN createdAt = UNDEFINED OR stmt.fileTs < createdAt
  END IF

  IF stmt matches { CREATE INDEX | CREATE POLICY | ALTER TABLE
                  | ALTER PUBLICATION ... ADD TABLE | COMMENT ON TABLE/COLUMN } targeting tbl
     AND tbl IS created somewhere in the chain THEN
     createdAt ← earliestCreateTimestamp(tbl)
     RETURN stmt.fileTs < createdAt
  END IF

  RETURN false
END FUNCTION
```

### Property: Fix Checking

```pascal
// For every statement that triggers the bug, the fixed chain must not abort on replay.
FOR ALL stmt WHERE isBugCondition(stmt) DO
  // After fix: stmt is hardened-at-create-site, relocated after the CREATE, or guarded.
  ASSERT NOT isBugCondition(stmt')          // checker no longer flags it
END FOR

// Aggregate oracle:
result ← run('node scripts/check-migration-replay-order.mjs')
ASSERT result.stdout CONTAINS "CLEAN" AND result.exitCode = 0
```

### Property: Preservation Checking

```pascal
// For every non-buggy statement, the fixed chain behaves identically to the original.
FOR ALL stmt WHERE NOT isBugCondition(stmt) DO
  ASSERT F(stmt) = F'(stmt)
END FOR

// And on production (where every referenced object already exists), guarded statements
// still execute, so production's logical state is unchanged:
FOR ALL stmt WHERE wasGuardedOrHardened(stmt) DO
  ASSERT effectOnProduction(F'(stmt)) = effectOnProduction(F(stmt))
END FOR
```

**Key Definitions:**

- **F**: the original (unfixed) migration chain — aborts on a fresh replay with 35 findings.
- **F'**: the fixed migration chain — replays cleanly (checker CLEAN, exit 0) and is logically unchanged on production.
- **Counterexample**: a fresh replay of `supabase/migrations/` aborting at
  `20260504032936_fix_mutable_search_paths.sql:7` with `42883: function validate_sub_clo_weights() does not exist`.
