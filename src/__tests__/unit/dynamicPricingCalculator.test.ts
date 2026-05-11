// =============================================================================
// Unit Test: Dynamic Pricing Calculator
// Task 26.2 — Dynamic price computation, bounds enforcement
// =============================================================================

import { describe, it, expect } from "vitest";
import {
  computeDynamicPrice,
  classifyDemand,
} from "@/lib/dynamicPricingCalculator";

describe("Dynamic Pricing Calculator", () => {
  describe("classifyDemand", () => {
    it("classifies high demand when above p75", () => {
      expect(classifyDemand(80, 20, 60)).toBe("high");
    });

    it("classifies low demand when below p25", () => {
      expect(classifyDemand(5, 20, 60)).toBe("low");
    });

    it("classifies normal demand between p25 and p75", () => {
      expect(classifyDemand(40, 20, 60)).toBe("normal");
    });

    it("classifies exactly p25 as normal", () => {
      expect(classifyDemand(20, 20, 60)).toBe("normal");
    });

    it("classifies exactly p75 as normal", () => {
      expect(classifyDemand(60, 20, 60)).toBe("normal");
    });
  });

  describe("computeDynamicPrice", () => {
    it("returns base price for normal demand", () => {
      const result = computeDynamicPrice({
        basePrice: 100,
        purchaseCount: 50,
        p25: 30,
        p75: 70,
      });
      expect(result.dynamicPrice).toBe(100);
      expect(result.isAdjusted).toBe(false);
      expect(result.multiplier).toBe(1);
    });

    it("increases price for high demand", () => {
      const result = computeDynamicPrice({
        basePrice: 100,
        purchaseCount: 140,
        p25: 30,
        p75: 70,
      });
      expect(result.dynamicPrice).toBeGreaterThan(100);
      expect(result.isAdjusted).toBe(true);
      expect(result.demandLevel).toBe("high");
    });

    it("decreases price for low demand", () => {
      const result = computeDynamicPrice({
        basePrice: 100,
        purchaseCount: 0,
        p25: 30,
        p75: 70,
      });
      expect(result.dynamicPrice).toBeLessThan(100);
      expect(result.isAdjusted).toBe(true);
      expect(result.demandLevel).toBe("low");
    });

    it("never goes below 50% of base price", () => {
      const result = computeDynamicPrice({
        basePrice: 100,
        purchaseCount: 0,
        p25: 100,
        p75: 200,
      });
      expect(result.dynamicPrice).toBeGreaterThanOrEqual(50);
    });

    it("never exceeds 150% of base price", () => {
      const result = computeDynamicPrice({
        basePrice: 100,
        purchaseCount: 1000,
        p25: 10,
        p75: 50,
      });
      expect(result.dynamicPrice).toBeLessThanOrEqual(150);
    });

    it("returns 1 for zero base price", () => {
      const result = computeDynamicPrice({
        basePrice: 0,
        purchaseCount: 50,
        p25: 30,
        p75: 70,
      });
      expect(result.dynamicPrice).toBe(1);
    });

    it("always returns an integer", () => {
      const result = computeDynamicPrice({
        basePrice: 77,
        purchaseCount: 100,
        p25: 20,
        p75: 60,
      });
      expect(Number.isInteger(result.dynamicPrice)).toBe(true);
    });
  });
});
