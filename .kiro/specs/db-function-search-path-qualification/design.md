# DB Function search_path Qualification Bugfix Design

## Overview

A past hardening migration, `supabase/migrations/20260504032936_fix_mutable_search_paths.sql`, applied `SET search_path = ''` to 17 `public` functions to clear the `function_search_path_mutable` advisor warning. Several of those functions reference user tables and helper functions by **unqualified** name (e.g. `social_challenges` rather than `public.social_challenges`). Under an empty `search_path`, Postgres has no schema to resolve bare identifiers against, so those functions raise `undefined_table` (42P01) or `undefined_function` (42883) **when invoked at runtime**. This is the identical root cause already fixed for `process_marketplace_purchase` (the "Buy Freeze" bug, fixed in `20260601004718`).

The same migration also `ALTER`s 5 functions **before** they are `CREATE`d by later-timestamped migrations. A clean from-scratch replay (Supabase Preview branch, `supabase db reset`, disaster recovery, `supabase db diff --linked`) therefore **aborts hard** at `20260504032936` statement 6 with `ERROR: could not find a function named "public.validate_sub_clo_weights" (SQLSTATE 42883)`. Because the replay aborts there, no clean environment can be rebuilt from the current migrations, and later migrations are never reached — so additional drift downstream of that abort is currently unobserved. A separate, already-surfaced drift exists in `social_challenges`: the recorded migrations build a table that does not match the LIVE schema.

The fix has three parts, executed in a specific order:

- **Part A — Function qualification (runtime correctness, the live fix):** recreate the 10 confirmed-broken functions with fully `public.`-qualified bodies while retaining `SET search_path = ''` and the exact `SECURITY DEFINER`/`SECURITY INVOKER`, volatility, ownership, and grants currently deployed. Shipped to production as **Part C** (a new forward migration), because production will not re-run historical files.
- **Part B — Migration replay integrity:** bake `SET search_path = ''` into the `CREATE OR REPLACE` of the 5 mis-ordered functions and remove their too-early `ALTER`s from `20260504032936`; harden + qualify the badge functions at their LAST create; reconcile `social_challenges` drift in the historical migrations; then iterate `supabase db diff --linked` until it completes with an empty diff, fixing each newly surfaced drift/abort point along the way.
- **Part C — Production forward migration:** a single new forward migration that `CREATE OR REPLACE`s the 10 broken functions on production (the historical edits in Part A/B affect only fresh replays).

**Critical accuracy note (drives the whole design):** the LIVE definitions have drifted from the migration text. The clearest proof is `get_wellness_aggregate_stats` — its latest migration file (`20260331235836`) defines it as `LANGUAGE sql ... SET search_path = public` with qualified bodies, yet the live function is `SECURITY DEFINER`, `LANGUAGE plpgsql`, carries `search_path = ''`, and calls **unqualified** `auth_institution_id()`. So the Part C forward migration MUST derive each function body from the **currently-deployed** definition (`pg_get_functiondef`), not from any migration file. Migration files are the source of truth only for what a fresh replay builds (Part B); the LIVE catalog is the source of truth for what production currently runs (Part C).

## Glossary

- **Bug_Condition (C)**: an invocation that forces resolution of an unqualified user object under empty `search_path`, OR a clean from-scratch replay that reaches an `ALTER FUNCTION` before that function's `CREATE`, OR a clean replay whose final schema diverges from live production.
- **Property (P)**: the desired behavior — every hardened function resolves all objects `public.`-qualified and returns the same correct result it produced before; a clean replay completes and reproduces production exactly.
- **Preservation**: for every non-buggy input, `F'(X) = F(X)`; security model, volatility, ownership, grants, trigger semantics, append-only invariants, and the live schema/data remain unchanged.
- **F / F'**: the original (broken) function / the fixed (qualified, still-hardened) function.
- **Qualified reference**: a `schema.object` name (`public.marketplace_items`); built-ins (`now()`, `count()`, `gen_random_uuid()`, `date_trunc()`, `coalesce()`, `greatest()`, `array_position()`) resolve from `pg_catalog` automatically and need no change.
- **Probe**: a read-only check that calls a function (or fires its trigger via real DML) inside a rolled-back transaction with `set local search_path = ''`, asserting it resolves (no 42P01/42883).
- **Replay / shadow DB**: a from-scratch application of every migration into a throwaway Postgres (Docker + Supabase CLI 2.102.0) via `supabase db diff --linked`.
- **`badge_auto_archive` / `badge_spotlight_auto_rotate`**: cron functions in `20260720000008` / `20260720000007` that re-`CREATE OR REPLACE` without `search_path`, overwriting the earlier `ALTER` so they are currently mutable in prod (advisor WARN) AND reference unqualified tables.

