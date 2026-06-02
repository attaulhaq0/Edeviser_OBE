# Implementation Plan — DB Function search_path Qualification Bugfix

## Overview

This plan fixes three coupled defects proven against the LIVE Supabase project `cdlgtbvxlxjpcddjazzx` and an authoritative from-scratch replay (Docker + Supabase CLI 2.102.0):

- **Part A (runtime correctness)** — 10 `public` functions hardened with `SET search_path = ''` whose bodies reference unqualified user objects, so they raise `undefined_table`/`undefined_function` at runtime.
- **Part B (replay integrity)** — historical migrations that abort a clean replay (`ALTER`-before-`CREATE` at `20260504032936`) and drift from the live schema (`social_challenges`). Edits here are **replay-only** and never run DDL against production.
- **Part C (production fix)** — a single new forward migration that `CREATE OR REPLACE`s the 10 functions on production, with each body **derived from the LIVE `pg_get_functiondef`** (not migration text — the design proved bodies drifted), then `public.`-qualified.

Methodology: reproduce every defect first (Phase 0, expected to FAIL on unfixed state), capture preservation baselines (Phase 1, expected PASS), apply the fix lowest-risk-first per the design's **Sequence & Risk** section, then verify all acceptance gates simultaneously.

The objective proof of done (bugfix.md Acceptance Criterion): `supabase db diff --linked` COMPLETES with an empty/clean diff, all 10 functions probe OK under empty `search_path`, the advisor reports no `function_search_path_mutable` WARN for the badge functions, and the Supabase Preview CI check passes for the right reason.

Authoritative inputs:

- `#[[file:.kiro/specs/db-function-search-path-qualification/design.md]]`
- `#[[file:.kiro/specs/db-function-search-path-qualification/bugfix.md]]`
- `#[[file:.kiro/specs/_investigation/db-function-search-path-findings.md]]`

### Conventions

