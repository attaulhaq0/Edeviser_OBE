// Feature: student-experience-remediation, Property 7: Quiz score is computed from the latest submitted answers
// For any sequence of submitted answers (each evaluated correct or incorrect) and
// total question count >= 1, the finalized score equals computeScore(totalCorrect,
// totalQuestions) derived from the most recently submitted answers -- independent of
// when finalization is triggered (manual finish or timer expiry) -- where computeScore
// rounds (totalCorrect / totalQuestions) * 100.
// **Validates: Requirements 3.1, 3.3**

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { computeScore } from "@/lib/quizScore";

// Pathological numeric inputs that must never produce NaN/Infinity scores.
const nonFiniteArb = fc.constantFrom(
  Number.NaN,
  Number.POSITIVE_INFINITY,
  Number.NEGATIVE_INFINITY
);

// Any number, including non-finite values and extreme magnitudes.
const anyNumberArb = fc.oneof(
  fc.double({ noNaN: false, noDefaultInfinity: false }),
  fc.integer({ min: -1_000_000, max: 1_000_000 }),
  nonFiniteArb
);

describe("quizScore.computeScore — Property 7: score from latest submitted answers", () => {
  // Core formula: with a valid question count and a correct count within range,
  // the score is exactly the rounded percentage and lands in [0, 100].
  it("equals round(correct/total*100) for in-range answers and stays in [0,100]", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 500 }),
        fc.nat(),
        (totalQuestions, rawCorrect) => {
          // Constrain correct answers to the questions actually presented.
          const totalCorrect = rawCorrect % (totalQuestions + 1);
          const score = computeScore(totalCorrect, totalQuestions);

          expect(score).toBe(Math.round((totalCorrect / totalQuestions) * 100));
          expect(Number.isInteger(score)).toBe(true);
          expect(score).toBeGreaterThanOrEqual(0);
          expect(score).toBeLessThanOrEqual(100);
        }
      ),
      { numRuns: 200 }
    );
  });

  // The result is always a whole-number percentage in [0, 100] for ANY inputs,
  // including negative, non-finite, and extreme magnitudes (no NaN/Infinity leak).
  it("always returns an integer in [0,100] for arbitrary inputs", () => {
    fc.assert(
      fc.property(
        anyNumberArb,
        anyNumberArb,
        (totalCorrect, totalQuestions) => {
          const score = computeScore(totalCorrect, totalQuestions);
          expect(Number.isFinite(score)).toBe(true);
          expect(Number.isInteger(score)).toBe(true);
          expect(score).toBeGreaterThanOrEqual(0);
          expect(score).toBeLessThanOrEqual(100);
        }
      ),
      { numRuns: 200 }
    );
  });

  // No questions / non-positive / non-finite question counts => 0 (no division by zero).
  it("returns 0 when the question count is zero, negative, or non-finite", () => {
    fc.assert(
      fc.property(
        anyNumberArb,
        fc.oneof(fc.integer({ min: -1000, max: 0 }), nonFiniteArb),
        (totalCorrect, totalQuestions) => {
          expect(computeScore(totalCorrect, totalQuestions)).toBe(0);
        }
      ),
      { numRuns: 200 }
    );
  });

  // Undetermined or negative correct counts contribute nothing, even with valid totals.
  it("returns 0 when the correct count is negative or non-finite", () => {
    fc.assert(
      fc.property(
        fc.oneof(fc.integer({ min: -1000, max: -1 }), nonFiniteArb),
        fc.integer({ min: 1, max: 500 }),
        (totalCorrect, totalQuestions) => {
          expect(computeScore(totalCorrect, totalQuestions)).toBe(0);
        }
      ),
      { numRuns: 200 }
    );
  });

  // A miscount above the question count is clamped to the total, so the score caps at 100%.
  it("clamps correct answers to the question count (never exceeds 100)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 500 }),
        fc.integer({ min: 0, max: 10_000 }),
        (totalQuestions, excess) => {
          const totalCorrect = totalQuestions + excess;
          expect(computeScore(totalCorrect, totalQuestions)).toBe(100);
        }
      ),
      { numRuns: 200 }
    );
  });

  // Determinism: the same answers yield the same score regardless of when (or how
  // many times) finalization is triggered -- the trigger-independence of Property 7.
  it("is deterministic for identical inputs (trigger-independent finalization)", () => {
    fc.assert(
      fc.property(
        anyNumberArb,
        anyNumberArb,
        (totalCorrect, totalQuestions) => {
          const first = computeScore(totalCorrect, totalQuestions);
          const second = computeScore(totalCorrect, totalQuestions);
          expect(second).toBe(first);
        }
      ),
      { numRuns: 100 }
    );
  });
});
