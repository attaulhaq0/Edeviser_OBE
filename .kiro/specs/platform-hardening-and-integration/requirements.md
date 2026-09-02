# Platform Hardening & Integration — Requirements

> Status: ACTIVE · Created 2026-09-02 · Source: live Supabase logs, production console traces, teacher/coordinator product reviews (2026-09-01/02).
> Guiding principle: **use the existing backend — expose connections, never invent parallel data, keep the OBE chain (Teacher → Question Bank → Rubric → Gradebook → Outcome Attainment → Curriculum Matrix → CQI → Accreditation) alive end-to-end.**

## E1 — Verified production errors (P0–P3)

| ID | Severity | Error | Root cause (verified) | Fix |
|----|----------|-------|----------------------|-----|
| E1.1 | P0 | `agent-orchestrator` 503 on every request (worker boot error); chat, proposal inbox, autonomy card, governance down on ALL roles | Deployed function imports `ProtectedWriteBoundaryError` from `write-tools/execution.ts` which does not export it (defined in `registry.ts`). Gates missed it: vitest never loads entrypoints; tsc excludes Deno | Import from `registry.ts` + `scripts/check-edge-imports.mjs` gate (`npm run check:edge-imports`) + redeploy. Evidence: `function_logs` "worker boot error" 21:53→22:59Z 2026-09-01 |
| E1.2 | P1 | `intervention-jobs` POST 500 "Measurement claim failed" (21:00:12Z) | TBD in task F2 | Fix claim path |
| E1.3 | P1 | `generate-quiz-questions` POST 500 (20:27:26Z); teacher "Edge Function returned a non-2xx status code" when adding/generating questions | TBD in task F3 | Reproduce + fix |
| E1.4 | P1 | `notification-digest` POST 401 (20:21:59Z) — external cron scheduler not authenticated | Scheduler not sending `CRON_SECRET` (binding verified present) | Verify function binding; scheduler config is user-owned |
| E1.5 | P2 | Rubric builder: "new row violates row-level security policy for table rubrics" | `rubrics_teacher_write` requires `created_by = auth.uid()`; client INSERT omits `created_by` (no column default) → WITH CHECK sees NULL | Client sends `created_by` + MCP migration (column default + policy parity) |
| E1.6 | P2 | Rubric builder: "All criteria must have a name" blocks valid saves | Validation reads wrong field/stale state in `RubricBuilder.tsx` | Fix validation against actual criteria shape |
| E1.7 | P2 | Teacher module/material form: raw Zod default toast "Invalid input: expected number, received NaN" when sort_order cleared/decremented | `sort_order: z.number().int().min(0)` with no custom messages/empty handling (ModuleManager.tsx:539/828, same pattern GradeCategoryManager) | Integer coercion, clamp ≥ 0, localized messages; audit all raw sort_order inputs |
| E1.8 | P2 | Notification preferences: toggling one flashes/highlights all switches | Shared mutation `isPending` + whole-list invalidation re-renders every Switch | Per-key pending state + targeted cache update |
| E1.9 | P2 | Question Bank / Generate Questions: audit hardcoded-vs-live across quiz-generation pages + fix E1.3 | TBD in task F3 | Audit documented in spec |
| E1.10 | P2 | Tutor handoffs page empty | `teacher_handoff_requests` read via `any`-cast hook; write path (tutor chat → handoff) unverified; table/RLS unverified | Verify live; fix broken link; drop `any`; regen types |
| E1.11 | P2 | Gradebook letter-grade bug: 84.2% renders "F" (Olivia Nguyen) while peers at ~84% get A/B | Letter-scale mapping bug in matrix computation | Fix scale + unit-test thresholds |
| E1.12 | P2 | Attendance Marker: legacy UI + Create Session not working; stale May-2026 sessions | Create mutation/table/RLS unverified | Fix backend failure + design-system rebuild |
| E1.13 | P3 | Fonts CSS refused (MIME text/html) | `public/sw.js` intercepts cross-origin GETs, can serve index.html fallback | SW: same-origin only + CACHE_NAME v3 |
| E1.14 | P3 | Unsplash avatar images blocked | CSP `img-src` in vercel.json missing `images.unsplash.com` | Add host |
| E1.15 | P3 | Manifest icon-192 size mismatch | PNG actual dims ≠ declared | Regenerate from logo |
| E1.16 | P3 | Favicon still vite.svg | Never replaced | Edeviser mark |
| E1.17 | P3 | Auth 400 "Invalid Refresh Token: Not Found" | Stale browser sessions after redeploys | Benign — users re-login (documented) |
| E1.18 | P3 | PostgREST "Warp server error: Thread killed by timeout manager" (~30s) | Connection-pool reap artifact; verify no slow-query correlation | Classify (likely benign) |
| E1.19 | P3 | Black card headers (user preference) | Role dashboards use dark headers | White admin-style (`bg-white/80 border-slate-200/60`) everywhere |

