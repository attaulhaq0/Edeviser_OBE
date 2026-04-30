// Feature: adaptive-quiz-generation, Property 14: Discrimination index computation
// **Validates: Requirements 9.3**

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { computeDiscriminationIndex } from "@/lib/difficultyCalibration";

describe("computeDiscriminationIndex — property-based tests", () => {
  it("P14a: result is always in [-1.0, 1.0]", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 1, noNaN: true }),
        fc.double({ min: 0, max: 1, noNaN: true }),
        (topRate, bottomRate) => {
          const result = computeDiscriminationIndex(topRate, bottomRate);
          expect(result).toBeGreaterThanOrEqual(-1.0);
          expect(result).toBeLessThanOrEqual(1.0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("P14b: result equals topGroupSuccessRate - bottomGroupSuccessRate", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 1, noNaN: true }),
        fc.double({ min: 0, max: 1, noNaN: true }),
        (topRate, bottomRate) => {
          const result = computeDiscriminationIndex(topRate, bottomRate);
          expect(result).toBeCloseTo(topRate - bottomRate, 10);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("P14c: equal groups produce zero discrimination", () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 1, noNaN: true }), (rate) => {
        const result = computeDiscriminationIndex(rate, rate);
        expect(result).toBeCloseTo(0, 10);
      }),
      { numRuns: 100 }
    );
  });

  it("P14d: when top rate > bottom rate, result is positive (good discrimination)", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 0.99, noNaN: true }),
        fc.double({ min: 0.01, max: 1.0, noNaN: true }),
        (bottomRate, delta) => {
          const topRate = bottomRate + delta;
          if (topRate > 1.0) return;
          const result = computeDiscriminationIndex(topRate, bottomRate);
          expect(result).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});
