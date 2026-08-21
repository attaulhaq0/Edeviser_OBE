d # Spec Unmarked-Tasks Audit — 2026-08-21

> Full audit of every `- [ ]` item across all `.kiro/specs/*/tasks.md` files.
> Completed items were marked `[x]` in their spec files during this audit; this
> document records **every remaining unmarked item** with its verification verdict,
> so it can be cross-checked later.
>
> Verdict legend:
> - **VERIFIED NOT DONE** — checked against the codebase; the work is genuinely absent.
> - **RUNTIME GATE** — requires the running/deployed app or live DB; cannot be closed from code alone.
> - **PROCESS GATE** — requires opening/merging a PR, CI, Preview, deploy, or stakeholder sign-off.
> - **STANDING GUARDRAIL** — an ongoing constraint applied to every change, not a completable task.
> - **NOT DEEP-CHECKED** — listed for completeness; not individually verified in this pass.

## What was MARKED completed in this audit (48 items)

| Spec | Items marked | Evidence |
|---|---|---|
| xp-marketplace | 12.1–12.11, 13.1–13.9, 14.1–14.5, 15.1–15.8, 16.1–16.3, 17.1–17.3 → `[x]` | All 20 test files exist; all migrations exist; all Zod schemas exist; both pg_cron jobs scheduled |
| duplication-audit-verification | 3 → `[x]`; 12 → `[x]`; 10 → `[~]` partial | cron.unschedule() in 3 migrations; useRealtime.ts finding recorded; corsHeaders exported (only ~1 importer) |
| production-bug-fixes | 7 → `[x]` | `20260504032951_revoke_anon_execute_on_security_definer_functions.sql` + ~36 further REVOKE EXECUTE statements |
| prototype-frontend-rebuild | 2.1–2.5 → `[x]`; 1.0.1 → `[~]` partial; progress notes corrected | All 5 dashboard rows flipped to `rebuilt: true` in visual/screen-map.ts; layout tokens exist with different values than pinned |

---

## 1. dashboard-and-ux-performance — 50 unmarked

> Note: this spec has its own authoritative "Status reconciliation" section
> (senior-dev + QA pass, 2026-06-22) at the bottom of tasks.md that dispositioned
> these items. That block was respected; nothing here was re-marked.

| Item | Description | Verdict |
|---|---|---|
| 1 / 1.1–1.4 | Capture baselines (per-role DevTools, analyze/lighthouse, pg p50/p95, store under audit/baselines/ux-perf/) | RUNTIME GATE (harness template exists: audit/baselines/ux-perf/TEMPLATE.before.json) |
| 2 (parent box) | Student dashboard aggregate RPC | Deliberately left open by spec's own reconciliation (2.5 + 2.8 pending); RPC + hook verified implemented |
| 2.5 | Remove useDeferredMount(500) gating | VERIFIED NOT DONE (by-design deviation documented in spec) |
| 2.8 | Measure ~27→~1 mount requests, record *.after.* | RUNTIME GATE |
| 8.2 | Seed fetched profile into query cache | DEFERRED (documented rationale in spec: no consumer today) |
| 10.2 | Verify warm-ping via function logs | RUNTIME GATE |
| R | Re-measure after Tier 1 + 1.5 | RUNTIME GATE |
| 11.2 | Measure INP before/after | RUNTIME GATE |
| 12 / 12.1 / 12.2 | Per-user query-cache persistence + leakage test | VERIFIED NOT DONE (`@tanstack/query-persist-client` absent from package.json); gated by leakage test |
| 13 / 13.1–13.3 | RLS permissive-policy consolidation | GATED RLS WORK (overlaps rls-policy-consolidation spec) |
| 14 / 14.1 / 14.2 | Index hygiene | NOT DEEP-CHECKED (FK indexes verified done via production-bug-fixes Req 11) |
| 15 / 15.1 | Lazy-import chart component on recharts pages | VERIFIED NOT DONE (0 lazy chart imports found in src/pages) |
| 15.3 | Virtualize big tables | VERIFIED NOT DONE |
| 15.4 | Verify realtime filter-scoped + torn down | NOT DEEP-CHECKED |
| 15.5 | Justify with bundle/Lighthouse numbers | RUNTIME GATE |
| 17 / 17.1 / 17.2 | Tutor Analytics / Teams "failed to fetch" | OWNED BY ai-tutor-rag SPEC (needs manual edge deploy) |
| 18 / 18.1 | Gradebook "page failed to load" | OWNED BY qa-partner-review-remediation (needs runtime repro) |
| 19 / 19.1 | Slow teacher pages | Measurement + owned alongside ai-tutor-rag |
| E | Scope realtime (17 published tables) | VERIFIED NOT DONE (gated) |
| F | Wrap 2 bare submissions policies | NOT DEEP-CHECKED (gated RLS work) |
| G | Confirm 57014 timeout stops | RUNTIME GATE (Postgres log re-check) |
| 23 | Collapse N+1 / serial chains (non-dashboard remainder) | Dashboard slice done via aggregates; remainder gated behind Task 31 baseline |
| 25 | Parallelize auth gate beyond 8.3 | GATED (8.3 already satisfied per spec) |
| 26 | Pre-bundle 5 role layout shells | NOT DEEP-CHECKED (gated) |
| 27 | Scope realtime + header queries | GATED |
| 28 | Per-user query persistence | VERIFIED NOT DONE (package absent) |
| 29 | RLS consolidation + SECURITY DEFINER paths | GATED RLS work |
| 30 | Compute decision (free tier vs Pro) | STAKEHOLDER DECISION |
| 31 | Baselines for all roles | RUNTIME GATE |
| 37 | Maintained summary tables | NOT STARTED (baseline-gated) |
| 38 | Materialized views | NOT STARTED (baseline-gated) |
| 39 | Cheaper counts (estimated/planned) | NOT DEEP-CHECKED (gated) |
| 40 | Query prefetch-on-hover | DEFERRED (documented rationale in spec) |
| 41 | Re-measure all roles | RUNTIME GATE |