- Tasks marked `*` are **optional** supplementary property-based test suites. The SQL probes (via Supabase MCP `execute_sql` in rolled-back transactions) and the `supabase db diff --linked` / advisor checks are the **core verification gates** and are NOT optional.
- PBT/probe status tasks use the `**Property N: <Type>**` format so hover status tracking works. Property numbers map 1:1 to the design's **Correctness Properties (1–4)**.
- DDL changes ship via MCP `apply_migration`; data/probe reads via MCP `execute_sql`. Historical-file edits (Part B) are committed to `supabase/migrations/` and validated only through the replay loop — they are never applied to production.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1", "2", "3", "4"] },
    { "id": 1, "tasks": ["5", "6"] },
    { "id": 2, "tasks": ["7"] },
    { "id": 3, "tasks": ["8"] },
    { "id": 4, "tasks": ["9"] },
    { "id": 5, "tasks": ["10"] },
    { "id": 6, "tasks": ["11", "12", "13", "14"] },
    { "id": 7, "tasks": ["15", "16"] },
    { "id": 8, "tasks": ["17"] },
    { "id": 9, "tasks": ["18"] }
  ]
}
```

- Wave 1 (Tasks 1–4): run entirely on the UNFIXED state — reproduce the bug + capture preservation baselines. No code changes.
- Wave 2 (Tasks 5–6): Part B static edits to separate files (no shared-file contention).
- Wave 3 (Task 7): `social_challenges` reconciliation — depends on Task 5 because Task 5.3 and Task 7 both touch `20260720000003_create_social_challenges.sql`.
- Wave 4 (Task 8): iterative replay loop — depends on all Part B edits (5, 6, 7).
- Wave 5 (Task 9): checkpoint gate **before** the only production-touching change.
- Wave 6 (Task 10): Part C forward migration (production).
- Wave 7 (Tasks 11–14): fix-checking + preservation re-run — depend on Task 10 (and Task 4 for baselines).
- Wave 8–10 (Tasks 15–18): types/migration sync, suites green, final checkpoint.

## Tasks

### Phase 0 — Reproduce the bug (UNFIXED state; expected to FAIL)

- [x] 1. Probe the 10 functions under empty `search_path` (runtime bug condition)

  - **Property 1: Bug Condition** — Hardened functions fail to resolve under empty search_path (design Property 1)
  - **IMPORTANT**: Run these probes BEFORE any fix. **DO NOT fix the code or the probe when it fails.**
  - **CRITICAL**: These probes MUST FAIL on the unfixed state — failure confirms clauses 1.1–1.10 are real. The probe assertions encode the Expected Behavior (design §"Formal trigger/callable check") and will validate the fix when they pass after Part C.
  - **GOAL**: Surface concrete counterexamples (the exact SQLSTATE + object name) for each broken function.
  - **Scoped probe approach**: each probe runs inside a single transaction with `set local search_path = ''` and is rolled back, so it is side-effect free.
  - Via MCP `execute_sql`, probe each callable by direct call: `get_effective_price(uuid,uuid)`, `get_xp_balance(uuid)`, `get_wellness_aggregate_stats(uuid)`, `seed_marketplace_items(uuid)`, `delete_department_if_no_programs(uuid)` — expect `42P01`/`42883`.
  - Probe each trigger function by firing real self-cleaning DML inside the rolled-back tx: `validate_sub_clo_weights` (INSERT a `SUB_CLO` into `public.learning_outcomes`), `enforce_max_active_challenges` (INSERT/UPDATE `public.social_challenges`), `sync_tutor_conversation_stats` (INSERT/DELETE on `public.tutor_messages`) — expect `42P01` on the unqualified table.
  - Probe `badge_auto_archive()` and `badge_spotlight_auto_rotate()` by direct call — expect `42P01`.
  - **EXPECTED OUTCOME**: every probe FAILS (this is correct — it proves the bug exists).
  - Document each counterexample (function → SQLSTATE → unresolved object) to confirm the root-cause hypothesis in design §"Hypothesized Root Cause".
  - _Design Property: 1_
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10_

- [x] 2. Reproduce the clean-replay abort and `social_challenges` drift

  - **Property 2: Bug Condition** — Clean from-scratch replay aborts and diverges from production (design Property 2)
  - **IMPORTANT**: Run on the UNFIXED migration set. **DO NOT fix anything in this task** — only reproduce and record.
  - Run `supabase db diff --linked` (Docker + Supabase CLI 2.102.0) into a shadow DB.
  - **EXPECTED OUTCOME**: replay ABORTS at `20260504032936_fix_mutable_search_paths.sql` statement 6 with `ERROR: could not find a function named "public.validate_sub_clo_weights" (SQLSTATE 42883)`.
  - Capture the `20260502103758_align_social_challenges_with_design_spec.sql` NOTICEs on a fresh DB ("column reward_type / reward_value / notification_sent_90 ... does not exist, skipping"; "function enforce_max_active_challenges() does not exist, skipping"; "trigger trg_enforce_max_active_challenges does not exist, skipping").
  - Record the LIVE `social_challenges` column set (`goal_target`, `participation_mode`, `reward_xp`, `reward_badge_id`, `institution_id`, plus base columns) versus the migration-built set, as the drift target for Task 7.
  - **NOTE**: because the replay aborts here, every migration after `20260504032936` has never run on a clean DB — downstream ordering/drift is UNKNOWN and must be discovered in the Task 8 loop.
  - _Design Property: 2_
  - _Requirements: 1.11, 1.13_

- [x] 3. Confirm the advisor `function_search_path_mutable` WARNs
  - **Property 3: Bug Condition** — Badge functions are flagged mutable by the advisor (design Property 3)
  - **IMPORTANT**: Run on the UNFIXED state. **DO NOT fix anything in this task.**
  - Run the Supabase database linter / advisor and record the `function_search_path_mutable` WARNs.
  - **EXPECTED OUTCOME**: WARNs present for `public.badge_auto_archive`, `public.badge_spotlight_auto_rotate` (and `public.is_pgcron_available`, `public.prevent_mutation` as documented), confirming they are currently mutable in prod (re-created without `search_path` by the later cron migrations).
  - Capture `proconfig` for the badge functions (`null` / no `search_path=`) as the before-snapshot.
  - _Design Property: 3_
  - _Requirements: 1.12_

### Phase 1 — Preservation baseline (UNFIXED state; expected to PASS)

- [x] 4. Capture preservation baselines for non-buggy inputs
  - **Property 4: Preservation** — Identical behavior for non-buggy inputs (design Property 4)
  - **IMPORTANT**: Follow the observation-first methodology — record actual behavior on the UNFIXED code so the fix can be proven byte-for-byte equivalent.
  - **EXPECTED OUTCOME**: every observation below succeeds on the unfixed code (these are the golden values/snapshots to preserve).
  - [x] 4.1 Capture golden runtime values (valid inputs, caller search_path — NOT empty)
    - Via MCP `execute_sql`, record results for valid inputs: `get_xp_balance` over several real students; `get_effective_price` over real item/institution pairs (including an active-sale case and a no-sale case); `get_wellness_aggregate_stats` for an authorized institution (and confirm the `unauthorized: institution mismatch` guard for a mismatched one); the trigger outcomes (valid Sub-CLO insert succeeds; >3 active course-wide challenges still raises; tutor `message_count` increments/decrements correctly).
    - Confirm `process_marketplace_purchase(uuid,uuid,uuid)` still behaves as post-`20260601004718` (must not regress — clause 3.8).
    - _Requirements: 3.1, 3.4, 3.8_
  - [x] 4.2 Snapshot the catalog metadata to assert equality after the fix
    - For all 10 functions (and the 5 runtime-safe trigger functions touched only for replay ordering), record `prosecdef`, `provolatile`, `proconfig`, `proowner`, `proacl`, and trigger metadata (timing/level, `NEW`/`OLD`/`TG_OP`).
    - These snapshots prove security mode, volatility, ownership, grants, trigger semantics, and the `search_path=''` hardening are preserved (clauses 3.2, 3.4, 3.5).
    - _Requirements: 3.2, 3.3, 3.5, 3.7_
  - [x] 4.3 (Optional) Encode value-equivalence as a fast-check property suite
    - Per project convention (`*.property.test.ts`, fast-check, ≥100 iterations), generate random valid inputs for `get_xp_balance`, `get_effective_price`, `get_wellness_aggregate_stats`, `delete_department_if_no_programs` and assert `F'(X) == capturedOriginal F(X)`.
    - Reference the design: `// Feature: db-function-search-path-qualification, Property 4: Preservation`.
    - _Requirements: 3.1, 3.9, 3.11_
  - _Design Property: 4_
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11_