## Bug Details

### Bug Condition

The bug manifests in three ways: (1) a hardened `public` function with `search_path = ''` reaches an unqualified user-object reference at runtime and cannot resolve it; (2) a clean replay runs `ALTER FUNCTION f SET search_path = ''` before `f` has been created; (3) a clean replay's final schema does not match live production.

**Formal Specification:**

```
FUNCTION isBugCondition(X)
  INPUT: X is a runtime function invocation OR a migration-replay event
  OUTPUT: boolean

  runtimeBug ←
        X invokes a public function F
    AND F has SET search_path = ''
    AND F's body references >= 1 user table/function by unqualified name
    AND the invocation reaches that reference

  replayOrderingBug ←
        X is a clean from-scratch replay
    AND migration 20260504032936 runs ALTER FUNCTION f
    AND f has not yet been CREATEd at that point

  replayDriftBug ←
        X is a clean from-scratch replay
    AND final_state(X) ≠ live_production_schema

  RETURN runtimeBug OR replayOrderingBug OR replayDriftBug
END FUNCTION
```

### Part A — The 10 confirmed-broken functions and their exact unqualified references

Each function is recreated with every user object below `public.`-qualified, while preserving the deployed `SET search_path = ''`, security mode, volatility, ownership, and grants. Built-ins are left unqualified (they resolve from `pg_catalog`).

| #   | Function (signature)                        | Security mode (preserve)                                         | Unqualified refs to qualify → `public.`                                                                                                                                                                      | Last/source CREATE migration                        |
| --- | ------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------- |
| 1   | `get_effective_price(uuid, uuid)`           | `SECURITY INVOKER`, `STABLE`                                     | `marketplace_items`, `sale_event_items` (alias `sei`), `sale_events` (alias `se`)                                                                                                                            | `20260412192010` → `20260503100010`                 |
| 2   | `get_xp_balance(uuid)`                      | `SECURITY INVOKER`, `STABLE`                                     | `xp_transactions`, `xp_purchases`                                                                                                                                                                            | `20260412191955` → `20260503100009`                 |
| 3   | `get_wellness_aggregate_stats(uuid)`        | **`SECURITY DEFINER`**, `plpgsql` (per LIVE, not migration text) | `wellness_habit_logs` (alias `whl`), `profiles` (alias `p`), and the helper call `auth_institution_id()` → `public.auth_institution_id()`                                                                    | live body drifted; derive from `pg_get_functiondef` |
| 4   | `seed_marketplace_items(uuid)`              | `SECURITY INVOKER`, `plpgsql`                                    | `marketplace_items` (all 5 `INSERT ... INTO marketplace_items` statements)                                                                                                                                   | `20260412192106` → `20260503100012`                 |
| 5   | `delete_department_if_no_programs(uuid)`    | **`SECURITY DEFINER`**, `plpgsql`                                | `departments` (in `DELETE FROM`), `programs` (in `NOT EXISTS` subquery)                                                                                                                                      | `20260329000001`                                    |
| 6   | `validate_sub_clo_weights()` (trigger)      | `SECURITY INVOKER`, `plpgsql`                                    | `learning_outcomes` (the `SELECT type INTO parent_type FROM learning_outcomes`)                                                                                                                              | `20260620000001`                                    |
| 7   | `enforce_max_active_challenges()` (trigger) | `SECURITY INVOKER`, `plpgsql`                                    | `social_challenges` (the `SELECT COUNT(*) FROM social_challenges`)                                                                                                                                           | `20260720000003`                                    |
| 8   | `sync_tutor_conversation_stats()` (trigger) | `SECURITY INVOKER`, `plpgsql`                                    | `tutor_conversations` (the three `UPDATE tutor_conversations` statements)                                                                                                                                    | `20260820000003`                                    |
| 9   | `badge_auto_archive()`                      | **`SECURITY DEFINER`**, `void`, `plpgsql`                        | `badges` (the `UPDATE badges`) and (none else; only `badges`). NOTE the investigation lists `institutions` for parity — confirm against live body; qualify whatever user tables the deployed body references | `20260720000008` (LAST create; currently mutable)   |
| 10  | `badge_spotlight_auto_rotate()`             | **`SECURITY DEFINER`**, `void`, `plpgsql`                        | `institutions` (`FOR inst IN SELECT id FROM institutions`), `badge_spotlight_schedule` (the `SELECT EXISTS`, `SELECT category`, and `INSERT INTO`)                                                           | `20260720000007` (LAST create; currently mutable)   |

