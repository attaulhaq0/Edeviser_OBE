// Feature: Page Capability Matrix (tasks.md 3.2).
// Route → assistant-capability registry. Single source of truth for what the
// EdeviserAssistantPanel may render per route. Kept in lockstep with
// .kiro/specs/edeviser-agentic-intelligence/page-capability-matrix.md —
// pageCapabilityRegistry.test.ts fails if doc and registry drift apart.

import type { PageCapabilityRow, ToolName } from "@/ai/capabilities/types";

const STUDENT_CORE: readonly ToolName[] = [
  "get_student_learning_context",
  "get_course_mastery",
  "get_outcome_chain",
  "get_habit_context",
];
const ADMIN_ILO: readonly ToolName[] = [
  "get_admin_institution_context",
  "get_institution_ilos",
  "get_ilo_detail",
  "get_ilo_attainment",
  "get_ilo_attainment_trend",
  "get_ilo_mapping_coverage",
  "get_ilo_program_contributions",
  "get_ilo_evidence_summary",
  "get_unmapped_program_outcomes",
  "get_outcome_hierarchy_health",
];

/**
 * All capability rows. Longest-pattern match wins (resolvePageCapabilities).
 * Fail-closed: routes without a row get no assistant surface.
 */
export const PAGE_CAPABILITY_ROWS: readonly PageCapabilityRow[] = [
  // ---- Student -----------------------------------------------------------------
  {
    pathPattern: "/student",
    roles: ["student"],
    surfaces: ["twin-summary", "alignment-summary", "suggestions"],
    tools: [...STUDENT_CORE],
    approvalCeiling: "none",
    evidenceSources: ["student_learning_states", "outcome_mappings"],
  },
  {
    pathPattern: "/student/courses/:courseId",
    roles: ["student"],
    surfaces: ["twin-summary", "alignment-summary", "conversation"],
    tools: [...STUDENT_CORE, "search_course_materials"],
    approvalCeiling: "none",
    evidenceSources: ["student_learning_states", "submissions", "course_material_embeddings"],
  },
  {
    pathPattern: "/student/courses/:courseId/assignments/:assignmentId",
    roles: ["student"],
    surfaces: ["twin-summary", "conversation"],
    tools: [...STUDENT_CORE, "search_course_materials", "get_assignment_context"],
    approvalCeiling: "none",
    evidenceSources: ["student_learning_states", "submissions", "assignments"],
  },
  {
    pathPattern: "/student/tutor/*",
    roles: ["student"],
    surfaces: ["conversation", "suggestions"],
    tools: [...STUDENT_CORE, "search_course_materials"],
    approvalCeiling: "actor",
    evidenceSources: ["agent_messages", "rag_chunks", "submissions"],
  },

  // ---- Teacher -----------------------------------------------------------------
  {
    pathPattern: "/teacher/dashboard",
    roles: ["teacher"],
    surfaces: ["insight-cards", "approval-inbox"],
    tools: ["get_teacher_course_context", "get_at_risk_signals", "get_habit_context"],
    approvalCeiling: "teacher",
    evidenceSources: ["ai_feedback", "learning_interventions", "proactive_agent_jobs"],
  },
  {
    pathPattern: "/teacher/gradebook/*",
    roles: ["teacher"],
    surfaces: ["insight-cards", "conversation"],
    tools: [
      "get_teacher_course_context",
      "get_at_risk_signals",
      "get_assignment_context",
      "get_outcome_chain",
    ],
    approvalCeiling: "teacher",
    evidenceSources: ["grades", "submissions", "ai_feedback"],
  },
  {
    pathPattern: "/teacher/outcomes/*",
    roles: ["teacher"],
    surfaces: ["insight-cards", "conversation"],
    tools: ["get_teacher_course_context", "get_outcome_chain", "get_intervention_effects"],
    approvalCeiling: "teacher",
    evidenceSources: ["clos", "sub_clos", "outcome_mappings"],
  },
  {
    pathPattern: "/teacher/students/:studentId",
    roles: ["teacher"],
    surfaces: ["insight-cards", "suggestions", "conversation"],
    tools: [
      "get_teacher_course_context",
      "get_at_risk_signals",
      "get_habit_context",
      "get_student_learning_context",
      "get_intervention_effects",
    ],
    approvalCeiling: "teacher",
    evidenceSources: ["student_learning_states", "learning_interventions", "attendance"],
  },

  // ---- Coordinator ---------------------------------------------------------------
  {
    pathPattern: "/coordinator",
    roles: ["coordinator"],
    surfaces: ["insight-cards"],
    tools: [
      "get_coordinator_outcome_context",
      "get_ilo_mapping_coverage",
      "get_unmapped_program_outcomes",
      "get_ilo_program_contributions",
    ],
    approvalCeiling: "coordinator",
    evidenceSources: ["plos", "ilos", "outcome_mappings"],
  },
  {
    pathPattern: "/coordinator/plos/*",
    roles: ["coordinator"],
    surfaces: ["insight-cards", "conversation"],
    tools: [
      "get_coordinator_outcome_context",
      "get_outcome_chain",
      "get_unmapped_program_outcomes",
    ],
    approvalCeiling: "coordinator",
    evidenceSources: ["plos", "graduate_attributes", "outcome_mappings"],
  },
  {
    pathPattern: "/coordinator/cqi/*",
    roles: ["coordinator"],
    surfaces: ["insight-cards", "approval-inbox"],
    tools: ["get_coordinator_outcome_context", "get_ilo_mapping_coverage"],
    approvalCeiling: "coordinator",
    evidenceSources: ["cqi_actions", "agent_action_proposals"],
  },

  // ---- Admin ----------------------------------------------------------------------
  {
    pathPattern: "/admin",
    roles: ["admin"],
    surfaces: ["insight-cards", "approval-inbox"],
    tools: [...ADMIN_ILO],
    approvalCeiling: "admin",
    evidenceSources: ["institution_outcomes", "agent_action_proposals", "audit_logs"],
  },
  {
    pathPattern: "/admin/outcomes/*",
    roles: ["admin"],
    surfaces: ["insight-cards", "conversation", "approval-inbox"],
    tools: [...ADMIN_ILO],
    approvalCeiling: "admin",
    evidenceSources: ["ilos", "programs", "outcome_mappings"],
  },
  {
    pathPattern: "/admin/governance/*",
    roles: ["admin"],
    surfaces: ["approval-inbox", "insight-cards"],
    tools: [...ADMIN_ILO],
    approvalCeiling: "admin",
    evidenceSources: ["agent_action_proposals", "agent_runs", "tutor_llm_logs"],
  },

  // ---- Parent ----------------------------------------------------------------------
  {
    pathPattern: "/parent",
    roles: ["parent"],
    surfaces: ["twin-summary"],
    tools: ["get_parent_child_progress"],
    approvalCeiling: "none",
    evidenceSources: ["parent_student_links", "student_learning_states"],
  },
  {
    pathPattern: "/parent/children/*",
    roles: ["parent"],
    surfaces: ["twin-summary"],
    tools: ["get_parent_child_progress"],
    approvalCeiling: "none",
    evidenceSources: ["parent_student_links", "student_learning_states"],
  },
] as const;

export default PAGE_CAPABILITY_ROWS;