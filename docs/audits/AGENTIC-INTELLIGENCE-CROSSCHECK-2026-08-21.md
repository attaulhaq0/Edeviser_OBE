# Agentic Intelligence Platform — Implementation Cross-Check
not **Date:** 2026-08-21 · **Source:** "Edeviser Agentic Intelligence Platform Specification" (PDF) · **Method:** 5 parallel audit agents + direct codebase verification (read-only) · **REVISED after live Supabase + GitHub cross-verification**

---

## ⚠️ REVISION — Live-verification corrections (Supabase project `cdlgtbvxlxjpcddjazzx` + GitHub `attaulhaq0/Edeviser_OBE`)

The first pass audited the LOCAL working tree (branch `feat/proactive-agentic-intelligence`),
which is BEHIND the live database and remote for OBE remediation work applied via Supabase MCP.
Four P0/P1 findings were WRONG and are retracted; verified against live DB/function definitions:

| # | Original claim | Live-verified reality | Evidence |
|---|---|---|---|
| C1 | "Outcome RLS is broad; P0 security gap" | **RETRACTED — RLS is exactly per PDF §11**: separate INSERT/UPDATE/DELETE policies per role+type (`outcomes_admin_ilo_*`, `outcomes_coordinator_plo_*`, `outcomes_teacher_clo_*`) all WITH CHECK, institution-scoped; `outcome_mappings_*` policies enforce ILO→PLO (coordinator) and PLO→CLO (teacher) with same-institution both sides; read policy institution-scoped | pg_policy on learning_outcomes/outcome_mappings |
| C2 | "Rollup SQL uses REVERSED direction → cascade silently no-ops (P0)" | **RETRACTED** — live `trigger_attainment_rollup` uses CANONICAL direction (`JOIN learning_outcomes parent_plo ON parent_plo.id = m.source_outcome_id AND type='PLO' WHERE m.target_outcome_id = clo_id`); live mapping data is 100% canonical (12× ILO→PLO, 12× PLO→CLO, ZERO reversed rows). The reversed code seen locally is a superseded migration file | pg_get_functiondef('trigger_attainment_rollup'); live outcome_mappings × learning_outcomes join |
| C3 | "No structural constraints / mapping validation (PDF §9–10 missing)" | **RETRACTED — all enforced live**: `learning_outcomes_canonical_shape_check` (ILO/PLO/CLO shape combos), weight CHECKs on both tables, `trg_validate_outcome_mapping_hierarchy`, `trg_outcome_mapping_weight_sum` (DEFERRABLE), `trg_guard_mapped_outcome_delete`, `trg_enforce_learning_outcome_scope` | pg_constraint / pg_trigger |
| C4 | "Tutor still Gemini-powered; injection-hardening not evidenced" | **RETRACTED** — deployed `chat-with-tutor` v18 is fully migrated: canonical `createAIProvider` (DeepSeek-only factory; config throws if AI_PROVIDER ≠ deepseek), Supabase-native gte-small embeddings (+ optional self-hosted bge-m3), L1/L2/L3 autonomy with assignment>CLO precedence and teacher-ceiling cap, academic-integrity detection, server-authorized citation validation, prompt-injection-resistant "UNTRUSTED COURSE EVIDENCE" framing, RAG fail-closed (no uncited fallback). The GEMINI_* lines in `.env.example` are STALE leftovers — cleanup item only | get_edge_function(chat-with-tutor) v18 source |

Additional live findings:
- `agent_tool_attempts` table EXISTS live (observability better than first reported).
- **Tool registry CORRECTION (post-revision):** `_shared/ai/tools/registry.ts` EXISTS on GitHub main — a full typed READ-tool registry with 12 tools (get_student_learning_context, get_course_mastery, get_outcome_chain, get_habit_context, get_at_risk_signals, search_course_materials, get_assignment_context, get_teacher_course_context, get_parent_child_progress, get_coordinator_outcome_context, get_admin_institution_context, get_intervention_effects), each declaring allowedRoles/requiredContext/risk/approvalRequired with input/output validation and ToolBoundaryError enforcement. Main also has `write-tools/` and `proactive-worker.ts` absent from the local checkout. The earlier "typed tool registry ❌ not built" claim applied only to the stale local tree — on main it is ✅ built for reads (§18 outcome read/draft/propose tools remain to be added).
- Deployed edge functions include `agent-orchestrator` (v10) and `agent-worker` (v10), both ACTIVE.
- GitHub default branch confirms NO `.kiro/specs/edeviser-agentic-intelligence/` directory (matches local finding — this governance gap is REAL).

