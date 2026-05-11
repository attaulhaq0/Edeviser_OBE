// =============================================================================
// Unit Test: XP Economist Dashboard
// Task 26.1 — Earn/spend ratio display, inflation indicator
// =============================================================================

import { describe, it, expect } from "vitest";
import {
  computeEarnSpendRatio,
  classifyInflation,
  getStatusLabel,
} from "@/lib/earnSpendRatioCalculator";

describe("XP Economist Dashboard", () => {
  describe("computeEarnSpendRatio", () => {
    it("computes correct ratio for healthy economy", () => {
      const result = computeEarnSpendRatio({
        totalEarned: 3000,
        totalSpent: 1000,
      });
      expect(result.ratio).toBe(3);
      expect(result.status).toBe("healthy");
      expect(result.statusLabel).toBe("Healthy");
    });

    it("detects inflationary economy (ratio > 4)", () => {
      const result = computeEarnSpendRatio({
        totalEarned: 5000,
        totalSpent: 1000,
      });
      expect(result.ratio).toBe(5);
      expect(result.status).toBe("inflationary");
    });

    it("detects deflationary economy (ratio < 2)", () => {
      const result = computeEarnSpendRatio({
        totalEarned: 1000,
        totalSpent: 1000,
      });
      expect(result.ratio).toBe(1);
      expect(result.status).toBe("deflationary");
    });

    it("handles no spending", () => {
      const result = computeEarnSpendRatio({
        totalEarned: 5000,
        totalSpent: 0,
      });
      expect(result.ratio).toBeNull();
      expect(result.status).toBe("no_spending");
    });

    it("clamps negative values to 0", () => {
      const result = computeEarnSpendRatio({
        totalEarned: -100,
        totalSpent: -50,
      });
      expect(result.totalEarned).toBe(0);
      expect(result.totalSpent).toBe(0);
    });
  });

  describe("classifyInflation", () => {
    it("returns no_spending for null", () => {
      expect(classifyInflation(null)).toBe("no_spending");
    });

    it("returns healthy for ratio 2", () => {
      expect(classifyInflation(2)).toBe("healthy");
    });

    it("returns healthy for ratio 4", () => {
      expect(classifyInflation(4)).toBe("healthy");
    });

    it("returns inflationary for ratio 4.1", () => {
      expect(classifyInflation(4.1)).toBe("inflationary");
    });

    it("returns deflationary for ratio 1.9", () => {
      expect(classifyInflation(1.9)).toBe("deflationary");
    });
  });

  describe("getStatusLabel", () => {
    it("returns correct labels", () => {
      expect(getStatusLabel("healthy")).toBe("Healthy");
      expect(getStatusLabel("inflationary")).toBe("Inflationary");
      expect(getStatusLabel("deflationary")).toBe("Deflationary");
      expect(getStatusLabel("no_spending")).toBe("No spending yet");
    });
  });
});
