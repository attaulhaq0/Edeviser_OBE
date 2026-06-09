# Implementation Plan

## Overview

This plan fixes the from-scratch migration replay defect using the bug-condition methodology and
the design's six-class strategy. It first surfaces counterexamples that prove the bug on the
UNFIXED chain (exploration), then captures existing healthy behavior (preservation), then applies
the per-class fixes (A, B, C function/privilege guards + CREATE-site hardening; the mandatory
corrective migration for D/E/F; then guards for the early D/E/F statements), then re-runs the SAME
oracle/guard to confirm the bug is fixed and nothing regressed.

The authoritative oracle is `node scripts/check-migration-replay-order.mjs` (`npm run db:check-replay`):
it must print `CLEAN` and exit 0 on the fixed chain. The Vitest guard
`scripts/audit/__tests__/migration-replay-order.test.ts` must pass.

Property numbering mirrors the design's Correctness Properties:

- Property 1 — Bug Condition / Fix Checking (fresh replay completes with zero too-early references)
- Property 2 — Preservation (non-buggy statements and production logical state are unchanged)

Steering constraints that apply to every task: never hand-edit or overwrite `src/types/database.ts`;
never reorder or rename historical migration files; all edits keep production logical effect identical
(guards evaluate true where objects exist); every edited statement must be idempotent and replay-safe;
run `npm run lint`, `npx tsc --noEmit`, and `npm test` before any push.

## Task Dependency Graph

```json
{
  "waves": [
    {
      "wave": 1,
      "description": "Establish failing baseline (exploration) and preservation baseline on UNFIXED chain before any fix",
      "tasks": ["1", "2"]
    },
    {
      "wave": 2,
      "description": "Function/privilege classes A, B, C — harden at CREATE site and guard early statements",
      "tasks": ["3", "4", "5"]
    },
    {
      "wave": 3,
      "description": "Mandatory corrective migration for D/E/F (must precede guarding the early statements)",
      "tasks": ["6"]
    },
    {
      "wave": 4,
      "description": "Guard early D/E/F statements now that the corrective migration restores final state",
      "tasks": ["7", "8", "9"]
    },
    {
      "wave": 5,
      "description": "Fix verification + preservation verification + class-0 re-verification",
      "tasks": ["10", "11", "12"]
    },
    {
      "wave": 6,
      "description": "Final checkpoint — all tests pass, chain replay-safe",
      "tasks": ["13"]
    }
  ]
}
```

Notes on ordering:

