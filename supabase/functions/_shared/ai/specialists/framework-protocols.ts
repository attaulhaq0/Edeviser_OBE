// Scoped explanation hints used by the single orchestrator. Assessment models,
// curriculum identity and configured quality frameworks are separate concepts.
// Hints do not supply grading rules, subject rubrics or accreditation decisions.

import type { FrameworkContext } from "../contracts.ts";

type SpecialistHint = (fw: FrameworkContext) => string | undefined;

const CRITERION_HINT =
  "This course uses criterion assessment. Use only criterion identifiers, labels, levels and descriptors present in authorized assessment evidence for the selected curriculum, subject and year/phase. Do not infer a programme from the criterion model or institution accreditation. If the applicable rubric is absent, say it is unavailable; do not invent A-D labels, maxima, grade boundaries or a reporting judgment. Task observations and normalized analytics are not automatically final criterion judgments or official grades.";

const BAND_HINT =
  "This course uses band/grade assessment. Use only the selected syllabus, qualification, component, tier, exam series and versioned scale supported by authorized evidence. A band model does not identify Cambridge/IGCSE, a fixed set of Assessment Objectives, an A*-G or 9-1 scale, or universal percentage boundaries. Distinguish component marks and weighted contributions from the combined result and any externally awarded grade. If the applicable scale or objective evidence is absent, state that limitation rather than calculating or inventing a grade.";

const FRAMEWORK_HINTS: Readonly<
  Partial<Record<string, readonly SpecialistHint[]>>
> = {
  mastery: [
    (fw) => (fw.assessmentModel === "criterion" ? CRITERION_HINT : undefined),
    (fw) => (fw.assessmentModel === "band_grade" ? BAND_HINT : undefined),
  ],
  teacher: [
    (fw) => (fw.assessmentModel === "criterion" ? CRITERION_HINT : undefined),
    (fw) => (fw.assessmentModel === "band_grade" ? BAND_HINT : undefined),
    (fw) =>
      fw.defaultLanguage === "ar"
        ? "The institution's configured default language is Arabic. When drafting materials for teacher review, include bilingual considerations where appropriate."
        : undefined,
  ],
  intervention: [
    (fw) =>
      fw.assessmentModel === "criterion"
        ? `${CRITERION_HINT} Propose support for the evidenced criterion/outcome gap and a new authorized reassessment, subject to human approval; do not infer the cause of a gap from its score alone.`
        : undefined,
    (fw) =>
      fw.assessmentModel === "band_grade"
        ? `${BAND_HINT} Target only an evidenced objective/outcome gap. Proposed practice and reassessment require the applicable course context and human approval.`
        : undefined,
    (fw) =>
      fw.assessmentModel === "percent"
        ? "For percent-based support, use the evidenced learning outcome and configured institutional target. A quality-framework label does not define grading rules, prove a cause, or demonstrate compliance."
        : undefined,
  ],
  coordinator: [
    (fw) => {
      const configured =
        (fw.accreditationBodies?.length ?? 0) > 0 ||
        Boolean(fw.primaryAccreditation);
      return configured
        ? "The context lists configured quality/accreditation frameworks, not verified authorization, accreditation or evaluation decisions. Resolve the applicable programme, process, edition and evidence requirements before drafting a framework-specific summary. Do not infer MYP or criterion assessment from an IB label, or turn learner attainment into programme approval. Distinguish documentation coverage, implementation, impact and ongoing development; state missing evidence and external decision authority."
        : undefined;
    },
  ],
};

/** Missing framework context preserves the existing no-hints behavior. */
export const getFrameworkSpecialistHints = (
  specialist: string,
  framework?: FrameworkContext
): readonly string[] => {
  if (!framework) return [];
  const hints = FRAMEWORK_HINTS[specialist];
  if (!hints) return [];
  return hints
    .map((hint) => hint(framework))
    .filter(
      (line): line is string => typeof line === "string" && line.length > 0
    );
};
