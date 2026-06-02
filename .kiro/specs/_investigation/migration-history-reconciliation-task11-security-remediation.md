# Task 11 — Live `get_advisors(security)` Triage & Remediation (Execution Log)

> Spec: `migration-history-reconciliation`. Task 11 (Phase 5b, HIGH-RISK gate).
> Project: `cdlgtbvxlxjpcddjazzx` (confirmed against `supabase/.temp/project-ref`). PG **17.6**.
> Decision 4 was pre-approved by the user ("recommended ones, senior-dev + QA"). All DDL applied via
> MCP `apply_migration` as named additive forward migrations. NO `db push`, NO manual edits to
> recorded migrations. Pre-change snapshot captured read-only first.

---

## 1. Pre-change snapshot (read-only, captured before any change)

### 1.1 `leaderboard_weekly` view

- `relkind = v` (regular view), `owner = postgres`, **`reloptions = NULL`** → NO `security_invoker` set ⇒ runs with the **view owner's** privileges (definer-like), bypassing the querying user's RLS. This is exactly the ERROR the advisor flags. (The historical migration comment "CREATE VIEW … is SECURITY INVOKER (the default)" is **incorrect** for RLS purposes in PG.)
- Columns: `student_id uuid`, `weekly_xp bigint`, `rank bigint` (matches generated `database.ts`).
- View body: `SELECT student_id, sum(xp_amount) AS weekly_xp, rank() OVER (ORDER BY sum(xp_amount) DESC) AS rank FROM xp_transactions WHERE created_at >= date_trunc('week', now()) GROUP BY student_id;`
- Grants: SELECT to anon, authenticated, postgres, service_role.

### 1.2 Function grants (proacl) — revoke targets

- `anonymize_user(uuid)`: `prosecdef=true`, volatile, `search_path=public`. ACL = `postgres, anon, authenticated, service_role` all hold EXECUTE.
- `auth_institution_id()`: `prosecdef=true`, stable, `search_path=public`. ACL = `postgres, authenticated, service_role, anon`.
- `auth_user_role()`: `prosecdef=true`, stable, `search_path=public`. ACL = `postgres, authenticated, service_role, anon`.

### 1.3 Mutable-search-path functions

- `is_pgcron_available()`: `prosecdef=true`, volatile, **`proconfig=NULL`** (mutable). Body reads `pg_extension`.
- `prevent_mutation()`: `prosecdef=false` (INVOKER), volatile trigger, **`proconfig=NULL`** (mutable). Body only `RAISE EXCEPTION` (no relation refs). Attached to append-only triggers on `audit_logs`, `evidence`, `xp_transactions`.

### 1.4 RLS facts that drove the decisions

- `xp_transactions` RLS: `xp_transactions_student_read` = `student_id = auth.uid()` (own rows only); `xp_transactions_admin_read` = institution-scoped admin. **No cross-student read for students.**
- `student_gamification` RLS: `gamification_student_read` = `student_id = auth.uid()` (own row only); staff = institution-scoped.
- No RLS policy targeting role `anon` references `auth_user_role`/`auth_institution_id` (empty result).
- No RLS policy references `anonymize_user` (empty result).

---

## 2. `src/` RPC-call grep results (RULE #3)

Searched `src/**/*.{ts,tsx}` for client-side `.rpc('anonymize_user' | 'auth_user_role' | 'auth_institution_id')`:

- **NO matches.** None of the three is called as a client RPC anywhere in `src/`.
- `anonymize_user` is not invoked by any Edge Function either (grep of `supabase/functions/**`). The server-side GDPR erasure path therefore runs via the **service_role** (which retains EXECUTE after the revoke).

---

## 3. CRITICAL FINDING — auth-helper revoke would break RLS (NOT applied)

The prompt's Decision-4 text suggested revoking `auth_institution_id()` / `auth_user_role()` from `anon`
(and possibly `authenticated`), asserting "RLS policies invoke them as SECURITY DEFINER internally,
which does NOT require the caller to hold EXECUTE."

**This assertion is FALSE on this database — proven empirically in rolled-back probes (PG 17.6):**

| Probe (rolled back)                                                                                                                                    | Result                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------- |
| REVOKE EXECUTE on `auth_user_role()`+`auth_institution_id()` FROM `authenticated`, then `SET ROLE authenticated; SELECT count(*) FROM xp_transactions` | **FAILED: `permission denied for function auth_user_role`** |
| REVOKE … FROM `anon`, then `SET ROLE anon; SELECT count(*) FROM profiles`                                                                              | **FAILED: `permission denied for function auth_user_role`** |
| same, `SELECT count(*) FROM xp_transactions` as anon                                                                                                   | **FAILED: `permission denied for function auth_user_role`** |

In Postgres, a function called inside an RLS policy expression is evaluated as the **querying** role and
requires that role to hold EXECUTE. `SECURITY DEFINER` controls what the function does _internally_, not
whether the caller may invoke it. Nearly every table's RLS calls `auth_user_role()`/`auth_institution_id()`
(policies apply to PUBLIC), so revoking EXECUTE from `anon`/`authenticated` would break reads/writes
**platform-wide** for those roles.

