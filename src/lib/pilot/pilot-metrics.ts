/**
 * Phase 8 — Pilot Value Measurement Framework.
 * Defines the KPIs and truth tables needed to prove Edeviser creates
 * measurable value for a real Qatar K-12 school during pilot.
 */

// ─── Pilot School Configuration ────────────────────────────────────────────

export interface PilotSchoolConfig {
  name: string;
  curriculumCode: string;
  accreditationCodes: readonly string[];
  defaultLanguage: "en" | "ar";
  academicYear: { start: string; end: string; terms: number };
  grades: number;
  subjectsPerGrade: number;
  courses: number;
  sections: number;
  teachers: number;
  students: number;
  assessmentModel: string;
}

export const QATAR_NATIONAL_PILOT: PilotSchoolConfig = {
  name: "Qatar Model School — MoEHE National",
  curriculumCode: "MOEHE",
  accreditationCodes: ["QNSA"],
  defaultLanguage: "ar",
  academicYear: { start: "2026-09-01", end: "2027-06-30", terms: 3 },
  grades: 6,
  subjectsPerGrade: 8,
  courses: 48,
  sections: 72,
  teachers: 36,
  students: 720,
  assessmentModel: "percent",
};

export const IB_MYP_PILOT: PilotSchoolConfig = {
  name: "Qatar IB Academy — MYP",
  curriculumCode: "IB_MYP",
  accreditationCodes: ["IB", "QNSA"],
  defaultLanguage: "en",
  academicYear: { start: "2026-09-01", end: "2027-06-30", terms: 3 },
  grades: 5,
  subjectsPerGrade: 8,
  courses: 40,
  sections: 60,
  teachers: 30,
  students: 500,
  assessmentModel: "criterion",
};

export const BRITISH_PILOT: PilotSchoolConfig = {
  name: "Doha British School — IGCSE",
  curriculumCode: "IGCSE",
  accreditationCodes: ["BSO"],
  defaultLanguage: "en",
  academicYear: { start: "2026-09-01", end: "2027-06-30", terms: 3 },
  grades: 4,
  subjectsPerGrade: 10,
  courses: 40,
  sections: 56,
  teachers: 28,
  students: 420,
  assessmentModel: "band_grade",
};

// ─── Product KPIs ───────────────────────────────────────────────────────────

export interface PilotKPIs {
  /** Days from school creation to first actionable insight. */
  timeToFirstInsight: number;
  /** Days from insight detection to intervention proposal. */
  timeToIntervention: number;
  /** Days from intervention to reassessment. */
  timeToMeasurement: number;
  /** Days from assessment to accreditation-ready evidence. */
  timeToEvidence: number;
  /** Percentage of proposed interventions completed. */
  interventionCompletionRate: number;
  /** Percentage of interventions showing improvement. */
  interventionEffectivenessRate: number;
  /** At-risk learners correctly detected / total at-risk. */
  atRiskDetectionRate: number;
  /** Incorrectly flagged as at-risk / total flagged. */
  falsePositiveRate: number;
  /** Missed at-risk / total at-risk. */
  falseNegativeRate: number;
  /** Evidence items auto-generated / total evidence items. */
  evidenceAutomationRate: number;
  /** Assessment coverage per outcome (0-1). */
  outcomeCoverageRate: number;
}

// ─── Intelligence Truth Table ──────────────────────────────────────────────

export interface IntelligenceTruthRow {
  learnerId: string;
  framework: string;
  assessmentModel: string;
  observedReality: string;
  expectedInterpretation: string;
  actualInterpretation: string;
  evidenceSource: string;
  evidenceRefs: readonly string[];
  correct: boolean;
  reason: string;
}

// ─── Pilot Incident ────────────────────────────────────────────────────────

export type IncidentSeverity = "P0" | "P1" | "P2" | "P3";

export interface PilotIncident {
  id: string;
  severity: IncidentSeverity;
  category:
    | "ux"
    | "data"
    | "intelligence"
    | "performance"
    | "security"
    | "workflow"
    | "localization";
  description: string;
  observedAt: string;
  workflow: string;
  resolved: boolean;
}

// ─── Value Categories ──────────────────────────────────────────────────────

export interface TeacherValueMetrics {
  /** Seconds to identify weakest learners in a class. */
  weakestLearnerIdentificationTime: number;
  /** Seconds to identify weakest outcomes. */
  weakestOutcomeIdentificationTime: number;
  /** Seconds to create an intervention from insight. */
  interventionCreationTime: number;
  /** Number of pages/views to complete grading workflow. */
  gradingWorkflowSteps: number;
  /** Manual data entry points in assessment flow. */
  manualDataEntryPoints: number;
}

export interface CoordinatorValueMetrics {
  cohortAnalysisTime: number;
  outcomeCoverageReviewTime: number;
  interventionMonitoringTime: number;
  evidencePackGenerationTime: number;
  manualEvidenceCollectionHours: number;
}
