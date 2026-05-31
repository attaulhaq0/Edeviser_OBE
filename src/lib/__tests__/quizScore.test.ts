import { describe, it, expect } from "vitest";
import { computeScore } from "../quizScore";

describe("quizScore", () => {
  describe("computeScore", () => {
    it("computes a rounded percentage from correct over total (R3.1, R3.3)", () => {
      expect(computeScore(5, 10)).toBe(50);
      expect(computeScore(10, 10)).toBe(100);
      expect(computeScore(0, 10)).toBe(0);
    });

    it("rounds to the nearest whole percent", () => {
      // 1/3 = 33.33% → 33
      expect(computeScore(1, 3)).toBe(33);
      // 2/3 = 66.66% → 67
      expect(computeScore(2, 3)).toBe(67);
      // 1/8 = 12.5% → 13 (round half up)
      expect(computeScore(1, 8)).toBe(13);
    });

    it("returns 0 when there are no questions (no division by zero)", () => {
      expect(computeScore(0, 0)).toBe(0);
      expect(computeScore(3, 0)).toBe(0);
    });

    it("treats non-positive or non-finite question counts as zero score", () => {
      expect(computeScore(3, -5)).toBe(0);
      expect(computeScore(3, Number.NaN)).toBe(0);
      expect(computeScore(3, Number.POSITIVE_INFINITY)).toBe(0);
    });

    it("clamps correct count so the score never exceeds 100", () => {
      expect(computeScore(15, 10)).toBe(100);
    });

    it("treats negative or non-finite correct counts as zero", () => {
      expect(computeScore(-4, 10)).toBe(0);
      expect(computeScore(Number.NaN, 10)).toBe(0);
    });
  });
});
