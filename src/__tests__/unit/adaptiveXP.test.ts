import { describe, it, expect } from "vitest";
import {
  getLevelMultiplier,
  getDifficultyMultiplier,
  getDiminishingMultiplier,
  calculateFinalXP,
  type BloomsLevel,
} from "@/lib/adaptiveXP";

describe("Adaptive XP Calculation Utility", () => {
  describe("getLevelMultiplier", () => {
    it("returns 1.2 for levels 1–5", () => {
      for (const level of [1, 2, 3, 4, 5]) {
        expect(getLevelMultiplier(level)).toBe(1.2);
      }
    });

    it("returns 1.0 for levels 6–10", () => {
      for (const level of [6, 7, 8, 9, 10]) {
        expect(getLevelMultiplier(level)).toBe(1.0);
      }
    });

    it("returns 0.9 for levels 11–15", () => {
      for (const level of [11, 12, 13, 14, 15]) {
        expect(getLevelMultiplier(level)).toBe(0.9);
      }
    });

    it("returns 0.8 for levels 16–20", () => {
      for (const level of [16, 17, 18, 19, 20]) {
        expect(getLevelMultiplier(level)).toBe(0.8);
      }
    });

    it("returns 0.8 for levels above 20", () => {
      expect(getLevelMultiplier(25)).toBe(0.8);
      expect(getLevelMultiplier(50)).toBe(0.8);
    });
  });

  describe("getDifficultyMultiplier", () => {
    it.each<[BloomsLevel, number]>([
      ["Remembering", 1.0],
      ["Understanding", 1.1],
      ["Applying", 1.2],
      ["Analyzing", 1.3],
      ["Evaluating", 1.4],
      ["Creating", 1.5],
    ])("returns %f for %s", (level, expected) => {
      expect(getDifficultyMultiplier(level)).toBe(expected);
    });
  });

  describe("getDiminishingMultiplier", () => {
    it("returns 1.0 for first action (repeatCount 0)", () => {
      expect(getDiminishingMultiplier(0, false)).toBe(1.0);
    });

    it("returns 0.8 for second action (repeatCount 1)", () => {
      expect(getDiminishingMultiplier(1, false)).toBe(0.8);
    });

    it("returns 0.6 for third action (repeatCount 2)", () => {
      expect(getDiminishingMultiplier(2, false)).toBe(0.6);
    });

    it("returns 0.4 for fourth action (repeatCount 3)", () => {
      expect(getDiminishingMultiplier(3, false)).toBeCloseTo(0.4, 10);
    });

    it("returns 0.2 minimum for fifth+ action", () => {
      expect(getDiminishingMultiplier(4, false)).toBe(0.2);
      expect(getDiminishingMultiplier(10, false)).toBe(0.2);
    });

    it("always returns 1.0 for milestones regardless of repeat count", () => {
      expect(getDiminishingMultiplier(0, true)).toBe(1.0);
      expect(getDiminishingMultiplier(3, true)).toBe(1.0);
      expect(getDiminishingMultiplier(10, true)).toBe(1.0);
    });
  });

  describe("calculateFinalXP", () => {
    it("applies all multipliers correctly", () => {
      // base=100, level=3 (1.2x), Applying (1.2x), repeat=0 (1.0x)
      const result = calculateFinalXP(100, 3, ["Applying"], 0, false);
      expect(result).toBe(Math.floor(100 * 1.2 * 1.2 * 1.0)); // 144
    });

    it("uses highest Bloom level for multiple CLOs", () => {
      // base=100, level=7 (1.0x), highest=Creating (1.5x), repeat=0 (1.0x)
      const result = calculateFinalXP(
        100,
        7,
        ["Remembering", "Creating"],
        0,
        false
      );
      expect(result).toBe(Math.floor(100 * 1.0 * 1.5 * 1.0)); // 150
    });

    it("applies diminishing returns for non-milestone actions", () => {
      // base=50, level=1 (1.2x), Remembering (1.0x), repeat=2 (0.6x)
      const result = calculateFinalXP(50, 1, ["Remembering"], 2, false);
      expect(result).toBe(Math.floor(50 * 1.2 * 1.0 * 0.6)); // 36
    });

    it("skips diminishing returns for milestones", () => {
      // base=50, level=1 (1.2x), Remembering (1.0x), repeat=4 but milestone
      const result = calculateFinalXP(50, 1, ["Remembering"], 4, true);
      expect(result).toBe(Math.floor(50 * 1.2 * 1.0 * 1.0)); // 60
    });

    it("returns 0 for zero or negative base XP", () => {
      expect(calculateFinalXP(0, 5, ["Creating"], 0, false)).toBe(0);
      expect(calculateFinalXP(-10, 5, ["Creating"], 0, false)).toBe(0);
    });

    it("floors the result", () => {
      // base=10, level=7 (1.0x), Understanding (1.1x), repeat=0 (1.0x)
      // 10 * 1.0 * 1.1 * 1.0 = 11.0 → 11
      const result = calculateFinalXP(10, 7, ["Understanding"], 0, false);
      expect(result).toBe(11);
    });

    it("handles single CLO in array", () => {
      const result = calculateFinalXP(100, 6, ["Evaluating"], 0, false);
      expect(result).toBe(Math.floor(100 * 1.0 * 1.4 * 1.0)); // 140
    });
  });
});
