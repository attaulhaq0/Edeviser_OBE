// ─── Bloom's Climb ───────────────────────────────────────────────────────────
// Pure functions for Bloom's Climb mechanic: advancement, revert, highest level,
// and practice XP computation.

/** A single quiz question attempt with Bloom's level and correctness. */
export interface BloomAttempt {
  bloomLevel: number;
  correct: boolean;
}

/**
 * Determines whether the student should advance to the next Bloom's level.
 *
 * Returns `currentLevel + 1` when the student has answered 3+ consecutive
 * questions correctly at the current level and the level is below 6 (Creating).
 * Returns 6 when already at the maximum level. Returns `currentLevel` otherwise.
 *
 * @param currentLevel - Current Bloom's level (1–6).
 * @param consecutiveCorrectAtLevel - Consecutive correct answers at this level.
 * @returns The Bloom's level to use for the next question.
 */
export function shouldAdvanceBloom(
  currentLevel: number,
  consecutiveCorrectAtLevel: number,
): number {
  if (consecutiveCorrectAtLevel >= 3 && currentLevel < 6) {
    return currentLevel + 1;
  }
  return currentLevel;
}

/**
 * Handles Bloom's level revert when a student answers incorrectly at a
 * newly advanced level.
 *
 * Returns `previousLevel` when the answer was incorrect and the student
 * had just advanced. Returns `currentLevel` in all other cases.
 *
 * @param currentLevel - The student's current Bloom's level.
 * @param previousLevel - The Bloom's level before the last advancement.
 * @param wasCorrect - Whether the student answered correctly.
 * @param justAdvanced - Whether the student just advanced to `currentLevel`.
 * @returns The Bloom's level to use going forward.
 */
export function handleBloomRevert(
  currentLevel: number,
  previousLevel: number,
  wasCorrect: boolean,
  justAdvanced: boolean,
): number {
  if (!wasCorrect && justAdvanced) {
    return previousLevel;
  }
  return currentLevel;
}

/**
 * Computes the highest Bloom's level where the student has at least 2
 * correct answers across all attempts.
 *
 * @param attempts - Array of quiz question attempts with Bloom's level and correctness.
 * @returns The highest Bloom's level with 2+ correct answers, or 0 if none qualifies.
 */
export function highestBloomReached(attempts: BloomAttempt[]): number {
  const correctCountByLevel = new Map<number, number>();

  for (const attempt of attempts) {
    if (attempt.correct) {
      correctCountByLevel.set(
        attempt.bloomLevel,
        (correctCountByLevel.get(attempt.bloomLevel) ?? 0) + 1,
      );
    }
  }

  let highest = 0;
  for (const [level, count] of correctCountByLevel) {
    if (count >= 2 && level > highest) {
      highest = level;
    }
  }

  return highest;
}

/**
 * Returns the fixed XP awarded for completing a practice mode quiz.
 * Always returns exactly 10, regardless of any parameters.
 *
 * @returns 10
 */
export function computePracticeXP(): number {
  return 10;
}
