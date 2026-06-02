# Preservation Baseline — DB Function search_path Qualification Bugfix

> **Task 4 (Phase 1 preservation baseline) output.** Captured against the LIVE Supabase
> project `cdlgtbvxlxjpcddjazzx` via MCP `execute_sql`, on the **UNFIXED** state, before any
> Part B/Part C change. This is the golden record that **Task 14** re-runs and asserts
> equivalence against (`F'(X) == capturedOriginal F(X)`), and the catalog snapshot Task 14
> diffs for equality.
>
> **Capture method:** OBSERVATION ONLY. No DDL (no CREATE/ALTER/DROP), no function modified,
> no production-mutating statement committed. Trigger outcomes and the active-sale case were
> observed inside self-cleaning `DO` blocks that `RAISE` at the end to force rollback; residue
> was confirmed zero afterwards. Reads were plain `SELECT`s.
>
> Maps to design **Property 4: Preservation** and bugfix.md clauses 3.1–3.11 (esp. 3.1, 3.2,
> 3.3, 3.4, 3.5, 3.7, 3.8, 3.10).

## 0. Critical observation that shapes the baseline

Every one of the 10 in-scope functions carries `SET search_path = ''` **baked into its own
definition** (`proconfig = ["search_path=\"\""]`). Postgres applies that empty `search_path`
inside the function body on **every** invocation regardless of the caller's session
`search_path`. Therefore on the unfixed state a direct call fails immediately, e.g.:

```
SELECT public.get_xp_balance('cf326a2c-6857-4fd1-9bdb-91eafe9b13b3');
-- ERROR: 42P01: relation "xp_transactions" does not exist
--        PL/pgSQL function public.get_xp_balance(uuid) line 6 at SQL statement
```

This is exactly the Task 1 / Property 1 bug condition (confirmed again here as a side effect).
**Consequence for preservation:** the "golden value" for each function is the
**functionally-correct result its body logic produces against the real production data** — i.e.
the value the body computes once its identifiers resolve. These were captured by executing each
function's exact body logic with resolvable (schema-qualified / public) identifiers. After the
fix (Part C), `F'(X)` must reproduce these exact values. The badge-cron functions
(`badge_auto_archive`, `badge_spotlight_auto_rotate`) currently have `proconfig = null`
(mutable) — see §2.

## 1. Golden runtime values (Task 4.1) — caller search_path (NOT empty)

Captured 2026 baseline against live data. Data-state context at capture time:
`marketplace_items`=33, `sale_events`=0, `sale_event_items`=0, active sales=0,
`wellness_habit_logs`=0, `social_challenges`=21 (none `course_wide`), CLOs=21,
`tutor_conversations`=1 (message_count=0), `xp_purchases`=0 rows.

Institutions:
| institution_id | name |
|---|---|
| `00000000-0000-0000-0000-000000000001` | Demo University |
| `9fb38246-8bad-4372-acf7-e2d17558f2d0` | Gulf Academy of Excellence |
| `4de6a0a2-758b-47f3-ab7e-984bb974d88b` | Noor International School |

### 1.1 `get_xp_balance(uuid)` — golden balances (earned − spent, floored at 0)

All sampled students are in `4de6a0a2-758b-47f3-ab7e-984bb974d88b` (Noor). No `xp_purchases`
rows exist, so `spent = 0` for every student; balance = earned.

| student_id                             | earned | spent | golden_xp_balance |
| -------------------------------------- | ------ | ----- | ----------------- |
| `cf326a2c-6857-4fd1-9bdb-91eafe9b13b3` | 2220   | 0     | **2220**          |
| `28892e25-f686-4511-8831-a5cf5273ff87` | 2200   | 0     | **2200**          |
| `74355922-9523-4b33-8b20-0fab220d0491` | 2190   | 0     | **2190**          |
| `ace0dc2f-e6da-439d-8691-0c9520295a92` | 2140   | 0     | **2140**          |
| `d8992b24-f35d-4a47-8215-cffded6a6ce7` | 2080   | 0     | **2080**          |
| `8c932d8c-edb6-4ba4-89d0-a73a36e45bb9` | 2010   | 0     | **2010**          |
| `1e223d05-2c72-428f-b265-752160f07d88` | 1990   | 0     | **1990**          |
| `7bcd3e7d-17fa-4b44-9edf-c3542583a57c` | 1930   | 0     | **1930**          |

