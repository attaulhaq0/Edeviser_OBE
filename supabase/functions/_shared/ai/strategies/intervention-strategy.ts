/**
 * v2 — Intervention & measurement strategy layer.
 * Framework-aware: IB criterion intervention ≠ IGCSE AO intervention ≠ QNSA outcome intervention.
 * Shared engine + framework-specific policy = no hardcoded conditionals.
 */
import type { AssessmentModel } from "../contracts.ts";
import type { LearnerSignal } from "./learner-signals.ts";

export type InterventionActionType =
  | "criterion_targeted_remediation"
  | "ao_targeted_practice"
  | "outcome_improvement_action"
  | "behavioral_support"
  | "reassessment"
  | "peer_tutoring"
  | "teacher_conference";

export type MeasurementResult =
  | "improved"
  | "no_material_change"
  | "declined"
  | "inconclusive"
  | "insufficient_evidence";

export interface InterventionPolicy {
  readonly signalType: string;
  readonly assessmentModel: AssessmentModel;
  readonly recommendedActions: readonly InterventionActionType[];
  readonly reassessmentRequired: boolean;
  readonly measurementDimension: string;
}

export interface MeasurementInput {
  readonly beforeValue: number;
  readonly afterValue: number;
  readonly sampleSize: number;
  readonly minImprovement: number;
}

const POLICIES: ReadonlyArray<InterventionPolicy> = [
  {
    signalType: "criterion_gap",
    assessmentModel: "criterion",
    recommendedActions: ["criterion_targeted_remediation", "reassessment"],
    reassessmentRequired: true,
    measurementDimension: "criterion_level",
  },
  {
    signalType: "assessment_objective_gap",
    assessmentModel: "band_grade",
    recommendedActions: ["ao_targeted_practice", "reassessment"],
    reassessmentRequired: true,
    measurementDimension: "assessment_objective",
  },
  {
    signalType: "low_attainment",
    assessmentModel: "percent",
    recommendedActions: ["outcome_improvement_action", "teacher_conference"],
    reassessmentRequired: false,
    measurementDimension: "attainment_percent",
  },
  {
    signalType: "persistent_submission_delay",
    assessmentModel: "percent",
    recommendedActions: ["behavioral_support", "teacher_conference"],
    reassessmentRequired: false,
    measurementDimension: "submission_timeliness",
  },
];

export const selectInterventionPolicy = (
  signal: LearnerSignal
): InterventionPolicy | undefined =>
  POLICIES.find(
    (p) =>
      p.signalType === signal.signalType &&
      p.assessmentModel === (signal.assessmentModel ?? "percent")
  );

export const evaluateMeasurement = (
  input: MeasurementInput
): MeasurementResult => {
  if (input.sampleSize < 1) return "insufficient_evidence";
  const delta = input.afterValue - input.beforeValue;
  if (delta >= input.minImprovement) return "improved";
  if (delta <= -input.minImprovement) return "declined";
  if (Math.abs(delta) < input.minImprovement * 0.5) return "no_material_change";
  return "inconclusive";
};
