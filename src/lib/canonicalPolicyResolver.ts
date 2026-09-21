// Pure assessment-policy helper; not an authoritative grading/write boundary.
// Explicit selections fail closed unless the caller supplies matching metadata.
// Curriculum/quality brands never select an assessment algorithm or boundaries.

import type {
  AssessmentModel,
  GradeScaleBand,
} from "./assessmentStrategyEngine";
import {
  DEFAULT_ATTAINMENT_THRESHOLDS,
  DEFAULT_GRADE_SCALES,
  type AttainmentThresholdsConfig,
} from "@/types/app";

// Historical illustrative scales retained for source compatibility only.
// These are NOT official IB/Cambridge boundaries and are never selected by
// resolvePolicy. Callers must supply an applicable versioned percent scale.
// Native-domain grading/reporting judgments need a separate reviewed contract.

export const IB_MYP_GRADE_SCALE: GradeScaleBand[] = [
  { letter: "7", min_percent: 88, max_percent: 100, gpa_points: 4.0 },
  { letter: "6", min_percent: 75, max_percent: 88, gpa_points: 3.7 },
  { letter: "5", min_percent: 63, max_percent: 75, gpa_points: 3.3 },
  { letter: "4", min_percent: 50, max_percent: 63, gpa_points: 3.0 },
  { letter: "3", min_percent: 38, max_percent: 50, gpa_points: 2.0 },
  { letter: "2", min_percent: 25, max_percent: 38, gpa_points: 1.0 },
  { letter: "1", min_percent: 0, max_percent: 25, gpa_points: 0.0 },
];

export const IGCSE_9_1_GRADE_SCALE: GradeScaleBand[] = [
  { letter: "9", min_percent: 90, max_percent: 100, gpa_points: 4.0 },
  { letter: "8", min_percent: 80, max_percent: 90, gpa_points: 4.0 },
  { letter: "7", min_percent: 70, max_percent: 80, gpa_points: 3.7 },
  { letter: "6", min_percent: 60, max_percent: 70, gpa_points: 3.3 },
  { letter: "5", min_percent: 50, max_percent: 60, gpa_points: 3.0 },
  { letter: "4", min_percent: 40, max_percent: 50, gpa_points: 2.0 },
  { letter: "3", min_percent: 30, max_percent: 40, gpa_points: 0.0 },
  { letter: "2", min_percent: 20, max_percent: 30, gpa_points: 0.0 },
  { letter: "1", min_percent: 0, max_percent: 20, gpa_points: 0.0 },
];

// ─── Policy Resolution ───────────────────────────────────────────────────────

export interface ResolvedPolicy {
  assessmentModel: AssessmentModel;
  gradeScale: GradeScaleBand[];
  gradeScaleId?: string;
  gradeScaleVersion?: string;
  /** Legacy scales lack identity/version and are not certified native policies. */
  gradeScaleSource: "selected" | "legacy_institution" | "legacy_default";
  attainmentThresholds: AttainmentThresholdsConfig;
  frameworkCode?: string;
  defaultLanguage?: string;
}

interface CourseConfig {
  assessmentModel?: string;
  gradeScaleId?: string;
  gradeScaleVersion?: string;
  frameworkCode?: string;
}

interface InstitutionConfig {
  grade_scales?: GradeScaleBand[];
  attainment_thresholds?: AttainmentThresholdsConfig;
  default_language?: string;
}

/**
 * Already authorized scale data; this helper performs no retrieval.
 * Supported here: positive-width continuous bands covering exactly 0-100,
 * with the higher-minimum band winning a shared endpoint. Partial/discrete
 * scales need a separately reviewed policy; no gaps are rounded or filled.
 */
export interface SelectedPercentGradeScale {
  id: string;
  version: string;
  domain: "percent";
  bands: readonly GradeScaleBand[];
}

const MODELS: readonly string[] = [
  "percent",
  "criterion",
  "band_grade",
  "component",
];

