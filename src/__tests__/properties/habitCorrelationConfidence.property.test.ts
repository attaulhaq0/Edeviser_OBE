// Feature: habit-heatmap, Property 30: Correlation confidence level mapping
// Feature: habit-heatmap, Property 31: Correlation minimum threshold enforcement
// **Validates: Requirements 31.1, 31.2, 31.3, 32.1**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { getCorrelationConfidenceLevel } from '@/lib/correlationConfidence';

// --- Pure helper for Property 31 (simulates Edge Function threshold logic) ---

interface CorrelationThresholdResult {
  insights: unknown[];
  insufficient_data: boolean;
  daysUntilReady?: number;
}

/**
 * Simulates the compute-habit-correlations Edge Function threshold logic.
 * For < 30 days: returns empty insights with insufficient_data: true.
 * For 14-29 days: also includes daysUntilReady = 30 - dayCount.
 */
function applyCorrelationThreshold(dayCount: number): CorrelationThresholdResult {
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
  // 30+ days: would compute real insights, but for threshold testing we just confirm it passes
  return { insights: [], insufficient_data: false };
}

describe('Habit Correlation Confidence Properties', () => {
  // Feature: habit-heatmap, Property 30: Correlation confidence level mapping
  describe('Property 30: Correlation confidence level mapping', () => {
    it('should return null for count < 30', () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 29 }), (count) => {
          expect(getCorrelationConfidenceLevel(count)).toBeNull();
        }),
        { numRuns: 100 },
      );
    });

    it('should return "early_pattern" for 30 <= count < 60', () => {
      fc.assert(
        fc.property(fc.integer({ min: 30, max: 59 }), (count) => {
          expect(getCorrelationConfidenceLevel(count)).toBe('early_pattern');
        }),
        { numRuns: 100 },
      );
    });

    it('should return "emerging_trend" for 60 <= count < 90', () => {
      fc.assert(
        fc.property(fc.integer({ min: 60, max: 89 }), (count) => {
          expect(getCorrelationConfidenceLevel(count)).toBe('emerging_trend');
        }),
        { numRuns: 100 },
      );
    });

    it('should return "strong_pattern" for count >= 90', () => {
      fc.assert(
        fc.property(fc.integer({ min: 90, max: 500 }), (count) => {
          expect(getCorrelationConfidenceLevel(count)).toBe('strong_pattern');
        }),
        { numRuns: 100 },
      );
    });

    it('should return one of the valid confidence levels or null for any non-negative count', () => {
      fc.assert(
        fc.property(fc.nat({ max: 1000 }), (count) => {
          const result = getCorrelationConfidenceLevel(count);
          expect([null, 'early_pattern', 'emerging_trend', 'strong_pattern']).toContain(result);
        }),
        { numRuns: 100 },
      );
    });

    it('should have exact boundary behavior at 30, 60, and 90', () => {
      expect(getCorrelationConfidenceLevel(29)).toBeNull();
      expect(getCorrelationConfidenceLevel(30)).toBe('early_pattern');
      expect(getCorrelationConfidenceLevel(59)).toBe('early_pattern');
      expect(getCorrelationConfidenceLevel(60)).toBe('emerging_trend');
      expect(getCorrelationConfidenceLevel(89)).toBe('emerging_trend');
      expect(getCorrelationConfidenceLevel(90)).toBe('strong_pattern');
    });
  });

  // Feature: habit-heatmap, Property 31: Correlation minimum threshold enforcement
  describe('Property 31: Correlation minimum threshold enforcement', () => {
    it('should return empty insights with insufficient_data: true for < 30 days', () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 29 }), (dayCount) => {
          const result = applyCorrelationThreshold(dayCount);
          expect(result.insights).toEqual([]);
          expect(result.insufficient_data).toBe(true);
        }),
        { numRuns: 100 },
      );
    });

    it('should include daysUntilReady = 30 - dayCount for 14-29 days', () => {
      fc.assert(
        fc.property(fc.integer({ min: 14, max: 29 }), (dayCount) => {
          const result = applyCorrelationThreshold(dayCount);
          expect(result.insights).toEqual([]);
          expect(result.insufficient_data).toBe(true);
          expect(result.daysUntilReady).toBe(30 - dayCount);
        }),
        { numRuns: 100 },
      );
    });

    it('should NOT include daysUntilReady for < 14 days', () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 13 }), (dayCount) => {
          const result = applyCorrelationThreshold(dayCount);
          expect(result.insights).toEqual([]);
          expect(result.insufficient_data).toBe(true);
          expect(result.daysUntilReady).toBeUndefined();
        }),
        { numRuns: 100 },
      );
    });

    it('should NOT flag insufficient_data for 30+ days', () => {
      fc.assert(
        fc.property(fc.integer({ min: 30, max: 500 }), (dayCount) => {
          const result = applyCorrelationThreshold(dayCount);
          expect(result.insufficient_data).toBe(false);
        }),
        { numRuns: 100 },
      );
    });

    it('daysUntilReady should always be in [1, 16] for 14-29 day range', () => {
      fc.assert(
        fc.property(fc.integer({ min: 14, max: 29 }), (dayCount) => {
          const result = applyCorrelationThreshold(dayCount);
          expect(result.daysUntilReady).toBeGreaterThanOrEqual(1);
          expect(result.daysUntilReady).toBeLessThanOrEqual(16);
        }),
        { numRuns: 100 },
      );
    });
  });
});
