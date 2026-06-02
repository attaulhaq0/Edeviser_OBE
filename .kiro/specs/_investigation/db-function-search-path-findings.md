# Investigation Findings — DB Function search_path / Qualification Bug

_Source of truth: live Supabase project `cdlgtbvxlxjpcddjazzx`, verified via MCP on 2026-06-01._

## Summary

A past hardening migration `supabase/migrations/20260504032936_fix_mutable_search_paths.sql`
set `SET search_path = ''` on 17 `public` functions. Several of those functions
reference tables with **unqualified** names (e.g. `social_challenges` instead of
`public.social_challenges`). Under an empty `search_path`, Postgres cannot resolve
bare names, so those functions **throw at runtime** (`undefined_table`). This is the
same class of bug as the already-fixed `process_marketplace_purchase` (Buy Freeze).

Separately, the same migration `ALTER`s 5 functions that are not `CREATE`d until
much later migrations, so a fresh migration replay (Supabase Preview branch / `db reset`
/ disaster recovery) aborts. The Supabase Preview CI check fails because of this.

## Two distinct defects

1. **Runtime correctness (production):** functions hardened with empty search_path but
   bodies use unqualified object references → broken when invoked.
2. **Migration replay ordering:** `20260504032936` ALTERs functions before they exist
   on a clean database → replay aborts.

## Confirmed runtime-BROKEN functions (empty search_path + unqualified refs)

| Function                                       | Unqualified refs                                     | First CREATE migration          |
| ---------------------------------------------- | ---------------------------------------------------- | ------------------------------- |
| `process_marketplace_purchase(uuid,uuid,uuid)` | many                                                 | already FIXED 20260601004718    |
| `get_effective_price(uuid,uuid)`               | marketplace_items, sale_event_items, sale_events     | 20260412192010 / 20260503100010 |
| `get_xp_balance(uuid)`                         | xp_transactions, xp_purchases                        | 20260412191955 / 20260503100009 |
| `get_wellness_aggregate_stats(uuid)`           | wellness_habit_logs, profiles, auth_institution_id() | 20260331235836 / 20260325000001 |
| `seed_marketplace_items(uuid)`                 | marketplace_items                                    | 20260412192106 / 20260503100012 |
| `delete_department_if_no_programs(uuid)`       | departments, programs                                | 20260329000001                  |
| `validate_sub_clo_weights()`                   | learning_outcomes                                    | 20260620000001                  |
| `enforce_max_active_challenges()`              | social_challenges                                    | 20260720000003                  |
| `sync_tutor_conversation_stats()`              | tutor_conversations                                  | 20260820000003                  |

Verified BROKEN via probe under `set search_path=''`:
process_marketplace_purchase (pre-fix), validate_sub_clo_weights,
enforce_max_active_challenges, sync_tutor_conversation_stats,
set_tutor_conversations_updated_at(\*see note), badge_auto_archive,
badge_spotlight_auto_rotate, get_effective_price, get_xp_balance,
seed_marketplace_items.

## Functions that are SAFE under empty search_path (no table refs; only NEW/now()/RAISE)

- `set_tutor_conversations_updated_at()` — only `NEW.updated_at = now()`
- `trg_review_schedules_set_updated_at()` — only `NEW.updated_at = now()`
- `update_graduate_attributes_updated_at()` — only `NEW.updated_at = now()`
- `update_marketplace_items_updated_at()` — only `NEW.updated_at = now()`
- `prevent_xp_purchases_delete()` — only `RAISE EXCEPTION`

(These are fine at runtime; they only matter for the replay-ordering defect where the
ALTER targets a not-yet-created function.)

## Already-correct (added this session, properly qualified)

- `course_material_institution(text)`, `set_audit_log_institution()`, `rls_isolation_violations()`

## NOTE on badge\_\* functions

`badge_auto_archive()` and `badge_spotlight_auto_rotate()` currently have **no**
search_path set in production (proconfig null) because later migrations
`20260720000007` / `20260720000008` re-`CREATE OR REPLACE` them WITHOUT search_path,
overwriting the earlier ALTER. They are flagged by Supabase advisor as
`function_search_path_mutable` (WARN). They reference unqualified tables
(`badges`, `institutions`, `badge_spotlight_schedule`), so they must be qualified
BEFORE/AS their search_path is hardened — otherwise hardening breaks them.

