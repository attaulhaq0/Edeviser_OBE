// Feature: pre-deployment-e2e-audit, Property 8: Bonus XP multiplier application
// **Validates: Requirements 8.2**
//
// XP amount written to xp_transactions equals the base schedule amount
// for a given source multiplied by the active multiplier at event time,
// or multiplied by 1 when no event applies. applyBonusMultiplier is the
// production reference function.

import { describe, it, expect } from "vitest";
import fc from "fast-check";

import { applyBonusMultiplier } from "@/lib/xpLevelCalculator";
import { XP_SCHEDULE } from "@/lib/xpSchedule";
import { XP_SOURCE_NAMES } from "@/__tests__/properties/_generators/xpEvents";

describe("Property 8 — Bonus XP multiplier application", () => {
  it("applyBonusMultiplier(base, 1) is a no-op for every source in the schedule", () => {
    fc.assert(
      fc.property(fc.constantFrom(...XP_SOURCE_NAMES), (source) => {
        const base = XP_SCHEDULE[source];
        expect(applyBonusMultiplier(base, 1)).toBe(base);
      }),
      { numRuns: 100 }
    );
  });

  it("applyBonusMultiplier(base, m) = floor(base * m) for every multiplier ≥ 1", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...XP_SOURCE_NAMES),
        fc.double({ min: 1, max: 10, noNaN: true }),
        (source, multiplier) => {
          const base = XP_SCHEDULE[source];
          expect(applyBonusMultiplier(base, multiplier)).toBe(
            Math.floor(base * multiplier)
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it("multipliers below 1 are rejected (floor to base instead of shrinking XP)", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...XP_SOURCE_NAMES),
        fc.double({ min: 0, max: 0.999, noNaN: true }),
        (source, multiplier) => {
          const base = XP_SCHEDULE[source];
          expect(applyBonusMultiplier(base, multiplier)).toBe(base);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("is monotonic in multiplier — larger multiplier never yields smaller XP", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...XP_SOURCE_NAMES),
        fc.double({ min: 1, max: 5, noNaN: true }),
        fc.double({ min: 0, max: 5, noNaN: true }),
        (source, m1, deltaM) => {
          const m2 = m1 + deltaM;
          const base = XP_SCHEDULE[source];
          expect(applyBonusMultiplier(base, m2)).toBeGreaterThanOrEqual(
            applyBonusMultiplier(base, m1)
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});
