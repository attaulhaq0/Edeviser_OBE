import type { CorrelationConfidenceLevel } from "@/types/habits";

/**
 * Maps a data point count to a correlation confidence level.
 *
 * - < 30 → null (below minimum threshold)
 * - 30–59 → 'early_pattern'
 * - 60–89 → 'emerging_trend'
 * - 90+ → 'strong_pattern'
 */
export function getCorrelationConfidenceLevel(
  dataPointCount: number
): CorrelationConfidenceLevel | null {
  if (dataPointCount < 30) return null;
  if (dataPointCount < 60) return "early_pattern";
  if (dataPointCount < 90) return "emerging_trend";
  return "strong_pattern";
}

// ---------------------------------------------------------------------------
// Correlation threshold logic (shared between Edge Function and client)
// ---------------------------------------------------------------------------

export interface CorrelationThresholdResult {
  insights: unknown[];
  insufficient_data: boolean;
  daysUntilReady?: number;
}

/**
 * Applies the correlation data threshold rules:
 * - < 14 days → insufficient data, no daysUntilReady
 * - 14–29 days → insufficient data, daysUntilReady = 30 - dayCount
 * - 30+ days → sufficient data
 *
 * This is the canonical threshold logic used by the
 * compute-habit-correlations Edge Function.
 */
export function applyCorrelationThreshold(
  dayCount: number
): CorrelationThresholdResult {
  if (dayCount < 14) {
    return { insights: [], insufficient_data: true };
  }
  if (dayCount < 30) {
    return {
      insights: [],
      insufficient_data: true,
      daysUntilReady: 30 - dayCount,
    };
  }
  return { insights: [], insufficient_data: false };
}
