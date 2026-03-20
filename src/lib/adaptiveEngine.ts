// ─── Adaptive Engine ─────────────────────────────────────────────────────────
// Client-side ability estimation and difficulty targeting for adaptive quizzes.

export type AbilityLevel = 'high' | 'medium' | 'low';

/**
 * Maps CLO attainment percentage to ability level.
 * High: ≥85%, Medium: 50–84%, Low: <50%
 */
export function classifyAbility(attainmentPercent: number): AbilityLevel {
  if (attainmentPercent >= 85) return 'high';
  if (attainmentPercent >= 50) return 'medium';
  return 'low';
}

/**
 * Maps ability level to initial target difficulty on the 1.0–5.0 scale.
 * High → 3.5, Medium → 2.5, Low → 1.5
 */
export function abilityToTargetDifficulty(ability: AbilityLevel): number {
  switch (ability) {
    case 'high': return 3.5;
    case 'medium': return 2.5;
    case 'low': return 1.5;
  }
}

/**
 * Adjusts target difficulty after each answer.
 * Correct: +stepUp (default 0.3), capped at 5.0
 * Incorrect: −stepDown (default 0.5), floored at 1.0
 */
export function adjustDifficulty(
  current: number,
  wasCorrect: boolean,
  stepUp = 0.3,
  stepDown = 0.5,
): number {
  if (wasCorrect) return Math.min(5.0, current + stepUp);
  return Math.max(1.0, current - stepDown);
}

/**
 * Selects preferred Bloom's levels based on ability.
 * High: [4, 5, 6] (Analyzing, Evaluating, Creating)
 * Medium: [2, 3, 4] (Understanding, Applying, Analyzing)
 * Low: [1, 2] (Remembering, Understanding)
 */
export function preferredBloomLevels(ability: AbilityLevel): number[] {
  switch (ability) {
    case 'high': return [4, 5, 6];
    case 'medium': return [2, 3, 4];
    case 'low': return [1, 2];
  }
}