- Tasks 1–2 MUST run first on the UNFIXED chain (exploration before preservation before any fix).
- Task 3 (CLASS A) has sub-tasks 3.1 (guard early ALTERs), 3.2 (bake `SET search_path = ''` into each function's TRUE last-writer CREATE — corrected per FINDING 1, all five functions), and 3.3 (verify the hardening survives the last-writer CREATE on a fresh replay via `pg_proc.proconfig`). 3.3 depends on 3.1 + 3.2.
- Task 6 (corrective migration) MUST be created before tasks 7–9 guard the early D/E/F statements, so a fresh replay still reaches the correct final state.
- Tasks 10–12 (verification) depend on every fix task (3–9). Task 12.1 is an OPTIONAL, non-blocking follow-up (FINDING 2 detector-limitation recommendation).
- Task 13 (checkpoint) depends on all prior tasks.

## Tasks

- [ ] 1. Establish the failing baseline — exploratory bug-condition checking on the UNFIXED chain

  - **Property 1: Bug Condition** - Fresh replay aborts with 35 too-early references (13 function, 22 table)
  - **CRITICAL**: This step MUST report findings (exit 1) on the unfixed chain — the non-clean result IS the success criterion that confirms the bug exists
  - **DO NOT fix any migration in this task** — only observe and record
  - **GOAL**: Surface counterexamples that demonstrate the bug and confirm the six-class root-cause taxonomy
  - **Oracle (authoritative, fast)**: run `node scripts/check-migration-replay-order.mjs` (`npm run db:check-replay`) against the current chain
  - **EXPECTED OUTCOME**: checker reports **35 too-early references (13 function, 22 table)** and exits with code **1** (this confirms the bug)
  - Confirm the Vitest guard `scripts/audit/__tests__/migration-replay-order.test.ts` is currently RED (CLEAN assertion fails)
  - Read each reported `file:line` and map it to its fix class:
    - CLASS A → `20260504032936_fix_mutable_search_paths.sql:7,9,12,14,15` (ALTER FUNCTION before CREATE: `validate_sub_clo_weights`, `enforce_max_active_challenges`, `update_graduate_attributes_updated_at`, `sync_tutor_conversation_stats`, `set_tutor_conversations_updated_at`)
    - CLASS B → `increment_team_xp(uuid, integer)` at `20260504032951:9`, `20260504033048:23,24`, `20260504041233:6` (created later at `20260720000012`)
    - CLASS C → phantom `rls_auto_enable()` at `20260504032951:13`, `20260504033048:7`, `20260504041233:17,24` (never created in chain)
    - CLASS D → `CREATE INDEX` at `20260504033325:7-13` on `teacher_handoff_requests`, `tutor_llm_logs`, `tutor_plan_updates` (created `20260820*`)
    - CLASS E → `CREATE POLICY` at `20260520063920:15,20,29`, `20260520063937:2,12,17,22`, `20260602103939:5,9,13,17,21,25` on `tutor_*` / `teacher_handoff_requests` / `course_material_embeddings` (created `20260820*`)
    - CLASS F → `ALTER PUBLICATION ... ADD TABLE` at `20260526115420:1` (`challenge_participants`, created `20260720000003`) and `ALTER TABLE ADD COLUMN` at `20260526145520:1` (`tutor_conversations`, created `20260820000003`)
  - Record the canonical counterexample: fresh replay aborts at `20260504032936_fix_mutable_search_paths.sql:7` with `42883: function validate_sub_clo_weights() does not exist`
  - Mark task complete when the 35 findings are recorded, each mapped to a class, and the failing baseline is documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10, 1.11, 1.12, 1.13, 1.14, 1.15, 1.16, 1.17, 1.18, 1.19, 1.20, 1.21, 1.22, 1.23, 1.24, 1.25, 1.26, 1.27, 1.28, 1.29, 1.30, 1.31, 1.32, 1.33_
  - _Advances: Property 1 (Fix Checking) — establishes the buggy partition isBugCondition(stmt)=true_

- [ ] 2. Capture the preservation baseline on the UNFIXED chain (BEFORE any fix)

  - **Property 2: Preservation** - Non-buggy statements and production logical state are unchanged
  - **IMPORTANT**: Follow observation-first methodology — observe before changing anything
  - **GOAL**: Record the baseline behavior that the fix MUST NOT change
  - Observe that statements referencing already-existing objects (object CREATEd in an earlier-or-equal migration) are NOT flagged by the checker, and that the checker's two accepted escape hatches behave as designed:
    - `DROP ... IF EXISTS` spans are masked / never flagged (observe an existing example in the chain)
    - `DO $$ ... $$;` guard blocks are masked / never flagged (observe `20260604151854` and `20260602101312` which already use this pattern and remain CLEAN)
    - Platform/extension table references (`auth.*`, `storage.*`, `cron.*`, `realtime.*`) are untracked and never flagged
  - Record the current finding count attributable to the already-reconciled `20260609*` / `20260821*` migrations (expected: zero — they are not part of the 35)
  - Record that `src/types/database.ts` is the committed auto-generated baseline (`git status` shows it unmodified) — it MUST stay untouched
  - **EXPECTED OUTCOME**: the above non-buggy statements are confirmed unflagged on the UNFIXED chain (this is the baseline to preserve)
  - Mark task complete when the non-buggy partition and escape-hatch behavior are observed and recorded
  - _Requirements: 3.1, 3.3, 3.4, 3.5, 3.6_
  - _Advances: Property 2 (Preservation) — establishes the non-buggy partition isBugCondition(stmt)=false_

- [ ] 3. CLASS A — harden function `search_path` at the TRUE last-writer CREATE site and guard the early ALTERs

  - **FINDING 1 correction:** `20260601110014` is NOT the last-writer for 4 of the 5 functions (and not for `validate_sub_clo_weights` either). Each function's true last-writer is its greatest-timestamp `CREATE OR REPLACE` (see 3.2). All FIVE functions must be hardened at their true last-writer or they regress to a mutable `search_path` on a fresh replay.
  - _Bug_Condition: isBugCondition(stmt) where stmt is `ALTER FUNCTION ... SET search_path = ''` in `20260504032936` targeting a function CREATEd later_
  - _Expected_Behavior: on a fresh replay the early ALTERs no-op (function absent), and each function's TRUE last-writer `CREATE OR REPLACE FUNCTION` carries `SET search_path = ''` (with `public.`-qualified body) so the end state equals the prior ALTER result_
  - _Preservation: on production every function exists, so the guarded ALTER still executes; baked last-writer CREATE-site setting is equivalent to the prior ALTER, and the final replayed `proconfig` carries `search_path=` (FINDING 1)_

  - [ ] 3.1 Guard the five early `ALTER FUNCTION` statements in `20260504032936_fix_mutable_search_paths.sql`

    - Wrap each of lines 7, 9, 12, 14, 15 in a `DO $$ BEGIN IF to_regprocedure('public.<fn>(<args>)') IS NOT NULL THEN EXECUTE '...'; END IF; END $$;` block
    - Use exact signatures: `validate_sub_clo_weights()`, `enforce_max_active_challenges()`, `update_graduate_attributes_updated_at()`, `sync_tutor_conversation_stats()`, `set_tutor_conversations_updated_at()`
    - Keep the wrapped statement text logically identical (`ALTER FUNCTION public.<fn>(...) SET search_path = ''`) so production effect is unchanged
    - _Files: `supabase/migrations/20260504032936_fix_mutable_search_paths.sql`_
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ] 3.2 Bake `SET search_path = ''` into each function's TRUE last-writer CREATE (greatest-timestamp `CREATE OR REPLACE`)

    - **CORRECTION (FINDING 1):** the earlier assumption that `20260601110014` is the last-writer is WRONG. Grep of every `CREATE OR REPLACE FUNCTION` site in replay order proved each of the five CLASS A functions has a LATER, currently-unhardened `CREATE OR REPLACE` that silently strips `SET search_path = ''` on a fresh replay. Harden at the TRUE last-writer (greatest-timestamp CREATE), NOT at `20260601110014`. **All FIVE functions need this — not three.**
    - **CRITICAL — schema-qualify the body when adding `SET search_path = ''`:** with `search_path = ''` every unqualified table reference fails to resolve at runtime, so each body that gains the setting MUST have its table references rewritten to `public.<table>` in the same change, or the trigger breaks at runtime.
    - Bake `SET search_path = ''` into `validate_sub_clo_weights()` at its true last-writer `20260620000001_add_sub_clo_support.sql` and `public.`-qualify its body refs (`public.learning_outcomes`)
    - Bake `SET search_path = ''` into `enforce_max_active_challenges()` at its true last-writer `20260720000003_create_social_challenges.sql` and `public.`-qualify its body refs (`public.social_challenges`)
    - Bake `SET search_path = ''` into `update_graduate_attributes_updated_at()` at its true last-writer `20260620000002_create_graduate_attributes.sql`
    - Bake `SET search_path = ''` into `sync_tutor_conversation_stats()` AND `set_tutor_conversations_updated_at()` at their shared true last-writer `20260820000003_create_tutor_conversations.sql` and `public.`-qualify their body refs (`public.tutor_conversations`)
    - Ensure runtime behavior of each function is unchanged (definition body otherwise identical apart from schema-qualification)
    - **Completion criterion:** every function targeted by an `ALTER FUNCTION ... SET search_path` in `20260504032936` has the setting present in its LAST `CREATE OR REPLACE` in replay order (no later unhardened CREATE remains)
    - _Files: `supabase/migrations/20260620000001_add_sub_clo_support.sql`, `supabase/migrations/20260720000003_create_social_challenges.sql`, `supabase/migrations/20260620000002_create_graduate_attributes.sql`, `supabase/migrations/20260820000003_create_tutor_conversations.sql`_
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.10_

  - [ ] 3.3 Verify search_path hardening survives the last-writer CREATE (FINDING 1)
    - **Property 2: Preservation** - Search-path hardening survives the last-writer CREATE on a fresh replay
    - **IMPORTANT**: Run AFTER applying 3.1 (guards) and 3.2 (last-writer hardening)
    - Assert that for each of the five CLASS A functions, its final replayed definition carries an immutable `search_path`. Run: `SELECT proname, proconfig FROM pg_proc WHERE proname IN ('validate_sub_clo_weights','enforce_max_active_challenges','update_graduate_attributes_updated_at','sync_tutor_conversation_stats','set_tutor_conversations_updated_at')`
    - **EXPECTED OUTCOME**: every row's `proconfig` contains a `search_path=` entry (none NULL / none missing)
    - Assert each trigger still behaves identically with the schema-qualified body: message_count sync (`sync_tutor_conversation_stats`), `updated_at` touch (`set_tutor_conversations_updated_at`, `update_graduate_attributes_updated_at`), Sub-CLO parent/weight validation (`validate_sub_clo_weights`), and max-active-challenge enforcement (`enforce_max_active_challenges`)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.10_
    - _Validates: Property 2 (Preservation)_

