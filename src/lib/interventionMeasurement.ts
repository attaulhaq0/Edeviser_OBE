export const INTERVENTION_EVALUATION_STATES = [
  "PENDING",
  "IMPROVED",
  "NO_MATERIAL_CHANGE",
  "DECLINED",
  "INSUFFICIENT_EVIDENCE",
] as const;

export type InterventionEvaluationState =
  (typeof INTERVENTION_EVALUATION_STATES)[number];

export interface DeterministicMeasurement {
  baselineMetric: number;
  postActionMetric: number | null;
  evidenceCount: number;
}

export interface MeasurementResult {
  delta: number | null;
  evidenceSufficiency: "pending" | "sufficient" | "insufficient";
  evaluationState: InterventionEvaluationState;
}

export const evaluateInterventionMeasurement = (
  input: DeterministicMeasurement
): MeasurementResult => {
  if (input.postActionMetric === null) {
    return {
      delta: null,
      evidenceSufficiency: input.evidenceCount > 0 ? "pending" : "insufficient",
      evaluationState:
        input.evidenceCount > 0 ? "PENDING" : "INSUFFICIENT_EVIDENCE",
    };
  }
  if (input.evidenceCount < 1) {
    return {
      delta: null,
      evidenceSufficiency: "insufficient",
      evaluationState: "INSUFFICIENT_EVIDENCE",
    };
  }
  const delta =
    Math.round((input.postActionMetric - input.baselineMetric) * 100) / 100;
  return {
    delta,
    evidenceSufficiency: "sufficient",
    evaluationState:
      delta >= 5 ? "IMPROVED" : delta <= -5 ? "DECLINED" : "NO_MATERIAL_CHANGE",
  };
};
