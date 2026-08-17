import { z } from "zod";

export const CQI_PATTERN_TRIGGER_VERSION =
  "cqi/systemic-outcome-gap/v1.0.0" as const;

export const CQI_MEASUREMENT_STATES = [
  "PENDING",
  "IMPROVED",
  "NO_MATERIAL_CHANGE",
  "DECLINED",
  "INSUFFICIENT_EVIDENCE",
] as const;

export type CqiMeasurementState = (typeof CQI_MEASUREMENT_STATES)[number];
export type CqiOutcomeType = "CLO" | "PLO" | "ILO";

export interface OutcomeEvidencePoint {
  evidenceId: string;
  studentId: string;
  observedAt: string;
  attainment: number;
}

export interface OutcomeScope {
  institutionId: string;
  programId: string;
  courseId?: string;
  outcomeId: string;
  outcomeType: CqiOutcomeType;
  windowStart: string;
  windowEnd: string;
}

export interface SystemicPatternConfig {
  minimumSampleSize: number;
  minimumAffectedStudents: number;
  attainmentThreshold: number;
  severityGap: { moderate: number; high: number };
  /** An official, deterministic comparison point when one is available. */
  baselineAttainment?: number;
}

export interface SystemicPattern extends OutcomeScope {
  key: "systemic_outcome_attainment_gap";
  triggerVersion: typeof CQI_PATTERN_TRIGGER_VERSION;
  identity: string;
  baseline: number;
  currentValue: number;
  targetThreshold: number;
  sampleSize: number;
  affectedPopulation: number;
  severity: "moderate" | "high";
  evidenceReferences: string[];
  occurrenceVersion: string;
}

const rounded = (value: number): number => Math.round(value * 100) / 100;

const patternIdentity = (scope: OutcomeScope): string =>
  [
    CQI_PATTERN_TRIGGER_VERSION,
    scope.institutionId,
    scope.programId,
    scope.courseId ?? "program",
    scope.outcomeType,
    scope.outcomeId,
  ].join(":");

const isValidTimestamp = (value: string): boolean =>
  !Number.isNaN(Date.parse(value));

const inWindow = (value: string, start: string, end: string): boolean => {
  const observed = Date.parse(value);
  return (
    Number.isFinite(observed) &&
    observed >= Date.parse(start) &&
    observed <= Date.parse(end)
  );
};

const occurrenceVersion = (
  scope: OutcomeScope,
  evidenceReferences: readonly string[],
  currentValue: number
): string =>
  [
    CQI_PATTERN_TRIGGER_VERSION,
    scope.windowStart,
    scope.windowEnd,
    currentValue.toFixed(2),
    ...evidenceReferences,
  ].join(":");

/**
 * Produces an official pattern only from supplied, deterministic evidence.
 * One learner can never create an institutional CQI pattern on its own.
 */
export const detectSystemicOutcomePattern = (
  scope: OutcomeScope,
  evidence: readonly OutcomeEvidencePoint[],
  config: SystemicPatternConfig
): SystemicPattern | null => {
  if (
    config.minimumSampleSize < 2 ||
    config.minimumAffectedStudents < 2 ||
    config.minimumAffectedStudents > config.minimumSampleSize ||
    config.attainmentThreshold < 0 ||
    config.attainmentThreshold > 100 ||
    config.severityGap.moderate < 0 ||
    config.severityGap.high < config.severityGap.moderate ||
    !isValidTimestamp(scope.windowStart) ||
    !isValidTimestamp(scope.windowEnd) ||
    Date.parse(scope.windowStart) > Date.parse(scope.windowEnd) ||
    (config.baselineAttainment !== undefined &&
      (config.baselineAttainment < 0 || config.baselineAttainment > 100))
  ) {
    throw new Error("Invalid systemic CQI detection configuration");
  }

  const normalized = evidence.filter(
    (point) =>
      Number.isFinite(point.attainment) &&
      point.attainment >= 0 &&
      point.attainment <= 100 &&
      point.evidenceId.trim().length > 0 &&
      point.studentId.trim().length > 0 &&
      inWindow(point.observedAt, scope.windowStart, scope.windowEnd)
  );
  const students = new Set(normalized.map((point) => point.studentId));
  if (
    normalized.length < config.minimumSampleSize ||
    students.size < config.minimumAffectedStudents
  ) {
    return null;
  }

  const currentValue = rounded(
    normalized.reduce((sum, point) => sum + point.attainment, 0) /
      normalized.length
  );
  const affectedStudents = new Set(
    normalized
      .filter((point) => point.attainment < config.attainmentThreshold)
      .map((point) => point.studentId)
  );
  if (
    currentValue >= config.attainmentThreshold ||
    affectedStudents.size < config.minimumAffectedStudents
  ) {
    return null;
  }

  const gap = config.attainmentThreshold - currentValue;
  const evidenceReferences = [
    ...new Set(normalized.map((point) => point.evidenceId)),
  ].sort();
  return {
    ...scope,
    key: "systemic_outcome_attainment_gap",
    triggerVersion: CQI_PATTERN_TRIGGER_VERSION,
    identity: patternIdentity(scope),
    baseline: config.baselineAttainment ?? currentValue,
    currentValue,
    targetThreshold: config.attainmentThreshold,
    sampleSize: normalized.length,
    affectedPopulation: affectedStudents.size,
    severity: gap >= config.severityGap.high ? "high" : "moderate",
    evidenceReferences,
    occurrenceVersion: occurrenceVersion(
      scope,
      evidenceReferences,
      currentValue
    ),
  };
};

