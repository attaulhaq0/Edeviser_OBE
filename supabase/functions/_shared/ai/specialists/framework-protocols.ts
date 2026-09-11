// ─── v2 Framework-aware specialist hints ───────────────────────────────────────
// These are injected AFTER the base protocol blocks when framework context is
// available. They are intentionally scoped hints, not full protocol rewrites.

import type { FrameworkContext } from "../contracts.ts";

type SpecialistHint = (fw: FrameworkContext) => string | undefined;

const FRAMEWORK_HINTS: Readonly<
  Partial<Record<string, readonly SpecialistHint[]>>
> = {
  mastery: [
    (fw) => {
      if (fw.assessmentModel === "criterion")
        return "This is an IB MYP criterion course. Attainment is expressed as criterion levels (0-8 per criterion A-D, total /32→1-7). Frame mastery analysis in criterion-specific language — e.g., 'Criterion B (Investigating) shows developing mastery at level 4/8.'";
    },
    (fw) => {
      if (fw.assessmentModel === "band_grade")
        return "This is an IGCSE band-grade course. Attainment uses Assessment Objectives (AO1-AO3) with weighted bands. Frame mastery in AO-specific language — e.g., 'AO2 (Application) shows satisfactory band B.'";
    },
  ],
  teacher: [
    (fw) => {
      if (
        fw.assessmentModel === "criterion" &&
        fw.primaryAccreditation === "IB"
      )
        return "You are advising an IB MYP teacher. When drafting feedback or interventions, use criterion-specific language (A: Knowing & Understanding, B: Investigating, C: Communicating, D: Thinking Critically). Reference ATL skills where relevant.";
    },
    (fw) => {
      if (fw.assessmentModel === "band_grade")
        return "You are advising an IGCSE teacher. When drafting feedback or interventions, use Assessment Objective language (AO1: Knowledge, AO2: Application, AO3: Analysis). Reference syllabus codes and band boundaries where relevant.";
    },
    (fw) => {
      if (fw.defaultLanguage === "ar")
        return "The institution's default language is Arabic. When drafting materials for teacher review, include bilingual considerations where appropriate.";
    },
  ],
  intervention: [
    (fw) => {
      if (fw.assessmentModel === "criterion")
        return "For IB MYP criterion-based interventions: target the specific weak criterion (A/B/C/D) rather than the overall subject. Criterion-specific reteaching and reassessment is the standard intervention pattern.";
    },
    (fw) => {
      if (fw.assessmentModel === "band_grade")
        return "For IGCSE band-grade interventions: target the weak Assessment Objective (AO1/AO2/AO3). AO-weighted practice with targeted feedback is the standard pattern.";
    },
    (fw) => {
      if (
        fw.assessmentModel === "percent" &&
        fw.primaryAccreditation === "QNSA"
      )
        return "For QNSA outcome-based interventions: focus on the specific learning outcome below institutional target. Improvement actions should link to school-level evidence requirements.";
    },
  ],
  coordinator: [
    (fw) => {
      const bodies = fw.accreditationBodies ?? [];
      if (bodies.includes("QNSA"))
        return "This institution is QNSA-accredited. When drafting CQI or evidence summaries, frame findings in terms of school outcomes, learner attributes, and continuous improvement evidence that supports QNSA self-study requirements.";
      if (bodies.includes("IB"))
        return "This institution is IB-authorized. When drafting CQI or evidence summaries, frame findings in terms of criterion-related assessment, ATL development, and programme evaluation evidence.";
    },
  ],
};

/**
 * Returns framework-aware specialist protocol hints. Called by the orchestrator
 * to inject scoped framework semantics into the system prompt when context is
 * available. Returns empty array when framework is absent (backward-compatible).
 */
export const getFrameworkSpecialistHints = (
  specialist: string,
  framework?: FrameworkContext
): readonly string[] => {
  if (!framework) return [];
  const hints = FRAMEWORK_HINTS[specialist];
  if (!hints) return [];
  return hints
    .map((h) => h(framework))
    .filter(
      (line): line is string => typeof line === "string" && line.length > 0
    );
};
