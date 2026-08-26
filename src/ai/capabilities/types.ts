// Feature: Page Capability Matrix (tasks.md 3.2).
// Types for the route → assistant-capability registry consumed by the
// EdeviserAssistantPanel shell (frontend-plan.md).
//
// Fail-closed contract: resolvePageCapabilities() returns null for any route
// without an explicit registry match — pages get NO assistant surface unless
// a row grants it. This mirrors the backend autonomy engine's strict-minimum,
// server-side-only posture.

/** Backend tool names mirrored from supabase/functions/_shared/ai/tools/registry.ts. */
export type ToolName =
  | "get_student_learning_context"
  | "get_course_mastery"
  | "get_outcome_chain"
  | "get_habit_context"
  | "get_at_risk_signals"
  | "search_course_materials"
  | "get_teacher_course_context"
  | "get_assignment_context"
  | "get_intervention_effects"
  | "get_coordinator_outcome_context"
  | "get_admin_institution_context"
  | "get_institution_ilos"
  | "get_ilo_detail"
  | "get_ilo_attainment"
  | "get_ilo_attainment_trend"
  | "get_ilo_mapping_coverage"
  | "get_ilo_program_contributions"
  | "get_ilo_evidence_summary"
  | "get_unmapped_program_outcomes"
  | "get_outcome_hierarchy_health"
  | "get_parent_child_progress";

/** Surfaces the assistant shell may render on a page. */
export type AssistantSurface =
  | "conversation"
  | "suggestions"
  | "insight-cards"
  | "approval-inbox"
  | "twin-summary"
  | "alignment-summary";

export interface PageCapabilityRow {
  /** Role-rooted path pattern. `:param` = one segment, trailing `*` = any remainder. */
  readonly pathPattern: string;
  /** Which roles may receive assistant surfaces on this route. */
  readonly roles: readonly ("student" | "teacher" | "coordinator" | "admin" | "parent")[];
  /** Assistant surfaces permitted on this route (fail-closed: absent = not rendered). */
  readonly surfaces: readonly AssistantSurface[];
  /** Read tools permitted for orchestrator context-building on this route. */
  readonly tools: readonly ToolName[];
  /** Approval ceiling for proposals arising from this page context. */
  readonly approvalCeiling: "none" | "actor" | "teacher" | "coordinator" | "admin";
  /** Entity/table tags feeding evidence sourcing for citations. */
  readonly evidenceSources: readonly string[];
}