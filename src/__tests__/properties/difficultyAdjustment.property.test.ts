// Feature: adaptive-quiz-generation, Property 8: Difficulty adjustment is bounded
// **Validates: Requirements 6.2, 6.3**

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { adjustDifficulty } from "@/lib/adaptiveEngine";

describe("adjustDifficulty — property-based tests", () => {
  it("P8a: result is always in [1.0, 5.0] for any current difficulty and correctness", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 1.0, max: 5.0, noNaN: true }),
        fc.boolean(),
        (current, wasCorrect) => {
          const result = adjustDifficulty(current, wasCorrect);
          expect(result).toBeGreaterThanOrEqual(1.0);
          expect(result).toBeLessThanOrEqual(5.0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("P8b: correct answer increases difficulty by +0.3, capped at 5.0", () => {
    fc.assert(
      fc.property(fc.double({ min: 1.0, max: 5.0, noNaN: true }), (current) => {
        const result = adjustDifficulty(current, true);
        const expected = Math.min(5.0, current + 0.3);
        expect(result).toBeCloseTo(expected, 10);
        expect(result).toBeLessThanOrEqual(5.0);
      }),
      { numRuns: 100 }
    );
  });

  it("P8c: incorrect answer decreases difficulty by -0.5, floored at 1.0", () => {
    fc.assert(
      fc.property(fc.double({ min: 1.0, max: 5.0, noNaN: true }), (current) => {
        const result = adjustDifficulty(current, false);
        const expected = Math.max(1.0, current - 0.5);
        expect(result).toBeCloseTo(expected, 10);
        expect(result).toBeGreaterThanOrEqual(1.0);
      }),
      { numRuns: 100 }
    );
  });

  it("P8d: repeated correct answers from 1.0 never exceed 5.0", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 50 }), (steps) => {
        let difficulty = 1.0;
        for (let i = 0; i < steps; i++) {
          difficulty = adjustDifficulty(difficulty, true);
        }
        expect(difficulty).toBeLessThanOrEqual(5.0);
        expect(difficulty).toBeGreaterThanOrEqual(1.0);
      }),
      { numRuns: 100 }
    );
  });

  it("P8e: repeated incorrect answers from 5.0 never go below 1.0", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 50 }), (steps) => {
        let difficulty = 5.0;
        for (let i = 0; i < steps; i++) {
          difficulty = adjustDifficulty(difficulty, false);
        }
        expect(difficulty).toBeGreaterThanOrEqual(1.0);
        expect(difficulty).toBeLessThanOrEqual(5.0);
      }),
      { numRuns: 100 }
    );
  });
});
