// Feature: adaptive-quiz-generation, Property 21: Mastery failure count triggers recovery at threshold
// **Validates: Requirements 18.1, 18.2**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  countMasteryFailures,
  shouldActivateRecovery,
  type QuizAttemptCLOResult,
} from '@/lib/masteryRecovery';

const CLO_ID = 'clo-test-001';
const MASTERY_THRESHOLD = 70;

/** Arbitrary for a per-CLO score between 0 and 100. */
const cloScoreArb = fc.double({ min: 0, max: 100, noNaN: true });

/** Build a QuizAttemptCLOResult with a specific score for the target CLO. */
const attemptWithScore = (score: number): QuizAttemptCLOResult => ({
  clo_scores: { [CLO_ID]: score },
});

/**
 * Arbitrary that produces an array of attempts where exactly `failCount`
 * attempts have a score below the mastery threshold and the rest are at or above.
 */
const attemptsWithExactFailures = (failCount: number, totalMin: number, totalMax: number) =>
  fc
    .integer({ min: Math.max(totalMin, failCount), max: totalMax })
    .chain((total) => {
      const passCount = total - failCount;
      const failScores = fc.array(
        fc.double({ min: 0, max: MASTERY_THRESHOLD - 0.01, noNaN: true }),
        { minLength: failCount, maxLength: failCount },
      );
      const passScores = fc.array(
        fc.double({ min: MASTERY_THRESHOLD, max: 100, noNaN: true }),
        { minLength: passCount, maxLength: passCount },
      );
      return fc.tuple(failScores, passScores).map(([fails, passes]) =>
        fc.shuffledSubarray([...fails, ...passes], {
          minLength: fails.length + passes.length,
          maxLength: fails.length + passes.length,
        }),
      );
    })
    .chain((shuffled) => shuffled)
    .map((scores) => scores.map(attemptWithScore));

describe('Mastery failure count triggers recovery — property-based tests', () => {
  it('P21a: exactly 2 failures triggers recovery (shouldActivateRecovery returns true)', () => {
    fc.assert(
      fc.property(attemptsWithExactFailures(2, 2, 15), (attempts) => {
        const failures = countMasteryFailures(attempts, CLO_ID, MASTERY_THRESHOLD);
        expect(failures).toBe(2);
        expect(shouldActivateRecovery(failures)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('P21b: 0 failures does not trigger recovery', () => {
    fc.assert(
      fc.property(attemptsWithExactFailures(0, 0, 15), (attempts) => {
        const failures = countMasteryFailures(attempts, CLO_ID, MASTERY_THRESHOLD);
        expect(failures).toBe(0);
        expect(shouldActivateRecovery(failures)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it('P21c: exactly 1 failure does not trigger recovery', () => {
    fc.assert(
      fc.property(attemptsWithExactFailures(1, 1, 15), (attempts) => {
        const failures = countMasteryFailures(attempts, CLO_ID, MASTERY_THRESHOLD);
        expect(failures).toBe(1);
        expect(shouldActivateRecovery(failures)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it('P21d: 3+ failures also triggers recovery (threshold is >=2)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 3, max: 10 }).chain((failCount) =>
          attemptsWithExactFailures(failCount, failCount, 15).map(
            (attempts) => ({ attempts, failCount }),
          ),
        ),
        ({ attempts, failCount }) => {
          const failures = countMasteryFailures(attempts, CLO_ID, MASTERY_THRESHOLD);
          expect(failures).toBe(failCount);
          expect(shouldActivateRecovery(failures)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P21e: countMasteryFailures counts only scores below threshold for the target CLO', () => {
    fc.assert(
      fc.property(
        fc.array(cloScoreArb, { minLength: 1, maxLength: 20 }),
        (scores) => {
          const attempts = scores.map(attemptWithScore);
          const result = countMasteryFailures(attempts, CLO_ID, MASTERY_THRESHOLD);
          const expected = scores.filter((s) => s < MASTERY_THRESHOLD).length;
          expect(result).toBe(expected);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P21f: attempts missing the target CLO are counted as failures (score defaults to 0)', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({ clo_scores: fc.constant({ 'other-clo': 90 }) }),
          { minLength: 1, maxLength: 10 },
        ),
        (attempts) => {
          const failures = countMasteryFailures(attempts, CLO_ID, MASTERY_THRESHOLD);
          expect(failures).toBe(attempts.length);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P21g: empty attempt array yields 0 failures and no recovery', () => {
    const failures = countMasteryFailures([], CLO_ID, MASTERY_THRESHOLD);
    expect(failures).toBe(0);
    expect(shouldActivateRecovery(failures)).toBe(false);
  });

  it('P21h: shouldActivateRecovery boundary — false at 1, true at 2', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 20 }),
        (failureCount) => {
          const result = shouldActivateRecovery(failureCount);
          if (failureCount >= 2) {
            expect(result).toBe(true);
          } else {
            expect(result).toBe(false);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
