// Feature: adaptive-quiz-generation, Property 15: Quality flag determination
// **Validates: Requirements 9.4, 9.5, 11.2**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { determineQualityFlag } from '@/lib/difficultyCalibration';

describe('determineQualityFlag — property-based tests', () => {
  it('P15a: returns null when totalAttempts < 20', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 1, noNaN: true }),
        fc.double({ min: -1, max: 1, noNaN: true }),
        fc.integer({ min: 0, max: 19 }),
        (successRate, discIndex, attempts) => {
          expect(determineQualityFlag(successRate, discIndex, attempts)).toBeNull();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P15b: low discrimination flagged when discIndex < 0.2 and attempts >= 20', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 1, noNaN: true }),
        fc.double({ min: -1, max: 0.199, noNaN: true }),
        fc.integer({ min: 20, max: 500 }),
        (successRate, discIndex, attempts) => {
          expect(determineQualityFlag(successRate, discIndex, attempts)).toBe('low_discrimination');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P15c: too_easy flagged when successRate > 0.95 and discIndex >= 0.2', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.951, max: 1.0, noNaN: true }),
        fc.double({ min: 0.2, max: 1.0, noNaN: true }),
        fc.integer({ min: 20, max: 500 }),
        (successRate, discIndex, attempts) => {
          expect(determineQualityFlag(successRate, discIndex, attempts)).toBe('too_easy');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P15d: too_hard flagged when successRate < 0.10 and discIndex >= 0.2', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 0.099, noNaN: true }),
        fc.double({ min: 0.2, max: 1.0, noNaN: true }),
        fc.integer({ min: 20, max: 500 }),
        (successRate, discIndex, attempts) => {
          expect(determineQualityFlag(successRate, discIndex, attempts)).toBe('too_hard');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P15e: good flag when none of the bad conditions hold and attempts >= 20', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.10, max: 0.95, noNaN: true }),
        fc.double({ min: 0.2, max: 1.0, noNaN: true }),
        fc.integer({ min: 20, max: 500 }),
        (successRate, discIndex, attempts) => {
          expect(determineQualityFlag(successRate, discIndex, attempts)).toBe('good');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P15f: result is always one of the valid flags or null', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 1, noNaN: true }),
        fc.double({ min: -1, max: 1, noNaN: true }),
        fc.integer({ min: 0, max: 500 }),
        (successRate, discIndex, attempts) => {
          const result = determineQualityFlag(successRate, discIndex, attempts);
          expect([null, 'good', 'low_discrimination', 'too_easy', 'too_hard']).toContain(result);
        },
      ),
      { numRuns: 100 },
    );
  });
});
