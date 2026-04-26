// Task 26.2: Dynamic pricing calculator — price computation, bounds enforcement
import { describe, it, expect } from 'vitest';
import { computeDynamicPrice, type DynamicPricingInput } from '@/lib/dynamicPricingCalculator';

describe('computeDynamicPrice', () => {
  it('returns base price when dynamic pricing is disabled', () => {
    const input: DynamicPricingInput = {
      basePrice: 100,
      purchaseCount: 50,
      categoryAveragePurchases: 10,
      dynamicPricingEnabled: false,
    };
    const result = computeDynamicPrice(input);
    expect(result.effectivePrice).toBe(100);
    expect(result.adjustmentPercent).toBe(0);
    expect(result.demandLevel).toBe('normal');
  });

  it('returns base price when category average is 0', () => {
    const input: DynamicPricingInput = {
      basePrice: 200,
      purchaseCount: 10,
      categoryAveragePurchases: 0,
      dynamicPricingEnabled: true,
    };
    const result = computeDynamicPrice(input);
    expect(result.effectivePrice).toBe(200);
  });

  it('increases price for high-demand items', () => {
    const input: DynamicPricingInput = {
      basePrice: 100,
      purchaseCount: 30,
      categoryAveragePurchases: 10,
      dynamicPricingEnabled: true,
    };
    const result = computeDynamicPrice(input);
    expect(result.effectivePrice).toBeGreaterThan(100);
    expect(result.adjustmentPercent).toBeGreaterThan(0);
  });

  it('decreases price for low-demand items', () => {
    const input: DynamicPricingInput = {
      basePrice: 100,
      purchaseCount: 2,
      categoryAveragePurchases: 20,
      dynamicPricingEnabled: true,
    };
    const result = computeDynamicPrice(input);
    expect(result.effectivePrice).toBeLessThan(100);
    expect(result.adjustmentPercent).toBeLessThan(0);
  });

  it('enforces upper bound of 150% of base price', () => {
    const input: DynamicPricingInput = {
      basePrice: 100,
      purchaseCount: 1000,
      categoryAveragePurchases: 1,
      dynamicPricingEnabled: true,
    };
    const result = computeDynamicPrice(input);
    expect(result.effectivePrice).toBeLessThanOrEqual(150);
  });

  it('enforces lower bound of 50% of base price', () => {
    const input: DynamicPricingInput = {
      basePrice: 100,
      purchaseCount: 0,
      categoryAveragePurchases: 100,
      dynamicPricingEnabled: true,
    };
    const result = computeDynamicPrice(input);
    expect(result.effectivePrice).toBeGreaterThanOrEqual(50);
  });

  it('minimum effective price is 1', () => {
    const input: DynamicPricingInput = {
      basePrice: 1,
      purchaseCount: 0,
      categoryAveragePurchases: 100,
      dynamicPricingEnabled: true,
    };
    const result = computeDynamicPrice(input);
    expect(result.effectivePrice).toBeGreaterThanOrEqual(1);
  });

  it('classifies demand level correctly', () => {
    // Low demand
    const low = computeDynamicPrice({
      basePrice: 100, purchaseCount: 1, categoryAveragePurchases: 10, dynamicPricingEnabled: true,
    });
    expect(low.demandLevel).toBe('low');

    // High demand
    const high = computeDynamicPrice({
      basePrice: 100, purchaseCount: 20, categoryAveragePurchases: 10, dynamicPricingEnabled: true,
    });
    expect(high.demandLevel).toBe('high');

    // Normal demand
    const normal = computeDynamicPrice({
      basePrice: 100, purchaseCount: 10, categoryAveragePurchases: 10, dynamicPricingEnabled: true,
    });
    expect(normal.demandLevel).toBe('normal');
  });
});
