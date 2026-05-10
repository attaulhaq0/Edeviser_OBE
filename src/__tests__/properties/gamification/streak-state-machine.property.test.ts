// Feature: pre-deployment-e2e-audit, Property 10: Streak state machine correctness
// **Validates: Requirements 8.4**
//
// calculateStreakUpdate must (a) increment on a consecutive-day login,
// (b) reset on a missed day beyond freeze, (c) preserve the streak on a
// single missed day when a freeze is consumed, and (d) be a no-op on a
// same-day login.

import { describe, it, expect } from "vitest";
import fc from "fast-check";

import {
  calculateStreakUpdate,
  type StreakState,
} from "@/lib/streakCalculator";

import {
  arbitraryLoginTimeline,
  dateStringFor,
} from "@/__tests__/properties/_generators/loginTimeline";

describe("Property 10 — streak state machine correctness", () => {
  it("same-day login never increments the streak", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 365 }), (dayOffset) => {
        const dateStr = dateStringFor(dayOffset);
        const state: StreakState = {
          streak_count: 5,
          last_login_date: dateStr,
          streak_freezes_available: 0,
        };
        const result = calculateStreakUpdate(state, dateStr);
        expect(result.new_streak_count).toBe(5);
        expect(result.is_new_day).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it("consecutive-day login increments by exactly 1", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 365 }),
        fc.nat({ max: 100 }),
        (dayOffset, startingCount) => {
          const today = dateStringFor(dayOffset + 1);
          const state: StreakState = {
            streak_count: startingCount,
            last_login_date: dateStringFor(dayOffset),
            streak_freezes_available: 0,
          };
          const result = calculateStreakUpdate(state, today);
          expect(result.new_streak_count).toBe(startingCount + 1);
          expect(result.is_new_day).toBe(true);
          expect(result.should_reset).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("missed day with freeze available preserves the streak and consumes the freeze", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 365 }),
        fc.nat({ max: 100 }),
        (dayOffset, startingCount) => {
          const today = dateStringFor(dayOffset + 2); // skipped one calendar day
          const state: StreakState = {
            streak_count: startingCount,
            last_login_date: dateStringFor(dayOffset),
            streak_freezes_available: 1,
          };
          const result = calculateStreakUpdate(state, today);
          expect(result.freeze_consumed).toBe(true);
          expect(result.streak_frozen).toBe(true);
          expect(result.should_reset).toBe(false);
          expect(result.new_streak_count).toBe(startingCount + 1);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("missed day with no freeze resets streak to 1", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 365 }),
        fc.integer({ min: 2, max: 30 }),
        fc.nat({ max: 100 }),
        (dayOffset, skipDays, startingCount) => {
          const today = dateStringFor(dayOffset + skipDays);
          const state: StreakState = {
            streak_count: startingCount,
            last_login_date: dateStringFor(dayOffset),
            streak_freezes_available: 0,
          };
          const result = calculateStreakUpdate(state, today);
          expect(result.should_reset).toBe(true);
          expect(result.new_streak_count).toBe(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("is deterministic — the same input yields the same result", () => {
    fc.assert(
      fc.property(arbitraryLoginTimeline(), (timeline) => {
        let state: StreakState = {
          streak_count: 0,
          last_login_date: null,
          streak_freezes_available: 0,
        };
        for (const day of timeline) {
          if (!day.loggedIn) continue;
          const dateStr = dateStringFor(day.dayIndex);
          const r1 = calculateStreakUpdate(state, dateStr);
          const r2 = calculateStreakUpdate(state, dateStr);
          expect(r2).toEqual(r1);
          state = {
            streak_count: r1.new_streak_count,
            last_login_date: dateStr,
            streak_freezes_available: Math.max(
              0,
              state.streak_freezes_available - (r1.freeze_consumed ? 1 : 0)
            ),
          };
        }
      }),
      { numRuns: 100 }
    );
  });
});