**Revised verdicts:** PDF §7 (mapping direction) = ✅ IMPLEMENTED end-to-end · §9–10 (constraints/validation) = ✅ IMPLEMENTED · §11 (RLS remediation) = ✅ IMPLEMENTED · §30 (Tutor migration) = ✅ IMPLEMENTED (deployed) · §31 RAG hardening = 🟢 largely implemented. The remaining genuine gaps are: canonical spec documents, specialist agents beyond the role map, typed tool registry, autonomy A0–A3 policy engine, shared AI frontend, page-capability matrix, remaining observability tables/jobs.

---

## 0. Executive summary

| Layer | Implemented | Tested | Verdict |
|---|---|---|---|
| OBE hierarchy & mapping direction | ✅ Canonical end-to-end (hooks, live data 100% canonical, live rollup trigger canonical) | Weak (no data-level regression test yet) | 🟢 implemented; add tests |
| Outcome RLS & constraints | ✅ Role+type-scoped split policies WITH CHECK + shape/weight/hierarchy/delete-guard triggers/constraints all live | No dedicated outcome RLS test suite in repo | 🟢 implemented; add deny-side tests |
| Admin ILO frontend | Mostly present (routes/pages/hooks/guards) | Shallow e2e smoke | 🟡 verify & repair, don't rebuild |
| DeepSeek provider | ✅ New agentic layer is DeepSeek-only (`config.ts`) | Unit tests exist for AI layer (partial) | 🟢 done for new layer |
| Tutor migration off Gemini | ✅ Deployed chat-with-tutor v18 fully on DeepSeek + Supabase-native embeddings (stale GEMINI_* lines remain in .env.example only) | — | 🟢 done; clean stale env docs |
| Agent orchestrator + worker | ✅ Real implementation (orchestrator.ts 431 lines, proposals store, audit sink) | Some unit tests | 🟡 extend |
| Specialist agents (10) | ❌ Only a compact `SPECIALISTS_BY_ROLE` map in contracts.ts (194 lines) | — | 🔴 not built |
| Typed tool registry (allowedRoles/actionType/approval) | ✅ READ registry live on main (`tools/registry.ts`, 12 tools); §18 outcome/draft/propose tools pending | boundary pattern implemented | 🟡 extend |
| Approval system | 🟡 `agent_action_proposals` + `agent_action_executions` exist (approval folded into proposals; no separate approvals table) | Partial | 🟡 acceptable deviation or add table |
| Digital Twin | 🟡 ONE table `student_learning_states` (jsonb sections: mastery/habits/risk/strengths/opportunities/goals/interventions/evidence + version/freshness/state_hash) with RLS | ? | 🟡 shape deviates from PDF's snapshot tables but covers concept |
| Observability tables | 🟡 agent_runs ✓, proposals ✓, executions ✓; MISSING conversations/messages/tool_calls/tasks/feedback/evaluations | — | 🟡 partial |
| Shared AI frontend (src/ai/components) | ❌ None exists (no assistant panel, no approval card, no autonomy control anywhere in src/) | — | 🔴 not built |
| Page-capability matrix | ❌ No file/code artifact | — | 🔴 missing |
| Canonical Kiro spec dir `.kiro/specs/edeviser-agentic-intelligence/` | ❌ DOES NOT EXIST while `.clinerules/08-intelligence-layer.md` mandates it | — | 🔴 P0 governance gap |

**Overall (revised): PDF Phases 0–2 are substantially DONE and live-verified — canonical OBE direction with DB enforcement, role+type-scoped outcome RLS, DeepSeek-only generation including the migrated Tutor, orchestrator/worker deployed, approval proposals, digital-twin state table. The genuine remaining gaps are Phase 2–4 items: canonical Kiro spec documents, specialist agents beyond the role map, typed tool registry, A0–A3 autonomy policy engine, shared AI frontend, page-capability matrix, remaining observability tables/jobs, and deeper tests (outcome RLS matrix, mapping-direction regression, data-level cascade).**

