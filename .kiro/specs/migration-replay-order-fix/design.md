# Migration Replay Order Fix — Bugfix Design

## Overview

The migration chain in `supabase/migrations/` aborts on a from-scratch replay (Supabase
Preview / clean rebuild / DR restore) because **35 statements reference an object before
the migration that CREATEs it** (or reference an object that is never created at all).
Production is healthy because it was built incrementally, so the defect is invisible until
a fresh replay runs. The static oracle `scripts/check-migration-replay-order.mjs` reports
35 too-early references (13 function, 22 table) and exits 1; the Vitest guard
`scripts/audit/__tests__/migration-replay-order.test.ts` is RED.

The fix makes every too-early statement **replay-safe** while keeping production's logical
state identical. It uses two complementary, low-risk mechanisms drawn from the
`migration-replay-integrity` steering and the patterns already established in the
`20260604151854` and `20260602101312` migrations:

1. **Harden-at-CREATE-site** for the function `search_path` class (CLASS A): bake
   `SET search_path = ''` into the final `CREATE OR REPLACE FUNCTION` so the setting
   survives even when the early `ALTER FUNCTION` is neutralised on a fresh replay.
2. **Guard-in-place** with `DO $$ … to_regprocedure(...)/to_regclass(...) IS NOT NULL … $$`
   blocks for privilege statements and historical DDL on objects created later, so each
   statement no-ops on a fresh replay (object absent) and still applies on production
   (object present).

A crucial correctness point drives the strategy: **guarding an early `CREATE
INDEX`/`CREATE POLICY`/`ALTER TABLE`/`ALTER PUBLICATION` only stops the abort — it does NOT
create the object on a fresh replay.** If the object is genuinely required (it is — these
are real indexes, RLS policies, columns, and realtime memberships), the final desired state
must be re-asserted by a migration that runs **after** the table exists. Therefore the
table classes (D, E, F) are fixed by guarding the early occurrence **and** adding ONE new,
correctly-ordered, fully idempotent corrective migration that re-asserts the final state.
The function classes (A, B, C) do not need this because the function's own CREATE-site
migration is the last-writer for its definition and grants.

We explicitly do **not** bulk-reorder or rename historical migration files. Reordering
applied history is high-risk: it can desync the `supabase_migrations.schema_migrations`
ledger, change recorded version order, and break `supabase db push`/`migration repair` on
live environments. Editing a historical file to make a statement replay-safe (without
changing its logical effect on production, which has already applied it) is the established,
accepted pattern in this repo and is what we use here.

## Glossary

- **Bug_Condition (C)**: A hard-aborting statement (`ALTER/REVOKE/GRANT/COMMENT ON
FUNCTION`, `CREATE TRIGGER … EXECUTE FUNCTION`, `CREATE INDEX`, `CREATE POLICY`, `ALTER
TABLE`, `ALTER PUBLICATION … ADD TABLE`, `COMMENT ON TABLE/COLUMN`) that targets an object
  CREATEd in a later migration (by filename timestamp) or never created in the chain, and is
  not already wrapped in an accepted escape hatch.
- **Property (P)**: The desired behavior — on a fresh replay the statement does not abort
  (no `42883`/`42P01`), the checker prints `CLEAN` and exits 0, the Vitest guard passes, and
  the final schema matches production's logical state.
- **Preservation**: Every statement that is NOT a bug condition behaves identically before
  and after the fix; on production (where referenced objects exist) every guarded statement
  still executes, so production's logical state is unchanged.
- **F / F'**: the original (unfixed) / fixed migration chain.
- **The oracle / checker**: `scripts/check-migration-replay-order.mjs` — the fast,
  authoritative static detector. It masks two SAFE spans: `DROP … IF EXISTS` and any
  `DO $$ … $$;` block. It keys function/table CREATEs by bare name (earliest timestamp).
- **to_regprocedure(sig)**: returns the function OID if `public.fn(args)` exists, else
  `NULL` — the guard predicate for functions.
- **to_regclass(name)**: returns the relation OID if `public.table` exists, else `NULL` —
  the guard predicate for tables/indexes/policies/publications.
- **Harden-at-CREATE-site**: bake `SET search_path = ''` (and `public.`-qualification) into
  the final `CREATE OR REPLACE FUNCTION` rather than relying on a separate later/earlier
  `ALTER FUNCTION`.
- **Corrective migration**: one NEW migration ordered after the latest table-create
  (`> 20260821000004`) that idempotently re-asserts indexes / final policies / columns /
  publication membership, so a fresh replay reaches the correct end state.

## Bug Details

### Bug Condition

The bug manifests when a migration statement that hard-aborts on a missing object runs
**earlier** in filename order than the migration that CREATEs that object — or when the
target object is never created anywhere in the chain. On a fresh replay the statement
aborts with Postgres `42883` (function does not exist) or `42P01` (relation does not exist),
and every subsequent migration never runs. Production already has the object, so the same
statement succeeds there, which is why the defect hides until a clean rebuild.

**Formal Specification:**