> **`badge_auto_archive` accuracy:** the migration body at `20260720000008` references only `badges` (via `UPDATE badges`). The investigation summary lists `badges, institutions`. Because the LIVE body is authoritative for Part C and may differ, the implementer MUST read `pg_get_functiondef('public.badge_auto_archive'::regproc)` and qualify exactly the user tables it contains — neither more nor fewer. The same applies to every function: **qualify what the deployed body actually references.**

**Formal trigger/callable check (Property 1 target):**

```
FUNCTION expectedBehavior(result)
  RETURN no_error(result)                       // no 42P01 / 42883
     AND result = functionally_correct_value     // same as pre-hardening behavior
     AND F' still has SET search_path = ''        // hardening preserved
     AND F'.prosecdef = F.prosecdef               // SECURITY DEFINER/INVOKER unchanged
END FUNCTION
```

### Functions that MUST NOT be functionally changed

These resolved as runtime-correct and are explicitly out of scope for body changes:

- **5 NEW/`now()`/`RAISE`-only trigger functions** (no user-table refs): `set_tutor_conversations_updated_at()`, `trg_review_schedules_set_updated_at()`, `update_graduate_attributes_updated_at()`, `update_marketplace_items_updated_at()`, `prevent_xp_purchases_delete()`. Of these, `set_tutor_conversations_updated_at` and `update_graduate_attributes_updated_at` are touched **only** in Part B (to bake `search_path` into their CREATE for replay ordering) — their bodies are unchanged.
- **`rls_auto_enable`** (`search_path = pg_catalog`): uses only `pg_catalog` builtins + dynamic `EXECUTE`; confirmed SAFE; no change.
- **`process_marketplace_purchase(uuid,uuid,uuid)`**: already fixed in `20260601004718`; not touched.

### Examples (bug manifestation)

- `SELECT public.get_xp_balance('<student>')` under `set search_path=''` → `ERROR: relation "xp_transactions" does not exist (42P01)`. Expected: returns the integer balance.
- `INSERT INTO public.learning_outcomes (... type='SUB_CLO' ...)` fires `validate_sub_clo_weights()` → `ERROR: relation "learning_outcomes" does not exist (42P01)`, so Sub-CLO creation fails. Expected: validation runs, insert succeeds.
- `SELECT public.get_wellness_aggregate_stats('<inst>')` → `ERROR: function auth_institution_id() does not exist (42883)` because the helper call is unqualified. Expected: returns aggregate rows (or raises the intentional `unauthorized: institution mismatch` guard).
- Clean replay reaches `20260504032936` → `ERROR: could not find a function named "public.validate_sub_clo_weights" (42883)` at statement 6; replay aborts.
- Clean replay of `20260502103758_align_social_challenges_with_design_spec.sql` logs `column "reward_type" of social_challenges does not exist, skipping` (and `reward_value`, `notification_sent_90`, trigger, function) → final `social_challenges` differs from live → non-empty `db diff`.

