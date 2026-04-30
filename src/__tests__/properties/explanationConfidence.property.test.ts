// Feature: adaptive-quiz-generation, Property 24: Explanation confidence computation
// **Validates: Requirements 21.1**

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { computeExplanationConfidence } from "@/lib/explanationConfidence";

/** Arbitrary for a single chunk similarity score in [0, 1]. */
const similarityScoreArb = fc.double({ min: 0, max: 1, noNaN: true });

/** Arbitrary for an array of chunk similarity scores (non-empty). */
const nonEmptyScoresArb = fc.array(similarityScoreArb, {
  minLength: 1,
  maxLength: 30,
});

/** Arbitrary for any array of chunk similarity scores (including empty). */
const scoresArb = fc.array(similarityScoreArb, { minLength: 0, maxLength: 30 });

describe("Explanation confidence computation — property-based tests", () => {
  it("P24a: computeExplanationConfidence returns the average of top 3 scores (or all if fewer than 3)", () => {
    fc.assert(
      fc.property(nonEmptyScoresArb, (scores) => {
        const result = computeExplanationConfidence(scores);
        const sorted = [...scores].sort((a, b) => b - a);
        const top = sorted.slice(0, 3);
        const expected = top.reduce((sum, s) => sum + s, 0) / top.length;
        expect(result).toBeCloseTo(expected, 10);
      }),
      { numRuns: 100 }
    );
  });

  it("P24b: computeExplanationConfidence returns 0 for an empty array", () => {
    expect(computeExplanationConfidence([])).toBe(0);
  });

  it("P24c: result is always in [0, 1] for any input scores in [0, 1]", () => {
    fc.assert(
      fc.property(scoresArb, (scores) => {
        const result = computeExplanationConfidence(scores);
        expect(result).toBeGreaterThanOrEqual(0);
        expect(result).toBeLessThanOrEqual(1);
      }),
      { numRuns: 100 }
    );
  });

  it("P24d: single score returns that score as the confidence", () => {
    fc.assert(
      fc.property(similarityScoreArb, (score) => {
        const result = computeExplanationConfidence([score]);
        expect(result).toBeCloseTo(score, 10);
      }),
      { numRuns: 100 }
    );
  });

  it("P24e: two scores returns the average of both", () => {
    fc.assert(
      fc.property(similarityScoreArb, similarityScoreArb, (a, b) => {
        const result = computeExplanationConfidence([a, b]);
        const expected = (a + b) / 2;
        expect(result).toBeCloseTo(expected, 10);
      }),
      { numRuns: 100 }
    );
  });

  it("P24f: scores beyond the top 3 do not affect the result", () => {
    fc.assert(
      fc.property(
        fc.array(similarityScoreArb, { minLength: 4, maxLength: 30 }),
        (scores) => {
          const result = computeExplanationConfidence(scores);
          const sorted = [...scores].sort((a, b) => b - a);
          const top3Avg = (sorted[0]! + sorted[1]! + sorted[2]!) / 3;
          expect(result).toBeCloseTo(top3Avg, 10);
        }
      ),
      { numRuns: 100 }
    );
  });
});