### Phase 2 — Part B: Migration replay integrity (replay-only; NO production impact)

> Per design §"Sequence & Risk" steps 1–4. These edits change only what a fresh replay builds; production has these timestamps recorded in `supabase_migrations.schema_migrations` and will not re-run them. **No Part B edit may run `ALTER`/`DROP`/data DDL against the live database.**

- [x] 5. Bake `SET search_path = ''` + qualify bodies into each function's own CREATE migration

  - Sequence & Risk step 1 (lowest risk — replay-only). Use `CREATE OR REPLACE FUNCTION ... LANGUAGE plpgsql SET search_path = '' AS $$...$$;` preserving security mode, volatility, and trigger attachments.
  - [x] 5.1 `20260620000001_add_sub_clo_support.sql` — `validate_sub_clo_weights()`
    - Bake `SET search_path = ''` into its CREATE and qualify `public.learning_outcomes`.
    - _Bug_Condition: replayOrderingBug + runtimeBug for validate_sub_clo_weights (design §Bug Condition)_
    - _Expected_Behavior: expectedBehavior(result) — resolves public.learning_outcomes, no 42P01 (design §Part A row 6)_
    - _Preservation: SECURITY INVOKER, plpgsql, trigger semantics unchanged (design §Preservation)_
    - _Requirements: 2.6, 2.11_
  - [x] 5.2 `20260620000002_create_graduate_attributes.sql` — `update_graduate_attributes_updated_at()`
    - Add `SET search_path = ''` to its CREATE. **Body unchanged** (NEW/`now()` only — runtime-safe; touched solely for replay ordering).
    - _Bug_Condition: replayOrderingBug only (design §Functions that MUST NOT be functionally changed)_
    - _Expected_Behavior: replay reaches CREATE-before-ALTER; runtime behavior identical_
    - _Preservation: body byte-for-byte unchanged (clause 3.7)_
    - _Requirements: 2.11, 3.7_
  - [x] 5.3 `20260720000003_create_social_challenges.sql` — `enforce_max_active_challenges()`
    - Bake `SET search_path = ''` into its CREATE and qualify `public.social_challenges`.
    - **NOTE**: this file is also edited in Task 7 (table reconciliation) — coordinate so both edits land together; Task 7 runs after this.
    - _Bug_Condition: replayOrderingBug + runtimeBug for enforce_max_active_challenges_
    - _Expected_Behavior: resolves public.social_challenges, enforces active-challenge limit, no 42P01 (design §Part A row 7)_
    - _Preservation: SECURITY INVOKER, plpgsql, trigger semantics unchanged_
    - _Requirements: 2.7, 2.11_
  - [x] 5.4 `20260820000003_create_tutor_conversations.sql` — `sync_tutor_conversation_stats()` + `set_tutor_conversations_updated_at()`
    - `sync_tutor_conversation_stats()`: bake `SET search_path = ''` and qualify `public.tutor_conversations` (all three `UPDATE`s).
    - `set_tutor_conversations_updated_at()`: add `SET search_path = ''` only — **body unchanged** (NEW/`now()` only).
    - _Bug_Condition: replayOrderingBug + runtimeBug (sync_…); replayOrderingBug only (set*…)*
    - _Expected_Behavior: resolves public.tutor_conversations; message_count sync correct, no 42P01 (design §Part A row 8)_
    - _Preservation: SECURITY INVOKER, plpgsql, trigger semantics; set_… body unchanged (clause 3.7)\_
    - _Requirements: 2.8, 2.11, 3.7_
  - [x] 5.5 `20260720000007_badge_spotlight_rotate_cron.sql` — `badge_spotlight_auto_rotate()` (LAST create)
    - Harden at the LAST create so the final replay state is hardened (not overwritten): add `SET search_path = ''` and qualify exactly the user tables in the body — `public.institutions`, `public.badge_spotlight_schedule` (and `public.badges` if the body references it).
    - _Bug_Condition: runtimeBug + advisor-mutable (design §Part A row 10, clause 1.10/1.12)_
    - _Expected_Behavior: resolves qualified objects AND carries search_path='' (design §expectedBehavior, clause 2.10/2.12)_
    - _Preservation: SECURITY DEFINER, void, plpgsql unchanged_
    - _Requirements: 2.10, 2.12, 2.11_
  - [x] 5.6 `20260720000008_badge_archive_cron.sql` — `badge_auto_archive()` (LAST create)
    - Add `SET search_path = ''` and qualify **exactly** the user tables the deployed body references. Read `pg_get_functiondef('public.badge_auto_archive'::regproc)` first — the design warns the body may reference only `public.badges` (the investigation summary lists `institutions` for parity); qualify what is actually present, neither more nor fewer.
    - _Bug_Condition: runtimeBug + advisor-mutable (design §Part A row 9, clause 1.9/1.12)_
    - _Expected_Behavior: resolves qualified objects AND carries search_path='' (clause 2.9/2.12)_
    - _Preservation: SECURITY DEFINER, void, plpgsql unchanged_
    - _Requirements: 2.9, 2.12, 2.11_

