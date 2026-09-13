// =============================================================================
// aiFeatureFlags.ts — Phase 18: Granular AI feature flag registry
// Replaces single global VITE_AI_FEATURE_ENABLED with per-capability gates
// Each capability can be independently enabled/disabled per environment
// =============================================================================

import type { AIEnvironment } from "./aiCostPolicy";

export type AICapability =
  | "student_tutor" // AI Tutor (RAG chat with course materials)
  | "teacher_copilot" // Teacher feedback/intervention drafts
  | "coordinator_insights" // Coordinator CQI/pattern analysis
  | "parent_summaries" // Parent child progress summaries
  | "agentic_recommendations" // Agent-proposed interventions/goals
  | "quiz_generation" // AI-generated quiz questions
  | "feedback_drafting" // AI-drafted assignment feedback
  | "curriculum_suggestion" // AI-suggested CLOs from syllabus paste
  | "habit_analysis" // AI-powered habit pattern analysis
  | "risk_detection" // AI-driven at-risk student detection
  | "shadow_evaluation"; // AI shadow evaluation (log-only, no user impact)

/** Per-environment capability enablement */
const CAPABILITY_GATES: Record<AIEnvironment, Set<AICapability>> = {
  AI_DISABLED: new Set(),
  AI_SHADOW: new Set(["shadow_evaluation"]),
  AI_ENABLED_QA: new Set([
    "student_tutor",
    "teacher_copilot",
    "coordinator_insights",
    "parent_summaries",
    "agentic_recommendations",
    "quiz_generation",
    "feedback_drafting",
    "curriculum_suggestion",
    "habit_analysis",
    "risk_detection",
  ]),
  AI_ENABLED_PILOT: new Set([
    "student_tutor",
    "teacher_copilot",
    "coordinator_insights",
    "parent_summaries",
    "agentic_recommendations",
    "quiz_generation",
    "feedback_drafting",
    "curriculum_suggestion",
    "habit_analysis",
    "risk_detection",
  ]),
};

/** Check if a specific AI capability is enabled */
export function isCapabilityEnabled(capability: AICapability): boolean {
  const env =
    (import.meta.env.VITE_AI_ENVIRONMENT as AIEnvironment) ?? "AI_DISABLED";
  return CAPABILITY_GATES[env]?.has(capability) ?? false;
}

/** Check if any agentic capability is enabled */
export function isAnyAgenticEnabled(): boolean {
  return (
    isCapabilityEnabled("agentic_recommendations") ||
    isCapabilityEnabled("student_tutor") ||
    isCapabilityEnabled("teacher_copilot")
  );
}

/** Get all enabled capabilities for the current environment */
export function getEnabledCapabilities(): AICapability[] {
  const env =
    (import.meta.env.VITE_AI_ENVIRONMENT as AIEnvironment) ?? "AI_DISABLED";
  return Array.from(CAPABILITY_GATES[env] ?? new Set());
}

/** Get the human-readable label for a capability */
export function capabilityLabel(capability: AICapability): string {
  const labels: Record<AICapability, string> = {
    student_tutor: "AI Tutor",
    teacher_copilot: "Teacher Copilot",
    coordinator_insights: "Coordinator Insights",
    parent_summaries: "Parent Summaries",
    agentic_recommendations: "Agentic Recommendations",
    quiz_generation: "Quiz Generation",
    feedback_drafting: "Feedback Drafting",
    curriculum_suggestion: "Curriculum Suggestions",
    habit_analysis: "Habit Analysis",
    risk_detection: "Risk Detection",
    shadow_evaluation: "Shadow Evaluation",
  };
  return labels[capability] ?? capability;
}
