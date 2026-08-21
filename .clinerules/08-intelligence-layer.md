# Intelligence Layer — OBE + Habit Engine + Agentic Guardrails

Adapted from `.kiro/specs/edeviser-agentic-intelligence` requirements and the Edeviser Agentic Intelligence Platform Specification.

## Product Vision
Edeviser is an intelligent learning operating system combining institutional outcomes (ILO/PLO/CLO/Sub-CLO), assessment evidence, student habits, and safe AI interventions. Every agent interaction must be context-aware:

- The authenticated actor, role, institution, assigned program/courses
- The current route/page/selected entity
- Applicable ILO/PLO/CLO/Sub-CLO
- Available assessment evidence + habit information
- User autonomy preference + institution policies + tool permissions + approval requirements
- Previous interventions and outcomes

## Canonical OBE Hierarchy
- Admin owns institutional ILO definition/governance
- Coordinator owns program PLO definition + PLO→ILO mapping + CQI/accreditation
- Teacher owns course CLO/Sub-CLO definition + CLO→PLO mapping + assessment evidence
- Student produces learning evidence; views authorized mastery/alignment
- Parent views authorized summaries for verified linked children

Hierarchy (canonical): Institution → ILO → PLO → CLO → Sub-CLO → Assessments/Rubrics/Evidence. Current code has Graduate Attributes between ILO and PLO — keep using the dedicated graduate_attribute tables until an audit decides otherwise.

## Canonical Mapping Direction (MUST be consistent everywhere)
- `source_outcome_id` = parent/higher-level outcome
- `target_outcome_id` = child/lower-level outcome
- Allowed pairs: ILO→PLO, PLO→CLO, CLO→SUB_CLO
- All hooks, SQL rollups, CQI queries, curriculum matrix queries, chain visualizations, deletion checks, and seeds MUST follow this convention. No mixed directions.

## Intelligence Guardrails (STRICT)
1. No agent receives arbitrary SQL, generic query tools, service-role credentials, or a tool that bypasses RLS.
2. Every tool declares: name, description, allowedRoles, actionType (read|suggest|draft|write), approval (none|actor|student|teacher|coordinator|admin), dataCategories, inputSchema, execute().
3. Authorization is enforced by tool handlers + RLS, never by the LLM.
4. Operational autonomy L1/L2/L3 (tutor) and A0–A3 (operational) are respected; effective autonomy = min(institution, role, page, tool, user preference, teacher/coordinator ceiling).
5. Approval is ALWAYS required for: creating/modifying ILO/PLO/CLO, changing outcome mappings, deleting/reordering ILOs, changing grades/deadlines/attendance, sending messages, CQI actions, and any official record mutation. Students cannot be granted outcome-management tools. A3 never bypasses approval.

## Habit Engine
- Habit signals: study consistency, streaks, session completion, effective duration, preferred study time, late-submission patterns, intervention acceptance.
- Habit Agent is deterministic-evidence-based: it must NOT invent risk scores; it structures evidence and supports habit recovery.

## Digital Twin / Student Learning State
- Mastery: CLO attainment → PLO contribution → derived ILO alignment (clearly labeled as "derived alignment", never official ILO mastery unless the calc methodology supports it).
- Never let the LLM invent ILO attainment. Never modify official attainment from Digital Twin output.

## Provider Policy
- DeepSeek is the primary production LLM provider; Gemini must NOT be required for normal production AI execution.
- `AI_PROVIDER=deepseek`, configure via Supabase secrets; never expose keys to browser.

## Spec-Driven Development (Kiro)
- Maintain `.kiro/specs/edeviser-agentic-intelligence/` canonical files: `requirements.md`, `design.md`, `tasks.md` + supporting audit files.
- Keep supporting files synchronized with canonical files in every AI-assisted change.

## Testing
- ILO frontend E2E: list/create/edit/delete-mapped-block/reorder/language/RLS/mapping-direction/attainment cascade.
- Run typecheck, lint, vitest, RLS tests, Edge Function tests, Playwright, visual regression, accessibility, Arabic/RTL, migration replay, Security Advisor.
- Inspect `package.json` for exact commands — do not guess command names.

## General Conduct
- Inspect before modifying; verify live schema before migrations; reuse/repair rather than duplicate.
- Do not use mock production data, bypass RLS, use service-role keys in browser code, trust presence of files as proof of functionality, or mix mapping directions.