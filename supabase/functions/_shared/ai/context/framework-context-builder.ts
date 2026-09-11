/**
 * v2 — Accreditation-native framework context builder.
 *
 * Builds a FrameworkContext from live course + institution data. Called by the
 * orchestrator before every agent run so that framework semantics propagate
 * into agent reasoning, intervention logic, and reporting.
 *
 * Pure + deterministic: only reads authorized data, never mutates.
 */
import type { AssessmentModel, FrameworkContext } from "../../contracts.ts";

export interface FrameworkContextSource {
  /** Raw course row (from RLS-scoped courses query). */
  course?: {
    assessment_model?: string | null;
    framework_id?: string | null;
    curriculum_code?: string | null;
    key_stage?: string | null;
    grade_scale_id?: string | null;
  } | null;
  /** Raw institution_settings row. */
  institutionSettings?: {
    accreditation_body?: string | null;
    accreditation_bodies?: string[] | null;
    default_language?: string | null;
  } | null;
  /** Raw competency_frameworks row. */
  framework?: {
    code?: string | null;
  } | null;
}

const ASSESSMENT_MODEL_VALUES = new Set<string>([
  "percent",
  "criterion",
  "band_grade",
  "component",
]);

const asModel = (v: unknown): AssessmentModel | undefined =>
  typeof v === "string" && ASSESSMENT_MODEL_VALUES.has(v)
    ? (v as AssessmentModel)
    : undefined;

const strOrUndef = (v: unknown): string | undefined =>
  typeof v === "string" && v.length > 0 ? v : undefined;

/**
 * Builds a scoped FrameworkContext from available data sources.
 * Returns undefined when no framework-relevant data is available
 * (backward-compatible — existing percent-only tenants have empty context).
 */
export const buildFrameworkContext = (
  source: FrameworkContextSource
): FrameworkContext | undefined => {
  const model = asModel(source.course?.assessment_model);
  const frameworkId = strOrUndef(source.course?.framework_id);
  const curriculumCode = strOrUndef(source.course?.curriculum_code);
  const keyStage = strOrUndef(source.course?.key_stage);
  const gradeScaleId = strOrUndef(source.course?.grade_scale_id);
  const primaryAccreditation = strOrUndef(
    source.institutionSettings?.accreditation_body
  );
  const accreditationBodies =
    source.institutionSettings?.accreditation_bodies?.filter(
      (b): b is string => typeof b === "string" && b.length > 0
    ) ?? [];
  const defaultLanguage = strOrUndef(
    source.institutionSettings?.default_language
  );
  const frameworkCode = strOrUndef(source.framework?.code);

  // No framework-relevant data at all → return undefined (backward-compat)
  if (
    !model &&
    !frameworkId &&
    !curriculumCode &&
    !keyStage &&
    !gradeScaleId &&
    !primaryAccreditation &&
    accreditationBodies.length === 0 &&
    !defaultLanguage &&
    !frameworkCode
  ) {
    return undefined;
  }

  return {
    accreditationBodies:
      accreditationBodies.length > 0 ? accreditationBodies : undefined,
    primaryAccreditation,
    frameworkId,
    frameworkCode,
    curriculumCode,
    keyStage,
    assessmentModel: model,
    gradeScaleId,
    defaultLanguage,
  };
};