## 2. duplication-audit-verification — 24 unmarked

| Item | Description | Verdict |
|---|---|---|
| 1 (AI-2) | Fix select-adaptive-question attainment column read | VERIFIED NOT DONE — still 6 occurrences of `attainment_percentage`, 0 of correct `attainment_percent` |
| 2 / 2.1–2.15 | DB-4 RLS policy consolidation rollout (14 tables + sweep) | NOT DEEP-CHECKED (each sub-task = own PR/migration) |
| 4 (CFG-1) | Untrack .har.txt / lint-output.txt / sentinel.md + gitignore rules | VERIFIED NOT DONE — all 3 .har.txt files still git-tracked |
| 5 (AI-1) | Shared _shared/embeddings.ts helper | VERIFIED NOT DONE — supabase/functions/_shared/embeddings.ts does not exist |
| 6 (FE-2) | Single useStudentGamification hook | VERIFIED NOT DONE — zero matches for useStudentGamification in src/ |
| 7 (FE-5) | Pick one league-tier model | VERIFIED NOT DONE — both leagueTier.ts AND leagueTierCalculator.ts (+ its property test) still exist |
| 8 (FE-7) | Delete dead useBadgeSpotlight.ts shim | VERIFIED NOT DONE — src/hooks/useBadgeSpotlight.ts still exists |
| 9 (BE-1) | Migrate 2-3 more edge fns to _shared/auth.ts | PARTIAL — 9 functions total import _shared/auth, but the 3 named candidates (ai-module-suggestion, calculate-attainment-rollup, send-email-notification) are still inline |
| 11 (RT-1) | Widen realtime-filter scanner scope | PARTIAL — scanner now walks src/ excluding __tests__ (verified), but the required regression-test fixture was not found |
| 13 | Dead-code cleanup batch (7 files) | VERIFIED NOT DONE — all 7 files still exist (useXP, LanguageSelector, ThemeToggle, FocusModeProvider, ImpersonationProvider, useImpersonation, ImpersonationBanner) |
| 14 | Re-verify AI-3/AI-4/AI-5/BE-3/BE-4/DB-5/CFG-2/CFG-3/FE-4/FE-6 | NOT PERFORMED (explicitly a verification pass before acting) |

## 3. production-bug-fixes — 27 unmarked

| Item | Description | Verdict |
|---|---|---|
| A.7 | Track A gate & PR | PROCESS GATE |
| 7.1–7.4 | SECURITY DEFINER inventory/caller-check/migration/verify sub-steps | Parent task 7 marked [x]; sub-step checkboxes left as record of method |
| 8.1 | Enable HaveIBeenPwned (Pro-plan dashboard toggle) | MANUAL/DEFERRED (documented in docs/MANUAL-STEPS.md §1) |
| B.13 | Track B gate & PR | PROCESS GATE |
| 13 / 13.1–13.3 | process-onboarding health check | NOT DEEP-CHECKED (function exists; health probe needs staging payload) |
| 14 / 14.1–14.4 | student_profiles uniqueness audit | NOT DEEP-CHECKED (no UNIQUE constraint found in migrations; needs live duplicate audit query) |
| 20 / 20.1–20.3 | Attainment scope mismatch & outcome-weight invariant | VERIFIED NOT STARTED (no outcome_weight invariant found in migrations) |
| 21 / 21.1–21.3 | Gamification engine defects triage & promote | VERIFIED NOT STARTED (no gamification-engine-remediation spec exists) |
| Z.1–Z.4 | Final gates: local CI, PR green, DEV-panel check, prod smoke | PROCESS GATE |

## 4. prototype-frontend-rebuild — 98 unmarked

> Spec's own DoD: a screen counts only when rebuilt from prototype + parity-green
> (`rebuilt: true`) + legacy deleted. "Reskinned" does not count.