## Expected Behavior

### Preservation Requirements

**Unchanged behaviors (must continue to work exactly as before):**

- Every affected function returns identical functionally-correct results for valid inputs (effective price, XP balance, wellness stats, seeded items, department-delete guard, Sub-CLO validation, active-challenge enforcement, tutor stat sync, badge archive/rotation).
- `SECURITY DEFINER`/`SECURITY INVOKER`, volatility (`STABLE` etc.), function ownership, and `GRANT`/`REVOKE` privileges are byte-for-byte preserved.
- Trigger timing/level (`BEFORE`/`AFTER`, `FOR EACH ROW`), `NEW`/`OLD`/`TG_OP` handling, and `RAISE` behavior are unchanged.
- Append-only invariants on `xp_transactions`, `xp_purchases`, `audit_logs`, evidence records are honored (no UPDATE/DELETE introduced).
- The `SET search_path = ''` hardening introduced by `20260504032936` is **not reverted or weakened** on any function that already had it.
- The LIVE production schema and all data are unchanged. Reconciliation edits migration files only; it runs no `ALTER`/`DROP`/data-rewriting DDL against production.
- `process_marketplace_purchase` behavior from `20260601004718` is not regressed.

**Scope:** All inputs that do NOT meet `isBugCondition` are completely unaffected. This includes valid invocations of the 10 functions, the 5 runtime-safe trigger functions, `rls_auto_enable`, and every database object not named in this document.

## Hypothesized Root Cause

1. **Hardening applied without qualifying bodies.** `20260504032936` added `SET search_path = ''` to 17 functions but did not rewrite their bodies to schema-qualify object references. Empty `search_path` removes the implicit `public` resolution, so any bare table/function name throws. (Primary cause for clauses 1.1–1.10.)

2. **`ALTER`-before-`CREATE` ordering.** The hardening migration is timestamped `20260504032936` but 5 of its targets are first created by later migrations (`20260620000001`, `20260620000002`, `20260720000003`, `20260820000003`). On an already-live DB the `ALTER`s succeeded (functions existed); on a fresh replay they don't exist yet → 42883 abort. (Cause for clause 1.11.)

3. **Later re-CREATE overwrites the hardening.** `badge_auto_archive`/`badge_spotlight_auto_rotate` are re-created WITHOUT `search_path` in `20260720000008`/`20260720000007`, which run after `20260504032936`, so production ends up with mutable search_path on these two (advisor WARN) AND unqualified bodies. (Cause for clauses 1.9, 1.10, 1.12.)

4. **Out-of-band schema edits not captured in migrations.** `social_challenges` was reshaped live (early create `20260411221627`, column adds `20260415071331`, align `20260502103758`, re-create `20260720000003`) such that the recorded migration set builds a different table than production. Later migrations were written against the live shape. (Cause for clause 1.13.) The same out-of-band drift explains why `get_wellness_aggregate_stats`'s live body differs from its migration text — confirming Part C must read live definitions.

5. **Unknown downstream drift (must be re-investigated).** Because the replay aborts at `20260504032936`, every migration after it has **never been executed on a clean DB**. Additional ordering or drift failures may exist past that point and can only be found by iterating the replay after the abort is removed.

## Correctness Properties

Property 1: Bug Condition — Hardened functions resolve under empty search_path

_For any_ invocation of one of the 10 functions where the bug condition holds (`isBugCondition` returns true for a runtime invocation), the fixed function SHALL resolve every user object `public.`-qualified, return the same functionally-correct value it produced before the regression, raise no `undefined_table`/`undefined_function` error, and still carry `SET search_path = ''` with its original `SECURITY DEFINER`/`SECURITY INVOKER` mode.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10**

Property 2: Bug Condition — Clean replay completes and reproduces production

_For any_ clean from-scratch migration replay (the bug condition holds as a replay event), the fixed migration set SHALL complete without the 42883 abort at `20260504032936`, build each function in `CREATE`-before-`ALTER` order, reconcile drifted tables (starting with `social_challenges`) to match the LIVE schema, and cause `supabase db diff --linked` to complete and report an empty/clean diff.

