// =============================================================================
// canonicalPolicyResolver.ts — Phase 16: Canonical Assessment/Attainment Policy
// Resolves the effective assessment strategy, grade scale, and attainment
// thresholds from: institution → track → curriculum → course → config
// Single source of truth — no more hardcoding 85/70/50 in multiple places.
// =============================================================================

import type { AssessmentModel, GradeScaleBand } from "./assessmentStrategyEngine";
import { DEFAULT_ATTAINMENT_THRESHOLDS, DEFAULT_GRADE_SCALES, type AttainmentThresholdsConfig } from "@/types/app";

// ─── Framework-Aligned Grade Scales ──────────────────────────────────────────

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
  attainmentThresholds: AttainmentThresholdsConfig;
  frameworkCode?: string;
  defaultLanguage?: string;
}

interface CourseConfig {
  assessmentModel?: string;
  gradeScaleId?: string;
  frameworkCode?: string;
}

interface InstitutionConfig {
  grade_scales?: GradeScaleBand[];
  attainment_thresholds?: AttainmentThresholdsConfig;
  default_language?: string;
}

/**
 * Resolve effective assessment policy from institution + course configuration.
 * Canonical resolution chain: institution → course → framework → policy.
 */
export function resolvePolicy(
  courseConfig: CourseConfig,
  institutionConfig: InstitutionConfig
): ResolvedPolicy {
  const model = (courseConfig.assessmentModel as AssessmentModel) ?? "percent";

  // Grade scale: institution-specific > framework-default > hardcoded
  const gradeScale = institutionConfig.grade_scales && institutionConfig.grade_scales.length > 0
    ? institutionConfig.grade_scales
    : resolveDefaultGradeScale(courseConfig.frameworkCode);

  // Attainment thresholds: institution-configured > framework-default > hardcoded
  const attainmentThresholds = institutionConfig.attainment_thresholds
    ? institutionConfig.attainment_thresholds
    : DEFAULT_ATTAINMENT_THRESHOLDS;

  return {
    assessmentModel: model,
    gradeScale,
    attainmentThresholds,
    frameworkCode: courseConfig.frameworkCode,
    defaultLanguage: institutionConfig.default_language,
  };
}

/**
 * Resolve the default grade scale based on framework code.
 * NOT hardcoded if(IB)/if(IGCSE) — uses a registry map.
 */
const FRAMEWORK_DEFAULT_SCALES: Record<string, GradeScaleBand[]> = {
  MYP: IB_MYP_GRADE_SCALE,
  IB: IB_MYP_GRADE_SCALE,
  IGCSE: IGCSE_9_1_GRADE_SCALE,
  "9-1": IGCSE_9_1_GRADE_SCALE,
  MOEHE: DEFAULT_GRADE_SCALES.map((s) => ({
    letter: s.letter,
    min_percent: s.min_percent,
    max_percent: s.max_percent,
    gpa_points: s.gpa_points ?? 0,
  })),
};

function resolveDefaultGradeScale(frameworkCode?: string): GradeScaleBand[] {
  if (!frameworkCode) return DEFAULT_SCALE;
  return FRAMEWORK_DEFAULT_SCALES[frameworkCode] ?? DEFAULT_SCALE;
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