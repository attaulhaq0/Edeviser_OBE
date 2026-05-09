// Feature: pre-deployment-e2e-audit, Property 9: Level formula consistency
// **Validates: Requirements 8.3**
//
// calculateLevel must be monotone non-decreasing in xp, hit known anchors
// (level(0)=1, level(100)=2, level(250)=3), and agree with the progressive
// formula xpRequired = floor(50 * n^1.5) within the documented rounding.

import { describe, it, expect } from "vitest";
import fc from "fast-check";

import { calculateLevel, LEVEL_THRESHOLDS } from "@/lib/xpLevelCalculator";

describe("Property 9 — level formula consistency", () => {
  it("hits the documented anchor points", () => {
    expect(calculateLevel(0)).toBe(1);
    expect(calculateLevel(99)).toBe(1);
    expect(calculateLevel(100)).toBe(2);
    expect(calculateLevel(249)).toBe(2);
    expect(calculateLevel(250)).toBe(3);
  });

  it("is monotonically non-decreasing in xp across a wide range", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10_000_000 }),
        fc.nat({ max: 10_000_000 }),
        (xpA, delta) => {
          const xpB = xpA + delta;
          expect(calculateLevel(xpB)).toBeGreaterThanOrEqual(
            calculateLevel(xpA)
          );
        }
      ),
      { numRuns: 200 }
    );
  });

  it("negative xp clamps to level 1", () => {
    fc.assert(
      fc.property(fc.integer({ min: -10_000, max: -1 }), (xp) => {
        expect(calculateLevel(xp)).toBe(1);
      }),
      { numRuns: 100 }
    );
  });

  it("for n ≥ 4 the threshold matches floor(50 * n^1.5)", () => {
    for (const { level, xpRequired } of LEVEL_THRESHOLDS) {
      if (level >= 4) {
        expect(xpRequired).toBe(Math.floor(50 * Math.pow(level, 1.5)));
      }
    }
  });
});
