/**
 * v2 — Learner signal taxonomy. Framework-aware typed signals that
 * replace the generic "low_mastery" approach. Each signal carries
 * framework context, evidence references, confidence, and expiry.
 */
import type { AssessmentModel } from "../contracts.ts";

export type LearnerSignalType =
  | "low_attainment"
  | "declining_attainment"
  | "criterion_gap"
  | "assessment_objective_gap"
  | "persistent_submission_delay"
  | "attendance_pattern"
  | "self_management_pattern"
  | "research_pattern"
  | "reflection_pattern"
  | "communication_pattern"
  | "repeated_reassessment_failure";

export type SignalSeverity = "low" | "medium" | "high";

export interface LearnerSignal {
  readonly signalType: LearnerSignalType;
  readonly severity: SignalSeverity;
  readonly confidence: number;
  readonly frameworkId?: string;
  readonly assessmentModel?: AssessmentModel;
  readonly dimension?: string;
  readonly evidenceRefs: readonly string[];
  readonly observedFrom: string;
  readonly observedTo: string;
  readonly sampleSize: number;
  readonly value?: number;
  readonly threshold?: number;
  readonly trend?: "improving" | "stable" | "declining";
  readonly expiresAt?: string;
}

export interface BehaviorPattern {
  readonly patternType: string;
  readonly dimension: string;
  readonly frameworkDimension?: string;
  readonly observationWindow: { from: string; to: string };
  readonly sampleSize: number;
  readonly confidence: number;
  readonly habitRefs: readonly string[];
  readonly attainmentRefs: readonly string[];
  readonly summary: string;
}