function validateBands(bands: readonly GradeScaleBand[]): void {
  if (bands.length === 0) throw new Error("Selected grade scale has no bands");
  const labels = new Set<string>();
  for (const band of bands) {
    if (
      !band.letter.trim() ||
      labels.has(band.letter) ||
      !Number.isFinite(band.min_percent) ||
      !Number.isFinite(band.max_percent) ||
      !Number.isFinite(band.gpa_points) ||
      band.min_percent < 0 ||
      band.max_percent > 100 ||
      band.min_percent >= band.max_percent
    ) {
      throw new Error("Invalid selected percent grade-scale band");
    }
    labels.add(band.letter);
  }
  const sorted = [...bands].sort((a, b) => a.min_percent - b.min_percent);
  let previous: GradeScaleBand | undefined;
  for (const band of sorted) {
    // This selected-scale helper supports a complete continuous percent domain
    // only. It does not infer rounding, step sizes, gap filling or extrapolation.
    // Positive widths make minima unique in a valid partition. At a shared
    // endpoint, the existing mapper selects the band with the higher minimum.
    if (!previous && band.min_percent !== 0) {
      throw new Error(
        "Selected grade scale must cover the complete 0-100 percent domain"
      );
    }
    if (previous && band.min_percent < previous.max_percent) {
      throw new Error("Selected grade-scale bands overlap");
    }
    if (previous && band.min_percent !== previous.max_percent) {
      throw new Error("Selected grade scale has an unsupported gap");
    }
    previous = band;
  }
  if (previous?.max_percent !== 100) {
    throw new Error(
      "Selected grade scale must cover the complete 0-100 percent domain"
    );
  }
}

/**
 * Resolve a percent-domain analytical/reporting scale, never an official native
 * award. With an explicit scale ID, matching versioned data is mandatory.
 * Existing unconfigured percent callers retain labelled legacy defaults only.
 */
export function resolvePolicy(
  courseConfig: CourseConfig,
  institutionConfig: InstitutionConfig,
  selectedScale?: SelectedPercentGradeScale
): ResolvedPolicy {
  const configuredModel = courseConfig.assessmentModel;
  if (configuredModel !== undefined && !MODELS.includes(configuredModel)) {
    throw new Error(`Unsupported assessment model: ${configuredModel}`);
  }
  if (
    configuredModel === undefined &&
    (courseConfig.frameworkCode || courseConfig.gradeScaleId)
  ) {
    throw new Error(
      "Assessment model is required for explicit educational configuration"
    );
  }
  const model = (configuredModel ?? "percent") as AssessmentModel;
  let gradeScale: GradeScaleBand[];
  let gradeScaleSource: ResolvedPolicy["gradeScaleSource"];

  if (courseConfig.gradeScaleId !== undefined) {
    if (
      !courseConfig.gradeScaleId.trim() ||
      !selectedScale ||
      selectedScale.id !== courseConfig.gradeScaleId
    ) {
      throw new Error(
        "Explicit grade scale is unavailable or does not match its selected ID"
      );
    }
    if (
      !selectedScale.version.trim() ||
      selectedScale.domain !== "percent" ||
      (courseConfig.gradeScaleVersion !== undefined &&
        courseConfig.gradeScaleVersion !== selectedScale.version)
    ) {
      throw new Error(
        "Selected grade scale has an unsupported domain or mismatched version"
      );
    }
    validateBands(selectedScale.bands);
    gradeScale = selectedScale.bands.map((band) => ({ ...band }));
    gradeScaleSource = "selected";
  } else {
    if (selectedScale || courseConfig.gradeScaleVersion !== undefined) {
      throw new Error(
        "Grade-scale data/version requires an explicit selected ID"
      );
    }
    if (model !== "percent" || courseConfig.frameworkCode) {
      throw new Error(
        "An explicit versioned grade scale is required; no curriculum-brand default is supported"
      );
    }
    const institutionBands = institutionConfig.grade_scales;
    gradeScale = (
      institutionBands?.length ? institutionBands : DEFAULT_SCALE
    ).map((band) => ({ ...band }));
    gradeScaleSource = institutionBands?.length
      ? "legacy_institution"
      : "legacy_default";
  }

  return {
    assessmentModel: model,
    gradeScale,
    gradeScaleId: selectedScale?.id,
    gradeScaleVersion: selectedScale?.version,
    gradeScaleSource,
    attainmentThresholds:
      institutionConfig.attainment_thresholds ?? DEFAULT_ATTAINMENT_THRESHOLDS,
    frameworkCode: courseConfig.frameworkCode,
    defaultLanguage: institutionConfig.default_language,
  };
}

const DEFAULT_SCALE: GradeScaleBand[] = DEFAULT_GRADE_SCALES.map((s) => ({
  letter: s.letter,
  min_percent: s.min_percent,
  max_percent: s.max_percent,
  gpa_points: s.gpa_points ?? 0,
}));

export const FRAMEWORK_STRATEGY_MAP: Record<string, AssessmentModel> = {
  MYP: "criterion",
  IB: "criterion",
  IGCSE: "band_grade",
  "9-1": "band_grade",
  MOEHE: "percent",
};