export interface CqiProposalEligibility {
  patternIdentity: string;
  occurrenceVersion: string;
  now: string;
  cooldownUntil?: string | null;
  hasOpenPlan: boolean;
  hasExistingProposalForOccurrence: boolean;
}

/**
 * Keeps a repeated unchanged pattern from generating CQI proposals forever.
 * Persistence remains responsible for enforcing the same identity/version rule.
 */
export const mayCreateCqiProposal = (
  eligibility: CqiProposalEligibility
): boolean => {
  if (
    eligibility.patternIdentity.trim().length === 0 ||
    eligibility.occurrenceVersion.trim().length === 0 ||
    !isValidTimestamp(eligibility.now)
  ) {
    return false;
  }
  if (
    eligibility.cooldownUntil &&
    isValidTimestamp(eligibility.cooldownUntil) &&
    Date.parse(eligibility.cooldownUntil) > Date.parse(eligibility.now)
  ) {
    return false;
  }
  return (
    !eligibility.hasOpenPlan && !eligibility.hasExistingProposalForOccurrence
  );
};

export interface CqiMeasurementInput {
  baselineMetric: number;
  postActionMetric: number | null;
  evidenceCount: number;
  materialChange: number;
}

export interface CqiMeasurementResult {
  delta: number | null;
  state: CqiMeasurementState;
}

/** Official CQI effect: numbers are deterministic; AI may only explain it. */
export const measureCqiEffect = (
  input: CqiMeasurementInput
): CqiMeasurementResult => {
  if (input.evidenceCount < 1)
    return { delta: null, state: "INSUFFICIENT_EVIDENCE" };
  if (input.postActionMetric === null) return { delta: null, state: "PENDING" };
  const delta = rounded(input.postActionMetric - input.baselineMetric);
  if (delta >= input.materialChange) return { delta, state: "IMPROVED" };
  if (delta <= -input.materialChange) return { delta, state: "DECLINED" };
  return { delta, state: "NO_MATERIAL_CHANGE" };
};

const cqiDraftSchema = z
  .object({
    problemStatement: z.string().trim().min(1).max(4000),
    outcomeContext: z.string().trim().min(1).max(2000),
    baseline: z.number().finite().min(0).max(100),
    target: z.number().finite().min(0).max(100),
    proposedImprovement: z.string().trim().min(1).max(4000),
    rationale: z.string().trim().min(1).max(4000),
    responsibleOwner: z.string().trim().min(1).max(500),
    measurementPlan: z.string().trim().min(1).max(4000),
    measurementWindow: z.string().trim().min(1).max(500),
    successCriterion: z.string().trim().min(1).max(2000),
    citations: z.array(z.string().min(1)).min(1).max(100),
  })
  .strict();

export type AuthorizedCqiDraft = z.infer<typeof cqiDraftSchema>;

/** Fails closed when a model cites anything outside the evidence packet. */
export const parseAuthorizedCqiDraft = (
  raw: unknown,
  authorizedEvidenceIds: readonly string[]
): AuthorizedCqiDraft | null => {
  const parsed = cqiDraftSchema.safeParse(raw);
  if (!parsed.success) return null;
  if (parsed.data.target < parsed.data.baseline) return null;
  const authorized = new Set(authorizedEvidenceIds);
  if (parsed.data.citations.some((citation) => !authorized.has(citation))) {
    return null;
  }
  return parsed.data;
};
