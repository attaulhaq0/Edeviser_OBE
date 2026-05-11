// Feature: xp-marketplace, Property 7: Sale price resolution — highest discount wins
// **Validates: Requirements 3.4, 14.5**

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  computeSalePrice,
  getHighestDiscount,
  type ActiveDiscount,
} from "@/lib/salePriceCalculator";

// ─── Arbitraries ────────────────────────────────────────────────────────────

const discountArb: fc.Arbitrary<ActiveDiscount> = fc.record({
  discount_percentage: fc.integer({ min: 5, max: 90 }),
});

const basePriceArb = fc.integer({ min: 1, max: 50_000 });

// ─── P7: computeSalePrice always >= 1, highest discount wins ────────────────

describe("Property 7 — Sale price resolution, highest discount wins", () => {
  it("P7a: computeSalePrice always returns >= 1", () => {
    fc.assert(
      fc.property(
        basePriceArb,
        fc.array(discountArb, { minLength: 0, maxLength: 10 }),
        (basePrice, discounts) => {
          const result = computeSalePrice(basePrice, discounts);
          expect(result).toBeGreaterThanOrEqual(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("P7b: effective price equals max(1, base - floor(base * maxDiscount / 100))", () => {
    fc.assert(
      fc.property(
        basePriceArb,
        fc.array(discountArb, { minLength: 1, maxLength: 10 }),
        (basePrice, discounts) => {
          const result = computeSalePrice(basePrice, discounts);
          const maxDiscount = getHighestDiscount(discounts);
          const expected = Math.max(
            1,
            basePrice - Math.floor((basePrice * maxDiscount) / 100)
          );
          expect(result).toBe(expected);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("P7c: no discounts returns the base price unchanged", () => {
    fc.assert(
      fc.property(basePriceArb, (basePrice) => {
        const result = computeSalePrice(basePrice, []);
        expect(result).toBe(basePrice);
      }),
      { numRuns: 100 }
    );
  });

  it("P7d: highest discount wins — discounts do not stack additively", () => {
    fc.assert(
      fc.property(
        basePriceArb,
        fc.array(discountArb, { minLength: 2, maxLength: 5 }),
        (basePrice, discounts) => {
          const singleHighest = computeSalePrice(basePrice, [
            { discount_percentage: getHighestDiscount(discounts) },
          ]);
          const withAll = computeSalePrice(basePrice, discounts);
          expect(withAll).toBe(singleHighest);
        }
      ),
      { numRuns: 100 }
    );
  });
});
