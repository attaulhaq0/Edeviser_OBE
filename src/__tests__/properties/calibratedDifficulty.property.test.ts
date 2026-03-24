// Feature: adaptive-quiz-generation, Property 13: Calibrated difficulty formula correctness
// **Validates: Requirements 9.2**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { computeCalibratedDifficulty } from '@/lib/difficultyCalibration';

describe('computeCalibratedDifficulty — property-based tests', () => {
  it('P13a: result is always in [1.0, 5.0] for valid inputs', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 1.0, max: 5.0, noNaN: true }),
        fc.double({ min: 0, max: 1, noNaN: true }),
        fc.integer({ min: 0, max: 500 }),
        (original, successRate, attempts) => {
          const result = computeCalibratedDifficulty(original, successRate, attempts);
          expect(result).toBeGreaterThanOrEqual(1.0);
          expect(result).toBeLessThanOrEqual(5.0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P13b: empirical weight equals min(1.0, totalAttempts / 50)', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 1.0, max: 5.0, noNaN: true }),
        fc.double({ min: 0, max: 1, noNaN: true }),
        fc.integer({ min: 10, max: 200 }),
        (original, successRate, attempts) => {
          const weight = Math.min(1.0, attempts / 50);
          const calibrated = 5.0 - 4.0 * successRate;
          const expected = weight * calibrated + (1 - weight) * original;
          const result = computeCalibratedDifficulty(original, successRate, attempts);
          expect(result).toBeCloseTo(expected, 10);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P13c: at 50+ attempts, weight is 1.0 and result equals calibrated formula', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 1.0, max: 5.0, noNaN: true }),
        fc.double({ min: 0, max: 1, noNaN: true }),
        fc.integer({ min: 50, max: 500 }),
        (original, successRate, attempts) => {
          const result = computeCalibratedDifficulty(original, successRate, attempts);
          const expected = 5.0 - 4.0 * successRate;
          expect(result).toBeCloseTo(expected, 10);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P13d: higher success rate produces lower calibrated difficulty', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 1.0, max: 5.0, noNaN: true }),
        fc.double({ min: 0, max: 0.49, noNaN: true }),
        fc.double({ min: 0.01, max: 0.5, noNaN: true }),
        fc.integer({ min: 1, max: 500 }),
        (original, baseSR, delta, attempts) => {
          const lowerSR = baseSR;
          const higherSR = baseSR + delta;
          if (higherSR > 1.0) return;
          const resultLow = computeCalibratedDifficulty(original, lowerSR, attempts);
          const resultHigh = computeCalibratedDifficulty(original, higherSR, attempts);
          expect(resultHigh).toBeLessThanOrEqual(resultLow);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P13e: at 0 attempts, result equals original difficulty', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 1.0, max: 5.0, noNaN: true }),
        fc.double({ min: 0, max: 1, noNaN: true }),
        (original, successRate) => {
          const result = computeCalibratedDifficulty(original, successRate, 0);
          expect(result).toBeCloseTo(original, 10);
        },
      ),
      { numRuns: 100 },
    );
  });
});