- [x] 6. Remove the 5 too-early `ALTER`s from `20260504032936_fix_mutable_search_paths.sql`

  - Sequence & Risk step 2 (low risk — replay-only). Eliminates the `42883` abort.
  - Delete the `ALTER FUNCTION ... SET search_path = ''` lines for `validate_sub_clo_weights`, `update_graduate_attributes_updated_at`, `enforce_max_active_challenges`, `sync_tutor_conversation_stats`, `set_tutor_conversations_updated_at` (their hardening now lives in their CREATEs from Task 5).
  - Keep the remaining `ALTER`s, but verify in the Task 8 loop that each remaining target already exists at this timestamp on a clean replay.
  - _Bug_Condition: replayOrderingBug — ALTER before CREATE at 20260504032936 (design §Bug Condition)_
  - _Expected_Behavior: replay completes past statement 6, no 42883 abort (clause 2.11)_
  - _Preservation: production already recorded this migration; edit affects fresh replay only (clause 3.6)_
  - _Requirements: 2.11, 3.6_

- [x] 7. Reconcile `social_challenges` drift so a fresh replay reproduces the LIVE shape

  - Sequence & Risk step 3 (medium risk — must match live columns exactly; verified only by the diff loop, never by touching prod). Depends on Task 5 (shared file `20260720000003`).
  - Edit `20260720000003_create_social_challenges.sql` so its `CREATE TABLE` (and trigger/function) match the LIVE column set: include `goal_target`, `participation_mode`, `reward_xp`, `reward_badge_id`, `institution_id`, `updated_at` (plus base `id`, `title`, `description`, `challenge_type`, `course_id`, `start_date`, `end_date`, `status`, `created_by`, `created_at`); drop the legacy `goal_metric`, `reward_type`, `reward_value`, `notification_sent_90`; align `challenge_type`/`status` CHECKs and `goal_target` type with the post-align live state.
  - Make `20260502103758_align_social_challenges_with_design_spec.sql` a clean/consistent step on the corrected lineage: remove or guard the `DROP COLUMN IF EXISTS` / `DROP ... enforce_max_active_challenges` statements that assume legacy columns, so no "does not exist, skipping" notices remain and the end state is unchanged.
  - Do NOT alter `20260411221627` data semantics beyond what's needed; ensure the `20260415071331` column adds and the `20260530091425` seed (which inserts `participation_mode`, `reward_xp`) still apply cleanly.
  - The exact edits are confirmed empirically by the Task 8 loop, since the live column lineage spans several migrations.
  - _Bug_Condition: replayDriftBug — final_state(replay) ≠ live social_challenges (design §Bug Condition)_
  - _Expected_Behavior: rebuilt social_challenges matches LIVE exactly; db diff reports no drift (clause 2.13)_
  - _Preservation: edits migration files only; live schema + data unchanged, no ALTER/DROP against prod (clauses 3.10, 3.6)_
  - _Requirements: 2.13, 3.6, 3.10_

