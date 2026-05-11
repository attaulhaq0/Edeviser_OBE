// =============================================================================
// Property-Based Test: Bonus Question
// Task 25.8 — P35: probability bounds (5–30%)
// Feature: xp-marketplace
// =============================================================================

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { bonusQuestionProbabilitySchema } from "@/lib/marketplaceSchemas";

/**
 * **Validates: Requirements 6.1**
 * P35: Bonus question probability is always bounded between 5% and 30%.
 */
describe("P35: Bonus question probability bounds", () => {
  it("accepts values between 5 and 30", () => {
    fc.assert(
      fc.property(fc.integer({ min: 5, max: 30 }), (probability) => {
        const result = bonusQuestionProbabilitySchema.safeParse(probability);
        expect(result.success).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it("rejects values below 5", () => {
    fc.assert(
      fc.property(fc.integer({ min: -100, max: 4 }), (probability) => {
        const result = bonusQuestionProbabilitySchema.safeParse(probability);
        expect(result.success).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it("rejects values above 30", () => {
    fc.assert(
      fc.property(fc.integer({ min: 31, max: 200 }), (probability) => {
        const result = bonusQuestionProbabilitySchema.safeParse(probability);
        expect(result.success).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it("rejects non-integer values", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 5.1, max: 29.9, noNaN: true }),
        (probability) => {
          // Only non-integer doubles
          if (Number.isInteger(probability)) return;
          const result = bonusQuestionProbabilitySchema.safeParse(probability);
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});
