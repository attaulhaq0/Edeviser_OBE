import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { AssessmentIntroContent } from "@/lib/assessmentIntro";

// ── Benefit-Oriented Assessment Framing content resolver (R17) ───────
//
// Resolves the localized intro content (benefit-oriented title, description,
// estimated time, and concrete benefits) for an onboarding assessment from the
// `student` namespace. Keys live under `onboarding.assessmentIntro.<type>` and
// are present in both en and ar (R17.4). Benefits are stored as numbered keys
// (`benefit1`..`benefitN`) so the lookup stays fully typed without relying on
// i18next `returnObjects`.

/** Assessment types that have benefit-oriented framing content. */
export type AssessmentIntroType =
  | "personality"
  | "learning_style"
  | "self_efficacy"
  | "study_strategy";

/** Maximum number of benefit bullet points defined per assessment. */
const MAX_BENEFITS = 3;

/**
 * Resolve localized framing content for an assessment. Returns a stable
 * object suitable for `<AssessmentIntro />` and the body-gating logic in
 * `assessmentIntro.ts`.
 */
export const useAssessmentIntro = (
  type: AssessmentIntroType
): AssessmentIntroContent => {
  const { t } = useTranslation("student");

  return useMemo<AssessmentIntroContent>(() => {
    const base = `onboarding.assessmentIntro.${type}`;

    const benefits: string[] = [];
    for (let i = 1; i <= MAX_BENEFITS; i += 1) {
      const key = `${base}.benefit${i}`;
      // `defaultValue: ""` ensures a missing/extra key resolves to an empty
      // string (filtered out below) rather than echoing the raw key.
      const value = t(key, { defaultValue: "" }).trim();
      if (value.length > 0) benefits.push(value);
    }

    return {
      title: t(`${base}.title`),
      description: t(`${base}.description`),
      estimatedTime: t(`${base}.estimatedTime`),
      benefits,
    };
  }, [t, type]);
};
