// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import {
  computeCalibratedDifficulty,
  computeDiscriminationIndex,
  determineQualityFlag,
} from "@/lib/difficultyCalibration";

// ── computeCalibratedDifficulty ─────────────────────────────────────

describe("computeCalibratedDifficulty", () => {
  it("returns calibrated = 5.0 for 0% success rate (50 attempts)", () => {
    // calibrated = 5.0 - 4.0 * 0 = 5.0, weight = 1.0
    expect(computeCalibratedDifficulty(3.0, 0.0, 50)).toBe(5.0);
  });

  it("returns calibrated = 1.0 for 100% success rate (50 attempts)", () => {
    // calibrated = 5.0 - 4.0 * 1.0 = 1.0, weight = 1.0
    expect(computeCalibratedDifficulty(3.0, 1.0, 50)).toBe(1.0);
  });

  it("returns calibrated = 3.0 for 50% success rate (50 attempts)", () => {
    // calibrated = 5.0 - 4.0 * 0.5 = 3.0, weight = 1.0
    expect(computeCalibratedDifficulty(3.0, 0.5, 50)).toBe(3.0);
  });

  it("returns original difficulty unchanged for 0 attempts", () => {
    // weight = 0, result = 0 * calibrated + 1 * original = original
    expect(computeCalibratedDifficulty(4.2, 0.8, 0)).toBe(4.2);
  });

  it("returns fully empirical value for 50 attempts (weight = 1.0)", () => {
    // calibrated = 5.0 - 4.0 * 0.6 = 2.6, weight = 1.0
    expect(computeCalibratedDifficulty(4.0, 0.6, 50)).toBeCloseTo(2.6);
  });

  it("returns 50% blend for 25 attempts", () => {
    // calibrated = 5.0 - 4.0 * 0.5 = 3.0, weight = 25/50 = 0.5
    // result = 0.5 * 3.0 + 0.5 * 4.0 = 1.5 + 2.0 = 3.5
    expect(computeCalibratedDifficulty(4.0, 0.5, 25)).toBeCloseTo(3.5);
  });
});

// ── computeDiscriminationIndex ──────────────────────────────────────

describe("computeDiscriminationIndex", () => {
  it("returns 0 when both groups at 0%", () => {
    expect(computeDiscriminationIndex(0.0, 0.0)).toBe(0);
  });

  it("returns 0 when both groups at 100%", () => {
    expect(computeDiscriminationIndex(1.0, 1.0)).toBe(0);
  });

  it("returns 1.0 when top 100% and bottom 0%", () => {
    expect(computeDiscriminationIndex(1.0, 0.0)).toBe(1.0);
  });

  it("returns -1.0 when top 0% and bottom 100%", () => {
    expect(computeDiscriminationIndex(0.0, 1.0)).toBe(-1.0);
  });
});

// ── determineQualityFlag ────────────────────────────────────────────

describe("determineQualityFlag", () => {
  it("returns null for 19 attempts (below threshold)", () => {
    expect(determineQualityFlag(0.5, 0.3, 19)).toBeNull();
  });

  it('returns "good" for 20 attempts with good metrics', () => {
    expect(determineQualityFlag(0.5, 0.3, 20)).toBe("good");
  });

  it('returns "low_discrimination" for discrimination index 0.1', () => {
    expect(determineQualityFlag(0.5, 0.1, 20)).toBe("low_discrimination");
  });

  it('returns "too_easy" for success rate 0.96', () => {
    expect(determineQualityFlag(0.96, 0.3, 20)).toBe("too_easy");
  });

  it('returns "too_hard" for success rate 0.09', () => {
    expect(determineQualityFlag(0.09, 0.3, 20)).toBe("too_hard");
  });

  it('returns "good" for discrimination exactly 0.2 (not low_discrimination)', () => {
    expect(determineQualityFlag(0.5, 0.2, 20)).toBe("good");
  });

  it('returns "good" for success rate exactly 0.95 (not too_easy)', () => {
    expect(determineQualityFlag(0.95, 0.3, 20)).toBe("good");
  });

  it('returns "good" for success rate exactly 0.10 (not too_hard)', () => {
    expect(determineQualityFlag(0.1, 0.3, 20)).toBe("good");
  });
});
