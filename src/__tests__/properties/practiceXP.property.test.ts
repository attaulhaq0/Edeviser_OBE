// Feature: adaptive-quiz-generation, Property 27: Practice mode XP is fixed at 10
// **Validates: Requirements 25.1, 25.3**

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { computePracticeXP } from "@/lib/bloomsClimb";

describe("Practice mode XP is fixed at 10 — property-based tests", () => {
  it("P27a: computePracticeXP always returns exactly 10", () => {
    fc.assert(
      fc.property(fc.anything(), () => {
        expect(computePracticeXP()).toBe(10);
      }),
      { numRuns: 100 }
    );
  });

  it("P27b: return value is a number and equals 10 regardless of invocation count", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 50 }), (callCount) => {
        for (let i = 0; i < callCount; i++) {
          const result = computePracticeXP();
          expect(typeof result).toBe("number");
          expect(result).toBe(10);
        }
      }),
      { numRuns: 100 }
    );
  });

  it("P27c: practice XP is independent of any external factors", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 1, max: 5, noNaN: true }),
        fc.boolean(),
        fc.integer({ min: 1, max: 6 }),
        () => {
          // Regardless of difficulty, correctness, or bloom level,
          // computePracticeXP always returns 10
          expect(computePracticeXP()).toBe(10);
        }
      ),
      { numRuns: 100 }
    );
  });
});