```
FUNCTION isBugCondition(stmt)
  INPUT: stmt — a migration statement at (file, line) with filename timestamp stmt.fileTs
  OUTPUT: boolean

  -- Accepted escape hatches are never a bug condition.
  IF stmt is `DROP ... IF EXISTS` THEN RETURN false
  IF stmt is wrapped in a `DO $$ ... $$;` block THEN RETURN false

  -- Function-targeting hard-aborting statements.
  IF stmt matches { ALTER FUNCTION | REVOKE EXECUTE ON FUNCTION
                  | GRANT EXECUTE ON FUNCTION | COMMENT ON FUNCTION
                  | CREATE TRIGGER ... EXECUTE FUNCTION } targeting fn THEN
     createdAt := earliestCreateTimestamp(fn)        -- bare name, earliest CREATE
     RETURN createdAt = UNDEFINED OR stmt.fileTs < createdAt
  END IF

  -- Table-targeting hard-aborting statements (only flagged when the table IS created
  -- somewhere in the chain but LATER; platform tables auth/storage/cron/realtime untracked).
  IF stmt matches { CREATE [UNIQUE] INDEX | CREATE POLICY | ALTER TABLE
                  | ALTER PUBLICATION <p> ADD TABLE | COMMENT ON TABLE/COLUMN } targeting tbl
     AND tbl IS created somewhere in the chain THEN
     createdAt := earliestCreateTimestamp(tbl)
     RETURN stmt.fileTs < createdAt
  END IF

  RETURN false
END FUNCTION
```

### Examples

- **CLASS A (42883)** — `20260504032936_fix_mutable_search_paths.sql:7` runs
  `ALTER FUNCTION public.validate_sub_clo_weights SET search_path = ''`, but the function is
  first CREATEd at `20260601110014`. Fresh replay: `42883 function
validate_sub_clo_weights() does not exist`. Production: succeeds (function present).
- **CLASS C (42883, phantom)** — `20260504041233:17` runs
  `REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM authenticated`, but
  `rls_auto_enable()` is **never** CREATEd anywhere in the chain (verified by grep: only
  REVOKE references exist, zero `CREATE FUNCTION rls_auto_enable`). Fresh replay always
  aborts here.
- **CLASS D (42P01)** — `20260504033325:10` runs `CREATE INDEX … ON public.tutor_llm_logs`,
  but `tutor_llm_logs` is created at `20260820000006`. `CREATE INDEX IF NOT EXISTS` does NOT
  help: `IF NOT EXISTS` guards the index _name_, not the _table_, so a missing table still
  aborts with `42P01`.
- **CLASS E (42P01)** — `20260602103939:5` runs `CREATE POLICY … ON
public.tutor_conversations` (the initplan-optimized final form), but the table is created
  at `20260820000003`.
- **CLASS F (42P01)** — `20260526115420:1` runs
  `ALTER PUBLICATION supabase_realtime ADD TABLE public.challenge_participants`, but the
  table is created at `20260720000003`.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**

- Production's logical schema state is unchanged: every guarded statement still executes on
  production because the `to_regprocedure(...)`/`to_regclass(...)` predicate is true there.
- The runtime behavior of every hardened function is unchanged: baking `SET search_path =
''` into the CREATE site produces the same final function state that the prior
  `ALTER FUNCTION … SET search_path = ''` produced.
- **Search-path hardening survives the last-writer CREATE (FINDING 1):** on a fresh replay,
  every function hardened by an early `ALTER FUNCTION … SET search_path` SHALL retain an
  immutable (non-mutable) `search_path` in its FINAL replayed definition — i.e. the
  hardening is preserved by the last `CREATE OR REPLACE` of the function, not merely asserted
  by the early ALTER (which no-ops on a fresh replay). A clean rebuild / Preview / DR restore
  SHALL therefore be no less hardened than production for these functions.
- Already-reconciled migrations (`20260609*`, `20260821*`) and all other passing migrations
  continue to replay without new errors and are not reordered or altered in effect.
- The checker's two accepted escape hatches (`DROP … IF EXISTS`, `DO $$ … $$;` blocks) and
  its non-tracking of platform tables (`auth.*`, `storage.*`, `cron.*`, `realtime.*`)
  continue to behave exactly as before.

**Scope:**
All statements that are NOT bug conditions must be completely unaffected. This includes:

- Statements referencing objects that already exist at their point in the chain.
- The full set of non-migration code: `src/types/database.ts` is never hand-edited, and no
  application code changes.
- The lint / `tsc --noEmit` / full Vitest suite must stay green.

