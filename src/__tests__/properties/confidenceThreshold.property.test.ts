// Feature: adaptive-quiz-generation, Property 25: Confidence threshold classification
// **Validates: Requirements 21.2, 21.3**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { needsTeacherVerification } from '@/lib/explanationConfidence';

/** Arbitrary for a confidence score in [0, 1]. */
const confidenceArb = fc.double({ min: 0, max: 1, noNaN: true });

/** Arbitrary for a confidence score strictly below 0.8. */
const belowThresholdArb = fc.double({ min: 0, max: 0.7999999999, noNaN: true });

/** Arbitrary for a confidence score at or above 0.8. */
const atOrAboveThresholdArb = fc.double({ min: 0.8, max: 1, noNaN: true });

describe('Confidence threshold classification — property-based tests', () => {
  it('P25a: returns true for any confidence score below 0.8', () => {
    fc.assert(
      fc.property(belowThresholdArb, (confidence) => {
        expect(needsTeacherVerification(confidence)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('P25b: returns false for any confidence score at or above 0.8', () => {
    fc.assert(
      fc.property(atOrAboveThresholdArb, (confidence) => {
        expect(needsTeacherVerification(confidence)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it('P25c: classification is consistent — below 0.8 is true, at or above 0.8 is false', () => {
    fc.assert(
      fc.property(confidenceArb, (confidence) => {
        const result = needsTeacherVerification(confidence);
        if (confidence < 0.8) {
          expect(result).toBe(true);
        } else {
          expect(result).toBe(false);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('P25d: boundary — exactly 0.8 returns false', () => {
    expect(needsTeacherVerification(0.8)).toBe(false);
  });

  it('P25e: boundary — 0 returns true, 1 returns false', () => {
    expect(needsTeacherVerification(0)).toBe(true);
    expect(needsTeacherVerification(1)).toBe(false);
  });
});
