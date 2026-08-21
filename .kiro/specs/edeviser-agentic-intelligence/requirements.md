# Requirements Document

## Introduction

Edeviser is becoming a secure, context-aware, multi-agent learning platform: a canonical
OBE/ILO layer, a DeepSeek-only agentic backbone with approval-gated interventions, a Student
Learning Digital Twin, and role-aware assistant experiences for all five roles
(student, teacher, parent, coordinator, admin). This document states WHAT must hold
(acceptance criteria); HOW is in design.md and WHEN in tasks.md. Implementation status is
tracked in tasks.md.

## Glossary

- **ILO / PLO / CLO / Sub-CLO** — Institutional / Program / Course / Sub-course Learning Outcome.
- **Canonical mapping direction** — source_outcome_id = parent/higher outcome; target_outcome_id = child/lower outcome (ILO→PLO, PLO→CLO, CLO→SUB_CLO).
- **Digital Twin / Student Learning State** — per-student computed mastery/habits/risk/support/outcomes snapshot.
- **Operational autonomy (A0–A3)** — observe / suggest-draft / confirm-before-action / auto-execute low-risk.
- **Pedagogical autonomy (L1–L3)** — tutor hints-only / guided discovery / direct explanation.
- **PROTECTED_ACTIONS** — action classes that always require human approval regardless of autonomy.
- **Proposal** — an agent-created pending change in agent_action_proposals awaiting approval.

## Requirements

### R1 — Platform foundations (verified in place)

- R1.1 DeepSeek is the sole production generation provider; configuration hard-fails on any other provider; keys never reach the browser.
- R1.2 Gemini is not required for normal production AI execution (stale env documentation removed).
- R1.3 All five roles (student, teacher, parent, coordinator, admin) authenticate through Supabase Auth with authoritative profile-based role/institution resolution (never user_metadata).

## R2 — OBE integrity

- R2.1 Canonical hierarchy: Institution → ILO → PLO → CLO → Sub-CLO → assessments/rubrics/evidence; Graduate Attributes remain in dedicated tables.
- R2.2 Canonical mapping direction everywhere (code AND data): source_outcome_id = parent/higher, target_outcome_id = child/lower; allowed pairs exactly ILO→PLO, PLO→CLO, CLO→SUB_CLO.
- R2.3 Database enforcement: canonical shape constraints, weight ranges, hierarchy-pair validation, weight-sum rule, mapped-delete guard, scope enforcement — all DB-side, replay-safe.
- R2.4 No mirrored duplicates, cross-institution mappings, invalid pairs, or orphaned mappings exist in production data.
- R2.5 Attainment rolls correctly from evidence → CLO → PLO → ILO using the canonical direction; no parallel rollup conventions.

## R3 — Outcome security

- R3.1 Separate SELECT/INSERT/UPDATE/DELETE policies per role+type with USING and WITH CHECK:
  Admin = ILO only (own institution); Coordinator = PLO only (assigned programs); Teacher = CLO/Sub-CLO only (own courses); Student/Parent = read-only summaries.
- R3.2 Cross-institution outcome mutations fail; an admin ILO form cannot modify a PLO/CLO via arbitrary ID.
- R3.3 Authorization helpers (auth_user_role/auth_institution_id/auth_user_status) are audited: safe search_path, restricted grants, SECURITY INVOKER preferred, DEFINER only where necessary with guards.
- R3.4 Supabase Security Advisor findings introduced by any change are resolved before merge.

## R4 — Admin ILO experience

- R4.1 Guarded routes /admin/outcomes(/new|/:id/edit) operate on live data only (no mock).
- R4.2 List/create/edit/delete/reorder all constrained to type='ILO' + own institution; reorder is atomic and validated (no unknown/duplicate IDs; cannot touch PLO/CLO); delete blocked while valid dependencies exist (canonical-direction dependency check).
- R4.3 Full UX surface: Arabic titles, description, mapping count, mapped-program count, attainment summary/trend, evidence count, deletion impact, audit history link, empty/loading/error states, responsive, accessible, en/ar, RTL, design-system parity.

## R5 — Coordinator & Teacher workflows

- R5.1 Coordinator manages PLOs for assigned programs only; maps PLO→ILO with weight validation; sees coverage/gaps/contribution/matrix/CQI/accreditation; cannot create or edit ILOs. UI states ownership text ("ILOs are managed by the institution Admin").
- R5.2 Teacher manages CLOs/Sub-CLOs for taught courses only; maps CLO→PLO; links assignments/rubrics to CLOs; views attainment and upward contribution; cannot modify ILOs/PLOs or access unassigned courses.

## R6 — Multi-agent architecture