- [ ] 4. CLASS B — guard `REVOKE`/`GRANT EXECUTE` on the later function `increment_team_xp`

  - Wrap each privilege statement in a `DO $$ BEGIN IF to_regprocedure('public.increment_team_xp(uuid, integer)') IS NOT NULL THEN EXECUTE '...'; END IF; END $$;` block
  - Apply to: `20260504032951...sql:9` (REVOKE), `20260504033048...sql:23` (REVOKE), `20260504033048...sql:24` (GRANT), `20260504041233...sql:6` (REVOKE)
  - Use the exact signature `increment_team_xp(uuid, integer)` so the guard predicate is true on production (function present) and the statement still executes there
  - _Bug_Condition: isBugCondition(stmt) where stmt REVOKEs/GRANTs `increment_team_xp` (CREATEd at `20260720000012`) in an earlier migration_
  - _Expected_Behavior: statement no-ops on fresh replay (function absent), executes on production_
  - _Preservation: production grant state unchanged because predicate true_
  - _Files: `supabase/migrations/20260504032951_revoke_anon_execute_on_security_definer_functions.sql`, `supabase/migrations/20260504033048_revoke_public_execute_on_security_definer_functions.sql`, `supabase/migrations/20260504041233_revoke_authenticated_execute_internal_functions.sql`_
  - _Requirements: 2.6, 2.9, 2.10, 2.11_
  - _Advances: Property 1 (Fix Checking), Property 2 (Preservation)_

