// ─── Difficulty Calibration ──────────────────────────────────────────────────
// Blends LLM-estimated difficulty with empirical data from student attempts.

/**
 * Blends LLM-estimated difficulty with empirical calibrated difficulty.
 * Weight shifts toward empirical as sample size grows.
 *
 * calibrated = 5.0 − (4.0 × successRate)
 * empiricalWeight = min(1.0, totalAttempts / 50)
 * result = empiricalWeight × calibrated + (1 − empiricalWeight) × originalDifficulty
 */
export function computeCalibratedDifficulty(
  originalDifficulty: number,
  successRate: number,
  totalAttempts: number
): number {
  const calibrated = 5.0 - 4.0 * successRate;
  const empiricalWeight = Math.min(1.0, totalAttempts / 50);
  return (
    empiricalWeight * calibrated + (1 - empiricalWeight) * originalDifficulty
  );
}

/**
 * Computes discrimination index using top/bottom 27% method.
 * Returns a value between −1.0 and 1.0.
 */
export function computeDiscriminationIndex(
  topGroupSuccessRate: number,
  bottomGroupSuccessRate: number
): number {
  return topGroupSuccessRate - bottomGroupSuccessRate;
}

/**
 * Determines quality flag based on analytics thresholds.
 * Returns null when fewer than 20 attempts have been recorded.
 */
export function determineQualityFlag(
  successRate: number,
  discriminationIndex: number,
  totalAttempts: number
): string | null {
  if (totalAttempts < 20) return null;
  if (discriminationIndex < 0.2) return "low_discrimination";
  if (successRate > 0.95) return "too_easy";
  if (successRate < 0.1) return "too_hard";
  return "good";
}
