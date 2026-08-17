import type { EvidenceReference } from "./contracts.ts";

export type EvaluatorRecommendation = "continue" | "change" | "stop" | "review";

export interface EvaluatorAssessment {
  beforeEvidence: readonly EvidenceReference[];
  actionEvidence: readonly EvidenceReference[];
  afterEvidence: readonly EvidenceReference[];
  effectExplanation: string;
  recommendation: EvaluatorRecommendation;
  nextInterventionDraft?: string;
}

export const EVALUATOR_OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    beforeEvidence: { type: "array", maxItems: 20 },
    actionEvidence: { type: "array", maxItems: 20 },
    afterEvidence: { type: "array", maxItems: 20 },
    effectExplanation: { type: "string", maxLength: 4000 },
    recommendation: { type: "string", enum: ["continue", "change", "stop", "review"] },
    nextInterventionDraft: { type: "string", maxLength: 4000 },
  },
  required: ["beforeEvidence", "actionEvidence", "afterEvidence", "effectExplanation", "recommendation"],
} as const;

const RECOMMENDATIONS: readonly EvaluatorRecommendation[] = ["continue", "change", "stop", "review"];

const evidence = (value: unknown): EvidenceReference[] | null => {
  if (!Array.isArray(value) || value.length > 20) return null;
  const parsed: EvidenceReference[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return null;
    const row = item as Record<string, unknown>;
    if (
      !["record", "outcome", "material", "signal", "calculation"].includes(String(row.kind)) ||
      typeof row.id !== "string" || row.id.length === 0 || row.id.length > 200
    ) return null;
    parsed.push({
      kind: row.kind as EvidenceReference["kind"],
      id: row.id,
      ...(typeof row.label === "string" ? { label: row.label.slice(0, 200) } : {}),
      ...(typeof row.observedAt === "string" ? { observedAt: row.observedAt } : {}),
    });
  }
  return parsed;
};

export const parseEvaluatorAssessment = (content: string): EvaluatorAssessment | null => {
  let value: unknown;
  try {
    value = JSON.parse(content);
  } catch {
    return null;
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const allowedKeys = new Set([
    "beforeEvidence",
    "actionEvidence",
    "afterEvidence",
    "effectExplanation",
    "recommendation",
    "nextInterventionDraft",
  ]);
  if (Object.keys(row).some((key) => !allowedKeys.has(key))) return null;
  const beforeEvidence = evidence(row.beforeEvidence);
  const actionEvidence = evidence(row.actionEvidence);
  const afterEvidence = evidence(row.afterEvidence);
  if (
    !beforeEvidence || !actionEvidence || !afterEvidence ||
    typeof row.effectExplanation !== "string" ||
    row.effectExplanation.trim().length === 0 || row.effectExplanation.length > 4000 ||
    !RECOMMENDATIONS.includes(row.recommendation as EvaluatorRecommendation)
  ) return null;
  return {
    beforeEvidence,
    actionEvidence,
    afterEvidence,
    effectExplanation: row.effectExplanation.trim(),
    recommendation: row.recommendation as EvaluatorRecommendation,
    ...(typeof row.nextInterventionDraft === "string"
      ? { nextInterventionDraft: row.nextInterventionDraft.slice(0, 4000) }
      : {}),
  };
};