**Validates: Requirements 2.11, 2.13**

Property 3: Bug Condition — Advisor hardening resolved correctly

_For any_ run of the Supabase database linter after the fix, the system SHALL report no `function_search_path_mutable` WARN for `badge_auto_archive` or `badge_spotlight_auto_rotate` (each qualified first, then hardened), achieving the non-mutable posture without breaking the function.

**Validates: Requirements 2.12**

Property 4: Preservation — Identical behavior for non-buggy inputs

_For any_ input where the bug condition does NOT hold (`isBugCondition` returns false) — valid invocations of any affected function, the 5 runtime-safe trigger functions, `rls_auto_enable`, `process_marketplace_purchase`, and every out-of-scope object — the fixed code SHALL produce exactly the same result as the original, preserving security mode, volatility, ownership, grants, trigger semantics, append-only invariants, the live schema and data, and the existing `search_path = ''` hardening.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11**

## Fix Implementation

### Part A / Part C — Qualify + harden the 10 functions, ship as a forward migration

**File (new, production fix):** `supabase/migrations/<timestamp>_fix_function_search_path_qualification.sql` (use a timestamp later than the newest existing migration).

**Method (per function):**

1. Read the **deployed** definition: `SELECT pg_get_functiondef(p.oid) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='<fn>';` — and capture `prosecdef`, `provolatile`, `proconfig`, `proowner`, and `proacl`.
2. Copy that exact body, then schema-qualify every user-table/function reference with `public.` (leave built-ins alone).
3. Emit `CREATE OR REPLACE FUNCTION ...` that preserves the original `LANGUAGE`, volatility, `SECURITY DEFINER`/`INVOKER`, and includes `SET search_path = ''`.
4. Do not change argument names, return types, or trigger attachments.

**Specific qualifications (the live fix content):**

1. `get_effective_price` → `public.marketplace_items`, `public.sale_event_items`, `public.sale_events`.
2. `get_xp_balance` → `public.xp_transactions`, `public.xp_purchases`.
3. `get_wellness_aggregate_stats` → `public.wellness_habit_logs`, `public.profiles`, `public.auth_institution_id()`; keep `SECURITY DEFINER` and the `unauthorized: institution mismatch` guard.
4. `seed_marketplace_items` → `public.marketplace_items` in all five `INSERT`s.
5. `delete_department_if_no_programs` → `public.departments`, `public.programs`.
6. `validate_sub_clo_weights` → `public.learning_outcomes`.
7. `enforce_max_active_challenges` → `public.social_challenges`.
8. `sync_tutor_conversation_stats` → `public.tutor_conversations` (all three UPDATEs).
9. `badge_auto_archive` → qualify exactly the user tables in the deployed body (`public.badges`, and `public.institutions` only if present).
10. `badge_spotlight_auto_rotate` → `public.institutions`, `public.badge_spotlight_schedule`.

Re-apply grants only if `pg_get_functiondef` shows `CREATE OR REPLACE` changed them (it does not change existing grants, so normally no `GRANT` needed). Do not add `REVOKE`/`GRANT` unless preserving an existing one.

### Part B — Migration replay integrity (edits to historical files; affects fresh replay only)

1. **Remove the 5 too-early `ALTER`s from `20260504032936`:** delete the lines for `validate_sub_clo_weights`, `update_graduate_attributes_updated_at`, `enforce_max_active_challenges`, `sync_tutor_conversation_stats`, `set_tutor_conversations_updated_at`. Keep the other `ALTER`s (their targets exist by that point), but verify each remaining target also exists at that timestamp during the replay loop.
2. **Bake `SET search_path = ''` into each function's own CREATE:**
   - `20260620000001` — `validate_sub_clo_weights()` + qualify `public.learning_outcomes`.
   - `20260620000002` — `update_graduate_attributes_updated_at()` (NEW/now() only; just add `SET search_path = ''`, no body change).
   - `20260720000003` — `enforce_max_active_challenges()` + qualify `public.social_challenges`.
   - `20260820000003` — `sync_tutor_conversation_stats()` + qualify `public.tutor_conversations`, AND `set_tutor_conversations_updated_at()` (NEW/now() only; add `SET search_path = ''`).
     Use `CREATE OR REPLACE FUNCTION ... LANGUAGE plpgsql SET search_path = '' AS $$...$$;`.