Body semantics preserved: `GREATEST(0, SUM(xp_transactions.xp_amount) − SUM(xp_purchases.xp_cost WHERE status<>'refunded'))`.

### 1.2 `get_effective_price(uuid, uuid)` — no-sale and active-sale cases

**No-sale case** (no active `sale_events` in prod → discount 0 → effective = base):

| item_id                                | institution_id | name          | base_price | golden_effective_price |
| -------------------------------------- | -------------- | ------------- | ---------- | ---------------------- |
| `5edfd591-ac15-4ec4-b35b-974d4085e1aa` | Gulf           | Gold Crown    | 1200       | **1200**               |
| `edaf56a5-1cd4-4f00-9c68-45206ad35e56` | Demo           | Gold Crown    | 1200       | **1200**               |
| `2fde2ff9-2863-4344-9021-732f4c8a251f` | Noor           | Gold Crown    | 1200       | **1200**               |
| `9e5f014a-9724-4195-a49b-c92081c6c411` | Noor           | Sunset Orange | 750        | **750**                |

**Active-sale case** (observed inside a rolled-back `DO` block: inserted a temporary 50%-off
active `sale_events` row + `sale_event_items` link for item
`2fde2ff9-2863-4344-9021-732f4c8a251f` @ Noor, computed via the function's join logic, then
`RAISE` to roll back):

```
GOLDEN_ACTIVE_SALE base=1200 disc=50 effective=600
```

→ `get_effective_price` golden for (base 1200, 50% active sale) = **600**
(`GREATEST(1, 1200 − FLOOR(1200*50/100))`). Post-rollback verification:
`sale_events`=0, `sale_event_items`=0 (no residue — side-effect free).

### 1.3 `get_wellness_aggregate_stats(uuid)` — authorized + unauthorized guard

- **Authorized golden output:** with `wellness_habit_logs`=0 in prod, the authorized result
  set is **empty (`[]`)** for all three institutions (Demo / Gulf / Noor). The body's aggregate
  is `SELECT whl.wellness_type, COUNT(*), COUNT(DISTINCT whl.student_id) FROM wellness_habit_logs whl JOIN profiles p ON p.id=whl.student_id WHERE p.institution_id=p_institution_id GROUP BY whl.wellness_type`.
- **Unauthorized guard (preserve verbatim):** when `auth_institution_id() <> p_institution_id`
  the function **`RAISE EXCEPTION 'unauthorized: institution mismatch'`**. This guard must be
  preserved exactly by F'. (Note: in the MCP service context `auth_institution_id()` returns
  `null`, so any non-null `p_institution_id` argument trips the guard — confirming the guard is
  active and intact.)

### 1.4 Trigger golden outcomes (observed via self-cleaning rolled-back `DO` blocks)

- **`validate_sub_clo_weights` (valid Sub-CLO insert succeeds):** parent
  `ebd7df95-b9f1-4152-9fd0-6083bd36cec8` is a `CLO`, so:

  ```
  GOLDEN_SUBCLO PASS: parent_type=CLO -> Sub-CLO insert succeeds
  ```

  Body decision table preserved: parent NULL → `RAISE 'Parent outcome not found'`;
  parent <> 'CLO' → `RAISE 'Sub-CLO parent must be a CLO, got %'`; parent = 'CLO' → pass.
  (Non-`SUB_CLO` rows short-circuit to `RETURN NEW` before touching `learning_outcomes`.)

- **`enforce_max_active_challenges` (>3 active course-wide still raises):**

  ```
  GOLDEN_ENFORCE max_active_course_wide_per_course=0
  GOLDEN_ENFORCE_TRUTHTABLE  others>=3 RAISES ('Maximum 3 active course-wide challenges per course'); others<3 PASSES
  ```

  Truth table preserved: the trigger raises iff (NEW.status='active' AND
  NEW.challenge_type='course_wide' AND COUNT(other active course_wide on same course) >= 3).
  **Live-data note:** there are currently **0** `course_wide` challenges, and the live
  `social_challenges_challenge_type_check` CHECK allows only
  `{academic, habit, xp_race, blooms_climb, cooperative}` — so `course_wide` is not even an
  insertable value under the current constraint, meaning no live insert reaches the raise today.
  The preserved branch logic is still asserted byte-for-byte; this is documented so Task 14 does
  not expect a live `course_wide` row.

