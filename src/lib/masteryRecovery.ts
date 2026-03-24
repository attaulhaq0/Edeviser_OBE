// ─── Mastery Recovery ────────────────────────────────────────────────────────
// Pure functions for mastery gate failure detection and recovery pathway logic.

/** A quiz attempt with per-CLO scores (0–100 scale). */
export interface QuizAttemptCLOResult {
  clo_scores: Record<string, number>;
}

/** A recovery pathway session tracking step completion. */
export interface RecoveryPathway {
  ai_tutor_completed: boolean;
  practice_completed: boolean;
}

/**
 * Counts the number of quiz attempts where the student's per-CLO score
 * fell below the mastery threshold for a given CLO.
 *
 * @param attempts - Array of quiz attempt results with per-CLO scores.
 * @param cloId - The CLO identifier to check.
 * @param masteryThreshold - Minimum passing score (default 70).
 * @returns Number of attempts where the CLO score was below threshold.
 */
export function countMasteryFailures(
  attempts: QuizAttemptCLOResult[],
  cloId: string,
  masteryThreshold: number = 70,
): number {
  return attempts.filter(
    (a) => (a.clo_scores[cloId] ?? 0) < masteryThreshold,
  ).length;
}

/**
 * Determines whether a mastery recovery pathway should be activated.
 * Returns true when the failure count reaches or exceeds the threshold.
 *
 * @param failureCount - Number of mastery failures for a student-CLO pair.
 * @param threshold - Minimum failures to trigger recovery (default 2).
 * @returns Whether recovery should be activated.
 */
export function shouldActivateRecovery(
  failureCount: number,
  threshold: number = 2,
): boolean {
  return failureCount >= threshold;
}

/**
 * Determines the Bloom's level for recovery practice questions.
 * Returns one level below the CLO's target Bloom's level, floored at 1 (Remembering).
 *
 * @param cloBloomLevel - The CLO's target Bloom's level (1–6).
 * @returns The Bloom's level for recovery practice (1–5).
 */
export function recoveryBloomLevel(cloBloomLevel: number): number {
  return Math.max(1, cloBloomLevel - 1);
}

/**
 * Checks whether a recovery pathway is complete.
 * Both the AI Tutor session and practice questions must be completed
 * before the student can retry the mastery gate.
 *
 * @param pathway - The recovery pathway with step completion flags.
 * @returns Whether the required recovery steps are complete.
 */
export function isRecoveryComplete(pathway: RecoveryPathway): boolean {
  return pathway.ai_tutor_completed && pathway.practice_completed;
}
