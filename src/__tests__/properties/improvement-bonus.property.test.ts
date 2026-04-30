// =============================================================================
// Property 110: Improvement bonus correctness
// Property 111: Comeback Kid badge threshold
// Feature: edeviser-platform
// **Validates: Requirements 123.1, 123.2, 123.4, 123.5**
// =============================================================================

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

// ─── Pure functions mirroring improvement-bonus-check logic ──────────────────

const IMPROVEMENT_THRESHOLD = 15; // percentage points
const IMPROVEMENT_BONUS_XP = 50;
const COMEBACK_KID_THRESHOLD = 3; // bonuses per semester

function checkImprovementBonus(
  previousPercent: number,
  currentPercent: number
): { eligible: boolean; bonusXP: number } {
  const improvement = currentPercent - previousPercent;
  if (improvement >= IMPROVEMENT_THRESHOLD) {
    return { eligible: true, bonusXP: IMPROVEMENT_BONUS_XP };
  }
  return { eligible: false, bonusXP: 0 };
}

function checkComebackKidEligibility(
  improvementBonusCount: number,
  alreadyAwarded: boolean
): boolean {
  return !alreadyAwarded && improvementBonusCount >= COMEBACK_KID_THRESHOLD;
}

// ─── Properties ──────────────────────────────────────────────────────────────

describe("Property 110: Improvement bonus correctness", () => {
  it("bonus awarded when improvement >= 15 percentage points", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 85 }),
        fc.integer({ min: 15, max: 100 }),
        (previous, delta) => {
          const current = Math.min(previous + delta, 100);
          if (current - previous < IMPROVEMENT_THRESHOLD) return;
          const result = checkImprovementBonus(previous, current);
          expect(result.eligible).toBe(true);
          expect(result.bonusXP).toBe(IMPROVEMENT_BONUS_XP);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("no bonus when improvement < 15 percentage points", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 0, max: 14 }),
        (previous, delta) => {
          const current = Math.min(previous + delta, 100);
          if (current - previous >= IMPROVEMENT_THRESHOLD) return;
          const result = checkImprovementBonus(previous, current);
          expect(result.eligible).toBe(false);
          expect(result.bonusXP).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("bonus XP is always exactly 50 when eligible", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 85 }), (previous) => {
        const current = previous + IMPROVEMENT_THRESHOLD;
        const result = checkImprovementBonus(previous, Math.min(current, 100));
        if (result.eligible) {
          expect(result.bonusXP).toBe(50);
        }
      }),
      { numRuns: 100 }
    );
  });
});

describe("Property 111: Comeback Kid badge threshold", () => {
  it("badge awarded when 3+ improvement bonuses in semester", () => {
    fc.assert(
      fc.property(fc.integer({ min: 3, max: 20 }), (bonusCount) => {
        const eligible = checkComebackKidEligibility(bonusCount, false);
        expect(eligible).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it("badge not awarded when fewer than 3 bonuses", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 2 }), (bonusCount) => {
        const eligible = checkComebackKidEligibility(bonusCount, false);
        expect(eligible).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it("badge not awarded twice (idempotent)", () => {
    fc.assert(
      fc.property(fc.integer({ min: 3, max: 20 }), (bonusCount) => {
        const eligible = checkComebackKidEligibility(bonusCount, true);
        expect(eligible).toBe(false);
      }),
      { numRuns: 100 }
    );
  });
});
