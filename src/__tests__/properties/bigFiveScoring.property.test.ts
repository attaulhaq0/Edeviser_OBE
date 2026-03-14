// Feature: student-onboarding-profiling, Property 1, 4, 8
// P1: Big Five trait scores bounded [0,100]
// P4: Big Five score calculation is deterministic
// P8: Reverse-scored personality items invert correctly
// **Validates: Requirements 11.1, 11.4**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { calculateBigFiveScores, type PersonalityResponse } from '@/lib/scoreCalculator';

const BIG_FIVE_DIMENSIONS = ['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism'] as const;

const personalityResponseArb = (dimension: string): fc.Arbitrary<PersonalityResponse> =>
  fc.record({
    dimension: fc.constant(dimension),
    selected_option: fc.integer({ min: 1, max: 5 }),
    weight: fc.constantFrom(1, -1),
  });

/** Generates a full set of 25 responses (5 per dimension) */
const fullResponseSetArb: fc.Arbitrary<PersonalityResponse[]> =
  fc.tuple(
    ...BIG_FIVE_DIMENSIONS.map((dim) => fc.array(personalityResponseArb(dim), { minLength: 5, maxLength: 5 })),
  ).map((arrays) => arrays.flat());

/** Generates a partial set (1-5 per dimension, for Day 1 / partial scenarios) */
const partialResponseSetArb: fc.Arbitrary<PersonalityResponse[]> =
  fc.tuple(
    ...BIG_FIVE_DIMENSIONS.map((dim) => fc.array(personalityResponseArb(dim), { minLength: 0, maxLength: 5 })),
  ).map((arrays) => arrays.flat()).filter((arr) => arr.length > 0);

describe('calculateBigFiveScores — property-based tests', () => {
  it('P1: all trait scores are bounded [0, 100] for any valid full response set', () => {
    fc.assert(
      fc.property(fullResponseSetArb, (responses) => {
        const scores = calculateBigFiveScores(responses);
        for (const dim of BIG_FIVE_DIMENSIONS) {
          expect(scores[dim]).toBeGreaterThanOrEqual(0);
          expect(scores[dim]).toBeLessThanOrEqual(100);
          expect(Number.isInteger(scores[dim])).toBe(true);
        }
      }),
      { numRuns: 200 },
    );
  });

  it('P1: all trait scores are bounded [0, 100] for partial response sets', () => {
    fc.assert(
      fc.property(partialResponseSetArb, (responses) => {
        const scores = calculateBigFiveScores(responses);
        for (const dim of BIG_FIVE_DIMENSIONS) {
          expect(scores[dim]).toBeGreaterThanOrEqual(0);
          expect(scores[dim]).toBeLessThanOrEqual(100);
          expect(Number.isInteger(scores[dim])).toBe(true);
        }
      }),
      { numRuns: 200 },
    );
  });

  it('P4: score calculation is deterministic — same inputs produce same outputs', () => {
    fc.assert(
      fc.property(fullResponseSetArb, (responses) => {
        const first = calculateBigFiveScores(responses);
        const second = calculateBigFiveScores(responses);
        expect(first).toEqual(second);
      }),
      { numRuns: 100 },
    );
  });

  it('P8: reverse-scored items (weight=-1) invert correctly: contribution = 6 - v', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...BIG_FIVE_DIMENSIONS),
        fc.integer({ min: 1, max: 5 }),
        (dimension, selectedOption) => {
          // Single positive-weight response
          const positiveResponse: PersonalityResponse[] = [
            { dimension, selected_option: selectedOption, weight: 1 },
          ];
          const positiveScores = calculateBigFiveScores(positiveResponse);

          // Single negative-weight response
          const negativeResponse: PersonalityResponse[] = [
            { dimension, selected_option: selectedOption, weight: -1 },
          ];
          const negativeScores = calculateBigFiveScores(negativeResponse);

          // For weight=+1: contribution = v, score = (v/5)*100
          const expectedPositive = Math.round((selectedOption / 5) * 100);
          expect(positiveScores[dimension]).toBe(expectedPositive);

          // For weight=-1: contribution = 6-v, score = ((6-v)/5)*100
          const expectedNegative = Math.round(((6 - selectedOption) / 5) * 100);
          expect(negativeScores[dimension]).toBe(expectedNegative);
        },
      ),
      { numRuns: 100 },
    );
  });
});
