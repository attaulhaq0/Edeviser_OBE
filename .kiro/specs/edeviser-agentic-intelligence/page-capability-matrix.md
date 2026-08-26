# Page-Capability Matrix (finalized — task 3.2, Wave D)

Code source of truth: `src/ai/capabilities/registry.ts` + `src/ai/capabilities/types.ts`,
consumed by `src/ai/hooks/usePageCapabilities.ts` and mounted via `EdeviserAssistantPanel` (D2/D4).
Sync guard: `src/__tests__/unit/pageCapabilityRegistry.test.ts` fails when this document and the
registry drift apart — every registered pattern appears below, backticked, exactly once.

Matching contract: longest normalized pattern wins; `:param` matches exactly one segment; a
trailing `*` matches any remainder (including empty); query/hash strings are stripped before
matching. Fail-closed: a route with NO matching row renders NO assistant surface — callers receive
`null` from `resolvePageCapabilities()`, mirroring the backend strict-minimum autonomy posture
(`policy/autonomy.ts`). Approval never escalates beyond the row's `approvalCeiling`.

## Student

| Route | Surfaces | Read tools | Ceiling | Evidence sources |
|---|---|---|---|---|
| `/student` | twin-summary, alignment-summary, suggestions | get_student_learning_context, get_course_mastery, get_outcome_chain, get_habit_context | none | student_learning_states, outcome_mappings |
| `/student/courses/:courseId` | twin-summary, alignment-summary, conversation | core + search_course_materials | none | student_learning_states, submissions, course_material_embeddings |
| `/student/courses/:courseId/assignments/:assignmentId` | twin-summary, conversation | core + search_course_materials, get_assignment_context | none | student_learning_states, submissions, assignments |
| `/student/tutor/*` | conversation, suggestions | core + search_course_materials | actor | agent_messages, rag_chunks, submissions |

## Teacher

| Route | Surfaces | Read tools | Ceiling | Evidence sources |
|---|---|---|---|---|
| `/teacher/dashboard` | insight-cards, approval-inbox | get_teacher_course_context, get_at_risk_signals, get_habit_context | teacher | ai_feedback, learning_interventions, proactive_agent_jobs |
| `/teacher/gradebook/*` | insight-cards, conversation | get_teacher_course_context, get_at_risk_signals, get_assignment_context, get_outcome_chain | teacher | grades, submissions, ai_feedback |
| `/teacher/outcomes/*` | insight-cards, conversation | get_teacher_course_context, get_outcome_chain, get_intervention_effects | teacher | clos, sub_clos, outcome_mappings |
| `/teacher/students/:studentId` | insight-cards, suggestions, conversation | teacher context/at-risk/habit + get_student_learning_context, get_intervention_effects | teacher | student_learning_states, learning_interventions, attendance |

## Coordinator

| Route | Surfaces | Read tools | Ceiling | Evidence sources |
|---|---|---|---|---|
| `/coordinator` | insight-cards | get_coordinator_outcome_context, get_ilo_mapping_coverage, get_unmapped_program_outcomes, get_ilo_program_contributions | coordinator | plos, ilos, outcome_mappings |
| `/coordinator/plos/*` | insight-cards, conversation | get_coordinator_outcome_context, get_outcome_chain, get_unmapped_program_outcomes | coordinator | plos, graduate_attributes, outcome_mappings |
| `/coordinator/cqi/*` | insight-cards, approval-inbox | get_coordinator_outcome_context, get_ilo_mapping_coverage | coordinator | cqi_actions, agent_action_proposals |

## Admin

| Route | Surfaces | Read tools | Ceiling | Evidence sources |
|---|---|---|---|---|
| `/admin` | insight-cards, approval-inbox | ADMIN-ILO set (10 read tools: get_admin_institution_context, get_institution_ilos, get_ilo_detail, get_ilo_attainment, get_ilo_attainment_trend, get_ilo_mapping_coverage, get_ilo_program_contributions, get_ilo_evidence_summary, get_unmapped_program_outcomes, get_outcome_hierarchy_health) | admin | institution_outcomes, agent_action_proposals, audit_logs |
| `/admin/outcomes/*` | insight-cards, conversation, approval-inbox | ADMIN-ILO set (as above) | admin | ilos, programs, outcome_mappings |
| `/admin/governance/*` | approval-inbox, insight-cards | ADMIN-ILO set (as above) | admin | agent_action_proposals, agent_runs, tutor_llm_logs |

## Parent

| Route | Surfaces | Read tools | Ceiling | Evidence sources |
|---|---|---|---|---|
| `/parent` | twin-summary | get_parent_child_progress | none | parent_student_links, student_learning_states |
| `/parent/children/*` | twin-summary | get_parent_child_progress | none | parent_student_links, student_learning_states |

## Deviations from the planning skeleton (PDF §19/§33)

- Sub-pages with equal capability sets collapse under one star pattern
  (`/admin/outcomes/*` covers list / new / :id / edit; longest-match precedence keeps future
  per-sub-page overrides possible without registry churn).
- Draft/proposal tools (`draft_ilo`, `draft_plo`, `propose_*`, `draft_cqi_action`, …) are NOT in
  this matrix — Wave D ships read-tool context-building only; draft surfaces arrive with the D3
  approval inbox and are still approval-gated per row ceiling.
- Coordinator analytics/accreditation pages and the accreditation-report pages keep no dedicated
  rows yet; they inherit nothing (fail-closed) until a later wave inventories them explicitly.
- Verified-link privacy for Parent rows is enforced by RLS (`parent_student_links`) — the matrix
  only re-expresses what the backend already guarantees.

## Mounting order & governance

D4 mounts assistant panels Student → Teacher → Admin per frontend-plan.md §Mounting order;
coordinator/parent rows ship dormant (resolver returns them but no panel mounts) until later waves.
Runtime impact of task 3.2 itself: NONE (pure frontend + docs; no migrations, no Edge Functions).

### Sync rule

Any change to `PAGE_CAPABILITY_ROWS` must update this document in the same PR; any change here that
adds/removes a pattern must update the registry or `pageCapabilityRegistry.test.ts` fails CI.
