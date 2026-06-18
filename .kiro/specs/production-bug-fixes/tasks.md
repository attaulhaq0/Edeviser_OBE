# Production Bug Fixes — Tasks

> Rules: no production gameplay/institutional data seeding; backward-compatible only;
> each confirmed defect gets a regression test; gate every push with
> `npm run lint` → `npx tsc --noEmit` → `npm test` (+ `npm run db:check-replay` when a
> migration is added). Feature branch + PR; rely on CI + Supabase Preview. Never merge
> with a required check red.
>
> Cross-spec: do NOT do function `search_path` work (→ `db-function-search-path-qualification`)
> or replay-order/history/phantom-table work (→ `migration-history-reconciliation` /
> `migration-replay-order-fix`) here.
>
> Ship order: Track A first (lowest risk), then Track B, then Track C (per item; promote
> the large ones to their own specs).

## Phase 0 — Branch & baseline

- [ ] 0.1 Create feature branch `fix/production-bug-fixes-track-a` off current main.
- [ ] 0.2 Confirm baseline green: `npm run lint`, `npx tsc --noEmit`, `npm test`.

---

## Track A — Confirmed surgical code defects (ship first)

- [ ] 1. **ILO status badge** (Req 1)

  - [ ] 1.1 In `src/pages/admin/outcomes/columns.tsx`, default missing `is_active` to
        Active (`rawActive ?? true`).
  - [ ] 1.2 Unit test: no `is_active` → "Active"; `is_active:false` → "Inactive".
  - [ ] 1.3 Verify ILO list renders "Active" and sort/filter unchanged.

- [ ] 2. **Onboarding completion never traps the student** (Req 2)

  - [ ] 2.1 In `src/pages/student/onboarding/OnboardingWizard.tsx`, move
        `navigate('/student')` + `setIsProcessing(false)` into `finally`.
  - [ ] 2.2 Keep `processOnboarding.mutateAsync` + completion-flag write intact; ensure
        failures are logged (Sentry via existing mutation onError), not swallowed.
  - [ ] 2.3 Component tests: `mutateAsync` rejects → navigate still called; resolves →
        navigate + completion flags written.

- [ ] 3. **Honorific-aware display name** (Req 3)

  - [ ] 3.1 Add shared pure helper `getDisplayFirstName(name)` (e.g.
        `src/lib/displayName.ts`) that skips a leading honorific token.
  - [ ] 3.2 Use it in `WelcomeHero.tsx` (fallback `t("greeting.there")`) and
        `ProfileDropdown.tsx:90` (fallback `"User"`); leave avatar-initials logic alone.
  - [ ] 3.3 Unit-test helper: "Mr. David Okonkwo"→"David", "Dr. Aisha Al-Mansoori"→
        "Aisha", "Sara Imran"→"Sara", ""/null→null. Render test per consumer for fallback.
  - [ ] 3.4 Manually verify all five role dashboards + header greet by real name.

- [ ] 4. **`.single()` → `.maybeSingle()` on zero-row reads** (Req 4)

  - [ ] 4.1 Convert the four flagged reads (`AcceptInvitePage.tsx:128-132`,
        `useSessionCompletion.ts:289-293`, `useReflectionDigest.ts:75-78,131-134`,
        `useTeamProfile.ts:63-65`); handle `null` as empty/not-found at each site.
  - [ ] 4.2 Leave all `insert/update().select().single()` calls untouched.
  - [ ] 4.3 Per site: test zero-row → no throw + empty branch; one-row → identical
        behaviour.

- [ ] 5. **Signup role dropdown** (Req 5)

  - [ ] 5.1 In `LoginPage.tsx:597-611`, restrict the register-tab role to `student`
        (or relabel "requested, subject to approval"); no AuthProvider/server change.
  - [ ] 5.2 Component test: privileged silently-ignored role no longer offered (or
        clarifying label present); consistent with `SignUpPage.tsx`.

- [ ] 6. **Global query/mutation error safety net** (Req 6)

  - [ ] 6.1 In `src/App.tsx`, add `queryCache`/`mutationCache` `onError` that logs
        (console + Sentry) and toasts, dedup-aware (respect a `meta` opt-out flag).
  - [ ] 6.2 Test: unhandled error → global log/toast fires; opted-out hook → no
        double-toast.

- [ ] A.7 **Track A gate & PR:** full local gate; open PR; CI + Preview green; confirm
      dev-only quick-login panel remains `import.meta.env.DEV`-gated.

---

## Track B — Supabase platform hardening (branch `fix/supabase-hardening`)

> Every migration: guard `REVOKE/GRANT/ALTER` with `to_regprocedure(...)`/`to_regclass(...)`
> when it could precede CREATE on a fresh replay; `npm run db:check-replay` clean;
> Supabase Preview green; regenerate types via `scripts/regen-types.ps1` if signatures change.