**DECISION (per Req 9.7 / 8.3): DO NOT revoke `auth_institution_id` / `auth_user_role` from anon or
authenticated.** These two advisor WARNs are **ACCEPTED with justification** — the helpers must remain
EXECUTE-able by both roles for RLS to function. They are thin, institution-scoped, read-only lookups
(`SELECT institution_id/role FROM profiles WHERE id = auth.uid()`) that only ever return the _caller's own_
row, so anon/authenticated RPC exposure leaks nothing beyond what the caller already knows about itself.
**Flagged for user awareness** (this deviates from the literal Decision-4 wording, but honors its intent —
"best for our codebase, senior-dev + QA" — by not shipping a platform-breaking revoke).

---

## 4. Changes applied (3 additive forward migrations)

| Migration (recorded on remote)                                         | Change                                                                                                                                              | Safety verification                                                                                                                                                                                            |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `20260601220023_task11_leaderboard_weekly_security_invoker`            | `ALTER VIEW public.leaderboard_weekly SET (security_invoker = true)`                                                                                | Rolled-back probe: authenticated + anon both SELECT the view with **no permission error** (RLS-filtered counts). Output shape unchanged.                                                                       |
| `20260601220036_task11_revoke_anonymize_user_from_public_roles`        | `REVOKE EXECUTE ON anonymize_user(uuid) FROM anon, authenticated`                                                                                   | No RLS dep, no client `.rpc`, no edge-fn call; service_role retains EXECUTE. Post-state ACL = `postgres, service_role` only.                                                                                   |
| `20260601220105_task11_harden_search_path_pgcron_and_prevent_mutation` | `CREATE OR REPLACE` both with `SET search_path=''`; `is_pgcron_available` qualified to `pg_catalog.pg_extension`; `prevent_mutation` body unchanged | `prosecdef`/volatility preserved (is_pgcron=DEFINER/v, prevent_mutation=INVOKER/v). Append-only triggers still attached + still fire (rolled-back UPDATE on xp_transactions raised the append-only exception). |

### `leaderboard_weekly` security_invoker — anonymity opt-out invariant analysis

- The view exposes **no names** — only `student_id, weekly_xp, rank`. Anonymity opt-out (`leaderboard_anonymous`)
  masking happens in the consuming layer.
- Consumers:
  - **Top-XP leaderboard** (`useLeaderboard.ts`) → `get_leaderboard_page` RPC (SECURITY DEFINER, institution-scoped,
    set-based opt-out exclusion). **Does not read the view.** Unaffected.
  - **League tab** (`useLeagueLeaderboard.ts`, student-only route) → reads `.from("leaderboard_weekly")` directly,
    but is gated upstream by `student_gamification` own-row RLS, so the `studentIds` set only ever contains the
    caller's own id; opt-out names are masked via a separate `leaderboard_anonymous` fetch. Under `security_invoker`
    the student reads only their own `xp_transactions` row → identical observable result.
  - **`leaderboard-refresh` edge function** → uses **service_role** (bypasses RLS). Unaffected.
- Post-change tests: `leaderboardOptOut.property.test.ts` + `leaderboardPage.test.tsx` → **18/18 pass.**

---

## 5. Per-finding decision table (ALL live security advisor findings)