3. **Harden + qualify the badge functions at their LAST create** (so the final replay state is hardened, not overwritten): edit `20260720000007` (`badge_spotlight_auto_rotate`) and `20260720000008` (`badge_auto_archive`) to add `SET search_path = ''` and qualify their user-table references. This is the replay analogue of the Part C live fix for these two.
4. **Reconcile `social_challenges` drift so a fresh replay reproduces LIVE.** LIVE columns: `goal_target`, `participation_mode`, `reward_xp`, `reward_badge_id`, `institution_id` (and base `id`, `title`, `description`, `challenge_type`, `course_id`, `start_date`, `end_date`, `status`, `created_by`, `created_at`, `updated_at`). LIVE does NOT have `goal_metric`, `reward_type`, `reward_value`, `notification_sent_90`. The replay-built table currently diverges because:
   - `20260720000003_create_social_challenges.sql` (a `CREATE TABLE IF NOT EXISTS`) defines the legacy shape (`goal_metric`, `reward_type`, `reward_value`, `notification_sent_90`) and, on replay, is a no-op if the table already exists from `20260411221627` — but its trigger/function still create the legacy `enforce_max_active_challenges`.
   - `20260502103758_align_...` tries to `DROP COLUMN IF EXISTS` the legacy columns and `DROP ... enforce_max_active_challenges`, but on a fresh DB those columns/objects don't exist yet at that timestamp (they're added later/elsewhere), producing the "does not exist, skipping" notices and leaving the legacy columns to be created afterward by `20260720000003`.
     **Approach (decided):** correct the historical migrations so the built table converges on the LIVE shape, choosing the option that keeps timestamps monotonic and avoids touching production:
   - Edit `20260720000003_create_social_challenges.sql` so its `CREATE TABLE` (and its trigger/function) match the LIVE column set — drop the legacy `goal_metric`/`reward_type`/`reward_value`/`notification_sent_90` columns from the definition and align `challenge_type`/`status` CHECKs and `goal_target` type with the post-align live state; ensure `institution_id`, `participation_mode`, `reward_xp`, `reward_badge_id`, `updated_at` are present (consistent with the `20260415071331` column adds).
   - Make `20260502103758_align_...` a clean no-op-or-consistent step on the corrected lineage (its `DROP COLUMN IF EXISTS` become harmless; remove or guard statements that assume legacy columns so no "does not exist" noise remains and the end state is unchanged).
   - Do NOT alter `20260411221627` data semantics beyond what's needed; prefer changing the latest-touching migration so earlier seeds (`20260530091425`, which inserts `participation_mode`, `reward_xp`) still apply cleanly.
     The exact edits are confirmed empirically by the iterative replay loop below, since the live column lineage spans several migrations.
5. **Iterative replay loop (REQUIRED — the investigation must be re-run past the abort).** Because the replay currently aborts at `20260504032936`, migrations after it have never run on a clean DB; unknown ordering/drift failures may exist downstream. Iterate:
   ```
   REPEAT
     run `supabase db diff --linked`
     IF it aborts at migration M with an error:
        diagnose (ALTER-before-CREATE? missing object? drift?)
        fix migration M (or the migration that should have created the object), keeping timestamps monotonic and never editing production
     ELSE IF it completes but reports a non-empty diff:
        identify the drifted object, correct the migration(s) that build it to match LIVE
     UNTIL `supabase db diff --linked` completes AND reports an empty/clean diff
   ```
   **Known points (fix in this order as they surface):** (a) the 42883 abort at `20260504032936` [step 1]; (b) `social_challenges` drift in `20260502103758`/`20260720000003` [step 4]; (c) any badge/cron or later-migration drift revealed once the replay proceeds past `20260504032936`. Treat the list as non-exhaustive.