- [ ] 5. CLASS C — guard `REVOKE` on the phantom function `rls_auto_enable`

  - Wrap each REVOKE in a `DO $$ BEGIN IF to_regprocedure('public.rls_auto_enable()') IS NOT NULL THEN EXECUTE '...'; END IF; END $$;` block
  - Apply to: `20260504032951...sql:13`, `20260504033048...sql:7`, `20260504041233...sql:17`, `20260504041233...sql:24`
  - Use the exact zero-arg signature `rls_auto_enable()`; the block no-ops everywhere the function is absent (it is never CREATEd in the chain) and still applies on any instance that has the leftover object
  - _Bug_Condition: isBugCondition(stmt) where stmt REVOKEs `rls_auto_enable()` which is never created in the chain (createdAt = UNDEFINED)_
  - _Expected_Behavior: statement no-ops on fresh replay (function absent); applies on instances where the leftover exists_
  - _Preservation: requirement 2.34 — guarded so it no-ops on clean replay yet still applies where the function exists_
  - _Files: `supabase/migrations/20260504032951_revoke_anon_execute_on_security_definer_functions.sql`, `supabase/migrations/20260504033048_revoke_public_execute_on_security_definer_functions.sql`, `supabase/migrations/20260504041233_revoke_authenticated_execute_internal_functions.sql`_
  - _Requirements: 2.7, 2.8, 2.12, 2.13, 2.34_
  - _Advances: Property 1 (Fix Checking), Property 2 (Preservation)_