---

## 1. Section-by-section status (PDF → repo)

| PDF § | Requirement | Status | Evidence |
|---|---|---|---|
| §1 Stack / roles / DeepSeek-primary | DeepSeek primary, Gemini not required | ✅ IMPLEMENTED — entire generation surface (incl. deployed Tutor v18) is DeepSeek-only via `createAIProvider`; config hard-fails on any non-deepseek provider. Stale GEMINI_*/TUTOR_PRIMARY_MODEL comments remain in `.env.example` (docs cleanup only) | _shared/ai/config.ts; deployed chat-with-tutor v18 |
| §5 Verified ILO starting point | Audit, don't rebuild ILO pages | ✅ Routes `/admin/outcomes(/new|/:id/edit)` guarded; ILOListPage/ILOForm/useILOs exist | src/router/AppRouter.tsx, src/pages/admin/outcomes/* |
| §7 Canonical mapping direction | source=parent→target=child everywhere | ✅ IMPLEMENTED end-to-end (live-verified): hooks write canonical; live `trigger_attainment_rollup` reads canonical (`source=PLO … WHERE target_outcome_id = clo_id`); live data 100% canonical (12× ILO→PLO, 12× PLO→CLO, zero reversed/mirrored). Local superseded migration files show the old direction — sync local checkout | pg_get_functiondef('trigger_attainment_rollup'); live join counts |
| §8 Data reconciliation | Report mirrored/duplicate/cross-institution mappings before fixes | ✅ Live data verified clean: zero mirrored/reversed/cross-type-invalid rows (12+12 canonical only); formal reconciliation report artifact still worth archiving | live SQL group-by source/target types |
| §9 Structural DB constraints | type/institution/program/course combos enforced | ✅ IMPLEMENTED — `learning_outcomes_canonical_shape_check` + weight CHECKs live | pg_constraint |
| §10 Mapping validation | pairs/institution/cycles/weights enforced DB-side | ✅ IMPLEMENTED — `trg_validate_outcome_mapping_hierarchy`, `trg_outcome_mapping_weight_sum` (DEFERRABLE), `trg_guard_mapped_outcome_delete`, `trg_enforce_learning_outcome_scope` live | pg_trigger |
| §11 Outcome RLS remediation | Separate SELECT/INSERT/UPDATE/DELETE role+type-scoped policies | ✅ IMPLEMENTED — full split policy set WITH CHECK for admin-ILO/coordinator-PLO/teacher-CLO + institution-scoped reads + canonical-direction mapping policies (see Revision C1) | pg_policy |
| §12 Helper function audit | auth_user_role() etc. SECURITY DEFINER/search_path/grants | 🟡 Partially addressed by earlier hardening (37 REVOKE EXECUTE migrations; search_path qualification spec completed) | supabase/migrations/20260504*, db-function-search-path-qualification spec (closed) |
| §13–14 Admin ILO frontend audit/completion | list/create/edit/delete/reorder end-to-end correct | 🟡 Present; reorder safety + delete dependency direction need verification (delete check must follow canonical direction) | e2e/intelligence-chain.spec.ts covers type-guard shallowly |
| §15 Coordinator workflow | PLO mgmt + PLO→ILO mapping + coverage/gaps | 🟡 Pages exist; mapping-weight validation UI unverified | coordinator outcomes/curriculum pages |
| §16 Teacher CLO workflow | CLO/Sub-CLO + CLO→PLO mapping | 🟡 Pages exist | teacher curriculum pages |
| §17 Attainment rollup verification | full cascade tests incl. weight/grade/isolation | 🟡 Rollup itself correct (live-verified); data-level cascade tests (weights/grades/isolation) still missing | see Tests section |
| §18 ILO-aware agents (Admin/Coordinator/Teacher/Student/Parent tools) | named tool lists per role | ❌ No per-role tool implementations found (only SPECIALISTS_BY_ROLE map) | _shared/ai/contracts.ts (194 lines) |
| §19 Page-capability matrix | every authenticated page → tools/approvals | ❌ Missing | — |
| §20 Shared multi-agent architecture | orchestrator + worker + full _shared/ai tree (agents/, tools/, policy/, context/, observability/) | 🟡 orchestrator.ts+worker+providers/proposals/evaluator/proactive exist; agents/, tools/, policy/, context/, observability/ subtrees DO NOT | supabase/functions/_shared/ai/ listing |
| §21 Specialist agents (10) | tutor/mastery/habit/risk/intervention/teacher/parent/coordinator/admin/evaluator | ❌ Not implemented as specified (SPECIALISTS_BY_ROLE suggests role routing intent only) | — |
| §22 Tool safety interface | typed AgentTool with allowedRoles/actionType/approval/inputSchema | ❌ Not found (`allowedRoles` grep = 0 hits in _shared/ai) | — |
| §23 Autonomy L1/L2/L3 + A0–A3 | effective-autonomy = min(ceilings) | ❌ Only 3 incidental matches for autonomy in ai layer; no policy engine | — |
| §24/25 Automatic vs approval-required actions | protected-action list | 🟡 PROTECTED_ACTIONS enum exists in contracts.ts; enforcement breadth unverified | contracts.ts |
| §26–28 Digital Twin | states/snapshots/interventions/events tables + versions | 🟡 One-table design (student_learning_states) with mastery/habits/risk jsonb sections, version, freshness, state_hash, RLS; MISSING separate intervention_outcomes/learning_state_events/snapshot tables; calculation/policy/model version fields absent (only generic `version`) | migration creating student_learning_states |
| §29 DeepSeek integration | provider + env structure + secrets | ✅ For new layer (AI_PROVIDER=deepseek, deepseek-v4-flash/pro, base URL, budget flags in .env.example); MockProvider NOT found | config.ts, .env.example |
| §30 Tutor migration | preserve streaming/RAG/etc., incremental | ✅ IMPLEMENTED (deployed v18): SSE contract preserved over canonical non-streaming provider boundary; enrollment/CLO-scope/institution checks; usage limits; XP; handoff triggers; plan-update triggers; Big-Five persona auto-select | get_edge_function(chat-with-tutor) |
| §31 RAG strategy | keep pgvector, hybrid retrieval, injection resistance | 🟢 Largely implemented: pgvector RPCs (v2/v3), Supabase-native embeddings w/ versioning, fail-closed no-evidence error, untrusted-evidence framing, citation validation. Hybrid keyword/rerank not yet present | deployed chat-with-tutor; embedding-registry.ts |
| §32 Shared frontend components | src/ai/components/* (12 components) | ❌ None exist | — |
| §33 All-page agentic coverage | page-capability matrix | ❌ Missing | — |
| §34 Role frontend requirements | per-role assistant experience | ❌ No assistant UI mounted anywhere | — |
| §35 Approval system | proposals/approvals/executions + statuses | 🟡 proposals+executions tables exist; approvals folded into proposals; status set includes expired boundary handling | proposals.ts, migrations |
| §36 Background jobs | 9 job families, durable queues, idempotency | ❌ No agent job schedules found (existing cron audited separately; keepwarm/badge jobs unrelated) | vercel.json, pg_cron migrations |
| §37 Observability | 10 tables + log fields + no-secrets rule | 🟡 agent_runs/proposals/executions only; conversations/messages/tool_calls/tasks/feedback/evaluations missing | migrations scan |
| §38 Testing requirements | ILO frontend, RLS matrix, mapping, agents, general suites | 🟡 e2e intelligence-chain = 8 shallow string-match tests; NO outcome RLS suite; NO mapping-direction regression test; some AI unit tests exist | see Tests section |
| §39 Rollout phases 0–7 | sequenced delivery | Phases 0–1 DONE & live-verified (OBE reconciliation/constraints/RLS); Phase 2 largely done (DeepSeek, Tutor migration, orchestrator, proposals); Phases 3–7 remain (frontend, digital-twin breadth, copilots, parent/admin agents, A3 automation) | this report |
| §40 Deliverables / §41 DoD | incl. canonical spec files | ❌ `.kiro/specs/edeviser-agentic-intelligence/` does not exist although `.clinerules/08-intelligence-layer.md` mandates and references it (P0 governance gap) | .clinerules/08 lines 3, 50 |

## 2. Test coverage vs spec §38

| Required test area | Found | Gap |
|---|---|---|
| e2e intelligence chain | e2e/intelligence-chain.spec.ts — 8 tests, string-presence assertions only | No data-level verification of mapping rows/cascade values; approval-card test near-tautological |
| Outcome RLS suite | NONE in src/__tests__/integration-rls/ | Entire admin/coordinator/teacher/student/parent × outcome matrix missing |
| Mapping-direction regression | NONE | Still needed as a guard even though live state is canonical (prevents regression) |
| Attainment cascade (weights/grades/isolation) | NONE at data level | Needed to certify §17 DoD |
| AI layer unit tests | Some exist (proposals/orchestrator-related) | Agent authorization/tool-scope tests absent (no tools to test yet) |
| General gates | package.json has lint/tsc/test/test:rls/test:visual/e2e scripts | Run before any change (pre-commit checks) |

## 3. Revised findings (after live verification)

1. **Missing canonical spec directory** `.kiro/specs/edeviser-agentic-intelligence/` referenced by .clinerules/08 (confirmed absent on GitHub main too) — create requirements/design/tasks + traceability capturing the PDF, or repoint the clinerule. This is now the top governance gap.
2. **Local checkout drift:** local branch is behind live DB/main for OBE remediation (superseded migration files show reversed rollup; live function is canonical). Sync/pull latest main and regenerate types to avoid future false audits.
3. **Stale env documentation:** GEMINI_API_KEY/TUTOR_PRIMARY_MODEL lines in `.env.example` contradict the deployed DeepSeek-only reality — delete them so no future work re-introduces Gemini.
4. **Test depth:** add outcome RLS deny-side matrix, mapping-direction regression test, and data-level CLO→PLO→ILO cascade tests (weights/grade updates/institution isolation) to certify PDF §38.
5. **Remaining build gaps (unchanged):** specialist agents, typed tool registry, A0–A3 autonomy engine, shared AI frontend, page-capability matrix, remaining observability tables + background jobs.

## 4. Cross-reference: unmarked spec items → required for THIS vision?

### duplication-audit-verification
| Item | Verdict | Why |
|---|---|---|
| 1 (AI-2 adaptive-question attainment column fix) | **REQUIRED (P0)** | Adaptive difficulty reads wrong attainment column → wrong OBE evidence feeding agents/habit engine |
| 2.x RLS consolidation | NICE-TO-HAVE now, REQUIRED before A3 automation | Perf/security posture; not a blocker for read-only agents |
| 4 (.har.txt untrack) | REMOVABLE from this vision (repo hygiene; do opportunistically) | No functional link |
| 5 (_shared/embeddings.ts) | **REQUIRED for RAG quality** (provider-agnostic embeddings; supports DeepSeek-era stack) | Directly serves §31 |
| 6 (useStudentGamification) | REMOVABLE for this vision (perf refactor) | Habit engine reads gamification but works today |
| 7 (league-tier model) | REMOVABLE | Unrelated to OBE/agents |
| 8 (useBadgeSpotlight shim) | REMOVABLE | Dead code hygiene |
| 9 (_shared/auth migration) | **REQUIRED-adjacent** (security posture for any new AI edge fns) | Hardens the surface agents run on |
| 11 (realtime scanner) | REMOVABLE for this vision | Perf tooling |
| 13 (dead-code cleanup) | REMOVABLE (do in P5 sweep) | Hygiene |
| 14 (re-verify pass) | NICE-TO-HAVE | Due diligence |

### production-bug-fixes
| Item | Verdict | Why |
|---|---|---|
| 13 process-onboarding health | REMOVABLE for this vision | Unrelated |
| 14 student_profiles uniqueness | NICE-TO-HAVE | Data integrity generally |
| **20 attainment scope mismatch & outcome-weight invariant** | **REQUIRED (P0)** — merge into the Phase-1 OBE reconciliation | Agents must never read wrong-scope attainment; weight invariant is PDF §10 |
| 21 gamification triage | REMOVABLE for this vision | Habit engine consumes signals, works today |
| Z gates | PROCESS (apply to whatever PRs carry the above) | Governance |

### dashboard-and-ux-performance
Mostly REMOVABLE for this vision (cosmetic perf). Exceptions:
- Task 31 baselines / E realtime scoping: NICE-TO-HAVE (agent polling adds load; scoped realtime protects the 8s timeout budget agents depend on).
- Nothing blocks agent work.

### prototype-frontend-rebuild
- **REQUIRED-adjacent decision:** the shared AI frontend (§32) should be built ONCE on the target design system. Building assistant UI on legacy pages now = wasted work IF Path A continues. Recommendation: build `src/ai/components` as design-system-agnostic primitives now (they're new surfaces, not reskins), mount later wherever the shell lands. The rebuild itself is NOT a prerequisite for backend agent work.

### ui-prototype-migration remaining items
REMOVABLE — spec is closed/superseded; V-gates superseded by Path A parity gates. Exception: 0.6 language-field reconciliation is cheap data hygiene worth folding into any migration PR.

### rls-consolidation-and-infra-health
NICE-TO-HAVE for read-only phase; **REQUIRED before A3 low-risk automation** (agent execution surface must sit on consolidated, deny-side-tested RLS).

## 5. Recommended senior-level action plan (safe, phased)

**Phase 0 — Governance + certification (no agent exposure)**
1. Create `.kiro/specs/edeviser-agentic-intelligence/{requirements,design,tasks}.md` (+ traceability) capturing the PDF; repoint/keep .clinerules/08 synchronized. *(top gap)*
2. Sync local checkout with live/main (superseded OBE migration files caused false audit findings); regenerate types.
3. Delete stale GEMINI_*/TUTOR_PRIMARY_MODEL lines from `.env.example`.
4. Add the missing tests: outcome RLS deny-side matrix, mapping-direction regression test, data-level CLO→PLO→ILO cascade tests (weights/grade updates/institution isolation). *(certifies PDF §38 / DoD)*
5. Verify Admin ILO reorder safety + delete-dependency direction end-to-end (PDF §13–14 remaining 🟡).

