import type { TutorPersona } from '@/lib/tutorSchemas';

/**
 * Big Five personality profile percentile scores (0-100).
 */
export interface BigFiveProfile {
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
}

/**
 * Result of persona auto-selection from Big Five profile.
 */
export interface PersonaAutoSelectResult {
  persona: TutorPersona;
  toneModifier?: string;
}

/**
 * Threshold for "high" trait percentile.
 */
const HIGH_PERCENTILE_THRESHOLD = 70;

/**
 * Auto-select a tutor persona based on the student's Big Five personality profile.
 *
 * Mapping rules (Requirement 26):
 * - Openness ≥ 70th percentile → Socratic Guide
 * - Conscientiousness ≥ 70th percentile → Step-by-Step Coach
 * - When multiple traits are high, the highest percentile wins
 * - High Neuroticism (≥ 70th) adds a supportive tone modifier
 * - Fallback to null when no profile is provided
 *
 * @param profile - Big Five personality profile, or null if not available
 * @returns PersonaAutoSelectResult or null if no profile
 */
export function autoSelectPersona(
  profile: BigFiveProfile | null | undefined,
): PersonaAutoSelectResult | null {
  if (!profile) return null;

  // Traits that map to personas, sorted by score descending
  const mappableTraits: Array<{ trait: string; score: number; persona: TutorPersona }> = [
    { trait: 'openness', score: profile.openness, persona: 'socratic_guide' },
    { trait: 'conscientiousness', score: profile.conscientiousness, persona: 'step_by_step_coach' },
  ].sort((a, b) => b.score - a.score);

  // Find the dominant trait that meets the threshold
  const dominant = mappableTraits.find((t) => t.score >= HIGH_PERCENTILE_THRESHOLD);

  // Default to quick_explainer if no trait is high enough
  const persona: TutorPersona = dominant?.persona ?? 'quick_explainer';

  // High neuroticism adds supportive tone regardless of persona
  let toneModifier: string | undefined;
  if (profile.neuroticism >= HIGH_PERCENTILE_THRESHOLD) {
    toneModifier =
      'Use an especially warm, encouraging, and supportive tone. ' +
      'Validate the student\'s effort frequently. Avoid language that could feel critical or pressuring.';
  }

  return { persona, toneModifier };
}