- R6.1 One authenticated orchestrator + one background worker; narrowly controlled specialists; no free agent-to-agent chatter.
- R6.2 Every tool declares: name, description, allowedRoles, actionType (read|suggest|draft|write), approval (none|actor|student|teacher|coordinator|admin), dataCategories, inputSchema, execute(). Authorization lives in tool handlers + RLS, never in LLM output.
- R6.3 No agent receives arbitrary SQL, table access, generic query tools, service-role/DB credentials, or anything that bypasses role policy.
- R6.4 Specialist agents deliver their PDF §21 capability sets (tutor, mastery, habit, risk, intervention, teacher, coordinator, admin, parent, evaluator), each reading only authorized scopes.
- R6.5 ILO/PLO/CLO are first-class context for authorized agents; students get derived-alignment explanations only; parents get simplified authorized summaries.

## R7 — Operational autonomy

- R7.1 Pedagogical autonomy L1/L2/L3 remains separate from operational autonomy A0–A3.
- R7.2 Effective autonomy = min(institution policy, role policy, page policy, tool policy, user preference, teacher/coordinator ceiling). Users may lower autonomy; never exceed ceilings.
- R7.3 Initially automatic: suggestions, resource recommendations, diagnostic offers, draft plans/feedback/reports, relationship explanations, governance/mapping-quality warnings.
- R7.4 Always approval-required (initial release): the PDF §25 protected-action list (outcome mutations, grades, deadlines, attendance, messaging, publishing, roles/permissions, financial/policy changes). A3 never bypasses these.

## R8 — Approval system

- R8.1 Proposals carry action type, description, reason, evidence, affected entities, outcome level, risk level, reversibility, required approver, expiry, payload.
- R8.2 Status lifecycle: draft → pending_approval → approved/rejected/expired → executing → completed/failed/cancelled; authorization revalidated at execution time.

## R9 — Student Learning Digital Twin ("Student Learning State")

- R9.1 Contains mastery (CLO attainment, PLO contribution, derived ILO alignment labeled as derived, gaps, trends, evidence confidence), habits (consistency, streaks, sessions, duration, timing, late-submission patterns), risk (deterministic score + signals + calculation version + escalation), support (intervention effectiveness, tutor autonomy, handoff/consent state), outcomes (accepted/completed interventions, mastery/habit change, feedback).
- R9.2 Uses observable educational evidence only; no medical/psychological diagnoses.
- R9.3 ILO alignment is derived and correctly labeled; the LLM never invents attainment; Digital Twin output never modifies official attainment.

## R10 — RAG

- R10.1 pgvector + course_material_embeddings with institution/course/CLO filters; no Pinecone.
- R10.2 Fail-closed retrieval for course-scoped answers; server-authorized citations only; prompt-injection-resistant evidence framing; hybrid/rerank improvements gated by evaluation; embedding model changes require separate evaluation.

## R11 — Observability & jobs

- R11.1 Persist conversations, messages, runs, tool calls/attempts, tasks, proposals, approvals/executions, feedback, evaluations with institution/actor/role/subject/outcome IDs/model/tool/authorization/approval/tokens/cost/latency/citations/safety/status — never secrets, tokens, raw credentials, unnecessary PII, or hidden chain-of-thought.
- R11.2 Background job families run small batches, idempotent, retry-limited, dead-lettered, institution-scoped, audit-logged; existing cron schedules are audited before adding (no duplicates).

## R12 — Frontend

- R12.1 One shared role-aware AI frontend (src/ai/components) adapted by role/route/entity/permission/tools/prompts — not five chat apps.
- R12.2 A page-capability matrix covers every authenticated route (entity, outcome level, tools, prompts, proactive cards, evidence sources, required approval).
- R12.3 Appropriate surface per page (Ask-Edeviser entry, prompts, insight, proactive card, evidence drawer, approval card, task inbox) — no large chatbot on every page.
- R12.4 English and Arabic fully localized; RTL via logical props; accessibility standards met.

## R13 — Testing & delivery gates

- R13.1 Test suites exist and pass for: ILO frontend flows, outcome RLS matrix (allowed AND denied per role × action), mapping direction/cycles/weights/deletion/cascade, agent authorization boundaries, plus general gates (lint, tsc, unit, integration, edge-fn schema, Playwright, visual, a11y, Arabic/RTL, migration replay, Security Advisor, Performance Advisor) using exact package.json script names.
- R13.2 Migrations replay successfully from scratch (local Docker) before merge; feature flags and rollback paths exist for every runtime change.
- R13.3 Kiro requirements/design/tasks/traceability stay complete and synchronized; architectural decisions recorded.