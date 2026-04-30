// Feature: adaptive-quiz-generation, Property 10: Preferred Bloom's levels match ability
// **Validates: Requirements 6.4**

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { preferredBloomLevels, type AbilityLevel } from "@/lib/adaptiveEngine";

const abilityArb = fc.constantFrom<AbilityLevel>("high", "medium", "low");

describe("preferredBloomLevels — property-based tests", () => {
  it("P10a: high → [4,5,6]", () => {
    fc.assert(
      fc.property(fc.constant("high" as AbilityLevel), (ability) => {
        const levels = preferredBloomLevels(ability);
        expect(levels).toEqual([4, 5, 6]);
      }),
      { numRuns: 100 }
    );
  });

  it("P10b: medium → [2,3,4]", () => {
    fc.assert(
      fc.property(fc.constant("medium" as AbilityLevel), (ability) => {
        const levels = preferredBloomLevels(ability);
        expect(levels).toEqual([2, 3, 4]);
      }),
      { numRuns: 100 }
    );
  });

  it("P10c: low → [1,2]", () => {
    fc.assert(
      fc.property(fc.constant("low" as AbilityLevel), (ability) => {
        const levels = preferredBloomLevels(ability);
        expect(levels).toEqual([1, 2]);
      }),
      { numRuns: 100 }
    );
  });

  it("P10d: all returned values are in [1,6] for any ability level", () => {
    fc.assert(
      fc.property(abilityArb, (ability) => {
        const levels = preferredBloomLevels(ability);
        expect(levels.length).toBeGreaterThan(0);
        for (const level of levels) {
          expect(level).toBeGreaterThanOrEqual(1);
          expect(level).toBeLessThanOrEqual(6);
        }
      }),
      { numRuns: 100 }
    );
  });
});
