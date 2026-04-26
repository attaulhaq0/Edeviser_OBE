import { describe, it, expect } from 'vitest';
import { computeSalePrice } from '@/lib/salePriceCalculator';

describe('computeSalePrice', () => {
  it('returns base price when no active sales', () => {
    expect(computeSalePrice(500, [])).toBe(500);
  });

  it('applies a single discount', () => {
    // 500 - floor(500 * 20 / 100) = 500 - 100 = 400
    expect(computeSalePrice(500, [{ discount_percentage: 20 }])).toBe(400);
  });

  it('applies the highest discount when multiple sales exist', () => {
    // highest is 50%: 500 - floor(500 * 50 / 100) = 500 - 250 = 250
    const sales = [
      { discount_percentage: 20 },
      { discount_percentage: 50 },
      { discount_percentage: 10 },
    ];
    expect(computeSalePrice(500, sales)).toBe(250);
  });

  it('never returns below 1', () => {
    // 90% off 10: 10 - floor(10 * 90 / 100) = 10 - 9 = 1
    expect(computeSalePrice(10, [{ discount_percentage: 90 }])).toBe(1);
    // 90% off 1: 1 - floor(1 * 90 / 100) = 1 - 0 = 1
    expect(computeSalePrice(1, [{ discount_percentage: 90 }])).toBe(1);
  });

  it('handles exact percentage calculations', () => {
    // 50% off 100: 100 - floor(100 * 50 / 100) = 100 - 50 = 50
    expect(computeSalePrice(100, [{ discount_percentage: 50 }])).toBe(50);
  });

  it('floors the discount amount', () => {
    // 33% off 100: 100 - floor(100 * 33 / 100) = 100 - 33 = 67
    expect(computeSalePrice(100, [{ discount_percentage: 33 }])).toBe(67);
    // 33% off 10: 10 - floor(10 * 33 / 100) = 10 - 3 = 7
    expect(computeSalePrice(10, [{ discount_percentage: 33 }])).toBe(7);
  });
});
