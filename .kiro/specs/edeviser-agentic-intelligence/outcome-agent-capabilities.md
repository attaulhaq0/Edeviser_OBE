detail# Outcome Agent Capabilities — per role (PDF §18)

> Hard rule: NO agent performs arbitrary outcome mutations. Reads are tool-scoped; drafts change
> nothing official; every official mutation is a proposal requiring human approval.

## Admin Agent

Read (no approval): get_institution_ilos · get_ilo_detail · get_ilo_attainment ·
get_ilo_attainment_trend · get_ilo_mapping_coverage · get_ilo_program_contributions ·
get_ilo_evidence_summary · get_unmapped_program_outcomes · get_outcome_hierarchy_health.

Draft (no approval): draft_ilo · draft_ilo_governance_report.

Propose (approval=admin, creates agent_action_proposals): propose_create_ilo · propose_update_ilo ·
propose_delete_ilo · propose_reorder_ilos.

Never automatic: create/update/delete/reorder ILO · change mappings · change official attainment.

## Coordinator Agent

Read: get_available_institution_ilos (ILO definitions readable, NOT editable) · get_program_plos ·
get_plo_ilo_mappings · get_program_ilo_contribution · get_program_outcome_gaps.
Draft: draft_plo · draft_cqi_action.
Propose (approval=coordinator): propose_create_plo · propose_update_plo · propose_plo_ilo_mapping.
Must not: create/edit ILOs; create CLOs via API; touch other coordinators' programs; map across institutions.

## Teacher Agent

Read: get_course_clos · get_course_plo_alignment · get_course_ilo_alignment · get_clo_attainment ·
get_course_outcome_chain.
Draft: draft_clo · draft feedback/question artifacts (via existing generation functions).
Propose (approval=teacher): propose_clo_plo_mapping.
Must not: modify ILOs/PLOs; access courses they don't teach.

## Student Agent

Explanatory only, built on read tools with real mappings:
- "Which CLO am I improving?" → CLO attainment + trend
- "Which program outcome does this support?" → CLO→PLO mapping explanation
- "How does this course contribute to institutional outcomes?" → derived ILO alignment,
  always labeled "derived alignment based on mapped course evidence".
NO management/draft/propose tools. Never states official ILO mastery.

## Parent Agent

Simplified authorized summaries for verified linked children only: progress alignment summary,
deadlines, attendance, support suggestions, privacy-aware explanations. No governance detail
unless explicitly requested. Uses get_parent_child_progress scope only.

## Evaluator Agent (cross-cutting)

Scores every run post-hoc: authorization correctness, evidence grounding, citation validity,
academic integrity, tool correctness, approval-policy compliance, response safety → agent_evaluations.
Feeds Phase 7 A3 thresholds; never intervenes in the live loop.

## Labeling language (enforced in prompts + tests)

- "Your current course evidence contributes to this institutional outcome."
- "Your strongest aligned institutional outcome is…"
- "This is a derived alignment based on mapped course evidence."
Forbidden: claiming official ILO mastery from Digital Twin output; inventing attainment numbers;
modifying official attainment from twin output.