**Phase 1 — Complete the AI backbone (extends what exists)**
6. Extend `_shared/ai`: add `tools/registry.ts` implementing the typed AgentTool interface (§22) + `policy/autonomy.ts` (A0–A3 min-ceiling engine) + `context/` builders + `observability/` (logger/cost/redaction/metrics).
7. Implement specialists incrementally behind SPECIALISTS_BY_ROLE: evaluator + admin read-tools first (get_institution_ilos, get_ilo_attainment…), all actionType="read"; then coordinator/teacher read+draft tools.
8. Add missing observability tables (agent_conversations/messages/tool_calls/tasks/feedback/evaluations) + background job skeletons with idempotency/dead-letter (§36–37).
9. Optional hardening: hybrid keyword+semantic retrieval/rerank (§31 remainder); MockProvider for tests.

**Phase 2 — Frontend**
10. Build `src/ai/components` (design-system-based, role-aware) + page-capability matrix; mount Ask-Edeviser entry + approval cards wired to agent_action_proposals; i18n en/ar from day one.

*(Previously listed work now confirmed DONE and removed from the plan: rollup-direction fix, outcome RLS split policies, structural constraints/validation triggers, Tutor DeepSeek migration — all live-verified.)*


**Explicitly DEFER/REMOVE for this vision:** league-tier unification, badge-shim deletion, realtime scanner, dead-code batch, gamification triage, most dashboard-perf items, ui-prototype-migration remnants (except 0.6 hygiene).

## 6. Answer to "which unmarked work is needed vs removable"

- **NEEDED to make the PDF real:** dup-audit #1, #5, #9, (2.x before A3); pbf #20 (+14 optional), Z gates on those PRs; rls-consolidation before A3; dashboard E/31 optionally; pfr only as the mounting surface decision (build AI UI design-system-native now).
- **NOT required / safely removable from this vision:** dup-audit #4, #6, #7, #8, #11, #13, #14; pbf #13, #21; nearly all dashboard-perf items; all ui-prototype-migration remnants except 0.6; prototype-frontend-rebuild P3/P5 (independent track).