- [ ] 6. Create the corrective migration that re-asserts CLASS D/E/F final state

  - **CRITICAL**: Guarding the early D/E/F statements only stops the abort — on a fresh replay the table does not yet exist so the guarded block no-ops and the object is NEVER created. This NEW migration restores the correct final state so a DR restore is not missing FK indexes and RLS SELECT policies.
  - Create NEW file `supabase/migrations/20260821000005_replay_safe_reassert_tutor_indexes_policies_columns.sql` (timestamp strictly after `20260821000004`, after every referenced table is created)
  - Every statement MUST be idempotent and replay-safe; on production each is a no-op or same-definition rewrite

  - [ ] 6.1 Re-assert CLASS D FK indexes idempotently

    - `CREATE INDEX IF NOT EXISTS` for every index originally in `20260504033325` on `teacher_handoff_requests`, `tutor_llm_logs`, `tutor_plan_updates` (all 7 indexes)
    - _Bug_Condition: CREATE INDEX on tables CREATEd at `20260820*`_
    - _Files: `supabase/migrations/20260821000005_replay_safe_reassert_tutor_indexes_policies_columns.sql`_
    - _Requirements: 2.14, 2.15, 2.16_

  - [ ] 6.2 Re-assert CLASS E RLS SELECT policies in their FINAL initplan-wrapped form

    - For each policy use `DROP POLICY IF EXISTS <name> ON public.<table>;` then `CREATE POLICY ...` using the `20260602103939` initplan-wrapped definitions verbatim (the last-writer authoritative form)
    - Cover `tutor_conversations`, `tutor_messages`, `tutor_usage_limits`, `tutor_llm_logs`, `tutor_plan_updates`, `teacher_handoff_requests`, `course_material_embeddings`
    - _Bug_Condition: CREATE POLICY on tables CREATEd at `20260820*`_
    - _Files: `supabase/migrations/20260821000005_replay_safe_reassert_tutor_indexes_policies_columns.sql`_
    - _Requirements: 2.17, 2.18, 2.19, 2.20, 2.21, 2.22, 2.23, 2.26, 2.27, 2.28, 2.29, 2.30, 2.31_

  - [ ] 6.3 Re-assert CLASS F columns and publication membership idempotently
    - `ALTER TABLE public.tutor_conversations ADD COLUMN IF NOT EXISTS recommended_persona ...` and `ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS avatar_letter ...` (matching the original `20260526145520` definitions)
    - Guarded `ALTER PUBLICATION supabase_realtime ADD TABLE public.challenge_participants` via a `DO`-block that checks `to_regclass('public.challenge_participants') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='challenge_participants')`
    - _Bug_Condition: ALTER TABLE ADD COLUMN / ALTER PUBLICATION ADD TABLE on tables CREATEd later (`20260820000003` / `20260720000003`)_
    - _Files: `supabase/migrations/20260821000005_replay_safe_reassert_tutor_indexes_policies_columns.sql`_
    - _Requirements: 2.24, 2.25_

