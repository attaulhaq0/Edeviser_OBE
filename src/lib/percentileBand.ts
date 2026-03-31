// Task 148.1: Percentile Band utility
// Requirements: 131.1, 131.2, 131.3

export type PercentileBandLabel = 'Top 10%' | 'Top 25%' | 'Top 50%' | 'Bottom 50%';

export type PercentileBandResult =
  | { type: 'exact'; rank: number }
  | { type: 'band'; band: PercentileBandLabel };

/**
 * Calculate percentile band for a student's rank.
 * - Top 10 students always see exact rank (Req 131.1)
 * - Others see percentile band: Top 10%, Top 25%, Top 50%, Bottom 50% (Req 131.2)
 * - Percentile = (rank / totalStudents) * 100 (Req 131.3)
 */
export function calculatePercentileBand(
  rank: number,
  totalStudents: number,
): PercentileBandResult {
  if (totalStudents <= 0 || rank <= 0) {
    return { type: 'exact', rank: Math.max(1, rank) };
  }

  // Top 10 always see exact rank
  if (rank <= 10) {
    return { type: 'exact', rank };
  }

  const percentile = (rank / totalStudents) * 100;

  if (percentile <= 10) return { type: 'band', band: 'Top 10%' };
  if (percentile <= 25) return { type: 'band', band: 'Top 25%' };
  if (percentile <= 50) return { type: 'band', band: 'Top 50%' };
  return { type: 'band', band: 'Bottom 50%' };
}

/**
 * Format a percentile band result for display.
 */
export function formatPercentileBand(result: PercentileBandResult): string {
  if (result.type === 'exact') return `#${result.rank}`;
  return result.band;
}