## Migration ordering defect detail

`20260504032936_fix_mutable_search_paths.sql` ALTERs these functions that do not yet
exist at that timestamp on a clean replay:

- `validate_sub_clo_weights` (created 20260620000001)
- `update_graduate_attributes_updated_at` (created 20260620000002)
- `enforce_max_active_challenges` (created 20260720000003)
- `sync_tutor_conversation_stats` (created 20260820000003)
- `set_tutor_conversations_updated_at` (created 20260820000003)

All 5 (and 20260504032936 itself) are already recorded in remote
`supabase_migrations.schema_migrations`, so production will NOT re-run them; editing the
historical files only affects fresh replays.

## Fix strategy (proper, not green-washing)

1. For each broken function, recreate it with body fully schema-qualified (`public.` for
   user tables; `pg_catalog`/built-ins resolve automatically) AND `SET search_path = ''`
   baked into the `CREATE OR REPLACE`. This makes it work under the secure search_path.
2. Bake `SET search_path = ''` into the CREATE of the 5 mis-ordered functions and remove
   their too-early ALTERs from `20260504032936` so a clean replay reaches the same state.
3. Qualify + harden `badge_auto_archive` / `badge_spotlight_auto_rotate` in their own
   (later) cron migrations so the advisor WARN is also resolved correctly.
