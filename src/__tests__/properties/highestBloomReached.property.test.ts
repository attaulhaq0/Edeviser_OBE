// Feature: adaptive-quiz-generation, Property 30: Highest Bloom's level requires 2 correct answers
// **Validates: Requirements 28.2**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { highestBloomReached, type BloomAttempt } from '@/lib/bloomsClimb';

/** Arbitrary for a single BloomAttempt. */
const bloomAttemptArb: fc.Arbitrary<BloomAttempt> = fc.record({
  bloomLevel: fc.integer({ min: 1, max: 6 }),
  correct: fc.boolean(),
});

/** Arbitrary for a non-empty array of BloomAttempts. */
const attemptsArb = fc.array(bloomAttemptArb, { minLength: 1, maxLength: 60 });

describe("Highest Bloom's level requires 2 correct answers — property-based tests", () => {
  it('P30a: returns 0 when no level has 2+ correct answers', () => {
    // Generate attempts where each level has at most 1 correct answer
    const atMostOneCorrectPerLevel = fc
      .array(fc.integer({ min: 1, max: 6 }), { minLength: 1, maxLength: 6 })
      .chain((levels) => {
        const uniqueLevels = [...new Set(levels)];
        // For each unique level, generate exactly 1 correct + some incorrect
        const attemptArbs = uniqueLevels.map((level) =>
          fc.tuple(
            fc.constant({ bloomLevel: level, correct: true } as BloomAttempt),
            fc.array(fc.constant({ bloomLevel: level, correct: false } as BloomAttempt), {
              minLength: 0,
              maxLength: 3,
            }),
          ),
        );
        return fc.tuple(...attemptArbs).map((pairs) =>
          pairs.flatMap(([correct, incorrects]) => [correct, ...incorrects]),
        );
      });

    fc.assert(
      fc.property(atMostOneCorrectPerLevel, (attempts) => {
        const result = highestBloomReached(attempts);
        expect(result).toBe(0);
      }),
      { numRuns: 100 },
    );
  });

  it('P30b: returns 0 for an empty attempts array', () => {
    expect(highestBloomReached([])).toBe(0);
  });

  it('P30c: returns the highest level with 2+ correct answers', () => {
    fc.assert(
      fc.property(attemptsArb, (attempts) => {
        const result = highestBloomReached(attempts);

        // Manually compute expected: count correct per level
        const correctCounts = new Map<number, number>();
        for (const a of attempts) {
          if (a.correct) {
            correctCounts.set(a.bloomLevel, (correctCounts.get(a.bloomLevel) ?? 0) + 1);
          }
        }

        let expected = 0;
        for (const [level, count] of correctCounts) {
          if (count >= 2 && level > expected) {
            expected = level;
          }
        }

        expect(result).toBe(expected);
      }),
      { numRuns: 100 },
    );
  });

  it('P30d: result is always between 0 and 6 inclusive', () => {
    fc.assert(
      fc.property(attemptsArb, (attempts) => {
        const result = highestBloomReached(attempts);
        expect(result).toBeGreaterThanOrEqual(0);
        expect(result).toBeLessThanOrEqual(6);
      }),
      { numRuns: 100 },
    );
  });

  it('P30e: adding a second correct answer at a higher level increases or maintains the result', () => {
    fc.assert(
      fc.property(
        attemptsArb,
        fc.integer({ min: 1, max: 6 }),
        (baseAttempts, targetLevel) => {
          const before = highestBloomReached(baseAttempts);

          // Add 2 correct answers at targetLevel
          const extended: BloomAttempt[] = [
            ...baseAttempts,
            { bloomLevel: targetLevel, correct: true },
            { bloomLevel: targetLevel, correct: true },
          ];
          const after = highestBloomReached(extended);

          // After adding 2 correct at targetLevel, result should be >= before
          expect(after).toBeGreaterThanOrEqual(before);
        },
      ),
      { numRuns: 100 },
    );
  });
});