| Finding                                              | Object                                     | Level | Decision                                                     | Status after          |
| ---------------------------------------------------- | ------------------------------------------ | ----- | ------------------------------------------------------------ | --------------------- |
| `security_definer_view`                              | `leaderboard_weekly`                       | ERROR | **fix-now** → security_invoker                               | ✅ CLEARED            |
| `function_search_path_mutable`                       | `is_pgcron_available`                      | WARN  | **fix-now** → `search_path=''`                               | ✅ CLEARED            |
| `function_search_path_mutable`                       | `prevent_mutation`                         | WARN  | **fix-now** → `search_path=''`                               | ✅ CLEARED            |
| `anon_security_definer_function_executable`          | `anonymize_user`                           | WARN  | **fix-now** → REVOKE anon                                    | ✅ CLEARED            |
| `authenticated_security_definer_function_executable` | `anonymize_user`                           | WARN  | **fix-now** → REVOKE authenticated                           | ✅ CLEARED            |
| `anon_/authenticated_…executable`                    | `auth_institution_id`                      | WARN  | **ACCEPT (justification §3)** — revoke breaks RLS            | remains (intended)    |
| `anon_/authenticated_…executable`                    | `auth_user_role`                           | WARN  | **ACCEPT (justification §3)** — revoke breaks RLS            | remains (intended)    |
| `anon_/authenticated_…executable`                    | `consume_invitation`                       | WARN  | **ACCEPT** — anon signup/invite flow needs it                | remains (intended)    |
| `anon_/authenticated_…executable`                    | `get_invitation_by_token`                  | WARN  | **ACCEPT** — anon invite lookup for signup                   | remains (intended)    |
| `anon_/authenticated_…executable`                    | `is_portfolio_publicly_accessible`         | WARN  | **ACCEPT** — public portfolio feature                        | remains (intended)    |
| `anon_/authenticated_…executable`                    | `portfolio_public_access`                  | WARN  | **ACCEPT** — public portfolio feature                        | remains (intended)    |
| `authenticated_…executable`                          | `check_rate_limit_approaching`             | WARN  | **ACCEPT** — self-guarding rate-limit helper                 | remains (intended)    |
| `authenticated_…executable`                          | `course_material_institution`              | WARN  | **ACCEPT** — institution-scoped storage helper               | remains (intended)    |
| `authenticated_…executable`                          | `delete_department_if_no_programs`         | WARN  | **ACCEPT** — admin RPC, self-guards on programs              | remains (intended)    |
| `authenticated_…executable`                          | `get_badge_spotlight`                      | WARN  | **ACCEPT** — self-scoped read                                | remains (intended)    |
| `authenticated_…executable`                          | `get_earn_spend_ratio`                     | WARN  | **ACCEPT** — institution-scoped aggregate                    | remains (intended)    |
| `authenticated_…executable`                          | `get_leaderboard` / `get_leaderboard_page` | WARN  | **ACCEPT** — institution-scoped, raises on mismatch          | remains (intended)    |
| `authenticated_…executable`                          | `get_wellness_aggregate_stats`             | WARN  | **ACCEPT** — institution-scoped aggregate                    | remains (intended)    |
| `extension_in_public`                                | `vector`                                   | WARN  | **DEFER to ops** — schema move may break refs                | remains (deferred)    |
| `extension_in_public`                                | `citext`                                   | WARN  | **DEFER to ops** — schema move may break refs                | remains (deferred)    |
| `auth_leaked_password_protection`                    | Auth config                                | WARN  | **DEFER to ops** — one-click Auth setting, not schema        | remains (deferred)    |
| `rls_policy_always_true`                             | `quiz_clos` (insert/delete)                | WARN  | **OUT OF SCOPE** — introduced by Task 3 phantom-table deploy | remains (Task 3 owns) |
| `rls_policy_always_true`                             | `student_badges` (insert)                  | WARN  | **OUT OF SCOPE** — Task 3                                    | remains (Task 3 owns) |
| `rls_policy_always_true`                             | `team_gamification` (insert/update)        | WARN  | **OUT OF SCOPE** — Task 3                                    | remains (Task 3 owns) |

> The `rls_policy_always_true` findings are NEW since the baseline §7 capture and are attributable to
> Task 3 (phantom-table deploy with `USING/WITH CHECK (true)` policies as defined in the source migrations).
> They are NOT in Task 11's scope (view + 3 grant sets + 2 mutable functions). Recommend the orchestrator
> route them to Task 3 follow-up or a tightening decision.

---

## 6. Post-apply advisor re-check (delta)

CLEARED (5): `security_definer_view`/leaderboard_weekly (ERROR), `function_search_path_mutable`/is_pgcron_available,
`function_search_path_mutable`/prevent_mutation, `anon`+`authenticated` executable/anonymize_user.

No NEW finding introduced by Task 11. Remaining findings are all ACCEPT (intentional) or DEFER (ops) or
OUT-OF-SCOPE (Task 3), per §5.

---

## 7. Non-regression confirmation

- `process_marketplace_purchase`: `secdef=false`, `search_path=""` — **unchanged**.
- 12 `search_path`-bugfix functions: not touched; deployment-gap functions still `search_path=public` (Task 6's domain).
- Append-only invariant: `prevent_mutation` still attached to `audit_logs`/`evidence`/`xp_transactions` and still
  raises on UPDATE (verified).
- View shape unchanged → **no `database.ts` regen required.**

## 8. CI gates

- `npx tsc --noEmit` → **exit 0** (zero errors).
- `npm run lint` (eslint `--max-warnings 0`) → **exit 0** (zero warnings).
- `npx vitest --run leaderboardOptOut.property.test.ts leaderboardPage.test.tsx` → **18/18 pass**.

## 9. Flags for the orchestrator / user

1. **auth-helper revoke NOT applied** (CRITICAL, §3): revoking `auth_user_role`/`auth_institution_id` from
   anon/authenticated breaks RLS platform-wide (proven). Accepted-with-justification instead. Deviates from the
   literal Decision-4 wording; honors its intent. **Needs user acknowledgment.**
2. **`supabase migration fetch` did not complete** locally (CLI timed out, likely Docker/network). All 3 Task 11
   migrations ARE recorded on remote (verified via `list_migrations`). Local file sync is Task 9's CORE GATE —
   left for Task 9 to complete the fetch + `migration list` head-equality check.
3. **`rls_policy_always_true` on quiz_clos/student_badges/team_gamification** (§5) — Task 3 artifact, not Task 11.
   Recommend a tightening decision in a Task 3 follow-up.
4. **DEFER items** (`vector`/`citext` extension-in-public, leaked-password protection) handed to ops.
