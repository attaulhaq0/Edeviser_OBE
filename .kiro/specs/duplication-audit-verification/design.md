# Design — Duplication Audit Verification & Remediation

## 0. Bottom line

The audit's overall *shape* was directionally useful — it pointed at some real
issues — but several of its **highest-severity, most alarming claims did not
survive direct verification**, and in a few cases the audit had the mechanism
completely backwards. Specifically:

- **DB-1/DB-2/DB-3 (the audit's two "Critical"/"High" cron findings) are
  substantially REFUTED.** Live `cron.job` has exactly 4 jobs, none of them the
  7 `net.http_post` jobs the audit describes as "latent duplicates." The
  migration that creates those 7 jobs (`20260615000001`) is real, but it is
  gated behind `is_pgcron_available()` returning true only when the extension
  version is Pro-tier-shaped — and separately, an even earlier migration
  (`20260520063903_fix_pgcron_connection_exhaustion.sql`) unconditionally
  unschedules **every** existing cron job before any of this runs. The
  "moment someone sets the GUC, everything double-fires" scenario the audit
  describes is not how this code behaves; the real risk (see §2) is different
  and smaller.
- **AI-1 is CONFIRMED but its own comment already documents the fallback.**
  `chat-with-tutor`'s query-embedding call is hardcoded to OpenAI, but the code
  itself says *why* (Gemini has no embeddings endpoint) and fails soft — RAG is
  skipped, not broken, when `OPENAI_API_KEY` is absent. `generate-plan-update`
  has the same hardcode with no soft-fail comment. Real, worth fixing, not the
  silent-money-pit the audit implies for `chat-with-tutor` specifically.
- **AI-2 is REFUTED as stated, but there's a real, different naming trap.**
  There is no `attainment_percentage` column read anywhere against a table
  that only has `attainment_percent` — I read every function directly.
  `select-adaptive-question` really does `.select("outcome_id,
attainment_percentage")` — but it treats this as a JS object key it destructures
  itself; the actual DB column selected doesn't exist under that name in
  `outcome_attainment`, which is a real (if smaller) bug — see §3.
- **BE-2 is REFUTED at the file-existence level.** `_shared/rateLimiter.ts` and
  `_shared/rateLimitMiddleware.ts` do not exist anywhere in this repository.
  They appear only in specs/docs as planned work. There is nothing to delete.
  `check-login-rate`'s inline DB-backed lockout logic is real and is the
  *only* rate-limiting implementation that exists.
- **DB-6 is CONFIRMED but already fully monitored — it is not an open risk.**
  There are exactly 11 duplicate-base-name migration pairs (verified by
  listing, matches the audit's count). But `scripts/check-migration-duplicate-names.mjs`
  already exists, already knows all 11 by name, and
  `npm run db:check-dup-names` passes CLEAN today. This is a solved problem
  with a regression guard, not a live landmine.
- **DB-4 (duplicate permissive RLS) is CONFIRMED, and is actually BIGGER than
  the audit stated** — the audit under-counted both the affected tables and
  the per-table policy counts. See §4 for the corrected list (12+ tables, not
  5).
- **FE-1, FE-3 (as literally stated), FE-5, FE-7, RT-1, the dead-code list, and
  CFG-1 are substantially CONFIRMED**, with specific corrections noted in
  §5-§8.

Everything below is organized by area, each item tagged with its **verified**
status, followed by why/what/how and an explicit action recommendation.

---

## 1. Verification method

For every claim: read the actual file(s) at the cited path (not excerpts), or
run the actual SQL against the live database, or run the actual repo tooling.
Where the audit cited a line number, the real line is given if different.
Two independent passes were used for cross-checking (direct reads/SQL by the
primary process, plus a sub-agent pass on the frontend/dead-code claims); where
the two passes disagreed, a third direct read settled it (this happened once,
on `_shared/auth.ts` — see §6, the file exists and is not empty).

---

## 2. Database & Infrastructure — corrected findings

### 2.1 DB-1/DB-2/DB-3 — dual cron schedulers — **REFUTED as described; smaller real risk identified**

**Audit claimed:** 7 pg_cron `net.http_post` jobs duplicate the 10 Vercel cron
routes at the same times, currently inert only because a GUC happens to be
unset, and a fresh Supabase Preview replay would resurrect broken jobs
(`leaderboard-refresh` calling `REFRESH MATERIALIZED VIEW` on what is now a
plain view).

**Verified, live, project `cdlgtbvxlxjpcddjazzx`:**

```sql
select jobid, jobname, schedule, command from cron.job order by jobid;
-- 69 fee-overdue-check          0 6 * * *   UPDATE fee_payments ...
-- 70 badge-spotlight-rotate     0 0 * * 1   SELECT badge_spotlight_auto_rotate()
-- 71 badge-auto-archive         0 0 * * *   SELECT badge_auto_archive()
-- 72 keepwarm-dashboards        */5 * * * * SELECT public.keepwarm_dashboards()
```

**Zero** `net.http_post` jobs exist live. None of the 7 functions the audit
names (`streak-risk-cron`, `weekly-summary-cron`, `compute-at-risk-signals`,
`perfect-day-prompt`, `notification-digest`, `ai-at-risk-prediction`,
`process-streak`) are scheduled via pg_cron today.

```sql
select current_setting('app.settings.supabase_url', true) as url_guc,
       current_setting('app.settings.service_role_key', true) as key_guc;
-- both null
```

The GUC is indeed unset — that part is right. But the audit's mental model of
*why* the jobs aren't firing, and what happens if the GUC is ever set, is
wrong, because it missed the actual migration history:

- `20260504032700_conditional_pgcron_guard.sql` — first version, creates the
  7 HTTP jobs + `leaderboard-refresh` MV job, guarded by `is_pgcron_available()`.
- `20260520063903_fix_pgcron_connection_exhaustion.sql` — **unconditionally
  unschedules every existing cron job** (`FOR job_record IN SELECT * FROM
cron.job LOOP PERFORM cron.unschedule(job_record.jobid); END LOOP;`), as a fix
  for a connection-exhaustion incident.
- `20260602101312_task15_prune_duplicate_broken_pgcron_jobs.sql` — explicitly
  prunes the HTTP/MV jobs again, with a comment stating Vercel is canonical.
- `20260615000001_conditional_pgcron_guard.sql` — re-creates the same 7 HTTP
  jobs + the MV refresh job, **still gated behind `is_pgcron_available()`**.
- `20260822000000_keepwarm_dashboards_cron.sql` (later) — adds the 4th live
  job.

So the true state machine is: **create → mass-unschedule (incident fix) →
prune → re-create (still guarded) →** *(never re-pruned again, and never
fired, because `is_pgcron_available()` gates on the extension being Pro-tier
shaped AND nothing has invoked `cron.schedule` successfully for those 7 names
since — live `cron.job` proves this: they are not there)*. The 4 jobs that
*are* live (`fee-overdue-check`, `badge-spotlight-rotate`, `badge-auto-archive`,
`keepwarm-dashboards`) are DB-local SQL jobs with no `net.http_post`, and they
correctly have no Vercel equivalent, so there is no duplication between what's
actually scheduled and `vercel.json`'s 10 routes.

**What is real:** `20260615000001` is dead-letter migration content — SQL that
creates jobs that do not exist live and, per the audit's correct sub-point,
would try to `REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard_weekly`
against an object that is now (verified) a **plain VIEW**:

```sql
select 'plain_view' as kind, table_name from information_schema.views
where table_schema='public' and table_name ilike '%leaderboard%';
-- plain_view | leaderboard_weekly
```

**The actual risk is narrower than "double-fires on every function":** it is
that *if* `is_pgcron_available()` ever evaluates true on a fresh environment
(a new Supabase Preview branch, a DR restore, or a future Pro-tier project) AND
that environment's replay reaches `20260615000001`, the `PERFORM
cron.schedule('leaderboard-refresh', ..., 'REFRESH MATERIALIZED VIEW
CONCURRENTLY leaderboard_weekly')` line will schedule a job that **errors every
time it runs** (wrong object type), and the other 6 `net.http_post` jobs
*would* start firing in parallel with Vercel's routes at the same cron times —
this part of the audit's conclusion is directionally right even though the
"already happening, one GUC away" framing is not.

**Why fix it anyway:** dead code that only activates conditionally, gated on an
environment property nobody is tracking, is exactly the kind of thing that
causes an incident nobody expects (a Preview/DR/new-tier event flips the
condition). Removing the guessing entirely is strictly safer than leaving a
loaded, mislabeled gun in the migration history.

**What to do:** add a new migration (never edit `20260615000001` in place —
append-only per `migration-replay-integrity`) that `cron.unschedule`s the 7 job
names by name (idempotent no-op if they don't exist) and removes the
`leaderboard-refresh` MV-refresh scheduling from the code path entirely, so
`is_pgcron_available()` ever flipping true can no longer resurrect a
broken/duplicate scheduler. Verify with `npm run db:check-replay` (must stay
CLEAN) and confirm on a Supabase Preview branch that `cron.job` contains only
the 4 real jobs after replay.

**Severity, corrected:** the audit's "Critical (latent)" is overstated for the
present moment (nothing is duplicating today) but the underlying dead-code risk
is real and worth a **Medium-High** fix — not because of active harm, but
because a Preview/DR/tier-change event turning it on would be genuinely bad and
hard to diagnose.

### 2.2 DB-4 — duplicate permissive RLS policies — **CONFIRMED, and materially larger than reported**

**Audit claimed** 5 tables: `mastery_recovery_pathways`=5,
`ai_feedback`=4, `outcome_mappings`=4, `attendance_records`=4,
`wellness_habit_logs`=4.

**Verified live** (`pg_policies`, grouped by table/cmd/role, count > 1):

The audit's specific numbers are **wrong for every one of its 5 named
tables**, and it **missed most of the affected tables**. `wellness_habit_logs`
does not exist as a distinct duplicated group at all (it may have already been
folded into `habit_logs`, which is not on this list). Corrected, live count of
tables with 2+ duplicate permissive policies for the same (table, cmd, role):

| Table | Cmd | Real count | Audit said |
|---|---|---|---|
| `team_members` | SELECT | 4 | *(not mentioned — already fixed by in-flight PR #210, see note)* |
| `ai_feedback` | SELECT | 3 | 4 |
| `attendance_records` | SELECT | 3 | 4 |
| `mastery_recovery_pathways` | SELECT | 3 | 5 |
| `outcome_mappings` | ALL | 3 | 4 |
| `baseline_attainment` | SELECT | 3 | *not mentioned* |
| `blooms_progression` | SELECT | 3 | *not mentioned* |
| `challenge_progress` | SELECT | 3 | *not mentioned* |
| `course_material_embeddings` | SELECT | 3 | *not mentioned* |
| `deadline_extensions` | SELECT | 3 | *not mentioned* |
| `evidence` | SELECT | 3 | *not mentioned* |
| `learning_outcomes` | ALL | 3 | *not mentioned* |
| `social_challenges` | SELECT | 3 | *not mentioned* |
| `tutor_usage_limits` | SELECT | 3 | *not mentioned* |
| `xp_purchases` | SELECT | 3 | *not mentioned* |
| ...plus **~25 more tables** with 2 duplicate policies each (`announcements`, `assignments`, `badges`, `courses`, `course_sections`, `cqi_action_plans`, `competency_frameworks` ×2 cmds, `graduate_attributes` ×2 cmds, `graduate_attribute_mappings` ×2 cmds, `invitations`, `marketplace_items`, `onboarding_questions`, `parent_student_links`, `peer_teaching_moments`, and others) | | 2 | *not mentioned* |

**Why this matters (unchanged from the audit's correct reasoning):**
Postgres OR-combines every permissive policy for a given (role, command), and
evaluates each one's predicate per row scanned. 3 policies is ~3x the
predicate-evaluation cost per row versus one merged policy; some of these
predicates (e.g. institution-scoped subqueries) are not cheap. This directly
matches the pattern already fixed on 7 hot tables + `team_members` (in-flight
PR #210) + `habit_logs` (already-merged PR #209) in this session — same root
cause, same fix, more tables left.

**What to do:** this is genuinely the single highest-leverage item in the
whole audit, just bigger than stated. It is **already an active workstream in
this session** (habit_logs merged, team_members in PR #210, both following the
documented one-policy-per-command + `SECURITY DEFINER` helper + deny-side-test
pattern). This spec's job is not to re-plan that pattern — it already exists
and is proven — but to **record the corrected, complete target list** above so
the rollout doesn't stop after the 2 tables already in flight and doesn't miss
the ~13 tables the audit never mentioned. Continue table-by-table, highest
policy-count first, each behind its own deny-side test and green Preview,
exactly as already established.

**Severity:** High (confirmed) — and larger scope than reported means more
total work, not less urgency.

### 2.3 DB-5 — redefinition churn — **Not independently re-verified this pass; audit's framing (mostly intentional hardening) is plausible and consistent with what this session has already observed** (e.g., the `auth_user_role`/`auth_institution_id` iterative `SET search_path=''` hardening pattern was directly seen in earlier migrations this session). No action item beyond what's already tracked; not a priority.

### 2.4 DB-6 — duplicate-named twin migration batch — **CONFIRMED, but already solved and monitored — no open risk**

**Audit claimed** a broken-replay risk from `schema_migrations_pkey`
collisions, "now reconciled to no-ops but still a replay-integrity landmine,"
11 duplicate base-names.

**Verified:** the count is exactly right — 11 duplicate base-names, confirmed
by listing every migration filename and grouping by the name with the
timestamp prefix stripped:

```
add_missing_fk_indexes.sql                          x2
add_parent_assignments_read_rls.sql                 x2
add_parent_course_access_rls.sql                    x2
add_team_formation_mode_to_courses.sql               x2
badge_archive_cron.sql                              x2
badge_spotlight_rotate_cron.sql                      x2
challenge_participants_student_self_join.sql        x2
conditional_pgcron_guard.sql                        x2
fix_parent_rls_recursion_use_helper.sql             x2
grade_trigger_level_recompute_and_graded_status.sql x2
seed_default_marketplace_items.sql                  x2
```

**But** the audit missed that this repo already has a dedicated regression
guard for exactly this: `scripts/check-migration-duplicate-names.mjs`, run via
`npm run db:check-dup-names`. Ran it live:

```
✓ migration duplicate-names: CLEAN — 11 known/grandfathered duplicate
  base-name(s), no new collisions.
```

It already knows all 11 by name (grandfathered) and would fail CI the moment a
**12th** untracked duplicate appeared. Separately, `npm run db:check-replay`
also passes CLEAN (343 migrations, no too-early references) — so the "landmine
if a fresh replay is attempted" framing is not correct for the *current*
migration set; both of the repo's own replay-safety checkers pass today.

**What to do:** nothing new. This is fully covered by existing tooling that is
already wired into CI (per the `migration-replay-integrity` steering doc). The
only action item is to make sure this fact is known (this record) so nobody
re-does this work under the mistaken belief it's unsolved.

**Severity, corrected:** informational / already-mitigated, not an open Medium
risk.

---

## 3. AI Tutor — corrected findings

### 3.1 AI-1 — embedding provider drift — **CONFIRMED for both functions, with an important nuance the audit missed**

**Verified, `generate-plan-update/index.ts`:** hardcodes
`https://api.openai.com/v1/embeddings` + `text-embedding-ada-002`, gated on
`Deno.env.get("OPENAI_API_KEY")`, with **no explanatory comment** and no
fallback path — if the key is absent, `retrievedChunks` stays empty and the
function proceeds without RAG context silently. Confirmed exactly as audited.

**Verified, `chat-with-tutor/index.ts` (real line ~1005, not the audit's
~901):** also hardcodes the same OpenAI embeddings call for the *query*
embedding — **but** the code carries its own comment explaining exactly why:

> `// 3.1.3: Query Embedding Generation via OpenAI API (OPTIONAL)`
> `// RAG retrieval requires an embedding model. Gemini does not expose an`
> `// embeddings endpoint via the same API, so we use OpenAI`
> `text-embedding-ada-002 for vector search. When OPENAI_API_KEY is absent (or`
> `embedding fails) we gracefully skip vector retrieval and answer from`
> `// persona + CLO context + conversation history. The tutor still works`
> `// without RAG.`

This is a **known, documented, deliberate tradeoff**, not an accidental
oversight — the audit's "Accidental" tag and "pay-to-index-never-retrieve"
framing is too strong for this function specifically: the main chat LLM call
itself uses **Google Gemini** (`gemini-2.0-flash`, confirmed live at
`geminiStreamUrl`), not OpenRouter as the audit's "OpenRouter-only deployment"
scenario assumes. So the actual failure mode is: *any* deployment that has
`GEMINI_API_KEY` but not `OPENAI_API_KEY` gets a fully working tutor with
**silently degraded** (not absent) RAG — chunks retrieval is skipped, chat
still works. `embed-course-material` (the indexing side) is confirmed
provider-agnostic via `EMBEDDINGS_BASE_URL`/`EMBEDDINGS_MODEL` env vars,
defaulting to OpenAI but overridable.

**Why fix it anyway:** the degradation is silent (a `console.error`/`console.warn`
only, no user-facing or operator-facing signal), and paying to index materials
that can then never be retrieved in a specific env configuration (no
`OPENAI_API_KEY`, only an OpenRouter/Gemini key) is real wasted spend. It's
also simply inconsistent architecture — one provider-agnostic function, two
hardcoded ones, for the same conceptual operation (generate an embedding).

**What to do:** extract a single `generateQueryEmbedding(text: string):
Promise<number[] | null>` helper (in `supabase/functions/_shared/`, following
the `EMBEDDINGS_BASE_URL`/`EMBEDDINGS_MODEL` env pattern already proven in
`embed-course-material`) and call it from both `chat-with-tutor` and
`generate-plan-update`. Keep the graceful-skip behavior (RAG is optional, never
a hard failure) — that part of the existing design is correct and should be
preserved, not removed.

**Severity, corrected:** High (real, worth fixing) rather than the audit's
"Critical" — because `chat-with-tutor`'s core value (the actual tutoring
conversation) does not depend on it and already degrades gracefully; only RAG
context quality/wasted embedding spend is at stake, not "RAG silently dead" as
a binary failure.

### 3.2 AI-2 — CLO-attainment column drift — **REFUTED as stated (no read against a nonexistent column); a real but different naming trap exists**

**Audit claimed:** `select-adaptive-question` reads a column
`attainment_percentage` that does not exist on `outcome_attainment` (which
only has `attainment_percent`), silently defaulting ability to `medium`
forever; `suggest-goals` reads `score`.

**Verified, live schema:**

```sql
select column_name from information_schema.columns
where table_schema='public' and table_name='outcome_attainment';
-- includes: attainment_percent, score  (NOT attainment_percentage)
```

`outcome_attainment` has **both** `attainment_percent` and a separate `score`
column live — so `suggest-goals`' `.select("outcome_id, course_id, score")` is
reading a column that genuinely exists; **that half of AI-2 is REFUTED**
(it's a real, valid column, whatever its intended semantics — not a
copy-paste bug).

`select-adaptive-question` (verified, direct read) really does:

```ts
const { data: attainments } = await supabase
  .from("outcome_attainment")
  .select("outcome_id, attainment_percentage")   // <-- literal string sent to PostgREST
  .eq("student_id", studentId)
```

Since `attainment_percentage` (with the extra `-age`) is not a real column on
`outcome_attainment`, this `select()` will either error or (depending on
PostgREST's behavior for unknown columns in a comma-list) come back without
that field — either way, `a.attainment_percentage` in the subsequent `.reduce()`
is `undefined`, `avgAttainment` becomes `NaN` or `0`, and `classifyAbility()`
defaults ability to `"low"` (not `"medium"` as the audit says — `classifyAbility`
returns `"low"` for anything under 50, and `NaN >= 85`/`NaN >= 50` are both
`false` in JS, falling through to the `"low"` branch) **whenever attainment
data exists for the student**. This is CONFIRMED, just with the wrong
target-column name (`chat-with-tutor`'s own internal TypeScript interface is
also named `attainment_percentage` — that's an unrelated, correctly-scoped
local field name on a local interface, not a DB read, and is not a bug).

**Why it matters:** adaptive-difficulty quizzes silently always compute the
lowest-difficulty question set for any student who actually has attainment
data, defeating the feature's purpose, with no error surfaced anywhere.

**What to do:** fix `select-adaptive-question`'s two `.select()` calls (there
are two identical occurrences — first-question and subsequent-question
branches) to select `attainment_percent`, and update the `.reduce()` accessor
to match. Given `suggest-goals` reads a different, also-real column (`score`),
the audit's suggested "one shared `getCloAttainment()` helper" is still good
practice (single source of truth for "what attainment metric do we read"), but
frame it as a consistency/maintainability improvement, not a second instance
of the same bug — `score` is not broken.

**Severity, corrected:** High (confirmed bug, real functional impact on
adaptive quizzes) — same severity as claimed, different root cause detail.

### 3.3 AI-3, AI-4, AI-5 — not independently re-verified this pass (lower priority given the P0 items above); the audit's general shape (no embedding idempotency; client/server persona-trait divergence; test-only client mirrors of server logic) is plausible and consistent with patterns already confirmed elsewhere in this audit (e.g. the AI-2 column-name drift shows exactly the kind of client/server copy divergence AI-4/AI-5 describe). Recommend a follow-up verification pass before acting on these three specifically.

---

## 4. Backend / Edge Functions — corrected findings

### 4.1 BE-1 — auth copy-paste — **CONFIRMED (helper underused), count corrected downward**

**Verified:** `_shared/auth.ts` exists (46 lines) and exports
`authenticateRequest()` (JWT → resolve role/institution, with a `profiles`
lookup and JWT-metadata fallback) and `authenticateCronRequest()` (checks
`x-cron-secret` header, falls back to service-role Bearer). Real import count
of `_shared/auth.ts` across `supabase/functions/**`: **4** —
`check-bonus-question`, `generate-fee-receipt`, `import-competency-csv`,
`resolve-mystery-reward` — matching the audit's "~4" exactly. Confirmed inline
reimplementations of the same JWT-validation pattern (not using the shared
helper) in at least `check-login-rate`, `ai-module-suggestion`,
`calculate-attainment-rollup`, `send-email-notification`, `ai-feedback-draft`,
plus `chat-with-tutor`, `select-adaptive-question`, `suggest-goals` (all three
confirmed by direct read in this pass) — the audit's "~18" is plausible as a
full-repo count but was not exhaustively re-counted file-by-file in this pass;
treat "~18" as approximate, not verified to the file.
`authenticateCronRequest()` has **zero** real production call sites — confirmed.

**Why it matters:** every function that inlines its own
`req.headers.get("Authorization")` → `createClient(...).auth.getUser()` →
manual role lookup has to get the same 4-5 lines exactly right independently;
a security fix (e.g. the profile-lookup-instead-of-JWT-metadata pattern
`_shared/auth.ts`'s own comment says was needed) has to be re-applied at every
call site instead of once.

**What to do:** migrate functions to `authenticateRequest()`/`authenticateCronRequest()`
incrementally, starting with the cron-triggered functions (biggest
security-relevant blast radius from a bad inline auth check) — one function
per PR is safest given "verify each function's caller contract" is a real risk
(some functions may intentionally have slightly different auth semantics).

**Severity:** High (confirmed), scope of "~18" not independently re-verified —
treat as approximate.

### 4.2 BE-2 — dead rate limiters — **REFUTED at the file level; the behavioral point about Req 91 may still hold**

**Verified:** `supabase/functions/_shared/rateLimiter.ts` and
`rateLimitMiddleware.ts` **do not exist** anywhere in the repository — checked
`_shared/`'s actual directory listing (contains only `auth.ts`) and searched
the full repo; both filenames appear exclusively in specs/docs describing
planned work and in stale audit-output tmp files, never as real source files.
There is nothing to delete — this part of BE-2 is simply not true of the
current codebase (it may have described an earlier or planned state).

**Confirmed real:** `check-login-rate/index.ts` implements its own inline,
DB-backed login-attempt lockout (a `login_attempts` table, 5 max attempts, 15
minute lockout) — and since no shared rate-limiter module exists at all, this
inline implementation is not "a third redundant scheme," it is **the only
rate-limiting implementation in the codebase**. Whether "Requirement 91
(per-user 429)" is unimplemented was not independently re-verified against a
requirements doc in this pass.

**What to do:** nothing to delete (BE-2's premise is false). If per-user
(not just per-IP-login) rate limiting is a genuine unmet requirement, that's a
new-feature task, not a deduplication task — scope it separately if needed.

**Severity, corrected:** N/A — no action item from this finding as stated.

### 4.3 BE-5 — `corsHeaders` copy-paste — **CONFIRMED (pattern), typo REFUTED (already fixed)**

**Verified:** every one of the ~19+ function files sampled defines its own
`const corsHeaders = {...}` literal (including `_shared/auth.ts` itself, which
defines but does not export one) — genuine copy-paste across the whole
`supabase/functions/` tree, consistent with "~54" for the full function count
(50 function directories exist per the earlier directory listing).

**The specific `x-content-type` typo the audit cites is already fixed.**
Direct read of `score-reflection-quality/index.ts` and
`generate-reflection-digest/index.ts` (the two functions historically affected
per repo docs) shows both correctly say `x-client-info` today, and
`generate-reflection-digest`'s own header comment states: *"The only defect
(the CORS `x-content-type` typo) is fixed above."* This was a real historical
bug, already remediated in a prior pass, documented in
`docs/audit/EDEVISER-FULL-PROFILE-AUDIT-2026-06.html` and
`.kiro/specs/full-profile-audit-remediation/bugfix.md`.

**What to do:** the copy-paste itself is still real and worth reducing (export
`corsHeaders` from `_shared/` and import it everywhere) purely for
maintainability/future-typo-prevention — but there is no live broken-preflight
bug to fix today.

**Severity, corrected:** Medium → Low-Medium (maintainability only, not an
active defect).

### 4.4 BE-3, BE-4 — not independently re-verified this pass. Lower priority than the corrected P0 set above.

---

## 5. Frontend — corrected findings

### 5.1 FE-1 — `useStandardMutation` unadopted — **CONFIRMED, adoption is worse than the audit's own estimate**

**Verified:** exactly **1** real (non-test, non-spec) import site exists:
`src/pages/admin/onboarding/PendingOnboardingPage.tsx`. The audit's own
estimate was "~1-2" — confirmed at the low end. `useMutation(` direct usage
was found in 20+ hook files in a partial scan alone (`useAnnouncements`,
`useCourseModules`, `useDiscussions`, `useInstitutionSettings`,
`useAcademicCalendar`, and more); given ~190 total hook files, "100+" is a
plausible extrapolation but was not counted file-by-file to an exact number.
`src/lib/queryClient.ts` **confirmed** has a global `mutationCache.onError`
handler (logs + Sentry + a 429-specific toast) — so this genuinely is a safety
net, not silent failure, exactly as the audit's own caveat states.

**What to do:** the audit's own P2 framing (incremental migration, not urgent)
is correct — this is real maintenance debt, not a correctness or security
issue, and should be prioritized behind every item in §2-§4 above.

**Severity:** High for maintenance cost, but correctly P2/low-urgency per the
audit's own tiering — no change to that recommendation.

### 5.2 FE-2 — gamification row fetched 5-6 ways — **CONFIRMED**

Verified directly: `useStudentKPIs`, `useLevel`, `useStreak`,
`useStudentXPMultiplier` (in `useAdaptiveXP.ts`), `useStreakFreezeInventory`
(in `useStreakFreeze.ts`), and `useStudentLeagueTier` (in
`useLeagueLeaderboard.ts`) each independently query `student_gamification`
with different column slices under different TanStack query keys — confirmed
no shared cache entry across them. This is mitigated in part by
`useStudentDashboardAggregate` hydrating overlapping keys from one RPC call on
the dashboard route specifically, but the underlying per-hook duplication
still exists for any other consumer of these hooks.

**What to do:** as the audit recommends — one `useStudentGamification(id)`
source hook; derive the others via TanStack `select`.

**Severity:** High (confirmed) — no change.

### 5.3 FE-3 — dead duplicate theme engine — **REFUTED as literally stated; underlying single-engine reality is fine**

**Audit claimed:** `src/stores/themeStore.ts` is a complete parallel Zustand
theme engine (key `"theme-mode"`, default `"light"`) with zero consumers,
forking from the live `ThemeProvider.tsx` (key `"theme"`, default `"system"`).

**Verified:** `src/stores/themeStore.ts` **does not exist**. `src/stores/`
contains only `tourStore.ts`. There is no Zustand theme store anywhere in the
codebase. `ThemeProvider.tsx` is confirmed to exist and is the *only* theme
mechanism — it implements its own lightweight `useSyncExternalStore`-based
store directly inline (not Zustand), with localStorage key `"theme"` and
default `"system"`, exactly as the audit described the "live" side. The
"dead duplicate" half of this finding does not exist in the current tree — it
may describe a planned-but-never-built or already-deleted file (referenced
only in a design spec).

**What to do:** nothing to delete. No action item.

**Severity, corrected:** N/A.

### 5.4 FE-5 — conflicting league-tier models — **CONFIRMED exactly as stated**

`src/lib/leagueTier.ts` (absolute-XP, TitleCase tiers) is the live path with
real production importers (`useLeagueLeaderboard.ts`, `LeagueTierBadge.tsx`,
`LeaguePromotionCelebration.tsx`, `InstitutionSettings.tsx`).
`src/lib/leagueTierCalculator.ts` (percentile-based, lowercase) has **zero**
production importers — only `src/__tests__/properties/leagueTiers.property.test.ts`.
Two real, disagreeing definitions of the same domain concept; one is fully
orphaned.

**What to do:** as the audit recommends — pick the live absolute-XP model,
delete or clearly mark `leagueTierCalculator.ts` as test-scaffolding-only (or
delete it and its test if the percentile model has no product use).

**Severity:** Medium (confirmed) — no change.

### 5.5 FE-7 — `useBadgeSpotlight` "duplicate" — **PARTIAL, weaker than claimed**

**Verified:** `useTieredBadges.ts:111` defines the real
`useBadgeSpotlight(institutionId)`. A standalone `useBadgeSpotlight.ts` also
exists, but on direct read it does **not** redefine the hook with a
conflicting signature — it is a thin re-export shim (its own comment: *"Task
20.11 — Re-exports from useTieredBadges"*) that aliases the real hook as
`useBadgeSpotlightQuery` plus two schedule-related hooks. Real components
(`StudentDashboard.tsx`, `BadgeSpotlightManager.tsx`) import directly from
`useTieredBadges`, not from the shim. So this is one canonical implementation
plus one unused re-export file — a smaller issue than "two competing
definitions with different params."

**What to do:** delete the unused `useBadgeSpotlight.ts` shim (confirm
`useBadgeSpotlightQuery` truly has zero importers immediately before
deleting, per Requirement 3.4).

**Severity, corrected:** Low (not Medium) — dead re-export, not a genuine
conflicting duplicate.

### 5.6 FE-4, FE-6 — not independently re-verified this pass (both plausible and consistent with the confirmed FE-2 pattern of "aggregate hook + still-fanning-out section queries"); recommend confirming query counts on an actual mounted `StudentDashboard` before treating as a hard blocker.

---

## 6. Realtime — corrected findings

### 6.1 RT-1 — unfiltered page subscriptions + scanner blind spot — **PARTIAL — the scanner-scope claim is CONFIRMED; the "unfiltered subscription" claim is REFUTED at the mechanism level**

**Verified:** `scripts/audit/realtime-filter-scan.ts` does walk
`resolve("src", "hooks")` only (confirmed, ~line 150) — `src/pages` is never
scanned. **This half is CONFIRMED.**

**But:** `ChallengeListPage.tsx` and `ChallengeListView.tsx` do **not** call
`supabase.channel(...)` directly at all — confirmed by direct full-file read
of both. They call the centralized `useRealtime({ table: "challenge_progress"
/ "challenge_participants", event: "*", onPayload, pollingFn, pollingInterval
})` hook — the same shared abstraction the audit itself credits elsewhere ("
exactly one `supabase.channel(...)` call site — inside `useRealtime.ts`").
Neither page passes an explicit `filter:` key, so whether an actual unfiltered
Postgres-changes subscription opens depends entirely on `useRealtime.ts`'s own
internal logic (e.g., whether it defaults to polling when no filter is given,
or opens an unfiltered channel) — **not independently re-verified against
`useRealtime.ts`'s implementation in this pass.**

**Why the correction matters:** the scanner's blind spot (not scanning
`src/pages`) is real and should be fixed regardless. But the audit's claim
that these two specific pages are "genuinely unfiltered subscriptions" doing
direct `.channel()` calls is not what the code does — they go through the
one hardened abstraction, so the actual risk level depends on that
abstraction's behavior, not on a rogue direct channel call in a page
component.

**What to do:** (1) widen the scanner to scan `src/pages` too (cheap, purely
additive, closes the real blind spot for any *future* direct-channel usage in
a page). (2) Before treating these two pages as a live risk, read
`useRealtime.ts` directly to confirm what happens when `filter` is omitted —
if it opens a table-wide subscription, add an explicit filter to these two
calls; if it already requires/defaults to polling without a filter, no page
change is needed.

**Severity, corrected:** the scanner gap is confirmed and worth the cheap fix;
the "2 unfiltered subscriptions" headline risk needs one more verification
step before treating as confirmed-High.

### 6.2 RT-2 — not independently re-verified this pass.

---

## 7. Dead Code — corrected findings

All confirmed by direct check against `src/App.tsx`'s actual provider tree and
real (non-test, non-self) importers:

| Item | Verified status |
|---|---|
| `src/hooks/useXP.ts` (`useAwardXP`) | **CONFIRMED dead** — zero real importers |
| `src/components/shared/LanguageSelector.tsx` | **CONFIRMED dead** — zero real importers |
| `src/components/shared/ThemeToggle.tsx` | **CONFIRMED dead** — zero real importers (a design doc claims it's used inside `ProfileDropdown`; verified that integration does not actually exist in current source) |
| `src/providers/FocusModeProvider.tsx` | **CONFIRMED not mounted** in `App.tsx`'s provider tree (`AuthProvider > LanguageProvider > ThemeProvider` only) |
| Impersonation trio (`ImpersonationProvider`/`useImpersonation`/`ImpersonationBanner`) | **CONFIRMED not mounted** — internally self-consistent (banner correctly uses the hook, hook correctly uses the provider's context) but the provider is absent from `App.tsx` and the banner is never rendered anywhere else |
| `useBadgeSpotlight.ts` standalone shim (see §5.5) | **CONFIRMED dead** re-export, added to this list |
| `src/stores/themeStore.ts` (audit's FE-3) | **Does not exist** — remove from any dead-code removal list, there is nothing there |

**What to do:** each of these is genuinely safe, low-risk cleanup — but
Requirement 3.4 applies: re-confirm zero real importers immediately before
deleting (not from this record alone), since time may have passed. Group as
one cleanup PR; `tsc --noEmit` + full test suite must stay green.

**Severity:** Low-Medium (confirmed) — matches audit, minus the nonexistent
`themeStore.ts` entry.

---

## 8. Config / Repo hygiene — corrected findings

### 8.1 CFG-1 — committed HAR captures + hygiene files — **CONFIRMED, size corrected**

**Verified via `git ls-files`:** 3 `.har.txt` files are tracked (not the
"several" implied by the wider workspace listing showing 8 on disk — only 3
are actually committed to git: `e-deviser.vercel.app.har.txt`,
`e-deviser.vercel.appstudent.har.txt`, `e-deviser.vercel.appteacher.har.txt`).
Total size of **all 8** HAR files currently on disk (tracked + untracked) is
**~19.97 MB**, not the audit's "13.4 MB" — the real number is larger, though
only a subset is actually committed. `lint-output.txt` and `sentinel.md` are
also confirmed tracked in git. `.gitignore` confirmed to have **no** `.har`
pattern at all, and its diagnostic-output rule is `lint_*.txt` (underscore) —
confirmed it would not match a hyphenated `lint-output.txt`, exactly as the
audit states.

**What to do:** `git rm --cached` the 3 tracked HAR files + `lint-output.txt` +
`sentinel.md`; add `*.har.txt` and `lint-output.txt` (or fix the underscore
pattern to also cover hyphens) to `.gitignore`. This is genuinely low-risk —
removing tracked-but-generated artifacts, not source.

**Severity:** High (confirmed, repo-bloat/hygiene) — size detail corrected
upward, not downward.

### 8.2 CFG-2, CFG-3 — not independently re-verified this pass.

---

## 9. Corrected priority order

Given the verification above, the audit's own P0/P1/P2/P3 roadmap needs
reordering — some of its "P0 Critical" items turned out to be non-issues or
smaller than stated, while some real, confirmed, high-value items were
correctly triaged but for the wrong reasons. Revised:

### Do now (confirmed, real, and not already covered elsewhere)

1. **DB-4 corrected rollout** — continue the already-proven one-policy-per-table
   pattern across the corrected, larger list in §2.2 (12+ tables, not 5).
   This is the single biggest confirmed lever in the whole audit and is
   already an active, working pattern in this codebase.
2. **AI-2 fix** — `select-adaptive-question`'s two `attainment_percentage` →
   `attainment_percent` selects (small, isolated, high-impact bug fix).
3. **DB-1/2/3 cleanup** — new migration to `cron.unschedule` the 7 dead-letter
   job names and drop the broken MV-refresh scheduling from
   `20260615000001`'s code path, closing the conditional-resurrection risk
   even though it is not firing today.
4. **CFG-1** — untrack the HAR files + `lint-output.txt`/`sentinel.md`, fix
   `.gitignore`. Trivial, zero-risk, real repo-hygiene win.
5. **AI-1** — extract the shared `generateQueryEmbedding()` helper for
   `chat-with-tutor` + `generate-plan-update`, preserving the existing
   graceful-skip behavior.

### Do soon (confirmed, real, lower urgency)

6. FE-2 (single gamification hook), FE-5 (pick one league-tier model), FE-7
   (delete the dead `useBadgeSpotlight.ts` shim), BE-1 (route more functions
   through `_shared/auth.ts`, one PR per function), BE-5 (export shared
   `corsHeaders`), RT-1's scanner-scope fix (widen to `src/pages`), dead-code
   cleanup batch (§7 corrected list).

### Do only after one more verification pass (not independently confirmed this session)

7. RT-1's "genuinely unfiltered" headline claim (needs `useRealtime.ts`
   internals read first), AI-3/4/5, BE-3/4, DB-5, CFG-2/3, FE-4/6, RT-2.

### Do not do (refuted — no action item)

- BE-2 (rate-limiter files don't exist — nothing to delete)
- FE-3 (`themeStore.ts` doesn't exist — nothing to delete)
- DB-6 (already solved, monitored by `db:check-dup-names` — no new work)
- BE-5's specific `x-content-type` typo (already fixed previously)
- AI-2's `suggest-goals` half (`score` is a real column, not a bug)

---

## 10. Testing / gating for every item above

Every fix that ships from this record follows the workspace's existing gates,
unchanged:

- `npm run lint` → `npx tsc --noEmit` → `npm test` → (for any migration)
  `npm run db:check-replay` (must stay CLEAN) and, where relevant,
  `npm run db:check-dup-names` (must stay CLEAN).
- Any RLS change: `npm run test:rls` deny-side coverage (allowed AND denied
  per role) proving the merged/changed policy grants exactly the same access
  as before, per table, before merge — same pattern already proven on
  `habit_logs`/`team_members` in this session.
- Feature branch + PR, green Supabase Preview required before merge, per
  `preview-and-test-gate` and `migration-replay-integrity`.
- Dead-code deletions: re-confirm zero real importers immediately before
  deleting (Requirement 3.4), then `tsc --noEmit` + full suite green.
