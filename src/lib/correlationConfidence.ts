import type { CorrelationConfidenceLevel } from '@/types/habits';

/**
 * Maps a data point count to a correlation confidence level.
 *
 * - < 30 → null (below minimum threshold)
 * - 30–59 → 'early_pattern'
 * - 60–89 → 'emerging_trend'
 * - 90+ → 'strong_pattern'
 */
export function getCorrelationConfidenceLevel(
  dataPointCount: number,
): CorrelationConfidenceLevel | null {
  if (dataPointCount < 30) return null;
  if (dataPointCount < 60) return 'early_pattern';
  if (dataPointCount < 90) return 'emerging_trend';
  return 'strong_pattern';
}
