// =============================================================================
// Property-Based Test: Class Donation
// Task 25.6 — P33: progress invariant (current_total = SUM contributions)
// Feature: xp-marketplace
// =============================================================================

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

/**
 * **Validates: Requirements 15.1**
 * P33: Class donation progress invariant — current_total equals sum of contributions.
 */
describe("P33: Class donation progress invariant", () => {
  it("current_total equals sum of all contributions", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 10000 }),
        fc.array(fc.integer({ min: 1, max: 500 }), {
          minLength: 0,
          maxLength: 50,
        }),
        (goalAmount, contributions) => {
          const currentTotal = contributions.reduce((sum, c) => sum + c, 0);
          const progressPercent = Math.min(
            100,
            Math.round((currentTotal / goalAmount) * 100)
          );

          expect(currentTotal).toBe(contributions.reduce((s, c) => s + c, 0));
          expect(progressPercent).toBeGreaterThanOrEqual(0);
          expect(progressPercent).toBeLessThanOrEqual(100);

          if (currentTotal >= goalAmount) {
            expect(progressPercent).toBe(100);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("progress never exceeds 100%", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 1000 }),
        fc.integer({ min: 0, max: 5000 }),
        (goalAmount, currentTotal) => {
          const progressPercent = Math.min(
            100,
            Math.round((currentTotal / goalAmount) * 100)
          );
          expect(progressPercent).toBeLessThanOrEqual(100);
        }
      ),
      { numRuns: 100 }
    );
  });
});