- [ ] 7. **Restrict EXECUTE on internal SECURITY DEFINER functions** (Req 7)

  - [ ] 7.1 Build the function inventory from `get_advisors(security)`; classify each as
        public-by-design (keep) or internal (candidate revoke).
  - [ ] 7.2 For each internal candidate, grep `src/` for an `rpc('<fn>'` client caller;
        only revoke where there is none. **Never** revoke `authenticated` EXECUTE on
        `auth_user_role()` / `auth_institution_id()`.
  - [ ] 7.3 Migration: guarded `REVOKE EXECUTE … FROM anon` (and `authenticated` where
        no client caller) inside `DO $$ … IF to_regprocedure(...) IS NOT NULL …`.
  - [ ] 7.4 Verify: re-run `get_advisors(security)` → targeted warnings cleared; smoke
        invite-accept, public portfolio, leaderboard, wellness stats still work.

- [ ] 8. **Enable leaked-password protection** (Req 8)

  - [ ] 8.1 Enable HaveIBeenPwned check in Auth settings (production project).
  - [ ] 8.2 Document the toggle in `docs/MANUAL-STEPS.md`; confirm sign-in unaffected.

- [ ] 9. **Investigate moving `vector`/`citext` out of `public`** (Req 9)

  - [ ] 9.1 Enumerate dependents (vector columns/HNSW index, citext columns).
  - [ ] 9.2 IF safe: migration `ALTER EXTENSION … SET SCHEMA extensions` + search_path
        adjustments; verify dependents still resolve. ELSE document + formally accept
        as-is with rationale.

- [ ] 10. **Restrict `mv_historical_evidence` from the API** (Req 10)

  - [ ] 10.1 Identify the Historical Evidence dashboard's current reader path.
  - [ ] 10.2 Migration: `REVOKE SELECT … FROM anon, authenticated`; route the dashboard
        through an authorised institution-scoped path (existing/scoped RPC).
  - [ ] 10.3 Verify dashboard still loads for an authorised user; raw MV not anonymously
        selectable.

- [ ] 11. **Index the two FKs** (Req 11)

  - [ ] 11.1 Migration: `idx_announcement_attachments_announcement_id`,
        `idx_announcement_reads_student_id` (both `CREATE INDEX IF NOT EXISTS`).
  - [ ] 11.2 Verify `EXPLAIN` on the related joins/deletes uses the new indexes.

- [ ] 12. **Triage unused indexes & permissive policies (document only)** (Req 12)

  - [ ] 12.1 Record the ~50 unused indexes with keep/candidate-after-load-test notes;
        drop nothing here.
  - [ ] 12.2 Carve `multiple_permissive_policies` into a new dedicated
        `rls-policy-consolidation` spec stub; record the finding + risk; no action here.

- [ ] B.13 **Track B gate & PR:** `db:check-replay` + full local gate; PR; CI + Supabase
      Preview green; advisors re-checked.

---

## Track C — Higher-risk correctness defects (one branch per item)

> Each item: reproduce → capture preservation baseline → fix → parity. Promote large
> items (20, and most of 21) to their own specs once their live audit confirms shapes.

- [ ] 13. **`process-onboarding` health** (Req 13)

  - [ ] 13.1 Confirm deployed + responding for a real payload (preview/staging student,
        no production seeding).
  - [ ] 13.2 If unhealthy, redeploy per `docs/Edge-Function-Deployment-Guide.md`; no
        contract change.
  - [ ] 13.3 Confirm client errors reach Sentry and never block the student (ties to 2).

- [ ] 14. **`student_profiles` uniqueness audit** (Req 14)

  - [ ] 14.1 Read-only duplicate audit query in production.
  - [ ] 14.2 IF duplicates: migration de-dupe (keep most recent) + `UNIQUE (student_id)`,
        obeying replay/history rules; `db:check-replay`; green Preview.
  - [ ] 14.3 IF a constraint is added: switch writer to upsert on `student_id`.
  - [ ] 14.4 IF no risk: document "no change needed" and close.

- [ ] 15. **Coordinator analytics empty-state + load** (Req 15)

  - [ ] 15.1 Audit each analytics view for resolved-but-empty vs infinite-spinner; route
        empty → shared `EmptyState` with guidance.
  - [ ] 15.2 Add per-section skeletons; ensure no query hangs first paint.
  - [ ] 15.3 Profile each hook; collapse confirmed waterfalls into one joined query/RPC;
        replace `select('*')` on wide tables with explicit columns.
  - [ ] 15.4 Semester Trends / Cohort Comparison: implement against real data OR label
        "coming soon"/hide from nav (no fabricated data).
  - [ ] 15.5 Output-parity check on a non-empty program (numbers identical pre/post).

- [ ] 16. **Parent attendance query consolidation** (Req 16)

  - [ ] 16.1 Replace the 4-step waterfall + large `.in()` in `useChildAttendance` with
        one joined query (or `SECURITY INVOKER` RPC) scoped by `student_id`.
  - [ ] 16.2 Keep `AttendanceSummary[]` shape unchanged (component untouched).
  - [ ] 16.3 Verify: linked parent sees real per-course summary; unlinked parent sees
        nothing; empty child shows the existing empty state.

