// Task 6.11: Adaptive quiz score computation (pure business logic)
// Requirements: 3.1, 3.3

/**
 * Computes the rounded percentage score for an adaptive quiz attempt.
 *
 * The score is derived from the number of correct answers over the number of
 * questions actually presented in the attempt. It is the single source of
 * truth for finalization (timer expiry, manual submit, or session completion),
 * so the recorded score always equals the score computed from the student's
 * most recently submitted answers (R3.1, R3.3).
 *
 * Rules:
 * - Returns a whole-number percentage in the inclusive range [0, 100].
 * - WHEN there are no questions (or the count is not a positive finite number),
 *   the score is 0 rather than `NaN`/`Infinity` (no division by zero).
 * - Non-finite or negative `totalCorrect` is treated conservatively as 0.
 * - `totalCorrect` is clamped to `totalQuestions` so a miscount can never
 *   produce a score above 100%.
 *
 * This function is pure and total: it returns a defined number for every input.
 *
 * @param totalCorrect - Number of questions answered correctly.
 * @param totalQuestions - Number of questions presented in the attempt.
 * @returns Rounded percentage score in [0, 100].
 */
export function computeScore(
  totalCorrect: number,
  totalQuestions: number
): number {
  // No questions ⇒ no score; also guards against division by zero and
  // non-positive/non-finite question counts.
  if (!Number.isFinite(totalQuestions) || totalQuestions <= 0) {
    return 0;
  }

  // Undetermined or negative correct counts contribute nothing.
  const correct = Number.isFinite(totalCorrect)
    ? Math.max(0, Math.min(totalCorrect, totalQuestions))
    : 0;

  return Math.round((correct / totalQuestions) * 100);
}