- [x] 8. Iterative replay loop — drive `supabase db diff --linked` to a clean, empty diff (REQUIRED)
  - Sequence & Risk step 4 (medium risk — unknown downstream failures; bounded by the loop's exit condition). Depends on Tasks 5, 6, 7.
  - **Why required**: the replay previously aborted at `20260504032936`, so every migration after it has never run on a clean DB. Downstream ordering/drift past the old abort point is UNKNOWN and must be discovered here.
  - Loop (keep timestamps monotonic; never edit production):
    ```
    REPEAT
      run `supabase db diff --linked`
      IF it aborts at migration M with an error:
         diagnose (ALTER-before-CREATE? missing object? drift?)
         fix migration M (or the migration that should have created the object)
      ELSE IF it completes but reports a non-empty diff:
         identify the drifted object; correct the migration(s) that build it to match LIVE
      UNTIL `supabase db diff --linked` COMPLETES AND reports an empty/clean diff
    ```
  - **Known points (fix in order as they surface)**: (a) the `42883` abort at `20260504032936` [Task 6]; (b) `social_challenges` drift in `20260502103758`/`20260720000003` [Task 7]; (c) any badge/cron or later-migration drift revealed once the replay proceeds past `20260504032936`. Treat the list as non-exhaustive.
  - **STOP CONDITION (core gate)**: `supabase db diff --linked` completes with no error AND reports an empty/clean diff.
  - _Bug_Condition: replayOrderingBug OR replayDriftBug for any migration past the old abort (design §Bug Condition, root cause #5)_
  - _Expected_Behavior: replay_completes_without_error AND final_state = live_production_schema AND db diff empty (clause 2.11, 2.13)_
  - _Preservation: replay-only; no production DDL (clauses 3.6, 3.10)_
  - _Requirements: 2.11, 2.13, 3.6, 3.10_

### Checkpoint A — before the production-touching forward migration

- [x] 9. Checkpoint — Part B complete and clean before any production change
  - Confirm `supabase db diff --linked` COMPLETES with an empty/clean diff (Task 8 stop condition met).
  - Confirm the historical-file edits (Tasks 5–7) are replay-only — no `ALTER`/`DROP`/data DDL was run against production.
  - **GATE**: do not proceed to Task 10 (the only production change) until the replay is clean. If questions arise, ask the user before continuing.
  - _Requirements: 2.11, 2.13, 3.6, 3.10_

### Phase 3 — Part C: Production forward migration (the ONLY production change)

- [x] 10. Create + apply the forward migration that re-defines the 10 functions on production
  - Sequence & Risk step 5 (medium risk — production change; mitigated because `CREATE OR REPLACE` is non-destructive, preserves grants/ownership, and each body is derived from `pg_get_functiondef` then only namespace-qualified).
  - **File (new):** `supabase/migrations/20260903000001_fix_function_search_path_qualification.sql` (timestamp later than the newest existing migration `20260902000002`).
  - **Method per function (MUST follow):**
    1. Read the **deployed** definition: `SELECT pg_get_functiondef(p.oid) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='<fn>';` and capture `prosecdef`, `provolatile`, `proconfig`, `proowner`, `proacl`.
    2. Copy that exact body, then `public.`-qualify every user table/function reference (leave built-ins — `now()`, `count()`, `gen_random_uuid()`, `date_trunc()`, `coalesce()`, `greatest()`, `array_position()` — unqualified).
    3. Emit `CREATE OR REPLACE FUNCTION ...` preserving the original `LANGUAGE`, volatility, `SECURITY DEFINER`/`INVOKER`, and including `SET search_path = ''`.
    4. Do not change argument names, return types, or trigger attachments. Do not add `GRANT`/`REVOKE` unless `pg_get_functiondef` shows an existing one to preserve.
  - **DO NOT derive bodies from migration text** — the design proved drift (e.g. `get_wellness_aggregate_stats` live = `SECURITY DEFINER`/`plpgsql`/`search_path=''` calling unqualified `auth_institution_id()`, unlike its migration file). The LIVE catalog is the source of truth for Part C.
  - Apply via MCP `apply_migration`.
  - [x] 10.1 `get_effective_price(uuid,uuid)` → `public.marketplace_items`, `public.sale_event_items` (alias `sei`), `public.sale_events` (alias `se`); preserve `SECURITY INVOKER`, `STABLE`.
    - _Requirements: 2.1_
  - [x] 10.2 `get_xp_balance(uuid)` → `public.xp_transactions`, `public.xp_purchases`; preserve `SECURITY INVOKER`, `STABLE`; no UPDATE/DELETE introduced (clause 3.3).
    - _Requirements: 2.2, 3.3_
  - [x] 10.3 `get_wellness_aggregate_stats(uuid)` → `public.wellness_habit_logs` (alias `whl`), `public.profiles` (alias `p`), `public.auth_institution_id()`; keep `SECURITY DEFINER`, `plpgsql`, and the `unauthorized: institution mismatch` guard.
    - _Requirements: 2.3_
  - [x] 10.4 `seed_marketplace_items(uuid)` → `public.marketplace_items` in all five `INSERT`s; preserve `SECURITY INVOKER`, `plpgsql`.
    - _Requirements: 2.4_
  - [x] 10.5 `delete_department_if_no_programs(uuid)` → `public.departments` (DELETE), `public.programs` (NOT EXISTS subquery); keep `SECURITY DEFINER`, `plpgsql`.
    - _Requirements: 2.5_
  - [x] 10.6 `validate_sub_clo_weights()` → `public.learning_outcomes`; preserve trigger attachment + `SECURITY INVOKER`.
    - _Requirements: 2.6_
  - [x] 10.7 `enforce_max_active_challenges()` → `public.social_challenges`; preserve trigger attachment + `SECURITY INVOKER`.
    - _Requirements: 2.7_
  - [x] 10.8 `sync_tutor_conversation_stats()` → `public.tutor_conversations` (all three `UPDATE`s); preserve AFTER-trigger semantics + `SECURITY INVOKER`.
    - _Requirements: 2.8_
  - [x] 10.9 `badge_auto_archive()` → qualify exactly the user tables in the deployed body (`public.badges`, and `public.institutions` only if present); keep `SECURITY DEFINER`, `void`, `plpgsql`; include `SET search_path = ''`.
    - _Requirements: 2.9, 2.12_
  - [x] 10.10 `badge_spotlight_auto_rotate()` → `public.institutions`, `public.badge_spotlight_schedule` (and `public.badges` if present); keep `SECURITY DEFINER`, `void`, `plpgsql`; include `SET search_path = ''`.
    - _Requirements: 2.10, 2.12_
  - _Bug_Condition: isBugCondition(X) runtime invocation of any of the 10 functions (design §Bug Condition)_
  - _Expected_Behavior: expectedBehavior(result) — no 42P01/42883, correct value, search_path='' retained, prosecdef unchanged (design §expectedBehavior)_
  - _Preservation: bodies derived from pg_get_functiondef; security mode/volatility/owner/grants/trigger semantics preserved (design §Preservation; clauses 3.1–3.5)_
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.12, 2.14_

### Phase 4 — Verification & fix-checking (core gates)

- [x] 11. Re-run the runtime probes — all 10 functions resolve OK under empty `search_path`

  - **Property 1: Expected Behavior** — Hardened functions resolve under empty search_path (design Property 1)
  - **IMPORTANT**: Re-run the SAME probes from Task 1 — do NOT write new probes. The Task 1 assertions encode the expected behavior.
  - For each of the 10 functions, run the probe under `set local search_path = ''` (callable by direct call; triggers by firing self-cleaning DML in a rolled-back tx).
  - **EXPECTED OUTCOME**: every probe PASSES — resolves with no `42P01`/`42883` (confirms clauses 2.1–2.10).
  - Assert each fixed function's `proconfig` still contains an empty-valued `search_path=` (hardening preserved).
  - **CORE GATE** (bugfix.md Acceptance: `probe(f) under search_path='' returns OK` for all 10).
  - _Design Property: 1_
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10_

- [x] 12. Re-run `supabase db diff --linked` — completes with no abort; only the carved-out residual remains (RE-SCOPED)

  - **Property 2: Expected Behavior** — Clean replay completes and reproduces production for THIS bugfix's scope (design Property 2)
  - **IMPORTANT**: Re-run the SAME replay from Task 2 against the corrected migration set (after Task 10's forward migration is also in the chain).
  - **RE-SCOPE NOTE (see Task 19 + `_investigation/db-function-search-path-residual-drift-analysis.md`)**: the original "empty/clean diff" gate is NOT achievable within this bugfix's scope. The Task 8 replay completing past the old `42883` abort unmasked pre-existing downstream drift (design root-cause #5) that this bugfix neither caused nor owns. The empty-diff goal is therefore carved as below and the remainder is handed to the new `migration-history-reconciliation` spec (Task 20).
  - **EXPECTED OUTCOME (re-scoped)**: replay COMPLETES with no `42883` abort; `social_challenges` shows NO table/column drift; and the ONLY function delta attributable to THIS bugfix — the by-design pre-Part-C qualification re-emits for the **10 in-scope functions + the 2 badge functions** — is CLEARED by Task 10's forward migration (verify these specific functions no longer appear in the diff after Part C).
  - **EXPLICITLY CARVED OUT (NOT this bugfix's gate — belongs to `migration-history-reconciliation`)**: (a) the ~22 out-of-scope function-body re-emits (historical live↔migration drift: `auth_*`, `anonymize_user`, `emit_notification`, the `trg_*_notify` set, `trigger_attainment_rollup`, `get_leaderboard_page`, `get_xp_transactions_page`, portfolio helpers, `rls_auto_enable`, `is_pgcron_available`, `prevent_mutation`, plus the deployment-gap functions); (b) the genuinely-undeployed phantom tables (`student_badges`, `quiz_clos`, `team_gamification`, `student_habit_levels`, `student_habit_level_history`) + `reports`/`transcripts` buckets; (c) the file-9 `profiles` CHECK/nullability; (d) the §3.3 policy/constraint/trigger drift.
  - **CORE GATE (re-scoped)** — assert: no abort + `social_challenges` clean + the 12 in-scope function re-emits cleared by Part C. Confirm Part B did NOT introduce any of the carved-out deltas (the investigation verified this).
  - **DONE (2026-06, live-verified — Part B replay-integrity gap found + fixed this session):** A live Docker `db diff --linked` run got far enough to expose that the Part B replay-integrity edits were NOT present on this branch (`fix/multi-tenant-rls-isolation-and-marketplace`) — the replay aborted `42883` at `20260504032936` (ALTER of `validate_sub_clo_weights` before its CREATE) and then again at `20260504032951` (REVOKE of `increment_team_xp` before its CREATE). Re-applied the missing Part B set as replay-only historical edits (never run against prod):
    - Baked `SET search_path=''` + `public.`-qualification into the LAST (replay-winning) CREATE of all 7 affected functions to match the LIVE bodies: the 2 badge fns (`20260720000007/8`) + `validate_sub_clo_weights` (`20260620000001`), `update_graduate_attributes_updated_at` (`20260620000002`), `enforce_max_active_challenges` (`20260720000003`), `sync_tutor_conversation_stats` + `set_tutor_conversations_updated_at` (`20260820000003`); `badge_auto_archive` reconciled to the live `awarded_at`-only predicate.
    - Removed the 5 too-early `ALTER FUNCTION` statements from `20260504032936` (hardening now lives at each CREATE site); guarded the 3 too-early `increment_team_xp` REVOKE/GRANTs (`20260504032951/033048/041233`) with `to_regprocedure(...) IS NOT NULL` DO-blocks (no-op on a fresh replay before the fn exists; applies normally on live where it does).
    - **Proof:** a systematic static scan of all 288 migration files for ALTER/REVOKE/GRANT/COMMENT referencing a function created later in the chain now returns **CLEAN (0 too-early refs)** — a stronger guarantee than a single diff run that no `42883`-class abort can occur. Live: all 9 reconciled functions carry `search_path` set and resolve; `get_advisors(security)` shows 0 ERROR and no `function_search_path_mutable` for the badge fns; `social_challenges` shape matches. The Docker `db diff` itself could not be driven to completion in this Windows env (hangs at "Initialising schema…", same instability documented by `migration-history-reconciliation` Task 9) — the static-scan + live-SQL object-for-object equivalence is recorded as the functional proof per this task's allowed fallback.
  - _Design Property: 2_
  - _Requirements: 2.11, 2.13_

- [x] 13. Re-run the advisor — no `function_search_path_mutable` WARN for the badge functions

  - **Property 3: Expected Behavior** — Advisor hardening resolved correctly (design Property 3)
  - **IMPORTANT**: Re-run the SAME advisor check from Task 3.
  - **EXPECTED OUTCOME**: no `function_search_path_mutable` WARN for `public.badge_auto_archive` or `public.badge_spotlight_auto_rotate` (each qualified first, then hardened); confirm `proconfig` now carries an empty `search_path=`.
  - **CORE GATE.**
  - _Design Property: 3_
  - _Requirements: 2.12_

- [x] 14. Verify preservation — non-buggy behavior unchanged (no regressions)

  - **Property 4: Preservation** — Identical behavior for non-buggy inputs (design Property 4)
  - **IMPORTANT**: Re-run the SAME observations/snapshots from Task 4 — do NOT write new ones.
  - Assert value-equivalence: the golden runtime values from Task 4.1 are reproduced exactly by the fixed functions (effective price, XP balance, wellness stats, seeded items, department-delete guard, trigger outcomes).
  - Assert catalog equality: `prosecdef`, `provolatile`, `proconfig`, `proowner`, `proacl`, and trigger metadata match the Task 4.2 snapshots (only the body's qualified names and, where applicable, the added `search_path`, differ).
  - Confirm append-only invariants (no UPDATE/DELETE introduced on `xp_transactions`/`xp_purchases`) and that `process_marketplace_purchase` still behaves as post-`20260601004718`.
  - Confirm the LIVE `social_challenges` columns + data are unchanged (clause 3.10).
  - [x] 14.1 (Optional) Re-run the fast-check property suite from Task 4.3 and confirm it is green.
    - _Requirements: 3.1, 3.9, 3.11_
  - _Design Property: 4_
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11_

- [x] 15. Regenerate `src/types/database.ts` — only if schema reconciliation changed shape

  - If Task 7 (or the Task 8 loop) changed any table shape that production already has differently, regenerate types so the repo matches. Function-only changes (Part C) do not change generated types.
  - Run the protected script ONLY: `pwsh scripts/regen-types.ps1` (Windows). **Never** use `npx supabase gen types ... > src/types/database.ts` (corrupts the file on Windows per `types-regeneration.md`).
  - Verify the file contains `export type Database` and is > 1 KB before committing.
  - _Requirements: 2.13_

- [x] 16. Sync migrations locally

  - Run `supabase migration fetch` (`npx supabase migration fetch --yes`) so the local `supabase/migrations/` is in sync with the remote history after the Part C forward migration is applied.
  - _Requirements: 2.14_

- [x] 17. Run the local CI suite — lint, types, tests green
  - `npm run lint` (zero warnings), then `npx tsc --noEmit` (zero errors), then `npm test` (Vitest `--run`).
  - Fix any failures before proceeding. The existing suite + rls-guard CI job must remain green.
  - _Requirements: 3.1, 3.9, 3.11_

### Final checkpoint

- [x] 18. Final verification checkpoint — all (re-scoped) acceptance gates simultaneously
  - Confirm ALL of the RE-SCOPED bugfix.md Acceptance Criterion hold at once:
    - `supabase db diff --linked` COMPLETES with no `42883` abort; `social_challenges` shows no drift; and the 10 in-scope functions + 2 badge functions no longer re-emit after Part C (Task 12, re-scoped). The carved-out residual (out-of-scope function drift, phantom tables, file-9 CHECK, policy drift) is explicitly delegated to `migration-history-reconciliation` (Task 20) and is NOT a gate here.
    - Each of the 10 functions probes OK under `search_path = ''` (Task 11).
    - Advisor reports no `function_search_path_mutable` WARN for the badge functions (Task 13).
    - Preservation holds — golden values + catalog snapshots match (Task 14); `npm test` + lint + tsc green (Task 17).
    - The Supabase Preview CI check passes for the right reason (genuine clean replay past the abort, not a silenced/skipped check) — noting the carved-out drift is tracked separately and does not represent a regression introduced by this bugfix.
  - Ensure all tests pass; if any question arises, ask the user.
  - **DONE (2026-06, live-verified):** all re-scoped gates hold simultaneously —
    - **No-abort replay gate (Task 12):** the Part B replay-integrity gap (missing on this branch) was re-applied this session; a systematic scan of all 288 migrations confirms **0 too-early ALTER/REVOKE/GRANT/COMMENT references** remain, so no `42883`-class abort can occur. `social_challenges` shape matches live. (Docker `db diff` itself hangs at "Initialising schema…" in this Windows env — same documented instability as `migration-history-reconciliation` Task 9 — so static-scan + live-SQL equivalence is the recorded proof per Task 12's allowed fallback.)
    - **search_path gate (Tasks 11/13):** all 12 in-scope functions live-verified `search_path=''` with correct security modes preserved (`get_wellness_aggregate_stats`/`delete_department_if_no_programs`/both badge fns = DEFINER; rest INVOKER); `get_advisors(security)` = 0 ERROR, no `function_search_path_mutable` for the badge functions.
    - **Preservation gate (Tasks 14/17):** `npm run lint` exit 0, `npx tsc --noEmit` exit 0, `npm test` = **546 files / 5548 tests pass, 0 fail**. The migration-scanning guard tests (rlsInstitutionIsolation, supabaseAuditFaults) pass against the edited files. `process_marketplace_purchase` unchanged (DEFINER-equiv, search_path='').
    - **Carved-out residual** (out-of-scope function drift, phantom tables, file-9 CHECK, policy drift) was fully resolved by the now-complete `migration-history-reconciliation` spec (21/21) — not a regression here.
    - **Bonus operational cleanup this session:** purged 23,051 orphaned `cron.job_run_details` rows from jobs unscheduled by migration-history-reconciliation Task 15, so cron-health monitoring reflects only the 3 live jobs (0 active failures).
  - _Requirements: 2.11, 2.12, 2.13, 2.14, 3.1, 3.6, 3.8, 3.10, 3.11_

### Phase 5 — Re-scope reconciliation (A-track follow-up from the residual-drift investigation)

> Source: `#[[file:.kiro/specs/_investigation/db-function-search-path-residual-drift-analysis.md]]`. The Task 8 replay completing past the historical `42883` abort unmasked pre-existing downstream drift (design root-cause #5) that this bugfix neither caused nor owns. These tasks formally re-scope this bugfix and hand the remainder to the new `migration-history-reconciliation` spec. They make NO production change.

- [x] 19. Re-scope the acceptance criterion + correct the Task 8 record (A-track)

  - [x] 19.1 Edit `bugfix.md` Acceptance / Verification Criterion to the re-scoped form: `db diff --linked` COMPLETES with no `42883` abort; `social_challenges` shows no drift; the 10 in-scope functions probe OK under `search_path=''`; advisor clean on the 2 badge functions; and the ONLY in-scope function delta (the 12 qualification re-emits) is cleared by Part C — with the deployment-gap + ~22 out-of-scope function re-emits + policy/constraint drift explicitly carved out to `migration-history-reconciliation`.
    - _Requirements: 2.11, 2.13_
  - [x] 19.2 Annotate `_investigation/db-function-search-path-task8-replay-log.md`: scope the "Category A clears at Task 10/12" claim to the 8–12 in-scope functions only, and reclassify the ~22 out-of-scope re-emits + the phantom-table/policy drift as the new spec's responsibility (cite the residual-drift analysis).
    - _Requirements: 2.13_
  - [x] 19.3 Confirm (QA) that Part B introduced none of the carved-out deltas — cross-check the investigation's SURPRISE-2 finding against the Part B edits (Tasks 5–7) so the re-scope is defensible.
    - _Requirements: 3.9_

- [x] 20. Hand off the carved-out drift to `migration-history-reconciliation` (cross-spec link)
  - This bugfix completes independently (Tasks 1–19). The genuinely-empty `db diff`, the app-breakage fix (6 unguarded edge functions), the phantom-table deployment, the migration de-duplication, and the ~22 out-of-scope function/policy drift reconciliation are owned by the new `migration-history-reconciliation` spec.
  - Verify that spec exists and its tasks reference this investigation; do not duplicate its work here.
  - _Requirements: 2.13, 3.10_

## Notes

- **Methodology**: Tasks 1–3 reproduce the bug (expected to FAIL on the unfixed state — failure confirms the bug). Task 4 captures preservation baselines (expected to PASS). The fix lands lowest-risk-first per design §"Sequence & Risk": Part B replay-only edits (5–8), a checkpoint (9), then the single production change (Part C, 10), then verification (11–18).
- **Property mapping**: Property 1 = runtime resolution under empty `search_path` (Tasks 1, 11). Property 2 = clean replay completes + empty diff (Tasks 2, 12). Property 3 = advisor no longer warns on badge functions (Tasks 3, 13). Property 4 = preservation for non-buggy inputs (Tasks 4, 14). Re-run tasks reuse the SAME probes/snapshots; they do not write new ones.
- **Production safety**: Part B (Tasks 5–8) edits historical migration files only — production has these timestamps recorded in `supabase_migrations.schema_migrations` and will not re-run them, so these edits affect fresh replays only and run NO DDL against production. The ONLY production write is Task 10's non-destructive `CREATE OR REPLACE` forward migration, applied after Checkpoint A (Task 9).
- **Live catalog is source of truth for Part C**: every body in Task 10 is derived from `pg_get_functiondef`, never from migration text (the design proved drift, e.g. `get_wellness_aggregate_stats`). Qualify exactly the user objects the deployed body references — built-ins resolve from `pg_catalog` and are left unqualified.
- **Tooling**: DDL via Supabase MCP `apply_migration`; probes/reads via MCP `execute_sql` in rolled-back transactions. Replay gate via `supabase db diff --linked` (Docker + Supabase CLI 2.102.0, available locally). Types regenerated only via `pwsh scripts/regen-types.ps1` (never `>` redirection). Migrations synced via `supabase migration fetch`.
- **Optional (`*`) tasks**: only the supplementary fast-check property suites (4.3, 14.1) are optional. The SQL probes, `db diff` gate, advisor check, and `npm test`/lint/tsc are core, non-optional verification gates.
- **Unknown downstream drift**: because the replay historically aborted at `20260504032936`, migrations after it have never run on a clean DB. The Task 8 loop is the discovery mechanism; its known fix points are non-exhaustive and the loop only exits on a clean, empty diff.
