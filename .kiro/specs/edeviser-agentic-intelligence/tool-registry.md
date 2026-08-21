# Tool Registry — current state & planned additions

## Registry pattern (live on main: `_shared/ai/tools/registry.ts`)

Every tool declares: name (closed enum), version, description, allowedRoles, requiredContext
(studentId/courseId/programId), risk, approvalRequired, idempotency, inputJsonSchema,
validateInput/validateOutput, and executes through `executeRegisteredTool` which enforces:
unknown-tool rejection → role authorization → required page context → input validation →
scope authorization (`dataSource.authorizeScope`) → output validation. Violations raise
ToolBoundaryError (unknown_tool | unauthorized | missing_context | invalid_input | invalid_output).

## Registered READ tools (12, live)

| Tool | Roles | Required context |
|---|---|---|
| get_student_learning_context | student, teacher | studentId |
| get_course_mastery | student, teacher, coordinator, admin | courseId |
| get_outcome_chain | student, teacher, coordinator, admin | courseId |
| get_habit_context | student | studentId |
| get_at_risk_signals | teacher, coordinator, admin | courseId |
| search_course_materials | student, teacher, coordinator, admin | courseId (+query ≤1000 chars) |
| get_assignment_context | student, teacher | courseId, assignmentId |
| get_teacher_course_context | teacher | courseId |
| get_parent_child_progress | parent | studentId |
| get_coordinator_outcome_context | coordinator | programId |
| get_admin_institution_context | admin | — |
| get_intervention_effects | all roles | — |

All reads: risk="read", approvalRequired=false, idempotent by nature. Scope authorization
delegates to RLS-scoped data sources per call.

## Planned additions

### Outcome read tools (PDF §18 — Admin/Coordinator/Teacher)
get_institution_ilos (admin) · get_ilo_detail (admin, coordinator-read) · get_ilo_attainment /
get_ilo_attainment_trend / get_ilo_mapping_coverage / get_ilo_program_contributions /
get_ilo_evidence_summary / get_unmapped_program_outcomes / get_outcome_hierarchy_health (admin;
program-scoped variants for coordinator) · get_course_plo_alignment / get_course_ilo_alignment /
get_clo_attainment (teacher).

### Draft tools (actionType=draft, produce artifacts, no official change)
draft_ilo (admin) · draft_plo (coordinator) · draft_clo (teacher) · draft_cqi_action
(coordinator; cqi-draft.ts exists) · draft_ilo_governance_report (admin).

### Propose tools (actionType=write boundary → agent_action_proposals, approvalRequired=true)
propose_create/update/delete_ilo · propose_reorder_ilos (admin) · propose_create/update_plo ·
propose_plo_ilo_mapping (coordinator) · propose_clo_plo_mapping (teacher).

### Student/Parent explanation tools
Derived-alignment explanation endpoints built ON read tools (no new data access); students and
parents NEVER receive management/draft/propose tools.

## Hard rules (enforced by registry + review)

No raw SQL parameters · no table-name parameters · no service credentials in tool scope ·
closed tool enum · every new tool ships with allow-list tests asserting unauthorized roles are
rejected (tasks 4.8/5.4/6.4).