### P0/P1 shell & chrome
| Item | Description | Verdict |
|---|---|---|
| 0.9 | Capture prototype reference baselines, commit them | RUNTIME GATE (needs machine with browsers) |
| 1.0.1 | Layout tokens | PARTIAL → marked `[~]` (tokens exist, values differ from pinned) |
| 1.0.2–1.0.5 | Shell grid / laptop+mobile layouts / correctness / chrome-suppression | VERIFIED NOT DONE (no app-shell grid found) |
| 1.1.1 | ⌘K search mounted + per-role items | PARTIAL — SearchCommand IS now referenced in GlobalHeader.tsx (spec note stale), but per-role ROLE_CMDK items + DoD unverified |
| 1.1.2–1.1.5 | Notif panel rebuild, role stat chips, profile chip, why-popover | NOT DEEP-CHECKED (chrome rebuild believed not started) |
| 1.2.1–1.2.3 | Primary nav+FAB, MORE links, student sidebar extras | NOT DEEP-CHECKED |
| 1.3.1–1.3.5 | Right rails (teacher/parent/coordinator/admin/student per-page) | NOT DEEP-CHECKED (believed missing) |
| 1.4.1 | Role layouts rebuilt in src/app | VERIFIED NOT DONE (src/app empty; layouts still in src/pages/{role}) |
| 1.5.2 | Onboarding/start/roles entry screens | NOT DEEP-CHECKED |
| 1.7.1–1.7.5 | Hero carousel, celebration overlays, AI approve/dismiss, feedback host, reusable overlays | NOT DEEP-CHECKED |

### P3 modules (all rows)
All module screens (student 23 rows, teacher 18, coordinator 8, admin 10, parent 5, public 2) — **VERIFIED NOT CUT OVER**: feature-screen files exist only for assignments list/detail, course detail, post-quiz review, friends, profile (src/features/**), but AppRouter still renders the legacy `src/pages/**` components for those routes; screen-map shows no `rebuilt: true` for any module row. Per DoD these remain not-started/not-done.
Also: 3.0 remaining-DoD sub-item (rebuilt:true + test:visual for transcript/security/fees/notifications) — RUNTIME GATE.

### P4/P5/Guardrails
| Item | Description | Verdict |
|---|---|---|
| 4.1 | Live parity ledger | ONGOING — count now 5 (was 0); note updated in spec |
| 5.1–5.5 | Flag removal, legacy deletion sweep, orphan triage, retain prototype/, final green bar | NOT STARTED (final-sweep phase) |
| G.1–G.5 | Guardrails | STANDING GUARDRAILS (not completable tasks) |

## 5. rls-consolidation-and-infra-health — 2 unmarked

| Item | Description | Verdict |
|---|---|---|
| 2.1 | Live-test scripts/infra-health-report.sh on macOS/Linux/WSL | RUNTIME GATE (manual, low priority, flagged as known gap in spec) |
| 10.3 | Supabase Preview green on the PR | PROCESS GATE (requires opening the actual PR) |

## 6. ui-prototype-migration — 15 unmarked

> ⛔ This spec is CLOSED / SUPERSEDED by prototype-frontend-rebuild (Path A).
> Its own header says track live work there. Remaining items:

| Item | Description | Verdict |
|---|---|---|
| 0.6 | Reconcile preferred_language vs language_preference | VERIFIED NOT DONE — both fields still in use (8 vs 7 references in src/) |
| 2.6 | Parity gate each dashboard | RUNTIME GATE (superseded; Path A dashboards now own this) |
| 3.7 | Coverage matrix row-status updates | PARTIAL (matrix authored; row statuses track flag flips — superseded) |
| V.1–V.8 | Regression/role/i18n/theme/a11y/perf/responsive/coverage matrices | RUNTIME GATES ("yours to sign off on the preview" per spec) |
| G.1–G.4 | Guardrails | STANDING GUARDRAILS |

---

## Cross-check notes

- Raw machine-readable snapshot of all 224 unmarked lines at audit time:
  `.kiro/specs/_unmarked-snapshot.txt` (tab-separated: spec \t item text).
- Specs with ZERO unmarked items (fully checked off): adaptive-quiz-generation,
  ai-tutor-rag, db-function-search-path-qualification, edge-fn-schema-drift-remediation,
  full-profile-audit-remediation, habit-heatmap, i18n-rtl-support,
  migration-history-reconciliation, migration-replay-order-fix, platform-audit-fixes,
  post-audit-remediation, pre-deployment-deps-upgrade, pre-deployment-e2e-audit,
  prototype-backend-parity, qa-partner-review-remediation, rls-policy-consolidation,
  student-experience-remediation, student-onboarding-profiling, supabase-audit-remediation,
  team-challenges, ui-consistency-global-fixes, weekly-planner-today-view, xp-marketplace (after marking).