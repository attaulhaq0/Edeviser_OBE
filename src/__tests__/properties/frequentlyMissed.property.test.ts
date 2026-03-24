// Feature: adaptive-quiz-generation, Property 26: Frequently missed question identification
// **Validates: Requirements 22.1**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { isFrequentlyMissed } from '@/lib/explanationConfidence';

/** Arbitrary for success_rate in [0, 1]. */
const successRateArb = fc.double({ min: 0, max: 1, noNaN: true });

/** Arbitrary for total_attempts >= 0. */
const totalAttemptsArb = fc.integer({ min: 0, max: 10000 });

/** Arbitrary for success_rate < 0.5. */
const lowSuccessRateArb = fc.double({ min: 0, max: 0.4999999999, noNaN: true });

/** Arbitrary for success_rate >= 0.5. */
const highSuccessRateArb = fc.double({ min: 0.5, max: 1, noNaN: true });

/** Arbitrary for total_attempts >= 10. */
const sufficientAttemptsArb = fc.integer({ min: 10, max: 10000 });

/** Arbitrary for total_attempts < 10. */
const insufficientAttemptsArb = fc.integer({ min: 0, max: 9 });

describe('Frequently missed question identification — property-based tests', () => {
  it('P26a: returns true only when success_rate < 0.5 AND total_attempts >= 10', () => {
    fc.assert(
      fc.property(successRateArb, totalAttemptsArb, (successRate, totalAttempts) => {
        const result = isFrequentlyMissed(successRate, totalAttempts);
        const expected = successRate < 0.5 && totalAttempts >= 10;
        expect(result).toBe(expected);
      }),
      { numRuns: 100 },
    );
  });

  it('P26b: low success rate with sufficient attempts returns true', () => {
    fc.assert(
      fc.property(lowSuccessRateArb, sufficientAttemptsArb, (successRate, totalAttempts) => {
        expect(isFrequentlyMissed(successRate, totalAttempts)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('P26c: high success rate always returns false regardless of attempts', () => {
    fc.assert(
      fc.property(highSuccessRateArb, totalAttemptsArb, (successRate, totalAttempts) => {
        expect(isFrequentlyMissed(successRate, totalAttempts)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it('P26d: insufficient attempts always returns false regardless of success rate', () => {
    fc.assert(
      fc.property(successRateArb, insufficientAttemptsArb, (successRate, totalAttempts) => {
        expect(isFrequentlyMissed(successRate, totalAttempts)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it('P26e: boundary — success_rate exactly 0.5 with 10 attempts returns false', () => {
    expect(isFrequentlyMissed(0.5, 10)).toBe(false);
  });

  it('P26f: boundary — success_rate 0.49 with exactly 9 attempts returns false', () => {
    expect(isFrequentlyMissed(0.49, 9)).toBe(false);
  });
});