### Editing historical migrations — risk note

Editing already-applied historical migration files **does not affect production**: production has these timestamps recorded in `supabase_migrations.schema_migrations` and will not re-run them. The edits change only **what a fresh replay builds**. Therefore the **live runtime fix must be Part C** (the new forward migration). Part B edits exist solely to make a clean replay end in the same hardened, qualified, drift-free state that production already runs. No Part B edit may run `ALTER`/`DROP`/data DDL against the live database.

## Testing Strategy

### Validation Approach

Two phases: first surface counterexamples on UNFIXED state (probe the 10 functions under empty search_path; run the replay to reproduce the 42883 abort and the social_challenges drift), then verify the fix works (functions resolve, replay completes clean) and preserves behavior (value-equivalence + catalog diffing + green suites).

### Exploratory Bug Condition Checking

**Goal:** Reproduce every defect before fixing, confirming the root-cause hypotheses (or refuting and re-hypothesizing).

**Test Plan:** Probe each callable function by direct invocation and each trigger function by firing real DML, all inside a rolled-back transaction with `set local search_path = ''`. Separately, run `supabase db diff --linked` into the shadow DB to reproduce the abort.

**Test Cases (expected to FAIL on unfixed state):**

1. `get_effective_price`, `get_xp_balance`, `get_wellness_aggregate_stats`, `seed_marketplace_items`, `delete_department_if_no_programs` — direct call under empty search_path (expect 42P01/42883).
2. `validate_sub_clo_weights` — `INSERT INTO public.learning_outcomes (... 'SUB_CLO' ...)` (expect 42P01 on `learning_outcomes`).
3. `enforce_max_active_challenges` — real `INSERT`/`UPDATE` into `public.social_challenges` to fire the trigger (expect 42P01).
4. `sync_tutor_conversation_stats` — `INSERT`/`DELETE` on `public.tutor_messages` to fire the AFTER trigger (expect 42P01 on `tutor_conversations`).
5. `badge_auto_archive`, `badge_spotlight_auto_rotate` — direct call (expect 42P01); also assert advisor WARN present.
6. Replay — `supabase db diff --linked` aborts at `20260504032936` (42883) [Property 2 counterexample].

**Expected Counterexamples:** unqualified-name resolution failures (42P01/42883) and the replay abort; possible additional downstream drift once the abort is removed.

### Fix Checking

**Goal:** For all inputs where the bug condition holds, the fixed function produces the expected behavior.

```
FOR ALL input WHERE isBugCondition(input) AND input is a runtime invocation DO
  result := fixedFunction(input)
  ASSERT no_error(result) AND result = correct_value
     AND fixedFunction still has SET search_path = '' AND prosecdef unchanged
END FOR

FOR ALL input WHERE isBugCondition(input) AND input is a replay DO
  ASSERT replay_completes_without_error(input)
     AND final_state(input) = live_production_schema
     AND supabase_db_diff_linked(input) reports empty/clean diff
END FOR
```

### Preservation Checking

**Goal:** For all inputs where the bug condition does NOT hold, the fixed function equals the original.

```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT originalFunction(input) = fixedFunction(input)
END FOR
```

