/**
 * Independence Score Calculator
 *
 * Calculates a student's independence score per CLO.
 * Independence Score = 1 - (AI-assisted submissions / total submissions)
 *
 * An AI-assisted submission is one preceded by a tutor conversation on the
 * same CLO within 2 hours before submission.
 *
 * Requirement 28: Independence Score Tracking
 */

export interface IndependenceScoreInput {
  /** Total number of submissions for this CLO */
  totalSubmissions: number;
  /** Number of submissions preceded by AI tutor usage within 2 hours */
  aiAssistedSubmissions: number;
}

/**
 * Calculate the independence score for a student on a specific CLO.
 *
 * @param input - Submission counts
 * @returns Independence score between 0.0 and 1.0
 *
 * Properties:
 * - Zero submissions → 1.0 (fully independent by default)
 * - All AI-assisted → 0.0
 * - No AI-assisted → 1.0
 * - Score is always in [0, 1]
 */
export function calculateIndependenceScore(input: IndependenceScoreInput): number {
  const { totalSubmissions, aiAssistedSubmissions } = input;

  // Handle zero submissions: return 1.0 (fully independent)
  if (totalSubmissions <= 0) return 1.0;

  // Clamp AI-assisted count to valid range
  const clampedAiAssisted = Math.max(0, Math.min(aiAssistedSubmissions, totalSubmissions));

  const score = 1 - clampedAiAssisted / totalSubmissions;

  // Ensure score is in [0, 1] range
  return Math.max(0, Math.min(1, score));
}

/**
 * Classify independence score into a color category for display.
 *
 * @param score - Independence score (0.0 to 1.0)
 * @returns Color category: 'green' (≥70%), 'yellow' (40-69%), 'red' (<40%)
 */
export function classifyIndependenceScore(score: number): 'green' | 'yellow' | 'red' {
  if (score >= 0.7) return 'green';
  if (score >= 0.4) return 'yellow';
  return 'red';
}
