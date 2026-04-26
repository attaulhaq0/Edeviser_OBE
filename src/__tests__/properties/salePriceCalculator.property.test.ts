// Feature: xp-marketplace, Property 7: sale price resolution, highest discount wins
// **Validates: Requirements 14.5**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { computeSalePrice, type ActiveSaleEvent } from '@/lib/salePriceCalculator';

// ─── Arbitraries ────────────────────────────────────────────────────────────

const basePriceArb = fc.integer({ min: 1, max: 50000 });
const discountArb = fc.integer({ min: 5, max: 90 });
const saleEventArb: fc.Arbitrary<ActiveSaleEvent> = fc.record({
  discount_percentage: discountArb,
});
const salesArb = fc.array(saleEventArb, { minLength: 0, maxLength: 10 });

// ─── Property 7: sale price resolution ──────────────────────────────────────

describe('Property 7 — Sale price resolution, highest discount wins', () => {
  it('P7a: no active sales returns original price', () => {
    fc.assert(
      fc.property(basePriceArb, (basePrice) => {
        expect(computeSalePrice(basePrice, [])).toBe(basePrice);
      }),
      { numRuns: 100 },
    );
  });

  it('P7b: effective price is always >= 1', () => {
    fc.assert(
      fc.property(basePriceArb, salesArb, (basePrice, sales) => {
        expect(computeSalePrice(basePrice, sales)).toBeGreaterThanOrEqual(1);
      }),
      { numRuns: 100 },
    );
  });

  it('P7c: effective price is always <= base price', () => {
    fc.assert(
      fc.property(basePriceArb, salesArb, (basePrice, sales) => {
        expect(computeSalePrice(basePrice, sales)).toBeLessThanOrEqual(basePrice);
      }),
      { numRuns: 100 },
    );
  });

  it('P7d: highest discount wins (no stacking)', () => {
    fc.assert(
      fc.property(
        basePriceArb,
        fc.array(saleEventArb, { minLength: 2, maxLength: 10 }),
        (basePrice, sales) => {
          const highestDiscount = Math.max(...sales.map((s) => s.discount_percentage));
          const expected = Math.max(1, basePrice - Math.floor((basePrice * highestDiscount) / 100));
          expect(computeSalePrice(basePrice, sales)).toBe(expected);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P7e: single sale applies its discount correctly', () => {
    fc.assert(
      fc.property(basePriceArb, discountArb, (basePrice, discount) => {
        const sales: ActiveSaleEvent[] = [{ discount_percentage: discount }];
        const expected = Math.max(1, basePrice - Math.floor((basePrice * discount) / 100));
        expect(computeSalePrice(basePrice, sales)).toBe(expected);
      }),
      { numRuns: 100 },
    );
  });

  it('P7f: adding a lower discount does not change the result', () => {
    fc.assert(
      fc.property(
        basePriceArb,
        fc.integer({ min: 50, max: 90 }),
        fc.integer({ min: 5, max: 49 }),
        (basePrice, highDiscount, lowDiscount) => {
          const withHigh = computeSalePrice(basePrice, [{ discount_percentage: highDiscount }]);
          const withBoth = computeSalePrice(basePrice, [
            { discount_percentage: highDiscount },
            { discount_percentage: lowDiscount },
          ]);
          expect(withBoth).toBe(withHigh);
        },
      ),
      { numRuns: 100 },
    );
  });
});
