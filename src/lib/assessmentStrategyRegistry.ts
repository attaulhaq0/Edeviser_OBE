// =============================================================================
// Assessment Strategy Registry — Canonical Assessment Strategy Implementation
// Phase 15: Makes assessment_model runtime-real, not metadata-only
// =============================================================================
// Each strategy defines input schema, normalization, evidence payload, and
// reporting representation. Strategy is resolved from course.assessment_model.
// NEVER reduce all assessments to percentage and discard native semantics.
// =============================================================================

// ─── Assessment Models ────────────────────────────────────────────────────────

export const ASSESSMENT_MODELS = [
  "percent",
  "criterion",
  "band_grade",
  "component",
] as const;
export type AssessmentModel = (typeof ASSESSMENT_MODELS)[number];

// ─── Native Result Types ─────────────────────────────────────────────────────

/** Percent model: raw score + max possible */
export interface PercentNativeResult {
  kind: "percent";
  score: number;
  maxScore: number;
}

/** Criterion model: per-criterion level (IB MYP 0–8) */
export interface CriterionNativeResult {
  kind: "criterion";
  criteria: Array<{
    criterionId: string;
    criterionName: string;
    level: number; // 0–8 for IB MYP
    maxLevel: number;
  }>;
}

/** Band-grade model: raw mark + grade boundary reference (IGCSE 9–1 / A*–G) */
export interface BandGradeNativeResult {
  kind: "band_grade";
  rawMark: number;
  maxMark: number;
  componentCode?: string; // e.g. "Paper 1", "Paper 2"
  weightingPercent?: number;
}

/** Component/AO-weighted model: multiple assessment objectives */
export interface ComponentNativeResult {
  kind: "component";
  components: Array<{
    componentId: string;
    componentName: string;
    objectiveCode: string; // e.g. "AO1", "AO2"
    score: number;
    maxScore: number;
    weightPercent: number;
  }>;
}

export type NativeResult =
  | PercentNativeResult
  | CriterionNativeResult
  | BandGradeNativeResult
  | ComponentNativeResult;

// ─── Normalized Result (always produced) ─────────────────────────────────────

export interface NormalizedResult {
  /** Overall normalized percentage [0–100], derived from native result */
  overallPercent: number;
  /** Per-outcome normalized percentages (CLO-level) */
  outcomePercents: Array<{
    outcomeId: string;
    percent: number;
    nativeBreakdown?: Record<string, unknown>;
  }>;
  /** Full native result preserved alongside normalization */
  native: NativeResult;
}

// ─── Strategy Definition ─────────────────────────────────────────────────────

export interface AssessmentStrategy {
  /** Unique identifier matching courses.assessment_model */
  readonly model: AssessmentModel;
  /** Human-readable label */
  readonly label: string;

  /** Validate raw assessment input against the strategy's schema */
  validate(input: unknown): NativeResult;

  /** Normalize native result → percent for OBE evidence and attainment */
  normalize(native: NativeResult): NormalizedResult;

  /** Produce evidence payload for storage in evidence.raw_score */
  toEvidencePayload(native: NativeResult, normalized: NormalizedResult): Record<string, unknown>;

  /** Produce reporting representation (human-readable) */
  toReportingResult(native: NativeResult, normalized: NormalizedResult, gradeScale?: GradeScaleConfig): ReportingResult;
}

export interface GradeScaleConfig {
  letter: string;
  min_percent: number;
  max_percent: number;
  gpa_points: number;
}

export interface ReportingResult {
  displayGrade: string;
  displayPercent: number;
  nativeDescription: string;
  gpaPoints?: number;
}