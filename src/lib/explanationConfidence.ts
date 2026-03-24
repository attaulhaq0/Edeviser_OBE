/**
 * Computes explanation confidence as the average similarity of top 3 chunks.
 * Returns a value between 0.0 and 1.0.
 * For an empty array, returns 0.
 */
export function computeExplanationConfidence(chunkSimilarities: number[]): number {
  if (chunkSimilarities.length === 0) return 0;
  const topChunks = [...chunkSimilarities]
    .sort((a, b) => b - a)
    .slice(0, 3);
  return topChunks.reduce((sum, s) => sum + s, 0) / topChunks.length;
}

/**
 * Determines if an explanation needs teacher verification.
 * Returns true when confidence is below 0.8.
 */
export function needsTeacherVerification(confidence: number): boolean {
  return confidence < 0.8;
}

/**
 * Determines if a question is frequently missed.
 * Returns true only when success_rate < 0.5 AND total_attempts >= 10.
 */
export function isFrequentlyMissed(successRate: number, totalAttempts: number): boolean {
  return successRate < 0.5 && totalAttempts >= 10;
}