- **`sync_tutor_conversation_stats` (message_count increments/decrements):** conversation
  `89b580da-a68b-46ff-aa4e-ba0919c71400` starts at `message_count=0`:

  ```
  GOLDEN_TUTORSYNC start=0 after_insert=1 after_delete=0
  ```

  Body semantics preserved: INSERT → `message_count = message_count + 1`; DELETE →
  `message_count = GREATEST(message_count − 1, 0)`; UPDATE that moves a message between
  conversations → −1 (floored at 0) on OLD, +1 on NEW. AFTER trigger, `RETURN NULL`.

- **`seed_marketplace_items` (idempotent seed):** all 3 institutions already have **11**
  seeded items across sub-categories
  `{profile_theme, avatar_frame, display_title, extra_quiz_attempt, deadline_extension, hint_token, xp_boost, streak_shield}`.
  Body inserts 16 catalog rows across 5 `INSERT ... ON CONFLICT DO NOTHING` blocks; re-running
  on a seeded institution is a no-op (golden: count stays 11, `ON CONFLICT DO NOTHING`).

- **`delete_department_if_no_programs(uuid)` (delete guard):** returns `true` iff the
  department has no programs (then deletes), else `false`.
  | dept_id | name | program_count | golden_would_delete |
  |---|---|---|---|
  | `cd399a33-eafa-4772-ab9e-3950c2f95317` | BBA | 0 | **true** |
  | `ba901808-012a-4768-a73d-07306c58f2d4` | CS | 0 | **true** |
  (Both currently program-free → guard returns true. A department WITH programs returns false
  and deletes nothing. NOT observed via real DELETE to stay side-effect free; decision logic
  captured via the body's `NOT EXISTS` predicate.)

- **`badge_auto_archive` / `badge_spotlight_auto_rotate`:** `void`-returning cron procedures
  (no scalar golden value). Behavioral invariants to preserve:
  - `badge_auto_archive`: archives (`SET archived_at = now()`) badges where
    `archived_at IS NULL AND is_pinned = false AND tier IS NOT NULL AND COALESCE(updated_at, created_at, awarded_at, now()-'91 days') < now() - '90 days'`.
  - `badge_spotlight_auto_rotate`: for each institution, if no schedule row exists for the
    current Monday, inserts the next category in the fixed alphabetical rotation
    `{academic, engagement, social, streak, wellness}` (`ON CONFLICT (institution_id, week_start) DO NOTHING`).

### 1.5 `process_marketplace_purchase(uuid,uuid,uuid)` — clause 3.8 (must not regress)

Already fixed in `20260601004718`; **out of scope** for change. Baseline snapshot to confirm
Task 14 sees it unchanged:

- `prosecdef = false` (SECURITY INVOKER), `volatility = v` (VOLATILE),
  `proconfig = ["search_path=\"\""]`, owner `postgres`,
  acl `{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}`.
- Body already fully `public.`-qualified (`already_qualified = true`).
- `pg_get_functiondef` **md5 = `3df06c27e0e01317c204d528266f0448`**, length **3990**.
- **Task 14 assertion:** this md5 / length / proconfig must be identical after the fix
  (this bugfix does not touch `process_marketplace_purchase`).

## 2. Catalog metadata snapshot (Task 4.2)

`pg_proc` snapshot for the 10 in-scope functions + the 5 runtime-safe trigger functions
(touched only for replay ordering in Part B). Volatility codes: `s`=STABLE, `v`=VOLATILE.
`proconfig` shown verbatim. **Task 14 asserts equality of `prosecdef`, `provolatile`,
`proconfig`, `proowner`, `proacl` after the fix** (only the body's qualified names — and, for
the two badge functions, the newly-added `search_path=''` — may differ).

| function (args)                                              | prosecdef | volatility | proconfig                           | owner    | proacl                                                                                               | language | return                                                               |
| ------------------------------------------------------------ | --------- | ---------- | ----------------------------------- | -------- | ---------------------------------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------- |
| `get_effective_price(p_item_id uuid, p_institution_id uuid)` | false     | s          | `["search_path=\"\""]`              | postgres | `{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}` | plpgsql  | integer                                                              |
| `get_xp_balance(p_student_id uuid)`                          | false     | s          | `["search_path=\"\""]`              | postgres | `{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}` | plpgsql  | integer                                                              |
| `get_wellness_aggregate_stats(p_institution_id uuid)`        | **true**  | v          | `["search_path=\"\""]`              | postgres | `{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}`                             | plpgsql  | TABLE(wellness_type text, total_logs bigint, unique_students bigint) |
| `seed_marketplace_items(p_institution_id uuid)`              | false     | v          | `["search_path=\"\""]`              | postgres | `{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}` | plpgsql  | void                                                                 |
| `delete_department_if_no_programs(dept_id uuid)`             | **true**  | v          | `["search_path=\"\""]`              | postgres | `{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}`                             | plpgsql  | boolean                                                              |
| `validate_sub_clo_weights()`                                 | false     | v          | `["search_path=\"\""]`              | postgres | `{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}` | plpgsql  | trigger                                                              |
| `enforce_max_active_challenges()`                            | false     | v          | `["search_path=\"\""]`              | postgres | `{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}` | plpgsql  | trigger                                                              |
| `sync_tutor_conversation_stats()`                            | false     | v          | `["search_path=\"\""]`              | postgres | `{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}` | plpgsql  | trigger                                                              |
| `badge_auto_archive()`                                       | **true**  | v          | **`null` (MUTABLE — advisor WARN)** | postgres | `{postgres=X/postgres,service_role=X/postgres}`                                                      | plpgsql  | void                                                                 |
| `badge_spotlight_auto_rotate()`                              | **true**  | v          | **`null` (MUTABLE — advisor WARN)** | postgres | `{postgres=X/postgres,service_role=X/postgres}`                                                      | plpgsql  | void                                                                 |
| `set_tutor_conversations_updated_at()`                       | false     | v          | `["search_path=\"\""]`              | postgres | `{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}` | plpgsql  | trigger                                                              |
| `trg_review_schedules_set_updated_at()`                      | false     | v          | `["search_path=\"\""]`              | postgres | `{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}` | plpgsql  | trigger                                                              |
| `update_graduate_attributes_updated_at()`                    | false     | v          | `["search_path=\"\""]`              | postgres | `{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}` | plpgsql  | trigger                                                              |
| `update_marketplace_items_updated_at()`                      | false     | v          | `["search_path=\"\""]`              | postgres | `{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}` | plpgsql  | trigger                                                              |
| `prevent_xp_purchases_delete()`                              | false     | v          | `["search_path=\"\""]`              | postgres | `{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}` | plpgsql  | trigger                                                              |

**Note on badge functions:** `proconfig = null` confirms clauses 1.9/1.10/1.12 — they are
currently MUTABLE in prod (later cron migrations `20260720000007/...08` re-CREATE them without
`search_path`). After the fix they must carry `search_path=''` (this is the one allowed
catalog delta for these two; advisor WARN must clear in Task 13).

### 2.1 `pg_get_functiondef` body fingerprints (unfixed) — for Task 14 delta proof

After Part C, these md5s are **expected to change** (bodies become `public.`-qualified; badge
fns also gain `search_path=''`). They are recorded so Task 14 can prove the change set is
limited to qualification + the two badge `search_path` additions, with no semantic drift.

| function                           | unfixed body md5                   | body length |
| ---------------------------------- | ---------------------------------- | ----------- |
| `badge_auto_archive`               | `3011eb33766bc73d41e0d13e4f398fa7` | 553         |
| `badge_spotlight_auto_rotate`      | `0e6a05c68fc055382d0be748305a5e9d` | 1850        |
| `delete_department_if_no_programs` | `184b754f30be615a8a349397fa527d70` | 432         |
| `enforce_max_active_challenges`    | `40b8a487e20f5bfe955827b8d25e42e0` | 515         |
| `get_effective_price`              | `ab77cd89fbb4ad77ce8b45968c453159` | 902         |
| `get_wellness_aggregate_stats`     | `bd004e616314d19a8a266c89dfb5c54f` | 745         |
| `get_xp_balance`                   | `c52126d84030597d3c9f0ee16c6801db` | 498         |
| `seed_marketplace_items`           | `660dd44f2255b6a9657860d6c078618d` | 4819        |
| `sync_tutor_conversation_stats`    | `6b298c2362c318f125b0c95f64aa5b8d` | 919         |
| `validate_sub_clo_weights`         | `f4deac55039b9fe7d14ea31424ccb111` | 793         |

### 2.2 Trigger metadata snapshot (timing / level / events) — must be preserved

| trigger                              | table                 | function                                | timing | level | events                 | enabled     |
| ------------------------------------ | --------------------- | --------------------------------------- | ------ | ----- | ---------------------- | ----------- |
| `trg_validate_sub_clo`               | `learning_outcomes`   | `validate_sub_clo_weights`              | BEFORE | ROW   | INSERT, UPDATE         | O (enabled) |
| `trg_enforce_max_active_challenges`  | `social_challenges`   | `enforce_max_active_challenges`         | BEFORE | ROW   | INSERT, UPDATE         | O           |
| `trg_sync_conversation_stats`        | `tutor_messages`      | `sync_tutor_conversation_stats`         | AFTER  | ROW   | INSERT, DELETE, UPDATE | O           |
| `trg_tutor_conversations_updated_at` | `tutor_conversations` | `set_tutor_conversations_updated_at`    | BEFORE | ROW   | UPDATE                 | O           |
| `trg_graduate_attributes_updated_at` | `graduate_attributes` | `update_graduate_attributes_updated_at` | BEFORE | ROW   | UPDATE                 | O           |
| `trg_marketplace_items_updated_at`   | `marketplace_items`   | `update_marketplace_items_updated_at`   | BEFORE | ROW   | UPDATE                 | O           |
| `review_schedules_set_updated_at`    | `review_schedules`    | `trg_review_schedules_set_updated_at`   | BEFORE | ROW   | UPDATE                 | O           |
| `trg_prevent_xp_purchases_delete`    | `xp_purchases`        | `prevent_xp_purchases_delete`           | BEFORE | ROW   | DELETE                 | O           |

## 3. LIVE `social_challenges` column set (clause 3.10 / Task 7 drift target — must NOT change)

Reconciliation (Task 7) must make a fresh replay reproduce exactly this LIVE shape; live data
and schema stay unchanged.

| column             | type        | not null | default                                                        |
| ------------------ | ----------- | -------- | -------------------------------------------------------------- |
| id                 | uuid        | yes      | gen_random_uuid()                                              |
| course_id          | uuid        | yes      | —                                                              |
| title              | text        | yes      | —                                                              |
| description        | text        | yes      | `''::text`                                                     |
| challenge_type     | text        | yes      | — (CHECK: academic, habit, xp_race, blooms_climb, cooperative) |
| goal_target        | integer     | yes      | — (CHECK > 0)                                                  |
| start_date         | timestamptz | yes      | —                                                              |
| end_date           | timestamptz | yes      | —                                                              |
| status             | text        | yes      | `'draft'::text` (CHECK: draft, active, ended, cancelled)       |
| created_by         | uuid        | yes      | —                                                              |
| created_at         | timestamptz | yes      | now()                                                          |
| institution_id     | uuid        | yes      | —                                                              |
| participation_mode | text        | yes      | `'team'::text` (CHECK: team, individual)                       |
| reward_xp          | integer     | yes      | 100 (CHECK 50..500)                                            |
| reward_badge_id    | text        | no       | —                                                              |
| updated_at         | timestamptz | yes      | now()                                                          |

**Absent (legacy, correctly NOT present live):** `goal_metric`, `reward_type`, `reward_value`,
`notification_sent_90`.

## 4. Production safety confirmation

- **No DDL executed.** No `CREATE` / `ALTER` / `DROP` / function modification was run.
- **No committed mutations.** The only DML was inside self-cleaning `DO` blocks that `RAISE`
  at the end (forcing rollback); post-checks confirmed zero residue
  (`sale_events`=0, `sale_event_items`=0 after the active-sale probe).
- All other reads were plain `SELECT` / catalog introspection.
- Project: `cdlgtbvxlxjpcddjazzx` (matches `supabase/.temp/project-ref`).

## 5. How Task 14 re-runs this

1. Re-read the §2 `pg_proc` snapshot and assert `prosecdef`, `provolatile`, `proconfig`,
   `proowner`, `proacl` equal these values for all 15 functions — except the two badge
   functions, whose `proconfig` must change from `null` → `["search_path=\"\""]`.
2. Re-read §2.2 trigger metadata and assert byte-for-byte equality.
3. Re-compute §1 golden values (XP balances, no-sale + 50%-sale effective price, empty wellness
   sets + unauthorized guard, the three trigger arithmetic/decision outcomes, seed idempotency,
   department-delete guard) and assert F'(X) reproduces them exactly.
4. Assert `process_marketplace_purchase` body md5 `3df06c27e0e01317c204d528266f0448` / length
   3990 / `proconfig=["search_path=\"\""]` unchanged (clause 3.8).
5. Assert the §3 LIVE `social_challenges` columns + data unchanged (clause 3.10).
