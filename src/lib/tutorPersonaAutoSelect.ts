// =============================================================================
// tutorPersonaAutoSelect — Big Five personality to tutor persona mapping
// =============================================================================

import type { TutorPersona } from "@/lib/tutorSchemas";
import type { BigFiveTraits } from "@/lib/scoreCalculator";

/**
 * Percentile threshold for considering a trait "high".
 * Scores are 0–100 (already percentile-based from onboarding scoring).
 */
const HIGH_TRAIT_THRESHOLD = 70;

export interface PersonaAutoSelectResult {
  persona: TutorPersona;
  toneModifier?: string;
}

/**
 * Auto-select a tutor persona based on the student's Big Five personality profile.
 *
 * Mapping rules (from Requirement 26):
 * - High Openness (≥70th percentile) → "socratic_guide"
 * - High Conscientiousness (≥70th percentile) → "step_by_step_coach"
 * - Default fallback → "quick_explainer"
 * - When multiple traits score high, prioritize the highest percentile
 * - High Neuroticism (≥70) adds a supportive tone modifier regardless of persona
 *
 * @param bigFiveProfile - The student's Big Five trait scores (0–100 scale)
 * @returns The recommended persona and optional tone modifier, or null if profile is missing
 */
export function autoSelectPersona(
  bigFiveProfile: BigFiveTraits | null | undefined
): PersonaAutoSelectResult | null {
  if (!bigFiveProfile) return null;

  // Consider only the traits that map to personas
  const traits: Array<{ trait: string; score: number }> = [
    { trait: "openness", score: bigFiveProfile.openness },
    { trait: "conscientiousness", score: bigFiveProfile.conscientiousness },
  ];

  // Sort by score descending — highest percentile wins when multiple are high
  traits.sort((a, b) => b.score - a.score);

  const dominant = traits[0] as { trait: string; score: number };
  let persona: TutorPersona;

  if (dominant.trait === "openness" && dominant.score >= HIGH_TRAIT_THRESHOLD) {
    persona = "socratic_guide";
  } else if (
    dominant.trait === "conscientiousness" &&
    dominant.score >= HIGH_TRAIT_THRESHOLD
  ) {
    persona = "step_by_step_coach";
  } else {
    persona = "quick_explainer";
  }

  // High neuroticism adds a supportive tone modifier regardless of persona
  let toneModifier: string | undefined;
  if (bigFiveProfile.neuroticism >= HIGH_TRAIT_THRESHOLD) {
    toneModifier =
      "Use an especially warm, encouraging, and supportive tone. " +
      "Validate the student's effort frequently. Avoid language that could feel critical or pressuring.";
  }

  return { persona, toneModifier };
}