The actual expected correct behavior for buggy inputs is defined in
[Correctness Properties](#correctness-properties) (Property 1).

## Hypothesized Root Cause

The 35 findings are not a single bug but six structural classes, all instances of the same
ordering defect: a statement was authored in a migration whose timestamp precedes the
migration that creates the target object. This happened because production was built
incrementally (the object existed by the time the statement ran in real time), so the
authoring order never matched the filename-timestamp replay order.

1. **CLASS A — function hardening done too early.** `20260504032936` runs
   `ALTER FUNCTION … SET search_path = ''` on five functions (`validate_sub_clo_weights`,
   `enforce_max_active_challenges`, `update_graduate_attributes_updated_at`,
   `sync_tutor_conversation_stats`, `set_tutor_conversations_updated_at`) that are CREATEd
   in later migrations (`20260601110014`, `20260620000001`, `20260620000002`,
   `20260720000003`, `20260820000003`). **Correction (see
   [Additional Findings](#additional-findings-rigorous-testing), FINDING 1):** rigorous grep
   proved `20260601110014` is NOT the last-writer for these functions — each has an even
   later, _unhardened_ `CREATE OR REPLACE` that silently strips the `SET search_path = ''`
   on a fresh replay. The fix must therefore harden each function at its TRUE last-writer
   migration, not at `20260601110014`.
2. **CLASS B — privilege statements on a later function.** Three migrations
   (`20260504032951`, `20260504033048`, `20260504041233`) `REVOKE`/`GRANT EXECUTE ON
FUNCTION public.increment_team_xp(...)`, which is CREATEd at `20260720000012`.
3. **CLASS C — phantom function.** The same three migrations `REVOKE` on
   `public.rls_auto_enable()`, which is never created in the chain — most likely a
   leftover/manually-created object that exists only on some live instances.
4. **CLASS D — `CREATE INDEX` on a later table.** `20260504033325` indexes
   `teacher_handoff_requests`, `tutor_llm_logs`, `tutor_plan_updates` (created `20260820*`).
5. **CLASS E — `CREATE POLICY` on a later table.** `20260520063920`, `20260520063937`,
   `20260602103939` create SELECT/initplan-wrapped policies on the `tutor_*`,
   `teacher_handoff_requests`, `course_material_embeddings` tables (created `20260820*`).
6. **CLASS F — `ALTER TABLE ADD COLUMN` / `ALTER PUBLICATION … ADD TABLE` on a later
   table.** `20260526115420` (publication membership for `challenge_participants`, created
   `20260720000003`) and `20260526145520` (`ADD COLUMN` on `tutor_conversations`, created
   `20260820000003`).

## Correctness Properties

<!-- Property comment convention for PBT traceability:
     // Feature: migration-replay-order-fix, Property N: <title> -->

Property 1: Bug Condition — Fresh replay completes with zero too-early references

_For any_ migration statement where the bug condition holds (`isBugCondition(stmt)` returns
true on the original chain), the fixed chain SHALL make that statement replay-safe — by
hardening the function at its CREATE site, by guarding it with a `DO $$ …
to_regprocedure(...)/to_regclass(...) IS NOT NULL … $$` block, and/or by re-asserting the
final object state in a correctly-ordered corrective migration — such that a from-scratch
replay does not abort with `42883`/`42P01`, the checker
`scripts/check-migration-replay-order.mjs` prints `CLEAN` and exits 0, and the Vitest guard
`scripts/audit/__tests__/migration-replay-order.test.ts` passes (both the CLEAN assertion
and the non-vacuous synthetic-violation assertion). The final replayed schema (functions,
grants, indexes, policies, columns, publication membership) SHALL match production's logical
state.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11, 2.12, 2.13, 2.14, 2.15, 2.16, 2.17, 2.18, 2.19, 2.20, 2.21, 2.22, 2.23, 2.24, 2.25, 2.26, 2.27, 2.28, 2.29, 2.30, 2.31, 2.32, 2.33, 2.34**

Property 2: Preservation — Non-buggy statements and production state are unchanged

_For any_ input where the bug condition does NOT hold (`isBugCondition(stmt)` returns
false), the fixed chain SHALL produce the same result as the original chain. Specifically:
statements referencing already-existing objects are untouched; on production (where every
referenced function and table exists) each guarded statement's predicate is true so it still
executes, preserving the exact logical grant/policy/index/column/publication state;
harden-at-CREATE-site yields a function state equivalent to the prior `ALTER FUNCTION`
result; the already-reconciled `20260609*`/`20260821*` migrations are not regressed;
`src/types/database.ts` is untouched; and `npm run lint`, `npx tsc --noEmit`, and the full
Vitest suite stay green. **Additionally (strengthened by FINDING 1):** for every function
targeted by an early `ALTER FUNCTION … SET search_path`, the function's FINAL replayed
definition on a fresh, from-scratch replay SHALL carry an immutable `search_path` (its
`pg_proc.proconfig` SHALL contain a `search_path=` entry) — guaranteeing the search_path
hardening is preserved by the function's last-writer `CREATE OR REPLACE` rather than silently
lost when the early ALTER no-ops. This protects the Requirement 2.1–2.5 hardening outcomes
against silent regression on a clean rebuild and is verified per
[Additional Findings — FINDING 1](#finding-1--class-a-last-writer-was-mis-identified).

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10**

## Additional Findings (Rigorous Testing)

Rigorous additional testing (exhaustive `grep` of every `CREATE OR REPLACE FUNCTION` site in
replay order, cross-checked against the early `ALTER FUNCTION` targets) surfaced two findings
that materially change the CLASS A fix. These supersede the earlier assumption that
`20260601110014` is the last-writer for the CLASS A functions.

### FINDING 1 — CLASS A "last-writer" was mis-identified

The original design assumed migration `20260601110014_fix_function_search_path_qualification.sql`
is the last-writer (final `CREATE OR REPLACE`) for the CLASS A functions and therefore the
correct place to confirm `SET search_path = ''`. Grep proved this is **false** for four of the
five functions: each has an even later `CREATE OR REPLACE FUNCTION` with **no** `SET
search_path` and unqualified table references, which is the actual last-writer in replay order.

| Function                                  | Hardened CREATE (has `search_path`) | TRUE last-writer in replay order                                 | Last-writer hardened? |
| ----------------------------------------- | ----------------------------------- | ---------------------------------------------------------------- | --------------------- |
| `sync_tutor_conversation_stats()`         | `20260601110014:204`                | **`20260820000003:42`** (unqualified `tutor_conversations` refs) | ❌ NO                 |
| `set_tutor_conversations_updated_at()`    | (none)                              | **`20260820000003:29`**                                          | ❌ NO                 |
| `update_graduate_attributes_updated_at()` | (none)                              | **`20260620000002:54`**                                          | ❌ NO                 |
| `validate_sub_clo_weights()`              | `20260601110014:156`                | **`20260620000001:11`** (unqualified `learning_outcomes` ref)    | ❌ NO                 |
| `enforce_max_active_challenges()`         | `20260601110014:188`                | **`20260720000003:70`** (unqualified `social_challenges` ref)    | ❌ NO                 |

**Correction to the user-supplied note:** `validate_sub_clo_weights()` is NOT safe at
`20260601110014`. It has a _later_ unhardened `CREATE OR REPLACE` at `20260620000001:11`
(June 20 > June 1), so its true last-writer is also unhardened. **All five** CLASS A functions
end up with a mutable `search_path` on a fresh replay, not three of them.

**The `enforce_max_active_challenges` DROP interaction is a harmless no-op on fresh replay.**
`20260502103758_align_social_challenges_with_design_spec.sql:45` runs
`DROP FUNCTION IF EXISTS enforce_max_active_challenges();`. Its timestamp (`20260502`) is
_before_ both creates (`20260601110014` and `20260720000003`), so on a fresh replay the DROP
runs when the function does not yet exist (or against the not-yet-final definition) and is
guarded by `IF EXISTS` — it never aborts and never affects the final state. The greatest-
timestamp `CREATE OR REPLACE` (`20260720000003:70`) is the last-writer and wins.

**Consequence (the real preservation violation).** On a fresh replay, the early
`ALTER FUNCTION … SET search_path = ''` in `20260504032936` is guarded to a no-op (the
function does not exist yet). The function's final definition then comes from its LATEST
`CREATE OR REPLACE`. Because that latest CREATE lacks `SET search_path = ''`, the function ends
up with a **mutable** `search_path` on a fresh rebuild — silently re-introducing the exact
Supabase "Function Search Path Mutable" (lint 0011 / search_path-hijack) issue that
`20260504032936` was written to fix. Production is unaffected (the early ALTER already ran
there), but a DR restore / Preview / clean rebuild would be LESS hardened than production:
`F'(fresh replay) ≠ F(production)` for the `search_path` attribute of these functions.

**Corrected CLASS A strategy** (reflected in the resolution table above):

- Bake `SET search_path = ''` into the **actual last-writer** migration for EACH function
  (the greatest-timestamp `CREATE OR REPLACE`), NOT `20260601110014`:
  - `sync_tutor_conversation_stats()` and `set_tutor_conversations_updated_at()` →
    **`20260820000003`**.
  - `update_graduate_attributes_updated_at()` → **`20260620000002`**.
  - `validate_sub_clo_weights()` → **`20260620000001`** (its true last-writer; the
    `20260601110014` copy is NOT last).
  - `enforce_max_active_challenges()` → **`20260720000003`** (later than `20260601110014`).
- **Schema-qualify body references when adding `SET search_path = ''`.** These trigger
  functions reference tables unqualified (e.g. `UPDATE tutor_conversations …`,
  `FROM learning_outcomes …`, `FROM social_challenges …`). With `search_path = ''` an
  unqualified reference fails to resolve at runtime, so each body MUST be schema-qualified
  (`public.tutor_conversations`, `public.learning_outcomes`, `public.social_challenges`) as
  part of the same change. A preservation check MUST confirm each trigger still behaves
  identically (message_count sync, `updated_at` touch, weight/parent validation, max-active
  enforcement).
- **Completion criterion:** the CLASS A fix is complete only when, for every function targeted
  by an `ALTER FUNCTION … SET search_path` in `20260504032936`, the function's LAST
  `CREATE OR REPLACE` in replay order carries the setting — i.e. its replayed
  `pg_proc.proconfig` contains a `search_path=` entry.

### FINDING 2 — detector limitation (the static oracle does not catch this class)

The static checker `scripts/check-migration-replay-order.mjs` keys each function CREATE by its
**earliest** timestamp and only flags references that occur _earlier_ than that earliest
CREATE. It therefore does **not** detect the FINDING 1 class — a _later_, unhardened
`CREATE OR REPLACE` silently overriding the `search_path` set by an earlier
`ALTER FUNCTION … SET search_path`. The checker can be CLEAN while the invariant from FINDING 1
is still violated, because the override happens _after_ the earliest CREATE, not before it.

**Recommendation (design note / optional follow-up — NOT a blocking task).** Extend the checker,
or add a companion check, that asserts: _every function targeted by an `ALTER FUNCTION … SET
search_path` has that setting present in its LAST `CREATE OR REPLACE` in replay order._ This
gives the static oracle coverage of the search_path-survives-replay invariant rather than
relying on manual review. Until that exists, reviewers MUST treat the static checker as
necessary but not sufficient for the search_path invariant, and rely on the Property 2
verification (proconfig contains `search_path=` in the final replayed definition) below.

## Fix Implementation

### Strategy summary (one consistent decision per class)

| Class                                                                        | Findings                          | Chosen fix pattern                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | File(s) touched                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ---------------------------------------------------------------------------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A — function `search_path` hardening too early                               | 1.1–1.5 (5)                       | **Harden-at-true-last-writer-CREATE-site**: bake `SET search_path = ''` (with `public.`-qualified body refs) into the **actual last-writer** `CREATE OR REPLACE FUNCTION` for EACH function (the greatest-timestamp CREATE, NOT assumed to be `20260601110014`) **and** wrap the early `ALTER FUNCTION` lines in a `to_regprocedure(...)` `DO`-block (no-op on fresh replay, applies on prod). Both are needed: the guard stops the abort, the last-writer CREATE-site setting guarantees the same final state when the guarded ALTER no-ops. See [Additional Findings (Rigorous Testing)](#additional-findings-rigorous-testing) — FINDING 1 proved `20260601110014` is NOT the last-writer for 4 of the 5 functions. | `20260504032936_fix_mutable_search_paths.sql` (guard the 5 early ALTERs); and bake `SET search_path = ''` at each function's TRUE last-writer: `validate_sub_clo_weights` → `20260620000001_add_sub_clo_support.sql`; `enforce_max_active_challenges` → `20260720000003_create_social_challenges.sql`; `update_graduate_attributes_updated_at` → `20260620000002_create_graduate_attributes.sql`; `sync_tutor_conversation_stats` + `set_tutor_conversations_updated_at` → `20260820000003_create_tutor_conversations.sql` |
| B — `REVOKE/GRANT EXECUTE` on later function `increment_team_xp`             | 1.6, 1.9, 1.10, 1.11 (4)          | **Guard-in-place** with `to_regprocedure('public.increment_team_xp(uuid, integer)')` `DO`-block                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | `20260504032951_*.sql`, `20260504033048_*.sql`, `20260504041233_*.sql`                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| C — `REVOKE` on phantom function `rls_auto_enable`                           | 1.7, 1.8, 1.12, 1.13 (4)          | **Guard-in-place** with `to_regprocedure('public.rls_auto_enable()')` `DO`-block (no-ops everywhere the function is absent; still applies on any instance that has the leftover object)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `20260504032951_*.sql`, `20260504033048_*.sql`, `20260504041233_*.sql`                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| D — `CREATE INDEX` on later tables                                           | 1.14–1.16 (7 indexes)             | **Guard-in-place** early statements with `to_regclass(...)` `DO`-block **+ re-assert** `CREATE INDEX IF NOT EXISTS` in the corrective migration                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | `20260504033325_add_missing_fk_indexes.sql` + corrective migration                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| E — `CREATE POLICY` on later tables                                          | 1.17–1.23, 1.26–1.31 (final form) | **Guard-in-place** early `CREATE POLICY` with `to_regclass(...)` `DO`-block **+ re-assert** the final initplan-wrapped policies (last-writer = `20260602103939` form) in the corrective migration                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | `20260520063920_*.sql`, `20260520063937_*.sql`, `20260602103939_*.sql` + corrective migration                                                                                                                                                                                                                                                                                                                                                                                                                              |
| F — `ALTER TABLE ADD COLUMN` / `ALTER PUBLICATION ADD TABLE` on later tables | 1.24, 1.25 (2)                    | **Guard-in-place** with `to_regclass(...)` `DO`-block **+ re-assert** column / publication membership idempotently in the corrective migration                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | `20260526115420_*.sql`, `20260526145520_*.sql` + corrective migration                                                                                                                                                                                                                                                                                                                                                                                                                                                      |

**New file:** `supabase/migrations/20260821000005_replay_safe_reassert_tutor_indexes_policies_columns.sql`
(ordered after the latest existing migration `20260821000004`, after every referenced table
is created). It idempotently re-asserts the CLASS D/E/F objects so a fresh replay reaches
the correct final state; on production every statement is a no-op or a same-definition
rewrite, so production is unchanged.

### Why guarding alone is insufficient for D/E/F (key design decision)

Wrapping an early `CREATE INDEX`/`CREATE POLICY`/`ALTER TABLE`/`ALTER PUBLICATION` in a
`DO`-block satisfies the checker (it masks `DO $$ … $$;` spans) and stops the abort — but on
a fresh replay the table does not yet exist, so the guarded block no-ops and **the object is
never created**. A DR restore would then be missing real FK indexes and RLS SELECT policies
(a security regression). Guarding is therefore only half the fix for D/E/F; the corrective
migration restores completeness. For A/B/C no corrective migration is needed: the function's
own CREATE-site migration is the last-writer for its definition (A) and its default grants
(B), and C's object is intentionally absent.

### Guard-block templates

Function privilege / ALTER (CLASS A early ALTER, B, C):

```sql
-- CLASS B example (increment_team_xp created later at 20260720000012)
DO $$ BEGIN
  IF to_regprocedure('public.increment_team_xp(uuid, integer)') IS NOT NULL THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.increment_team_xp(uuid, integer) FROM authenticated';
  END IF;
END $$;

-- CLASS C example (phantom rls_auto_enable — no-op unless the leftover object exists)
DO $$ BEGIN
  IF to_regprocedure('public.rls_auto_enable()') IS NOT NULL THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM authenticated';
  END IF;
END $$;
```

Table / relation DDL (CLASS D, E, F early statements, and the corrective migration):

```sql
-- CLASS D early CREATE INDEX guard
DO $$ BEGIN
  IF to_regclass('public.tutor_llm_logs') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_tutor_llm_logs_student_id ON public.tutor_llm_logs (student_id)';
  END IF;
END $$;

-- CLASS F publication membership (idempotent, used in the corrective migration)
DO $$ BEGIN
  IF to_regclass('public.challenge_participants') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime'
         AND schemaname = 'public'
         AND tablename = 'challenge_participants'
     ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.challenge_participants';
  END IF;
END $$;
```

The exact signature passed to `to_regprocedure` must match the function's argument types
(`increment_team_xp(uuid, integer)`, `rls_auto_enable()`, `validate_sub_clo_weights()`,
etc.). `to_regclass` takes the schema-qualified relation name.

### Interaction with the already-reconciled `20260609*` / `20260821*` migrations

- The `20260821*` set (parent course-access RLS, parent assignment read RLS, parent RLS
  recursion fix, challenge-participants student self-join, grade-trigger level recompute) is
  the latest reconciled history. The new corrective migration is timestamped
  `20260821000005`, strictly after `20260821000004`, so it never reorders or precedes them.
- The corrective migration targets a **disjoint** object set (FK indexes on
  `tutor_*`/`teacher_handoff_requests`; the initplan-wrapped SELECT policies on the `tutor_*`
  / handoff / embeddings tables; the `teams.avatar_letter` + `tutor_conversations.recommended_persona`
  columns; `challenge_participants` realtime membership). It does **not** touch the parent
  RLS policies or the challenge self-join policy created by the `20260821*` migrations, so it
  cannot regress them.
- The established guard pattern already lives in `20260604151854` (a
  `to_regprocedure(...)` `DO`-block) and `20260602101312` — the new guards are consistent
  with existing reconciled history, not a new convention.
- The CLASS E re-assertion uses the `20260602103939` initplan-wrapped policy definitions
  verbatim as the last-writer, so the optimized form remains authoritative after replay.

## Testing Strategy

### Validation Approach

Two phases: first surface counterexamples on the unfixed chain using the fast static oracle,
then verify the fixed chain is CLEAN and that production-equivalent state is preserved. The
static checker is the authoritative, fast oracle; the Docker-based `supabase db reset` is an
optional end-to-end confirmation (note the Windows "Initialising schema…" hang caveat from
the `migration-replay-integrity` steering).

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix, and
confirm the six-class root-cause taxonomy. If a class does not actually flag, re-hypothesize.

**Test Plan**: Run `node scripts/check-migration-replay-order.mjs` (`npm run db:check-replay`)
against the current chain and confirm it reports 35 too-early references (13 function, 22
table) and exits 1. Read each reported `file:line` and map it to its class.

**Test Cases** (all expected to FAIL/flag on the unfixed chain):

1. **CLASS A**: `20260504032936:7,9,12,14,15` flagged as `ALTER FUNCTION` before CREATE.
2. **CLASS B**: `increment_team_xp` flagged at `20260504032951:9`, `20260504033048:23,24`,
   `20260504041233:6`.
3. **CLASS C**: `rls_auto_enable()` flagged as `(never created in chain)` at
   `20260504032951:13`, `20260504033048:7`, `20260504041233:17,24`.
4. **CLASS D/E/F**: index/policy/column/publication statements flagged with `42P01` table
   targets created at `20260720*`/`20260820*`.

**Expected Counterexamples**: a fresh replay aborts at
`20260504032936_fix_mutable_search_paths.sql:7` with `42883: function
validate_sub_clo_weights() does not exist`; the phantom `rls_auto_enable()` REVOKE aborts on
every environment that lacks the leftover object.

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed chain does not
abort.

**Pseudocode:**

```
FOR ALL stmt WHERE isBugCondition(stmt) DO
  ASSERT NOT isBugCondition(stmt')        -- checker no longer flags it
END FOR

result := run('node scripts/check-migration-replay-order.mjs')
ASSERT result.stdout CONTAINS "CLEAN" AND result.exitCode = 0
ASSERT vitest('scripts/audit/__tests__/migration-replay-order.test.ts') passes
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed chain
behaves identically, and that production's logical state is unchanged.

**Pseudocode:**

```
FOR ALL stmt WHERE NOT isBugCondition(stmt) DO
  ASSERT F(stmt) = F'(stmt)
END FOR

FOR ALL stmt WHERE wasGuardedOrHardenedOrReasserted(stmt) DO
  ASSERT effectOnProduction(F'(stmt)) = effectOnProduction(F(stmt))   -- predicate true on prod
END FOR
```

**Testing Approach**: Property-based testing is well-suited to preservation here: enumerate
every migration statement, classify it via the bug-condition predicate, and assert the
fixed/unfixed equivalence for the non-buggy partition; for the guarded partition assert the
guard predicate is true whenever the object exists (production), so the wrapped statement
still runs. This catches edge cases (e.g. a guard signature typo that would silently no-op on
production) that hand-written unit tests miss.

**Test Plan**: Observe the unfixed chain's logical effect for non-buggy statements and for
the production case (objects present), then assert the fixed chain reproduces it.

**Test Cases**:

1. **Guarded-but-present preservation**: with the target object present, the guard predicate
   is true and the wrapped REVOKE/GRANT/INDEX/POLICY/ALTER executes (same as original).
2. **Harden-at-CREATE-site equivalence**: the final function definition carries
   `SET search_path = ''`, equivalent to the prior `ALTER FUNCTION` result.
3. **Search-path survives last-writer (FINDING 1)**: on a from-scratch replay, for every
   function targeted by an `ALTER FUNCTION … SET search_path` in `20260504032936`, assert its
   FINAL definition's `pg_proc.proconfig` contains a `search_path=` entry (query
   `SELECT proname, proconfig FROM pg_proc WHERE proname = ANY(ARRAY[...])` after replay and
   assert none has a NULL/`search_path`-less `proconfig`). This catches the silent regression
   where a later unhardened `CREATE OR REPLACE` strips the setting. Also assert each such
   trigger still functions identically (message_count sync, `updated_at` touch, Sub-CLO
   parent validation, max-active-challenge enforcement) with the schema-qualified body.
4. **Corrective-migration idempotency on production**: `CREATE INDEX IF NOT EXISTS`,
   `DROP POLICY IF EXISTS` + recreate, `ADD COLUMN IF NOT EXISTS`, and guarded
   `ALTER PUBLICATION` are all no-ops / same-definition rewrites on an instance that already
   has them.
5. **No-regression**: `20260609*`/`20260821*` reconciled migrations and all unrelated
   statements remain unflagged and unchanged.

### Unit Tests

- The committed Vitest guard `scripts/audit/__tests__/migration-replay-order.test.ts` must go
  GREEN: the CLEAN assertion (checker exits 0) and the non-vacuous synthetic-violation
  assertion (proves the detector still catches a planted too-early reference).
- Per-class assertions that the specific `file:line` references previously reported are no
  longer flagged.
- Guard-signature unit checks: each `to_regprocedure(...)` argument list matches the real
  function signature (`increment_team_xp(uuid, integer)`, `rls_auto_enable()`, etc.).
- **Last-writer search_path assertion (FINDING 1)**: for each CLASS A function, a unit/static
  check that its greatest-timestamp `CREATE OR REPLACE` (`20260820000003` for the two
  tutor-conversation functions, `20260620000002`, `20260620000001`, `20260720000003`) contains
  `SET search_path = ''` and that its body references are `public.`-qualified — so the
  hardening is not silently lost on a fresh replay.

### Property-Based Tests

- Generate the full statement list from `supabase/migrations/` and assert the partition
  invariant: every statement is either not-a-bug-condition (unchanged) or
  guarded/hardened/re-asserted (replay-safe). Min 100 iterations per the project convention.
- Generate object-present vs object-absent scenarios and assert guard predicate evaluation:
  present ⇒ wrapped statement runs (preservation); absent ⇒ no-op (replay-safe).

### Integration Tests

- `npm run db:check-replay` prints `CLEAN` and exits 0 (authoritative oracle).
- Full pre-push gate: `npm run lint`, `npx tsc --noEmit`, `npm test` all green.
- Optional end-to-end: `npx supabase db reset` / Supabase Preview replays the chain from an
  empty database without `42883`/`42P01` and produces the expected schema (note: the Docker
  replay can hang at "Initialising schema…" on some Windows hosts — the static checker is the
  fast oracle and the required local gate).

### Gold-standard end-to-end verification (optional, cost-gated)

The definitive proof of a clean from-scratch replay is to spin up a **Supabase preview/dev
branch** (Supabase Branching). A preview branch replays every file in `supabase/migrations/`
into a fresh, empty database in filename order — exactly what the required **Supabase Preview**
PR check does, and exactly what a new environment, a disaster-recovery restore, or a branch
deploy actually performs. A green preview replay is therefore the strongest available
confirmation that the chain rebuilds cleanly.

This step **incurs Supabase cost** (it provisions a real branch database), so it is
cost-gated: run it **once before merge as the final confirmation**, and only **after** the
static checker (`npm run db:check-replay`) is already CLEAN and exits 0. The static checker
remains the fast, authoritative **local** gate — run it first and iterate against it until
CLEAN; use the preview/dev-branch replay only as the final pre-merge sign-off. (The Windows
Docker caveat above still applies to the local `npx supabase db reset` path: it can hang at
"Initialising schema…" on some Windows hosts, which is why the static checker — not local
Docker replay — is the authoritative local gate.)

## Class 0 — Checked-and-Cleared (verified NOT defects)

To demonstrate the analysis was exhaustive, these candidate failure modes were investigated
and confirmed safe; no change is required, and the verification step should re-confirm them:

- **ENUM new-value safety**: `20260620000001_add_sub_clo_support.sql` runs
  `ALTER TYPE outcome_type ADD VALUE IF NOT EXISTS 'SUB_CLO'` and then creates
  `validate_sub_clo_weights()` in the same migration. The new value `'SUB_CLO'` is used only
  as a runtime string comparison inside the function body (`NEW.type != 'SUB_CLO'`), never as
  a DML literal in the same transaction, so there is no `55P04` "unsafe use of new enum
  value". Verification step: confirm no `ALTER TYPE … ADD VALUE` is followed by
  same-transaction DML using that value.
- **TRIGGER co-location**: every `CREATE TRIGGER … EXECUTE FUNCTION` is co-located in the
  same migration as its function's CREATE (e.g. `set_tutor_conversations_updated_at` /
  `sync_tutor_conversation_stats` in `20260820000003`), so no trigger-before-function class
  exists.
- **`DROP … IF EXISTS`**: always safe; the checker masks these spans and Postgres never
  aborts on a missing object.
- **Platform/extension tables**: references to `auth.*`, `storage.*`, `cron.*`,
  `realtime.*` are intentionally untracked by the checker and never flagged; the
  `supabase_realtime` _publication_ itself is a platform object (only the _table being
  added_, `challenge_participants`, is the tracked, fixable target).
- **Existing guarded history**: `20260604151854` and `20260602101312` already use the
  `DO $$ … $$` pattern correctly and remain CLEAN — the new guards follow the same
  convention.

### Exhaustive cross-class probe (senior-dev pass beyond the static checker's classes)

The static checker keys only function and table CREATEs. A senior-dev review went further and
probed **every** DDL class that could reference a later-created object — foreign keys, RLS
enablement, views, and table-level grants — not just the function/table classes the oracle
covers. Every one came back clean / co-located, so none constitutes an additional too-early
class:

- **FOREIGN-KEY references (`REFERENCES` / `ADD CONSTRAINT … REFERENCES`)**: every FK in the
  chain is declared INLINE in the same `CREATE TABLE` statement as the referencing table, and
  every referenced parent table (`institutions`, `profiles`, `programs`, `courses`,
  `learning_outcomes`, `submissions`, `grades`, `assignments`) is created in an
  earlier-or-equal migration (the `20260222*` core-table migrations). No FK references a table
  created in a LATER migration. The few `ALTER TABLE … ADD CONSTRAINT` statements are
  CHECK-constraint redefinitions on `xp_transactions` (same table, no cross-table dependency).
  **VERDICT: no too-early FK class.**
- **`ENABLE ROW LEVEL SECURITY`**: every `ALTER TABLE <t> ENABLE ROW LEVEL SECURITY` is
  co-located in the same migration as the `CREATE TABLE <t>` (e.g. `blooms_progression`,
  `question_bank`, `mastery_recovery_pathways`, `wellness_habit_logs`, `teams`,
  `graduate_attributes`, `sub_clos`, `badge_spotlight_schedule`). No RLS-enable runs before
  its table exists. **VERDICT: no too-early RLS-enable class.**
- **`CREATE VIEW` / `MATERIALIZED VIEW`**: `leaderboard_weekly` (and its later
  `CREATE OR REPLACE` / regular-view replacements) and `mv_historical_evidence` all reference
  tables (`student_gamification`, `profiles`, `evidence`, `semesters`) created in much earlier
  migrations. No view references a table created later. **VERDICT: no too-early view class.**
- **`GRANT (SELECT/ALL/INSERT/UPDATE/DELETE) ON TABLE`**: table-level grants are co-located
  with their table/policy migrations and target already-existing tables. The only
  function-level GRANT that was too-early (`increment_team_xp`) is already captured as
  **CLASS B**. **VERDICT: no additional too-early table-grant class.**

**Confidence statement.** This exhaustive cross-class probe RAISES CONFIDENCE that the 35
static-checker findings + the CLASS A–F taxonomy + these Class-0 items are the COMPLETE set of
from-scratch replay hazards in the chain. No hidden classes remain.
