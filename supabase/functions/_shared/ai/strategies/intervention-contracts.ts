/**
 * v2 — Intervention & measurement closed-loop contracts.
 * Turns signals into proposals, proposals into executed interventions,
 * and interventions into measured results. Framework-aware throughout.
 */
import type { AssessmentModel } from "../contracts.ts";

export type InterventionStatus =
  | "proposed"
  | "approved"
  | "executed"
  | "reassessed"
  | "measured"
  | "closed";

export type MeasurementResult =
  | "improved"
  | "no_material_change"
  | "declined"
  | "inconclusive"
  | "insufficient_evidence";

export interface InterventionProposal {
  id: string;
  studentId: string;
  courseId: string;
  institutionId: string;
  signalType: string;
  assessmentModel: AssessmentModel;
  dimension?: string;
  proposedAction: string;
  reason: string;
  evidenceRefs: readonly string[];
  confidence: number;
  status: InterventionStatus;
  proposedBy: string;
  proposedAt: string;
  approvedBy?: string;
  approvedAt?: string;
}

export interface MeasurementRecord {
  interventionId: string;
  framework?: string;
  assessmentModel: AssessmentModel;
  dimension?: string;
  beforeValue: number;
  afterValue: number;
  beforeEvidenceRefs: readonly string[];
  afterEvidenceRefs: readonly string[];
  sampleSize: number;
  methodologyVersion: string;
  result: MeasurementResult;
  measuredAt: string;
}

/**
 * Determines measurement result using the minimum-improvement threshold.
 * Framework-agnostic: works for criterion levels, AO percentages, and
 * attainment percentages alike.
 */
export const evaluateMeasurement = (
  before: number,
  after: number,
  minImprovement: number,
  sampleSize: number
): MeasurementResult => {
  if (sampleSize < 1) return "insufficient_evidence";
  const delta = after - before;
  if (delta >= minImprovement) return "improved";
  if (delta <= -minImprovement) return "declined";
  if (Math.abs(delta) < minImprovement * 0.5) return "no_material_change";
  return "inconclusive";
};