## E2 — Teacher module synchronization (team review 2026-09-02)
- **E2.A Grading Queue**: rubric-criteria checklist (✓/✗) above AI feedback; explicit Regenerate semantics; confidence/rubric-coverage indicator; teacher-edited vs AI-generated distinction; Prev/Next submission navigation; screen stays grading-only; "Why?" explains score/mastery reasoning.
- **E2.B Curriculum Studio**: approval propagates platform-wide (student journey, teacher schedule, AI flows); N/M review progress; explicit "curriculum ready" state with cross-module triggers; confirmed CLO = source of truth for attainment/analytics.
- **E2.C Question Bank**: single source of truth reused by quizzes/assignments/AI Tutor/daily review; AI questions stay in review until teacher approval; usage analytics (times-used, correct %, difficulty, Bloom) auto-computed from real attempts; approved questions feed coordinator attainment + accreditation evidence; generation from approved materials + confirmed CLO mappings only; live Bloom-distribution health indicator.
- **E2.D Gradebook**: read-only consolidated view; marks flow only from assessments; columns auto-generated from course assessments; scores link to original grading page; CLO attainment auto-calculated; missing-work propagates to triage/profile/coordinator; exports reflect live data; category filters recalculate summary cards.
- **E2.E Attendance**: save → downstream recalc (profile history, triage risk, AI signals, coordinator, threshold notifications); percentages always computed (present ÷ conducted), never editable; attendance is a weighted input to AI risk; session dropdown loads existing records; duplicate prevention.
- **E2.F Tutor Handoffs**: handoffs created only on defined triggers (low confidence, repeated questions, student request); AI summary (question, why escalated, what was tried, suggested intervention); Send & Resolve → message to student + resolved + returns control to tutor; resolved handoffs in student history.
- **E2.G Course Materials**: explicit course context; indexed materials become that course's AI Tutor knowledge base (no cross-course leakage); Curriculum Studio reuses indexed materials; instructor-only until published.
- **E2.H Rubrics**: attached rubric drives AI grading in Grading Queue; CLO mapping flows to attainment/triage/coordinator/accreditation; rubric versioning — edits affect only future grading; assignment↔rubric linkage automatic.

## E3 — Coordinator modules (connectivity, not redesign)
- **E3.A Outcome Attainment**: complete drill-down ILO→PLO→CLO→Course→Assessment→Student evidence; every percentage explains its calculation path; hub aggregation only; every PLO offers next actions (contributing CLOs / affected courses / Curriculum Matrix / Draft CQI).
- **E3.B Curriculum Matrix**: cells generated from approved evidence; gaps open real workflows; auto-refresh on teacher publish; explainable coverage %; AI recommendations require coordinator approval.
- **E3.C CQI Plans**: plans originate from evidence; origin traceability preserved; Evaluate auto-compares via the same attainment engine; completed evidence feeds Accreditation; keep 5-step flow.
- **E3.D Course File Generator**: readiness auto-verified from source modules; missing items deep-link to owning module; generation compiles latest approved data; auto-feeds Accreditation.
- **E3.E Accreditation Evidence**: readiness/status/checklist/approvals generated dynamically from platform data; make Review/Start/Export functional. Priority: after core OBE engine.
- **E3.F Outcome Attainment UI v2**: ILO/PLO hierarchy split; expandable PLO→CLO rows; trend indicators; green/orange/red hierarchy; persistent alerts sidebar.
- **E3.G Curriculum Matrix UI v2**: true PLO×Course matrix; coverage legend; summary column; gap action panel; AI recommendations; export/term filters.
- **E3.H Accreditation UI v2**: readiness hero (Complete/In Progress/Blocked/Not Started); evidence status cards; CQI table; pack checklist; approval timeline.
- **E3.I Me page repositioning**: professional identity header; AI Assistance panel (autonomy level, allowed/restricted capabilities, Manage AI Settings); role & permissions; Programs I Manage; Connected Faculty; notification preferences; Security & Access; Integrations; Academic info. Remove duplicated analytics.
- **E3.J Deferred (spec-marked, not built now)**: Competency Frameworks (config page after OBE engine); Discussions (course/CLO-scoped threads, real data; Low–Medium); Team Health (real-data calculation only).

## E4 — Student & visual improvements
- **E4.A Learning Path**: Bloom-level climbing camps (Remember→Create summit) with per-camp lessons/assignments/checkpoint/boss-quiz; environmental progression per level; fallback: background-tone progression + milestones on current layout.
- **E4.B Student course section**: prominent "Due Today"; refined course cards/progress; rewarding completed-submission styling; consistent spacing; add missing View action.
- **E4.C Journal**: daily prompts, XP/streak reward for consistency, entry timeline, Foxi/Pengu acknowledgment on save.
- **E4.D Teacher dashboard polish**: "AI Prepared Your Day" → prioritized action plan with estimated time; Triage grouped Critical/Attention/Monitor; batch approval; Today's Classes quick actions; layout unchanged.
- **E4.E Coordinator hero**: status chips → actionable items; KPI cards as filters; enriched attainment alerts; CQI visual timeline; program timeline card; evidence checklist.
