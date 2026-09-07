// =============================================================================
// problemCaseActions — 8.9 decision-intelligence: deterministic intervention
// draft planning (decision questions Q4 + Q5 + Q7).
// =============================================================================
// Pure business logic (no React, no Supabase, no AI). Given a classified
// problem case from `classify_problem_cases_v1`, produces the plan for a
// cited intervention draft:
//   - the recommended owner comes from the engine's routing (Q5);
//   - suggested actions are stable i18n keys keyed by the dominant cause;
//   - citations are the case's OWN evidence array, unchanged (Q4 guarantee:
//     citations ⊆ the authorized evidence set — never recomputed, never
//     invented);
//   - a curriculum-change recommendation (Q7) is flagged only for the
//     curriculum-design-signal cause, tying the case to the CQI path.
// The draft is a PLAN only: creating an official `learning_interventions`
// record is an official-record mutation and stays approval-gated through the
// agent proposal flow (see AGENTS.md intelligence guardrails).
// =============================================================================

/** Ownership routing targets — mirrors the SQL engine's deterministic mapping. */
export type RecommendedOwner = "teacher" | "coordinator" | "student_support";

export const OWNER_BY_CAUSE: Readonly<Record<string, RecommendedOwner>> = {
  "student-signal": "student_support",
  "teacher-signal": "coordinator",
  "assessment-signal": "teacher",
  "prerequisite-signal": "teacher",
  "curriculum-design-signal": "coordinator",
};

/** The five canonical problem classes (Q8 taxonomy). */
export const KNOWN_CAUSES = [
  "student-signal",
  "teacher-signal",
  "assessment-signal",
  "prerequisite-signal",
  "curriculum-design-signal",
] as const;

export type KnownCause = (typeof KNOWN_CAUSES)[number];

/** Stable i18n action keys per dominant cause. */
const ACTIONS_BY_CAUSE: Readonly<Record<KnownCause, readonly string[]>> = {
  "student-signal": [
    "review_struggling_students",
    "schedule_targeted_support",
    "notify_owner",
  ],
  "teacher-signal": [
    "compare_section_practice",
    "observe_high_variance_sections",
    "align_teaching_plan",
  ],
  "assessment-signal": [
    "author_coverage_guarded_assessment",
    "link_clo_to_assessment",
  ],
  "prerequisite-signal": ["remediate_sub_clos", "sequence_prerequisite_review"],
  "curriculum-design-signal": ["open_cqi_pattern", "review_curriculum_design"],
};

export interface ProblemCaseInput {
  clo_id: string;
  clo_title: string;
  dominant_cause: string;
  /** The authorized evidence set produced by the classification engine. */
  evidence: ReadonlyArray<Record<string, unknown>>;
}

export interface InterventionDraftPlan {
  clo_id: string;
  clo_title: string;
  dominant_cause: string;
  recommended_owner: RecommendedOwner;
  /** i18n key for the draft headline (stable identifier, not prose). */
  headline_key: string;
  /** i18n action keys — stable identifiers rendered through translations. */
  action_keys: readonly string[];
  /** The case's own evidence array — citations ⊆ authorized evidence, always. */
  citations: ReadonlyArray<Record<string, unknown>>;
  /** Q7: whole-cohort failure routes to the CQI curriculum-change path. */
  curriculum_change_recommended: boolean;
  /** Q4: the write is ALWAYS approval-gated. Type-level true. */
  approval_required: true;
}

export const isKnownCause = (cause: string): cause is KnownCause =>
  (KNOWN_CAUSES as readonly string[]).includes(cause);

export const ownerForCause = (cause: string): RecommendedOwner =>
  OWNER_BY_CAUSE[cause] ?? "teacher";

/**
 * Deterministic draft plan for a classified problem case.
 * Same input → same output (no randomness, no clock, no IO).
 */
export function buildInterventionDraftPlan(
  problemCase: ProblemCaseInput
): InterventionDraftPlan {
  const cause = problemCase.dominant_cause;
  return {
    clo_id: problemCase.clo_id,
    clo_title: problemCase.clo_title,
    dominant_cause: cause,
    recommended_owner: ownerForCause(cause),
    headline_key: isKnownCause(cause)
      ? `unitClose.draft.headline.${cause}`
      : "unitClose.draft.headline.generic",
    action_keys: isKnownCause(cause)
      ? ACTIONS_BY_CAUSE[cause]
      : ["review_struggling_students", "notify_owner"],
    citations: problemCase.evidence,
    curriculum_change_recommended: cause === "curriculum-design-signal",
    approval_required: true,
  };
}
