/** Typed, fail-closed CQI draft boundary for the shared orchestrator. */
export interface CqiCoordinatorDraft {
  problemStatement: string;
  outcomeContext: string;
  baseline: number;
  target: number;
  proposedImprovement: string;
  rationale: string;
  responsibleOwner: string;
  measurementPlan: string;
  measurementWindow: string;
  successCriterion: string;
  citations: readonly string[];
}

const text = (value: unknown, maximum: number): string | null =>
  typeof value === "string" &&
  value.trim().length > 0 &&
  value.length <= maximum
    ? value.trim()
    : null;

const percentage = (value: unknown): number | null =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  value >= 0 &&
  value <= 100
    ? value
    : null;

const citationIds = (value: unknown): string[] | null => {
  if (!Array.isArray(value) || value.length === 0 || value.length > 100)
    return null;
  const ids = value.every(
    (entry) =>
      typeof entry === "string" && entry.length > 0 && entry.length <= 200
  )
    ? [...new Set(value as string[])]
    : null;
  return ids;
};

/** Rejects malformed output, extra fields, and citations absent from the evidence packet. */
export const parseAuthorizedCqiCoordinatorDraft = (
  content: string,
  authorizedEvidenceIds: ReadonlySet<string>
): CqiCoordinatorDraft | null => {
  let value: unknown;
  try {
    value = JSON.parse(content);
  } catch {
    return null;
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const keys = [
    "problemStatement",
    "outcomeContext",
    "baseline",
    "target",
    "proposedImprovement",
    "rationale",
    "responsibleOwner",
    "measurementPlan",
    "measurementWindow",
    "successCriterion",
    "citations",
  ];
  if (Object.keys(row).some((key) => !keys.includes(key))) return null;
  const baseline = percentage(row.baseline);
  const target = percentage(row.target);
  const citations = citationIds(row.citations);
  if (
    baseline === null ||
    target === null ||
    target < baseline ||
    !citations ||
    citations.some((id) => !authorizedEvidenceIds.has(id))
  )
    return null;
  const parsed = {
    problemStatement: text(row.problemStatement, 4000),
    outcomeContext: text(row.outcomeContext, 2000),
    proposedImprovement: text(row.proposedImprovement, 4000),
    rationale: text(row.rationale, 4000),
    responsibleOwner: text(row.responsibleOwner, 500),
    measurementPlan: text(row.measurementPlan, 4000),
    measurementWindow: text(row.measurementWindow, 500),
    successCriterion: text(row.successCriterion, 2000),
  };
  if (Object.values(parsed).some((entry) => entry === null)) return null;
  return { ...parsed, baseline, target, citations } as CqiCoordinatorDraft;
};