- [ ] 7. CLASS D — guard the early `CREATE INDEX` statements in `20260504033325`

  - Wrap each early `CREATE INDEX` in a `DO $$ BEGIN IF to_regclass('public.<table>') IS NOT NULL THEN EXECUTE 'CREATE INDEX IF NOT EXISTS ...'; END IF; END $$;` block
  - Apply to `20260504033325_add_missing_fk_indexes.sql:7-13` for `teacher_handoff_requests`, `tutor_llm_logs`, `tutor_plan_updates`
  - The corrective migration (task 6.1) guarantees the indexes still exist after a fresh replay
  - _Bug_Condition: isBugCondition(stmt) — CREATE INDEX before table CREATE_
  - _Expected_Behavior: early statement no-ops on fresh replay; index created later by corrective migration; on production index already exists so guard runs IF NOT EXISTS (no-op)_
  - _Preservation: production index state unchanged_
  - _Files: `supabase/migrations/20260504033325_add_missing_fk_indexes.sql`_
  - _Requirements: 2.14, 2.15, 2.16_

- [ ] 8. CLASS E — guard the early `CREATE POLICY` statements

  - Wrap each early `CREATE POLICY` in a `DO $$ BEGIN IF to_regclass('public.<table>') IS NOT NULL THEN EXECUTE 'CREATE POLICY ...'; END IF; END $$;` block (preserve each policy's original statement text)
  - Apply to `20260520063920_add_missing_select_rls_policies_batch1.sql:15,20,29`; `20260520063937_add_missing_select_rls_policies_batch2.sql:2,12,17,22`; `20260602103939_task12_rls_initplan_wrap_tutor_content_donations.sql:5,9,13,17,21,25`
  - The corrective migration (task 6.2) re-asserts the final initplan-wrapped policy form after the tables exist
  - _Bug_Condition: isBugCondition(stmt) — CREATE POLICY before table CREATE_
  - _Expected_Behavior: early statement no-ops on fresh replay; final policy form re-asserted by corrective migration; on production the guard predicate is true so the original statement still executes_
  - _Preservation: production policy state unchanged_
  - _Files: `supabase/migrations/20260520063920_add_missing_select_rls_policies_batch1.sql`, `supabase/migrations/20260520063937_add_missing_select_rls_policies_batch2.sql`, `supabase/migrations/20260602103939_task12_rls_initplan_wrap_tutor_content_donations.sql`_
  - _Requirements: 2.17, 2.18, 2.19, 2.20, 2.21, 2.22, 2.23, 2.26, 2.27, 2.28, 2.29, 2.30, 2.31_

- [ ] 9. CLASS F — guard the early `ALTER TABLE ADD COLUMN` / `ALTER PUBLICATION ADD TABLE`

  - Wrap `20260526115420_add_challenge_participants_to_realtime.sql:1` in a `DO`-block guarded by `to_regclass('public.challenge_participants') IS NOT NULL` (plus the `pg_publication_tables NOT EXISTS` check to stay idempotent)
  - Wrap `20260526145520_add_teams_avatar_letter_and_tutor_recommended_persona.sql:1` `ALTER TABLE ... ADD COLUMN` in a `DO`-block guarded by `to_regclass('public.tutor_conversations') IS NOT NULL` (use `ADD COLUMN IF NOT EXISTS`)
  - The corrective migration (task 6.3) re-asserts the column and publication membership after the tables exist
  - _Bug_Condition: isBugCondition(stmt) — ALTER on tables CREATEd later_
  - _Expected_Behavior: early statement no-ops on fresh replay; column/membership re-asserted by corrective migration; on production the guard predicate is true so it still applies_
  - _Preservation: production column + realtime membership state unchanged_
  - _Files: `supabase/migrations/20260526115420_add_challenge_participants_to_realtime.sql`, `supabase/migrations/20260526145520_add_teams_avatar_letter_and_tutor_recommended_persona.sql`_
  - _Requirements: 2.24, 2.25_

- [ ] 10. Fix verification — run the authoritative oracle and the Vitest guard

  - [ ] 10.1 Confirm the bug-condition oracle is now CLEAN

    - **Property 1: Fix Checking** - Fresh replay completes with zero too-early references
    - **IMPORTANT**: Re-run the SAME oracle from task 1 — do NOT write a new checker
    - Run `node scripts/check-migration-replay-order.mjs` (`npm run db:check-replay`)
    - **EXPECTED OUTCOME**: prints `CLEAN` and exits with code **0** (zero too-early references) — confirms all 35 findings are resolved
    - _Requirements: 2.32_
    - _Validates: Property 1 (Fix Checking)_

  - [ ] 10.2 Confirm the Vitest replay-order guard is GREEN
    - **Property 1: Fix Checking** - Guard passes (CLEAN + non-vacuous synthetic-violation assertion)
    - Run `scripts/audit/__tests__/migration-replay-order.test.ts`
    - **EXPECTED OUTCOME**: both the CLEAN assertion (checker exits 0) and the non-vacuous synthetic-violation assertion pass
    - _Requirements: 2.33_
    - _Validates: Property 1 (Fix Checking)_

- [ ] 11. Preservation verification — confirm no regressions in reconciled / unrelated migrations

  - [ ] 11.1 Confirm reconciled and unrelated migrations are unflagged and unchanged

    - **Property 2: Preservation** - Non-buggy statements and production state are unchanged
    - **IMPORTANT**: Re-confirm the baseline captured in task 2 — the same non-buggy statements remain unflagged
    - Confirm the `20260609*` and `20260821*` reconciled migrations are not reordered, not altered in effect, and not newly flagged
    - Confirm the new corrective migration `20260821000005` targets a disjoint object set (does NOT touch the parent RLS or challenge self-join policies created by `20260821*`)
    - Confirm `git diff` on `src/types/database.ts` is empty (file untouched, never hand-edited)
    - Confirm no historical migration was renamed or reordered; edits only made statements replay-safe with identical production effect
    - **EXPECTED OUTCOME**: non-buggy partition unchanged; production logical state preserved
    - _Requirements: 3.1, 3.2, 3.6, 3.8, 3.9_
    - _Validates: Property 2 (Preservation)_

  - [ ] 11.2 Run the full pre-push gate
    - **Property 2: Preservation** - lint / type-check / test suite stay green
    - Run `npm run lint` (zero warnings), `npx tsc --noEmit` (no type errors), `npm test` (full Vitest suite green)
    - **EXPECTED OUTCOME**: all three pass — confirms no unrelated breakage
    - _Requirements: 3.7_
    - _Validates: Property 2 (Preservation)_

- [ ] 12. Class-0 re-verification — confirm checked-and-cleared candidates remain non-issues

  - Re-confirm ENUM new-value safety: `20260620000001_add_sub_clo_support.sql` runs `ALTER TYPE outcome_type ADD VALUE IF NOT EXISTS 'SUB_CLO'` and the new value is used only as a runtime string comparison inside the function body — confirm no same-transaction DML uses the new value (no `55P04`)
  - Re-confirm TRIGGER co-location: every `CREATE TRIGGER ... EXECUTE FUNCTION` is in the same migration as its function CREATE (e.g. `set_tutor_conversations_updated_at` / `sync_tutor_conversation_stats` in `20260820000003`) — no trigger-before-function class
  - Re-confirm `DROP ... IF EXISTS` spans remain safe (masked by the checker, never abort)
  - Re-confirm platform/extension tables (`auth.*`, `storage.*`, `cron.*`, `realtime.*`) remain untracked and unflagged; only the tracked `challenge_participants` table-add is the fixable target
  - **Exhaustive cross-class probe (performed):** the rigorous-testing pass additionally probed for too-early foreign keys, `ENABLE ROW LEVEL SECURITY`, view definitions, and table-level `GRANT`s — every such statement came back co-located with (or after) its target object's CREATE and clean. Re-confirm no too-early FK / RLS-enable / view / table-grant class exists (the six-class taxonomy A–F remains complete; no seventh class)
  - _Requirements: 3.3, 3.5_
  - _Advances: Property 2 (Preservation)_

  - [ ] 12.1 (OPTIONAL follow-up — NON-blocking) Companion check for the search_path-survives-replay invariant (FINDING 2)
    - **This is a design-note / recommendation, NOT a required code task — mark complete by acknowledging, or implement only if time allows.**
    - **Detector limitation:** the static checker `scripts/check-migration-replay-order.mjs` keys each function CREATE by its EARLIEST timestamp and only flags references occurring earlier than that earliest CREATE. It therefore CANNOT catch the FINDING 1 class — a LATER, unhardened `CREATE OR REPLACE` silently overriding the `search_path` set by an earlier `ALTER FUNCTION ... SET search_path`. The checker can print CLEAN while the FINDING 1 invariant is still violated.
    - **Recommendation:** add a companion check (or extend the checker) that asserts every function targeted by an `ALTER FUNCTION ... SET search_path` has that setting present in its LAST `CREATE OR REPLACE` in replay order, giving the static oracle coverage of the search_path-survives-replay invariant instead of relying on manual review.
    - Until that exists, treat the static checker as necessary-but-not-sufficient for the search_path invariant and rely on the task 3.3 Property 2 verification (`proconfig` contains `search_path=` in the final replayed definition).
    - _Requirements: 3.10_
    - _Advances: Property 2 (Preservation)_

- [ ] 13. Checkpoint — ensure all tests pass and the chain is replay-safe
  - Confirm `npm run db:check-replay` prints CLEAN + exits 0, the Vitest replay-order guard is green, and the full pre-push gate (`npm run lint`, `npx tsc --noEmit`, `npm test`) passes
  - Optional end-to-end: `npx supabase db reset` / Supabase Preview replays the chain from an empty DB without `42883`/`42P01` (note: the Docker replay can hang at "Initialising schema…" on some Windows hosts — the static checker is the authoritative local gate)
  - Ensure all tests pass; ask the user if questions arise
  - _Requirements: 2.32, 2.33, 3.7_

## Notes

- **Methodology:** Task 1 (exploration) and task 2 (preservation) MUST run on the UNFIXED chain before any fix. The exploration "test" is the checker output — it is EXPECTED to report 35 findings / exit 1, and that failing result is the success criterion proving the bug exists.
- **Property 1 (Fix Checking)** is validated by task 10: the oracle prints CLEAN + exits 0 and the Vitest guard passes.
- **Property 2 (Preservation)** is validated by tasks 11–12 and by task 3.3: reconciled/unrelated migrations unflagged and unchanged, `src/types/database.ts` untouched, lint/tsc/test green, and every CLASS A function's final replayed `pg_proc.proconfig` carries a `search_path=` entry (FINDING 1).
- **CLASS A last-writer correction (FINDING 1):** `20260601110014` is NOT the last-writer for the CLASS A functions. Each of the five functions is hardened at its TRUE last-writer (greatest-timestamp `CREATE OR REPLACE`) per task 3.2, with body table references `public.`-qualified so they resolve under `search_path = ''`. Task 3.3 verifies the hardening survives the last-writer CREATE on a fresh replay.
- **Corrective migration is mandatory for D/E/F:** guarding alone stops the abort but never creates the object on a fresh replay; `20260821000005` re-asserts the indexes, final initplan-wrapped policies, columns, and publication membership so a DR restore reaches the correct final state.
- **Hard constraints (every task):** never hand-edit or overwrite `src/types/database.ts`; never reorder or rename historical migration files; keep production logical effect identical (guards evaluate true where objects exist); every edited statement is idempotent and replay-safe.
- **Authoritative local gate:** `npm run db:check-replay` (static checker) — the Docker `supabase db reset` is optional and can hang at "Initialising schema…" on some Windows hosts.
- **Detector limitation (FINDING 2 — optional follow-up, task 12.1):** the static checker keys CREATEs by EARLIEST timestamp and cannot catch a later unhardened re-CREATE overriding an earlier `ALTER FUNCTION ... SET search_path`. A companion check that asserts the setting is present in each function's LAST `CREATE OR REPLACE` is recommended but NON-blocking; until it exists, rely on the task 3.3 `proconfig` verification.