4. Ship a new forward migration that re-defines the currently-broken production functions
   (production won't re-run historical files, so the live fix must be a new migration).
5. Verify: probe each function resolves under empty search_path; run the affected trigger
   paths in rolled-back transactions; confirm Supabase advisor no longer warns; confirm a
   fresh replay (Supabase Preview) passes.

## Verification assets available

- `public.rls_isolation_violations()` (RLS guard, unrelated but present)
- Supabase advisor `function_search_path_mutable` lints currently warn on:
  badge_auto_archive, badge_spotlight_auto_rotate, is_pgcron_available, prevent_mutation

---

## ADDENDUM — Exhaustive verification pass (2026-06-01, second sweep)

Goal: investor-readiness — confirm NO instance of this bug class is missed.

### Authoritative scope: functions that CANNOT resolve unqualified user objects

Out of 209 public functions:

- 17 have `search_path=""` ← primary risk set
- 1 has `search_path=pg_catalog` (`rls_auto_enable`) ← checked, SAFE (only uses pg_catalog builtins + dynamic EXECUTE)
- 28 have `search_path=public` ← SAFE (public resolves)
- 163 have mutable/unset search_path ← NOT runtime-broken (fall back to caller path), but flagged by advisor `function_search_path_mutable` (separate hardening backlog, out of scope for THIS bug)

So the definitive runtime-broken candidate set = the 17 `search_path=""` functions.

### Probe-verified results (executed against live DB)

Callable functions (probed by direct invocation under empty search_path):

- get_effective_price → BROKEN:undefined_table
- get_xp_balance → BROKEN:undefined_table
- get_wellness_aggregate_stats → BROKEN:undefined_function (unqualified auth_institution_id())
- delete_department_if_no_programs → BROKEN:undefined_table
- course_material_institution → OK (mine; qualified)
- rls_isolation_violations → OK (mine; qualified)

Trigger functions (probed by firing real DML in a self-cleaning probe):

- enforce_max_active_challenges → BROKEN:undefined_table (verified via real INSERT into social_challenges)

By body inspection (qualified-ref analysis), also BROKEN:

- validate_sub_clo_weights (bare learning_outcomes)
- sync_tutor_conversation_stats (bare tutor_conversations)
- seed_marketplace_items (bare marketplace_items)
- badge_auto_archive (bare badges, institutions) — NOTE currently mutable in prod (overwritten by later cron migration), still must be qualified
- badge_spotlight_auto_rotate (bare badge_spotlight_schedule, badges, institutions) — same caveat
- process_marketplace_purchase — ALREADY FIXED (20260601004718)

Confirmed SAFE under empty search_path (no table refs — only NEW/now()/RAISE):

- set_tutor_conversations_updated_at, trg_review_schedules_set_updated_at,
  update_graduate_attributes_updated_at, update_marketplace_items_updated_at,
  prevent_xp_purchases_delete

Already-correct (mine, this session): course_material_institution,
set_audit_log_institution, rls_isolation_violations.

### SECOND, SEPARATE FINDING — schema drift (social_challenges)

While probing, discovered the LIVE `social_challenges` table does NOT match its migration
file `20260720000003_create_social_challenges.sql`:

- Migration defines: goal_metric, goal_target, reward_type, reward_value, notification_sent_90
- LIVE has instead: goal_target, participation_mode, reward_xp, reward_badge_id, institution_id
  (NO goal_metric, reward_type, reward_value, notification_sent_90)

This means the deployed schema was altered out-of-band and migrations don't reproduce it.
A fresh replay would build a DIFFERENT social_challenges than production. This is a real
investor-readiness risk but is a DISTINCT problem from the search_path bug. It should be
tracked/fixed separately (schema-drift reconciliation), not folded into this bugfix, to
keep this fix focused and verifiable. Flag to user.

### Definitive fix scope for THIS bugfix (10 functions)

Re-qualify bodies + ensure SET search_path='' (and CREATE-before-ALTER ordering):

1. get_effective_price
2. get_xp_balance
3. get_wellness_aggregate_stats
4. seed_marketplace_items
5. delete_department_if_no_programs
6. validate_sub_clo_weights
7. enforce_max_active_challenges
8. sync_tutor_conversation_stats
9. badge_auto_archive
10. badge_spotlight_auto_rotate
    (process_marketplace_purchase already fixed.)

Plus replay-ordering correction in 20260504032936 for the 5 functions ALTERed-before-CREATE.

---

## ADDENDUM 2 — Authoritative shadow-DB replay (supabase db diff --linked)

Ran a full from-scratch migration replay into a Supabase shadow database
(Docker, supabase CLI 2.102.0). This is the authoritative test of whether the
migration chain can rebuild production. RESULT: **it cannot.**

### Decisive result: fresh replay ABORTS

The replay applied ~150 migrations successfully, then **failed hard** at:

```
Applying migration 20260504032936_fix_mutable_search_paths.sql...
ERROR: could not find a function named "public.validate_sub_clo_weights" (SQLSTATE 42883)
At statement: 6  ->  ALTER FUNCTION public.validate_sub_clo_weights SET search_path = ''
```

This is the EXACT failure the Supabase Preview CI check reports — now reproduced
locally and authoritatively. Because the replay aborts here, a clean database
(preview branch, disaster recovery, new region, local dev `db reset`) CANNOT be
built from the current migrations. This is the top investor-readiness risk.

### Additional drift exposed by replay NOTICEs (objects missing on a clean build)

Migration `20260502103758_align_social_challenges_with_design_spec.sql` logged on a
FRESH db:

- column "reward_type" of social_challenges does not exist, skipping
- column "reward_value" of social_challenges does not exist, skipping
- column "notification_sent_90" of social_challenges does not exist, skipping
- trigger "trg_enforce_max_active_challenges" does not exist, skipping
- function enforce_max_active_challenges() does not exist, skipping

These "does not exist, skipping" on a clean build mean the migration set is internally
inconsistent: later migrations were written against a production schema that was changed
out-of-band, so the recorded migrations don't reproduce it. (Many earlier
"already exists, skipping" NOTICEs are benign idempotency guards; the "does not exist"
ones on a fresh DB are the concerning signal.)

### Confirmed scope for the spec (expanded per user request)

Part A — Function qualification (runtime bug): 10 functions (see Addendum 1) recreated
with schema-qualified bodies under SET search_path=''.

Part B — Migration replay integrity (NEW, critical): the migration chain must rebuild a
fresh DB to a state matching production. Requires:

- Fix the ALTER-before-CREATE ordering in 20260504032936 (the hard abort).
- Reconcile social_challenges (and any other drifted tables) so migrations reproduce the
  live schema (live cols: goal_target, participation_mode, reward_xp, reward_badge_id,
  institution_id; migration-defined cols that aren't live: goal_metric, reward_type,
  reward_value, notification_sent_90).
- Re-run `supabase db diff --linked` until it (a) completes and (b) reports no drift.

Part C — Production forward migration: ship the function fixes as a NEW migration (prod
won't re-run historical files).

Verification gate: a clean `supabase db diff --linked` that COMPLETES with empty/clean
output is the objective proof the whole class is fixed.
