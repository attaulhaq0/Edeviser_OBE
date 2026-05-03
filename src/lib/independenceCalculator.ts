// =============================================================================
// independenceCalculator — Independence score calculation for AI dependency tracking
// =============================================================================

/**
 * Calculate the independence score for a student on a specific CLO.
 *
 * Independence Score = 1 - (AI-assisted submissions / total submissions)
 *
 * An AI-assisted submission is one where the student had a tutor conversation
 * on the same CLO within 1 hour before submission.
 *
 * Edge cases:
 * - 0 total submissions → score 1.0 (fully independent — no data to suggest dependency)
 * - All submissions AI-assisted → score 0.0
 * - Negative values are clamped to 0
 *
 * @param totalSubmissions - Total number of submissions for this CLO
 * @param aiAssistedSubmissions - Number of submissions preceded by AI tutor usage
 * @returns Independence score between 0.0 and 1.0
 */
export function calculateIndependenceScore(
  totalSubmissions: number,
  aiAssistedSubmissions: number,
): number {
  // No submissions means fully independent (no evidence of dependency)
  if (totalSubmissions <= 0) return 1.0;

  // Clamp AI-assisted count to valid range
  const clampedAiAssisted = Math.max(
    0,
    Math.min(aiAssistedSubmissions, totalSubmissions),
  );

  const score = 1 - clampedAiAssisted / totalSubmissions;

  // Clamp result to [0, 1] for safety
  return Math.max(0, Math.min(1, score));
}
