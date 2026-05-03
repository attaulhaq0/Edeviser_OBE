// =============================================================================
// Property-Based Test: Dynamic Pricing Calculator
// Task 25.1 — P26: bounded adjustment (50%–150% of base)
// Feature: xp-marketplace
// =============================================================================

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { computeDynamicPrice } from '@/lib/dynamicPricingCalculator';

/**
 * **Validates: Requirements 15.1**
 * P26: Dynamic price is always bounded between 50% and 150% of base price.
 */
describe('P26: Dynamic pricing bounded adjustment', () => {
  it('dynamic price is always within [50%, 150%] of base price', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10000 }),
        fc.integer({ min: 0, max: 500 }),
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 1, max: 200 }),
        (basePrice, purchaseCount, p25, p75Raw) => {
          const p75 = Math.max(p25 + 1, p75Raw);
          const result = computeDynamicPrice({ basePrice, purchaseCount, p25, p75 });

          const lowerBound = Math.max(1, Math.floor(basePrice * 0.5));
          const upperBound = Math.floor(basePrice * 1.5);

          expect(result.dynamicPrice).toBeGreaterThanOrEqual(lowerBound);
          expect(result.dynamicPrice).toBeLessThanOrEqual(upperBound);
          expect(result.dynamicPrice).toBeGreaterThanOrEqual(1);
          expect(Number.isInteger(result.dynamicPrice)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('multiplier is always between 0.5 and 1.5', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5000 }),
        fc.integer({ min: 0, max: 300 }),
        fc.integer({ min: 1, max: 50 }),
        fc.integer({ min: 1, max: 100 }),
        (basePrice, purchaseCount, p25, p75Raw) => {
          const p75 = Math.max(p25 + 1, p75Raw);
          const result = computeDynamicPrice({ basePrice, purchaseCount, p25, p75 });

          expect(result.multiplier).toBeGreaterThanOrEqual(0.5);
          expect(result.multiplier).toBeLessThanOrEqual(1.5);
        },
      ),
      { numRuns: 100 },
    );
  });
});
