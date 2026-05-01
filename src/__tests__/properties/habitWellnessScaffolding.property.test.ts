// Feature: habit-heatmap, Property 32: Wellness tip rotation determinism
// Feature: habit-heatmap, Property 33: Wellness target progress computation
// **Validates: Requirements 28.2, 30.2, 30.5**

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  getCurrentWellnessTip,
  computeWellnessProgress,
} from "@/lib/wellnessTips";
import type { WellnessTip, WellnessHabitType } from "@/types/habits";

// --- Arbitraries ---

const wellnessHabitTypeArb: fc.Arbitrary<WellnessHabitType> = fc.constantFrom(
  "meditation",
  "hydration",
  "exercise",
  "sleep"
);

/** Generate a non-empty array of rotating tips for a given habit type */
const tipsForTypeArb = (
  habitType: WellnessHabitType
): fc.Arbitrary<WellnessTip[]> =>
  fc.integer({ min: 1, max: 10 }).chain((count) =>
    fc.array(
      fc.record({
        id: fc.string({ minLength: 3, maxLength: 10 }),
        habitType: fc.constant(habitType),
        text: fc.string({ minLength: 5, maxLength: 100 }),
        isOnboarding: fc.constant(false),
      }),
      { minLength: count, maxLength: count }
    )
  );

describe("Habit Wellness Scaffolding Properties", () => {
  // Feature: habit-heatmap, Property 32: Wellness tip rotation determinism
  describe("Property 32: Wellness tip rotation determinism", () => {
    it("should return a valid tip from the array for any habit type", () => {
      fc.assert(
        fc.property(
          wellnessHabitTypeArb.chain((type) =>
            tipsForTypeArb(type).map((tips) => ({ type, tips }))
          ),
          ({ type, tips }) => {
            const result = getCurrentWellnessTip(type, tips);
            expect(result).not.toBeNull();
            // The returned tip should be one of the tips in the array
            expect(tips).toContainEqual(result);
            // The returned tip should match the requested habit type
            expect(result!.habitType).toBe(type);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should return the same tip for the same calendar week (deterministic)", () => {
      fc.assert(
        fc.property(
          wellnessHabitTypeArb.chain((type) =>
            tipsForTypeArb(type).map((tips) => ({ type, tips }))
          ),
          ({ type, tips }) => {
            // Call twice — same week, same result
            const result1 = getCurrentWellnessTip(type, tips);
            const result2 = getCurrentWellnessTip(type, tips);
            expect(result1).toEqual(result2);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should select tip index equal to weekNumber % tipCount", () => {
      fc.assert(
        fc.property(
          wellnessHabitTypeArb.chain((type) =>
            tipsForTypeArb(type).map((tips) => ({ type, tips }))
          ),
          ({ type, tips }) => {
            const result = getCurrentWellnessTip(type, tips);
            const weekNumber = Math.floor(
              Date.now() / (7 * 24 * 60 * 60 * 1000)
            );
            const expectedIndex = weekNumber % tips.length;
            expect(result).toEqual(tips[expectedIndex]);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should return null for empty tip array", () => {
      fc.assert(
        fc.property(wellnessHabitTypeArb, (type) => {
          const result = getCurrentWellnessTip(type, []);
          expect(result).toBeNull();
        }),
        { numRuns: 100 }
      );
    });

    it("should ignore onboarding tips in rotation", () => {
      fc.assert(
        fc.property(wellnessHabitTypeArb, (type) => {
          const onboardingOnly: WellnessTip[] = [
            {
              id: "onboard-1",
              habitType: type,
              text: "Onboarding tip",
              isOnboarding: true,
            },
          ];
          const result = getCurrentWellnessTip(type, onboardingOnly);
          expect(result).toBeNull();
        }),
        { numRuns: 100 }
      );
    });
  });

  // Feature: habit-heatmap, Property 33: Wellness target progress computation
  describe("Property 33: Wellness target progress computation", () => {
    it("should equal min(round((loggedValue / targetValue) * 100), 100) for targetValue > 0", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 1000 }),
          fc.integer({ min: 1, max: 500 }),
          (loggedValue, targetValue) => {
            const progress = computeWellnessProgress(loggedValue, targetValue);
            const expected = Math.min(
              Math.round((loggedValue / targetValue) * 100),
              100
            );
            expect(progress).toBe(expected);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should return value in [0, 100]", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 1000 }),
          fc.integer({ min: 0, max: 500 }),
          (loggedValue, targetValue) => {
            const progress = computeWellnessProgress(loggedValue, targetValue);
            expect(progress).toBeGreaterThanOrEqual(0);
            expect(progress).toBeLessThanOrEqual(100);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should return 100 when loggedValue >= targetValue and targetValue > 0", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 500 }),
          fc.integer({ min: 0, max: 500 }),
          (targetValue, extra) => {
            const loggedValue = targetValue + extra;
            const progress = computeWellnessProgress(loggedValue, targetValue);
            expect(progress).toBe(100);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should return 100 when targetValue is 0 and any value is logged", () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 1000 }), (loggedValue) => {
          const progress = computeWellnessProgress(loggedValue, 0);
          expect(progress).toBe(100);
        }),
        { numRuns: 100 }
      );
    });

    it("should return 0 when targetValue is 0 and no value is logged", () => {
      const progress = computeWellnessProgress(0, 0);
      expect(progress).toBe(0);
    });

    it("should return 0 when loggedValue is 0 and targetValue > 0", () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 500 }), (targetValue) => {
          const progress = computeWellnessProgress(0, targetValue);
          expect(progress).toBe(0);
        }),
        { numRuns: 100 }
      );
    });
  });
});
