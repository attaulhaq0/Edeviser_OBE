// Feature: xp-marketplace, Property 26: bounded adjustment (50%–150% of base)
// **Validates: Requirements 28.2, 28.3, 28.4**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { computeDynamicPrice, type DynamicPricingInput } from '@/lib/dynamicPricingCalculator';

// ─── Arbitraries ────────────────────────────────────────────────────────────

const basePriceArb = fc.integer({ min: 1, max: 10000 });
const purchaseCountArb = fc.integer({ min: 0, max: 500 });
const categoryAvgArb = fc.integer({ min: 1, max: 200 });

// ─── Property 26: Dynamic pricing bounded adjustment ────────────────────────

describe('Property 26 — Dynamic pricing bounded adjustment (50%–150% of base)', () => {
  it('P26a: effective price is always between 50% and 150% of base price when enabled', () => {
    fc.assert(
      fc.property(basePriceArb, purchaseCountArb, categoryAvgArb, (basePrice, purchaseCount, categoryAvg) => {
        const input: DynamicPricingInput = {
          basePrice,
          purchaseCount,
          categoryAveragePurchases: categoryAvg,
          dynamicPricingEnabled: true,
        };
        const result = computeDynamicPrice(input);
        const lowerBound = Math.max(1, Math.round(basePrice * 0.5));
        const upperBound = Math.round(basePrice * 1.5);
        expect(result.effectivePrice).toBeGreaterThanOrEqual(lowerBound);
        expect(result.effectivePrice).toBeLessThanOrEqual(upperBound);
      }),
      { numRuns: 100 },
    );
  });

  it('P26b: effective price equals base price when dynamic pricing is disabled', () => {
    fc.assert(
      fc.property(basePriceArb, purchaseCountArb, categoryAvgArb, (basePrice, purchaseCount, categoryAvg) => {
        const input: DynamicPricingInput = {
          basePrice,
          purchaseCount,
          categoryAveragePurchases: categoryAvg,
          dynamicPricingEnabled: false,
        };
        const result = computeDynamicPrice(input);
        expect(result.effectivePrice).toBe(basePrice);
        expect(result.adjustmentPercent).toBe(0);
        expect(result.demandLevel).toBe('normal');
      }),
      { numRuns: 100 },
    );
  });

  it('P26c: effective price is always at least 1', () => {
    fc.assert(
      fc.property(basePriceArb, purchaseCountArb, categoryAvgArb, (basePrice, purchaseCount, categoryAvg) => {
        const input: DynamicPricingInput = {
          basePrice,
          purchaseCount,
          categoryAveragePurchases: categoryAvg,
          dynamicPricingEnabled: true,
        };
        const result = computeDynamicPrice(input);
        expect(result.effectivePrice).toBeGreaterThanOrEqual(1);
      }),
      { numRuns: 100 },
    );
  });

  it('P26d: adjustment percent is bounded between -50 and +50', () => {
    fc.assert(
      fc.property(basePriceArb, purchaseCountArb, categoryAvgArb, (basePrice, purchaseCount, categoryAvg) => {
        const input: DynamicPricingInput = {
          basePrice,
          purchaseCount,
          categoryAveragePurchases: categoryAvg,
          dynamicPricingEnabled: true,
        };
        const result = computeDynamicPrice(input);
        expect(result.adjustmentPercent).toBeGreaterThanOrEqual(-50);
        expect(result.adjustmentPercent).toBeLessThanOrEqual(50);
      }),
      { numRuns: 100 },
    );
  });
});
