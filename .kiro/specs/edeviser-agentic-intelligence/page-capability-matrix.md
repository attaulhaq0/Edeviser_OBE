# Page-Capability Matrix — skeleton (to be completed in task 3.2)

> Format per PDF §19/§33. Routes below are the PDF's list adapted to verify against
> `src/router/AppRouter.tsx` real paths during implementation. Each row will define:
> entity, outcome level, read tools, draft tools, protected actions, suggested prompts,
> proactive cards, evidence sources, required approver.

## Admin

| Page | Entity | Outcome level | Read tools (planned) | Draft/propose | Protected actions | Notes |
|---|---|---|---|---|---|---|
| /admin/outcomes | ILO list | ILO | get_institution_ilos, get_outcome_hierarchy_health | draft_ilo | create/edit/delete/reorder ILO | ownership text |
| /admin/outcomes/new · /:id/edit | ILO form | ILO | get_ilo_detail, get_ilo_mapping_coverage | draft_ilo, propose_* | all ILO mutations | |
| /admin/outcome-chain | chain viz | ILO→PLO→CLO | get_outcome_chain | — | — | |
| /admin/historical-evidence | evidence | all | get_ilo_evidence_summary | — | — | via existing RPC |
| /admin/graduate-attributes | GA | ILO↔PLO | dedicated tables reads | — | GA mapping changes | |
| /admin/accreditation-reports | report | program/ILO | attainment summaries | draft reports | publish | |
| /admin/analytics | institution KPIs | all | get_admin_institution_context | — | — | |
| /admin/governance | AI governance | — | cost/safety metrics | — | policy changes | Phase 6 |

## Coordinator

| Page | Entity | Outcome level | Read tools | Draft/propose | Protected actions |
|---|---|---|---|---|---|
| /coordinator/outcomes | PLO mgmt | PLO | get_coordinator_outcome_context, get_available_institution_ilos | draft_plo, propose_plo_ilo_mapping | PLO mutations, mappings |
| /coordinator/curriculum(-matrix) | matrix | PLO/CLO | outcome context + coverage | — | — |
| /coordinator/coverage · gap-analysis · trends | analytics | PLO/ILO | gaps/contribution tools | — | — |
| /coordinator/cqi | CQI plans | program | cqi reads | draft_cqi_action | CQI action assign/status |
| /coordinator/accreditation | accreditation | program/ILO | readiness/evidence | pack generation | approvals |

## Teacher

| Page | Entity | Outcome level | Read tools | Draft/propose | Protected actions |
|---|---|---|---|---|---|
| /teacher/courses/:courseId/outcomes | CLOs | CLO | get_course_plo_alignment, get_course_ilo_alignment, get_clo_attainment | draft_clo, propose_clo_plo_mapping | CLO mutations |
| /teacher/courses/:courseId/assignments · rubrics | assignments | CLO | get_assignment_context | draft feedback/questions | publish/grade changes |
| /teacher/gradebook | grades | CLO | mastery/at-risk reads | — | grade changes |

## Student

| Page | Surface | Notes |
|---|---|---|
| dashboard / learn / course detail | Tutor entry, mastery summary, learning state, CLO gaps, alignment explanation ("derived alignment…"), study recommendations, diagnostic questions, goals/draft plans, handoff consent | NO management tools |
| progress / learning-profile | OutcomeAlignmentSummary + LearningStateSummary | derived-ILO labeling enforced |

## Parent

| Page | Surface | Notes |
|---|---|---|
| dashboard / progress / support | simplified authorized child summary, deadlines, attendance, support suggestions, privacy explanation | verified-link only; no governance detail unless requested |

## Completion rule

Task 3.2 finalizes this file against REAL routes and wires it into a code registry consumed by
the assistant shell; every authenticated route must appear exactly once with its capability set.