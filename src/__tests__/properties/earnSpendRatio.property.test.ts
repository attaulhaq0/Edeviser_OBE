// =============================================================================
// Property-Based Test: Earn/Spend Ratio Calculator
// Task 25.2 — P27: ratio computation and inflation status
// Feature: xp-marketplace
// =============================================================================

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  computeEarnSpendRatio,
  classifyInflation,
} from "@/lib/earnSpendRatioCalculator";

/**
 * **Validates: Requirements 15.1**
 * P27: Earn/spend ratio computation is correct and inflation status is consistent.
 */
describe("P27: Earn/spend ratio computation and inflation status", () => {
  it("ratio equals totalEarned / totalSpent when totalSpent > 0", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100000 }),
        fc.integer({ min: 1, max: 100000 }),
        (totalEarned, totalSpent) => {
          const result = computeEarnSpendRatio({ totalEarned, totalSpent });
          const expectedRatio =
            Math.round((totalEarned / totalSpent) * 100) / 100;

          expect(result.ratio).toBe(expectedRatio);
          expect(result.totalEarned).toBe(totalEarned);
          expect(result.totalSpent).toBe(totalSpent);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("ratio is null when totalSpent is 0", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 100000 }), (totalEarned) => {
        const result = computeEarnSpendRatio({ totalEarned, totalSpent: 0 });
        expect(result.ratio).toBeNull();
        expect(result.status).toBe("no_spending");
      }),
      { numRuns: 100 }
    );
  });

  it("inflation status is consistent with ratio value", () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 20, noNaN: true }), (ratio) => {
        const status = classifyInflation(ratio);
        if (ratio >= 2 && ratio <= 4) {
          expect(status).toBe("healthy");
        } else if (ratio > 4) {
          expect(status).toBe("inflationary");
        } else {
          expect(status).toBe("deflationary");
        }
      }),
      { numRuns: 100 }
    );
  });

  it("classifyInflation(null) returns no_spending", () => {
    expect(classifyInflation(null)).toBe("no_spending");
  });
});
