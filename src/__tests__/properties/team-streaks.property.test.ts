// Feature: edeviser-platform, Property 105: Team streak calculation
// **Validates: Requirements 119.1, 119.2**

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  calculateTeamStreakUpdate,
  type TeamStreakState,
} from "@/lib/teamStreakCalculator";

// Generate a valid YYYY-MM-DD date string
const dateArb = fc
  .integer({ min: 0, max: 1095 }) // 0-1095 days from 2024-01-01
  .map((offset) => {
    const d = new Date("2024-01-01T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + offset);
    return d.toISOString().slice(0, 10);
  });

const teamStreakStateArb = fc.record({
  streak_current: fc.integer({ min: 0, max: 365 }),
  streak_longest: fc.integer({ min: 0, max: 365 }),
  last_streak_date: fc.oneof(dateArb, fc.constant(null)),
});

// Ensure streak_longest >= streak_current
const validTeamStreakStateArb = teamStreakStateArb.map((s) => ({
  ...s,
  streak_longest: Math.max(s.streak_longest, s.streak_current),
}));

describe("Property 105: Team streak calculation", () => {
  it("streak increments only when ALL members log in on consecutive day", () => {
    fc.assert(
      fc.property(
        validTeamStreakStateArb,
        dateArb,
        (state: TeamStreakState, today: string) => {
          // Consecutive day scenario
          const yesterday = new Date(today + "T00:00:00Z");
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().slice(0, 10);

          const consecutiveState: TeamStreakState = {
            ...state,
            last_streak_date: yesterdayStr,
          };

          // All members logged in → streak increments
          const result = calculateTeamStreakUpdate(
            consecutiveState,
            today,
            true
          );
          expect(result.new_streak_current).toBe(
            consecutiveState.streak_current + 1
          );
          expect(result.is_new_day).toBe(true);
        }
      ),
      { numRuns: 200 }
    );
  });

  it("streak resets when any member misses a day", () => {
    fc.assert(
      fc.property(
        validTeamStreakStateArb.filter((s) => s.last_streak_date !== null),
        dateArb,
        (state: TeamStreakState, today: string) => {
          // Ensure today is different from last_streak_date
          if (state.last_streak_date === today) return;

          // Not all members logged in → streak resets to 0
          const result = calculateTeamStreakUpdate(state, today, false);
          expect(result.new_streak_current).toBe(0);
        }
      ),
      { numRuns: 200 }
    );
  });

  it("streak_longest never decreases", () => {
    fc.assert(
      fc.property(
        validTeamStreakStateArb,
        dateArb,
        fc.boolean(),
        (state: TeamStreakState, today: string, allLoggedIn: boolean) => {
          const result = calculateTeamStreakUpdate(state, today, allLoggedIn);
          expect(result.new_streak_longest).toBeGreaterThanOrEqual(
            state.streak_longest
          );
        }
      ),
      { numRuns: 200 }
    );
  });

  it("same-day login is a no-op", () => {
    fc.assert(
      fc.property(
        validTeamStreakStateArb.filter((s) => s.last_streak_date !== null),
        (state: TeamStreakState) => {
          const result = calculateTeamStreakUpdate(
            state,
            state.last_streak_date!,
            true
          );
          expect(result.is_new_day).toBe(false);
          expect(result.new_streak_current).toBe(state.streak_current);
          expect(result.new_streak_longest).toBe(state.streak_longest);
        }
      ),
      { numRuns: 200 }
    );
  });
});
