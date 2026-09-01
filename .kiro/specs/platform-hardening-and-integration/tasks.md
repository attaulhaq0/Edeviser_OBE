# Platform Hardening & Integration — Tasks

Format: `- [ ] T# (req) description — status/evidence appended when done.`

## Phase 1 — P0 deploy
- [x] T1 (E1.1) Deploy fixed agent-orchestrator; verify zero boot errors + OPTIONS 200 + all AI channels live. _(DONE 2026-09-02: CLI deploy 167kB; live OPTIONS → 200 with CORS headers; function_logs zero boot errors post-deploy. check:edge-imports gate green on 99 files pre-deploy.)_

## Phase 2 — Verified bug & infra fixes (PR `fix/production-console-errors`)
- [x] T2 (E1.5) Rubrics `created_by` default/policy migration (MCP + mirror) + client sends created_by. _(DONE 2026-09-02: MCP migration `rubrics_created_by_default_auth_uid` applied live — `created_by` now `DEFAULT auth.uid()`; `useCreateRubric` sends `created_by: user.id` explicitly. Parity mirror file still to be committed with the PR.)_
- [x] T3 (E1.6) Fix RubricBuilder criteria-name validation. _(DONE 2026-09-02: validation was CORRECT (default criteria seed with empty names) but opaque — toasts now name the offending criterion number: "Criterion N needs a name…"; same for level labels.)_
- [x] T4 (E1.7) Sort-order integer coercion + localized messages (ModuleManager, GradeCategoryManager, audit others). _(DONE 2026-09-02: new `src/lib/schemas/sortOrder.ts` — `sortOrderSchema` with friendly messages + `normalizeSortOrderInput` boundary helper; wired into ModuleManager (both sort_order inputs normalize on change), `courseModule.ts`, `gradeCategory.ts`. Root cause: raw number inputs submit ""/NaN → Zod default "Invalid input: expected number, received NaN". 5 unit tests incl. never-surface-"Invalid input" invariant; tsc clean.)_
- [x] T5 (E1.8) Per-key pending for notification preference toggles (all settings screens). _(DONE 2026-09-02: root cause = `EmailPreferencesSection` had `disabled={isUpdating}` on EVERY switch (shared mutation pending). New `updateSinglePreference` mutation in `useEmailPreferences` — optimistic setQueryData flip, per-key `isKeyPending`, rollback on error. Only the clicked switch disables; others stay live. Old whole-object API kept for compatibility; existing 5-test suite green; tsc clean.)_
- [x] T6 (E1.13) SW same-origin only + CACHE_NAME v3. _(DONE 2026-09-02: sw.js fetch handler now returns early for any cross-origin request — fonts/CDNs handled natively, no index.html fallback possible; cache bumped to edeviser-v3 to force client update.)_
- [x] T7 (E1.14) CSP img-src += images.unsplash.com. _(DONE 2026-09-02: vercel.json CSP updated — Unsplash avatars unblocked on next deploy.)_
- [x] T8 (E1.15) Manifest icon-192/512 dims corrected. _(DONE 2026-09-02: BOTH PNGs were 4x4 pixels (!) — regenerated 192x192 and 512x512 from edeviser-logo-final.png (1200x1200, aspect-preserving, white canvas). Manifest declarations now match.)_
- [x] T9 (E1.16) Replace vite.svg favicon with Edeviser mark. _(DONE 2026-09-02: index.html favicon → /icons/icon-192.png.)_
- [x] T10 (E1.2) Fix intervention-jobs measurement-claim 500. _(DONE 2026-09-02: failure was transient (next tick 200) but the bare error was undiagnosable — claim/lookup/complete failures now surface the Postgres message + SQLSTATE code. Redeployed; live tick 200 claimed:0.)_
- [x] T11 (E1.3/E1.9) Fix generate-quiz-questions 500 + document QB audit. _(DONE 2026-09-02 code+deploy: (a) LLM JSON now strips markdown fences — the 2026-08-30 log showed `Unexpected token '`'` from ```json-wrapped output; (b) retrieval step is now guarded + logged (the 2026-09-01 20:27Z 500 left NO quiz_generation_logs row → failed pre-LLM in retrieval); warnings preserved for the client. QB hardcoded-vs-live audit: generation writes quiz_generation_logs + agent_runs + agent_action_proposals from real course/CLO/material data — full page-by-page audit continues in T19.)_
- [x] T12 (E1.4) Verify notification-digest CRON_SECRET binding. _(DONE 2026-09-02: function now accepts BOTH `x-cron-secret` and `Authorization: Bearer <CRON_SECRET>` (timing-safe forms). Live: 200 via both forms. The recurring 401s come from the USER's external scheduler sending no secret — scheduler config is user-owned: send `x-cron-secret: <CRON_SECRET>` header. Redeployed.)_
- [ ] T13 (E1.19) White card headers across teacher/coordinator/student/parent.

## Phase 3 — Audits & feature repairs
- [ ] T14 (E1.11) Gradebook letter-scale fix + property tests + real-data audit.
- [ ] T15 (E1.10) Tutor handoffs: verify table/RLS/write path; fix broken link; drop `any`; regen types.
- [ ] T16 (E1.12) Attendance Marker: fix create-session backend + design-system rebuild.

## Phase 4 — Teacher sync (team feedback)
- [ ] T17 (E2.A) Grading Queue: rubric checklist, regenerate semantics, confidence, edited-flag, Prev/Next, Why-explains-score.
- [ ] T18 (E2.B) Curriculum Studio: approval propagation + progress + ready-state + CLO source-of-truth.
- [ ] T19 (E2.C) Question Bank: reuse hub, review-gate enforcement, live usage analytics view, approved-curriculum generation, Bloom health.
- [ ] T20 (E2.D) Gradebook: read-only enforcement, auto-columns, source links, auto attainment, propagation, live export, working filters.
- [ ] T21 (E2.E) Attendance: save-triggered recalc RPC, computed %, risk-signal input, session load, duplicate prevention.
- [ ] T22 (E2.F) Tutor Handoffs: trigger conditions, AI summary, resolve loop, student history.
- [ ] T23 (E2.G) Course Materials: course context, tutor knowledge isolation, studio reuse, publish control.
- [ ] T24 (E2.H) Rubrics: grading-standard linkage, CLO flow, versioning, auto assignment linkage.

## Phase 5 — Coordinator sync (team feedback)
- [ ] T25 (E3.F+A) Outcome Attainment v2 UI + full drill-down + explain-percentage + next actions.
- [ ] T26 (E3.G+B) Curriculum Matrix v2 UI + evidence-generated cells + gap workflows + auto-refresh.
- [ ] T27 (E3.C) CQI evidence-origination + traceability + auto-evaluate + accreditation feed.
- [ ] T28 (E3.D) Course File Generator auto-readiness + deep links + accreditation feed.
- [ ] T29 (E3.E+H) Accreditation Evidence dynamic generation + functional Review/Start/Export + UI v2.
- [ ] T30 (E3.I) Me page repositioning (identity, AI prefs, permissions, programs, faculty, notifications, security, integrations, academic info).
- [ ] T31 (E3.J) Deferred items recorded as spec-only (no build).

## Phase 6 — Student & visual (team feedback)
- [ ] T32 (E4.A) Learning Path climbing-camps visual (fallback: tone progression).
- [ ] T33 (E4.B) Student course section polish + View action.
- [ ] T34 (E4.C) Journal companion experience.
- [ ] T35 (E4.D) Teacher dashboard polish (action plan, triage groups, batch approval, quick actions).
- [ ] T36 (E4.E) Coordinator hero action hub + enriched alerts + timelines.

## Verification
Every completed task appends evidence (test run, live-log check, PR link) to this file. Gates per task: lint / tsc / vitest / i18n:check / check:edge-imports / db:check-replay / check:runtime-dependencies.