**Testing Approach:** Property-based testing is recommended because it generates many inputs across the domain and catches edge cases. Capture behavior on UNFIXED code first (golden values for valid inputs), then assert the fixed functions reproduce them. Complement with **catalog diffing**: snapshot `prosecdef`, `provolatile`, `proconfig`, `proowner`, `proacl`, and trigger metadata before/after and assert equality (only the body's qualified names and, where applicable, the added `search_path`, differ).

**Test Cases:**

1. Value-equivalence per function on valid inputs (e.g. `get_xp_balance` over random students; `get_effective_price` over random item/institution pairs incl. active-sale and no-sale).
2. Catalog snapshot equality for security mode/volatility/owner/grants.
3. Trigger semantics: valid Sub-CLO insert succeeds; >3 active course-wide challenges still raises; tutor `message_count` still increments/decrements correctly.
4. Append-only: confirm no UPDATE/DELETE introduced on `xp_transactions`/`xp_purchases`.
5. `process_marketplace_purchase` still behaves as post-`20260601004718`.

### Unit Tests

- Probe each of the 10 functions resolves OK under `set search_path = ''` (callable by direct call; trigger ones by firing real self-cleaning DML in a rolled-back tx).
- Assert each fixed function's `proconfig` contains `search_path=` and is empty-valued.
- Assert badge functions are no longer mutable (advisor + `proconfig`).

### Property-Based Tests

- Generate random valid inputs for `get_xp_balance`, `get_effective_price`, `get_wellness_aggregate_stats`, `delete_department_if_no_programs` and assert `F'(X)` equals captured-original `F(X)` (fast-check, ≥100 iterations, per project convention).
- Generate random `social_challenges`/`learning_outcomes`/`tutor_messages` rows and assert trigger outcomes are unchanged for non-buggy inputs.

### Integration Tests

- End-to-end on the affected features against a fixed DB: create/activate a course-wide social challenge; create a Sub-CLO; AI tutor message write updates `message_count`; marketplace effective-price/seed; badge cron callable. All succeed.
- **The objective gate:** `supabase db diff --linked` (Docker + Supabase CLI 2.102.0, available locally) COMPLETES and reports an empty/clean diff after the iterative loop.
- Supabase advisor: no `function_search_path_mutable` WARN for `badge_auto_archive`/`badge_spotlight_auto_rotate`.
- The existing Vitest suite (`npm test`) and the rls-guard CI job remain green; the Supabase Preview CI check passes for the right reason (genuine clean replay, not a silenced check).

## Sequence & Risk

Ordering is chosen so the replay state and the production state converge, with the lowest-risk, reversible edits first and the single production-touching change (Part C) last and isolated.

1. **Qualify + harden in the CREATE migrations (Part B, steps 2–3).** Bake `search_path=''` and qualify bodies into `20260620000001`, `20260620000002`, `20260720000003`, `20260820000003`, `20260720000007`, `20260720000008`. _Risk: low — replay-only; no production impact._
2. **Remove the 5 early `ALTER`s from `20260504032936` (Part B, step 1).** Eliminates the 42883 abort. _Risk: low — replay-only._
3. **Reconcile `social_challenges` drift (Part B, step 4).** Edit `20260720000003`/`20260502103758` to build the LIVE shape. _Risk: medium — must match live columns exactly; verified by the diff loop, never by touching prod._
4. **Iterate `supabase db diff --linked` (Part B, step 5).** Fix each newly surfaced abort/drift past the old abort point; repeat until the diff completes empty. _Risk: medium — unknown downstream failures; bounded by the loop's clear exit condition._
5. **Ship the forward migration (Part C).** New `<timestamp>_fix_function_search_path_qualification.sql` `CREATE OR REPLACE`s the 10 functions on production from their LIVE bodies, qualified + hardened. _Risk: medium — production change; mitigated because `CREATE OR REPLACE` is non-destructive, preserves grants/ownership, and each body is derived from `pg_get_functiondef` then only namespace-qualified._
6. **Verify (all gates).** Probe the 10 functions OK under empty search*path; advisor clean for the badge functions; `db diff` empty; `npm test` + rls-guard CI green; Supabase Preview CI green. \_Risk: low — read-only verification.*

**Top risks & mitigations:**

- _Body drift between migration text and live (proven for `get_wellness_aggregate_stats`)._ Mitigation: Part C derives every body from `pg_get_functiondef`, never from migration files.
- _Over-/under-qualifying (e.g. assuming `badge_auto_archive` references `institutions` when it may not)._ Mitigation: qualify exactly the user objects in the deployed body; built-ins left to `pg_catalog`.
- _Unknown downstream replay failures._ Mitigation: explicit iterative loop with an objective stop condition (empty diff).
- _Accidental production schema change._ Mitigation: Part B edits are replay-only and run no DDL against prod; the only production write is the non-destructive `CREATE OR REPLACE` in Part C.
