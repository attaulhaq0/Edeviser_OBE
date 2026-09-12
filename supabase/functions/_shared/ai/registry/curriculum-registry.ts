/**
 * v2 — Curriculum & Accreditation Registry.
 *
 * Separates curriculum, accreditation, framework, assessment model,
 * and grade scale into independent concepts. The core engine operates
 * on universal primitives; adapters translate framework-specific
 * semantics into the universal model.
 *
 * Design principle: a new curriculum must be addable as configuration
 * without changing the OBE, learner-state, habit, intervention, CQI,
 * or agent core engines.
 */
import type { AssessmentModel } from "../contracts.ts";

// ─── Curriculum Profile ─────────────────────────────────────────────────────

export interface GradeScaleDefinition {
  id: string;
  name: string;
  model: string;
  bands: readonly {
    label: string;
    minPercent: number;
    maxPercent: number;
    gpaPoints?: number;
    rawEquivalent?: string;
  }[];
}

export interface OutcomeModel {
  outcomeTypes: readonly string[];
  canonicalMapping: "source_is_parent" | "source_is_child";
}

export interface LearnerDimensionDefinition {
  code: string;
  name: string;
  description?: string;
  category?: string;
  observableIn?: readonly string[];
  habitMappings?: Record<string, string>;
}

export interface EvidencePolicy {
  type: string;
  sources: readonly string[];
  requiredMinimum?: number;
  frequency?: string;
}

export interface CurriculumProfile {
  id: string;
  code: string;
  name: string;
  region?: string;
  frameworkId?: string;
  assessmentModels: readonly AssessmentModel[];
  gradeScales: readonly GradeScaleDefinition[];
  outcomeModel: OutcomeModel;
  learnerDimensions?: readonly LearnerDimensionDefinition[];
  evidencePolicies?: readonly EvidencePolicy[];
  defaultLanguage?: string;
  requiredSubjects?: readonly string[];
}

// ─── Accreditation Profile ──────────────────────────────────────────────────

export interface EvidenceRequirement {
  id: string;
  standardCode?: string;
  indicator: string;
  evidenceTypes: readonly string[];
  acceptableSources: readonly string[];
  requiredFrequency?: string;
  ownerRole?: string;
}

export interface StandardDefinition {
  code: string;
  name: string;
  description?: string;
  indicators?: readonly string[];
}

export interface ReportingPolicy {
  reportType: string;
  sections: readonly string[];
  requiredEvidenceTypes: readonly string[];
  frequency?: string;
  language?: "en" | "ar" | "bilingual";
}

export interface AccreditationProfile {
  id: string;
  code: string;
  name: string;
  jurisdiction?: string;
  schoolLevel?: "k12" | "higher_ed" | "both";
  evidenceRequirements?: readonly EvidenceRequirement[];
  reportingPolicies?: readonly ReportingPolicy[];
  standards?: readonly StandardDefinition[];
}

// ─── Framework Adapter ──────────────────────────────────────────────────────

export interface FrameworkAdapter {
  /** Maps a framework-specific outcome to the universal outcome model. */
  mapOutcome: (raw: Record<string, unknown>) => {
    type: string;
    title: string;
    code?: string;
    parentCode?: string;
    dimension?: string;
  };
  /** Maps a framework-specific assessment result to universal evidence. */
  mapAssessmentToEvidence: (raw: Record<string, unknown>) => {
    scorePercent: number;
    rawScore: Record<string, unknown>;
    dimensions?: readonly string[];
  };
  /** Maps framework-specific learner signals to universal types. */
  mapLearnerSignal: (raw: Record<string, unknown>) => {
    signalType: string;
    dimension?: string;
    severity: "low" | "medium" | "high";
  };
  /** Framework-specific grade scale conversion hints. */
  gradeConversionHints?: Record<string, string>;
}

// ─── Course Configuration ───────────────────────────────────────────────────

export interface CourseConfiguration {
  courseId: string;
  curriculumCode: string;
  frameworkId?: string;
  assessmentModel: AssessmentModel;
  gradeScaleId: string;
  outcomeModelId?: string;
  language: "en" | "ar";
  policyVersions?: {
    assessment?: string;
    attainment?: string;
    evidence?: string;
  };
}

// ─── Multi-Curriculum Institution ───────────────────────────────────────────

export interface InstitutionCurriculumAssignment {
  curriculumCode: string;
  frameworkId?: string;
  accreditationCode?: string;
  activeSince: string;
  activeUntil?: string;
}

export interface InstitutionProfile {
  id: string;
  name: string;
  defaultLanguage: "en" | "ar";
  curricula: readonly InstitutionCurriculumAssignment[];
  accreditations: readonly string[];
  customDimensions?: readonly LearnerDimensionDefinition[];
}
