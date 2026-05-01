// =============================================================================
// Property 103: Total Active Days monotonic increment
// Feature: edeviser-platform
// **Validates: Requirements 126.2, 126.3**
// =============================================================================

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

// ─── Pure function mirroring total_active_days logic ─────────────────────────

/**
 * Update total active days. Increments by 1 when student completes at least
 * one habit on a new day. Never decreases.
 */
function updateTotalActiveDays(
  currentTotal: number,
  completedAtLeastOneHabit: boolean,
  isNewDay: boolean
): number {
  if (isNewDay && completedAtLeastOneHabit) {
    return currentTotal + 1;
  }
  return currentTotal;
}

// ─── Properties ──────────────────────────────────────────────────────────────

describe("Property 103: Total Active Days monotonic increment", () => {
  it("total_active_days is monotonically non-decreasing", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1000 }),
        fc.boolean(),
        fc.boolean(),
        (currentTotal, completedHabit, isNewDay) => {
          const newTotal = updateTotalActiveDays(
            currentTotal,
            completedHabit,
            isNewDay
          );
          expect(newTotal).toBeGreaterThanOrEqual(currentTotal);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("increments by exactly 1 when habit completed on new day", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 1000 }), (currentTotal) => {
        const newTotal = updateTotalActiveDays(currentTotal, true, true);
        expect(newTotal).toBe(currentTotal + 1);
      }),
      { numRuns: 100 }
    );
  });

  it("does not increment when no habit completed", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1000 }),
        fc.boolean(),
        (currentTotal, isNewDay) => {
          const newTotal = updateTotalActiveDays(currentTotal, false, isNewDay);
          expect(newTotal).toBe(currentTotal);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("does not increment on same-day login", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 1000 }), (currentTotal) => {
        const newTotal = updateTotalActiveDays(currentTotal, true, false);
        expect(newTotal).toBe(currentTotal);
      }),
      { numRuns: 100 }
    );
  });

  it("stays non-negative after any sequence of updates", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            completedHabit: fc.boolean(),
            isNewDay: fc.boolean(),
          }),
          { minLength: 1, maxLength: 50 }
        ),
        (updates) => {
          let total = 0;
          for (const u of updates) {
            total = updateTotalActiveDays(total, u.completedHabit, u.isNewDay);
            expect(total).toBeGreaterThanOrEqual(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