- [ ] 17. **Cron schedule mismatch & `fee-overdue-check` duplication** (Req 17)

  - [ ] 17.1 Reconcile `exam-period-notify`: set `vercel.json` + function header to one
        intended hour; document.
  - [ ] 17.2 `fee-overdue-check`: keep one scheduler (prefer Vercel per the prune note),
        retire the other via guarded migration / handler removal; never both live.
  - [ ] 17.3 Verify no other cron's schedule/target changed.

- [ ] 18. **Service-role Edge Functions caller checks** (Req 18)

  - [ ] 18.1 Add explicit in-handler caller checks (JWT + role/ownership) to
        `check-bonus-question`, `generate-fee-receipt`, `import-competency-csv`,
        `resolve-mystery-reward`, matching `bulk-import-users`.
  - [ ] 18.2 Fix the `score-reflection-quality` CORS header typo.
  - [ ] 18.3 Verify: legitimate caller succeeds; unauthorized caller → 401/403; CORS
        preflight OK. Contracts preserved.

- [ ] 19. **OBE accreditation report & course file schema drift** (Req 19 — highest value)

  - [ ] 19.1 Reproduce: confirm accreditation PLO/ILO rows render 0% and course-file CQI
        select errors/empties on current code.
  - [ ] 19.2 Live-verify the real `outcome_attainment` scope values the writer uses.
  - [ ] 19.3 Accreditation report: fix scope filter + `score_percent`→`attainment_percent`.
  - [ ] 19.4 Course file: fix `source/target_outcome_id`, `clo_weights`, CLO scope, real
        CQI columns.
  - [ ] 19.5 Generate a report/file for a real course **with** data → inspect non-zero
        correct values; a course **without** data → clean empty section, no 500.
  - [ ] 19.6 Land the Item 22 CI schema-contract check in the same PR.

- [ ] 20. **Attainment scope mismatch & outcome-weight invariant** (Req 20)

  - [ ] 20.1 Read-only live audit: `SELECT scope, count(*) FROM outcome_attainment GROUP
BY scope;` and map reader expectations vs writer scopes.
  - [ ] 20.2 IF mismatch confirmed AND fix is small/guarded: align readers to writer
        scopes (or extend trigger to write aggregate scopes) with parity on student-facing
        reads. ELSE **promote to a dedicated spec** with full reproduce/baseline/parity.
  - [ ] 20.3 Weight invariant: choose 0–100; add shared zod `superRefine` sum check +
        DB CHECK/trigger per `target_outcome_id`; normalisation migration for existing
        0–1 data. Promote to its own spec if non-trivial.

- [ ] 21. **Gamification engine defects — triage & promote** (Req 21)

  - [ ] 21.1 Record B-1/H-1/H-2/H-3/H-4/H-5/M-1 with severity + fix direction.
  - [ ] 21.2 Create `gamification-engine-remediation` spec for the interdependent set
        (badge unification + `award-xp`→`check-badges` [B-1]; `xp_total` SoT [H-1];
        streak driver [H-2]; `badge_definitions` seeding for spotlight [H-3]; team
        consolidation [H-4]; Perfect Day payout [H-5]).
  - [ ] 21.3 Quick wins only if safe in isolation, each with a test: M-1 cap→2; optional
        `process-streak` batch mode + midnight-cron fix (validate streak correctness; else
        defer). No seeded gameplay data.

- [ ] 22. **CI schema-contract check for Edge Functions** (Req 22)
  - [ ] 22.1 Add `scripts/check-edge-fn-schema.mjs` validating
        table/column/enum refs in `supabase/functions/**` against `src/types/database.ts`
        (with an explicit ignore list for unresolved dynamic/RPC calls).
  - [ ] 22.2 Wire into `.github/workflows/ci.yml` next to lint/types/tests; confirm it
        flags the Req 19 columns before the fix and passes after.

---

## Phase Z — Verify & ship (per track/PR)

- [ ] Z.1 Full local gate: `npm run lint`, `npx tsc --noEmit`, `npm test`
      (+ `npm run db:check-replay` if a migration was added).
- [ ] Z.2 Open the track/item PR; ensure CI (lint, types, tests, SQL replay,
      edge-schema-check) and Supabase Preview are green. Do not merge with any required
      check red.
- [ ] Z.3 Confirm the dev-only quick-login panel remains `import.meta.env.DEV`-gated and
      absent from the production build.
- [ ] Z.4 After deploy, smoke-test on production: ILO statuses, onboarding complete,
      greetings (hero + header), invite/session/digest/team empty states, coordinator
      analytics, parent attendance, accreditation report / course file with real data.

## Notes / non-goals

- No demo/sample gameplay or institutional data is inserted into production by any task.
- Items 1–3 may already be prototyped in the working tree
  (`columns.tsx`, `OnboardingWizard.tsx`, `WelcomeHero.tsx`) — port into the branch with
  the added tests and extend Item 3 to `ProfileDropdown.tsx` via the shared helper.
- `src/pages/LoginPage.tsx` dev quick-login panel is dev-only and excluded from scope;
  Item 5 only touches the register-tab role selector.
- Function `search_path` hardening, migration replay/history, and full RLS-policy
  consolidation are owned by other specs (see header).
