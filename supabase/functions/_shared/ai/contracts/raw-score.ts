/**
 * v2 — Accreditation-native raw score contracts.
 *
 * Each assessment_model has a validated raw_score shape. The canonical
 * score_percent (0-100) is computed from raw_score by model-specific
 * normalization; raw_score preserves the original educational semantics
 * (criterion levels, band grades, component weights) for reporting,
 * moderation, and accreditation evidence.
 *
 * All contracts are pure TypeScript types — runtime validation occurs
 * in the assessment UI (React Hook Form + Zod) and the Edge Function
 * payload schema.
 */

// ─── Percent ─────────────────────────────────────────────────────────────────

export interface PercentRawScore {
  model: "percent";
  /** The direct percentage (0-100). Redundant with score_percent but preserved for provenance. */
  percentage: number;
}

// ─── Criterion (IB MYP) ──────────────────────────────────────────────────────

export interface CriterionBand {
  /** Criterion identifier (A, B, C, D per MYP subject group). */
  criterion: string;
  /** Achieved level (0-8 for MYP). */
  level: number;
  /** Maximum possible level for this criterion. */
  maxLevel: number;
}

export interface CriterionRawScore {
  model: "criterion";
  /** Per-criterion scores. */
  criteria: readonly CriterionBand[];
  /** Total across all criteria (e.g. /32 for MYP). */
  totalRaw: number;
  /** Maximum possible total. */
  totalMax: number;
  /** Boundary table version used for conversion (e.g. "MYP-2025"). */
  boundaryVersion?: string;
}

// ─── Band Grade (IGCSE / British) ────────────────────────────────────────────

export interface AssessmentObjectiveBand {
  /** Assessment Objective (AO1, AO2, AO3). */
  objective: string;
  /** Raw marks achieved. */
  marks: number;
  /** Maximum marks possible. */
  maxMarks: number;
  /** Weight for this AO (0-1). */
  weight: number;
}

export interface BandGradeRawScore {
  model: "band_grade";
  /** Per-AO breakdown. */
  objectives: readonly AssessmentObjectiveBand[];
  /** Overall band grade (e.g. "B", "6"). */
  band?: string;
  /** Syllabus code (e.g. "0580"). */
  syllabusCode?: string;
}

// ─── Component (MoEHE / multi-part) ──────────────────────────────────────────

export interface ComponentScore {
  /** Component identifier (e.g. "coursework", "exam", "practical"). */
  componentId: string;
  /** Score achieved (0-100). */
  score: number;
  /** Weight for this component (0-1). */
  weight: number;
}

export interface ComponentRawScore {
  model: "component";
  /** Per-component breakdown. */
  components: readonly ComponentScore[];
}

// ─── Union type ──────────────────────────────────────────────────────────────

export type RawScore =
  | PercentRawScore
  | CriterionRawScore
  | BandGradeRawScore
  | ComponentRawScore;

/** Discriminated union guard: returns true for valid raw score shapes. */
export const isValidRawScore = (value: unknown): value is RawScore => {
  if (!value || typeof value !== "object") return false;
  const m = (value as Record<string, unknown>).model;
  switch (m) {
    case "percent":
      return typeof (value as PercentRawScore).percentage === "number";
    case "criterion":
      return Array.isArray((value as CriterionRawScore).criteria);
    case "band_grade":
      return Array.isArray((value as BandGradeRawScore).objectives);
    case "component":
      return Array.isArray((value as ComponentRawScore).components);
    default:
      return false;
  }
};
