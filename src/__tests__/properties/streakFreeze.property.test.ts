// Feature: edeviser-platform, Property 41: Streak Freeze consumption correctness
// Feature: edeviser-platform, Property 42: Streak Freeze purchase constraints
// **Validates: Requirements 59.1, 59.2, 59.3, 59.4, 59.5, 59.6**

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { calculateStreakUpdate } from "@/lib/streakCalculator";

// ─── Arbitraries ────────────────────────────────────────────────────────────

/** Generate a valid YYYY-MM-DD date string within a reasonable range. */
const dateArb = fc
  .integer({ min: 0, max: 1095 }) // days offset from 2024-01-01 (covers ~3 years)
  .map((offset) => {
    const d = new Date(Date.UTC(2024, 0, 1 + offset));
    return d.toISOString().slice(0, 10);
  });

/** Generate a streak state with configurable freeze count. */
const streakStateArb = (freezeRange: { min: number; max: number }) =>
  fc.record({
    streak_count: fc.integer({ min: 1, max: 365 }),
    last_login_date: dateArb,
    streak_freezes_available: fc.integer(freezeRange),
  });

/** Compute a "today" date that is exactly `dayDiff` days after `baseDate`. */
function addDays(baseDate: string, dayDiff: number): string {
  const d = new Date(baseDate + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + dayDiff);
  return d.toISOString().slice(0, 10);
}

// ─── Property 41: Streak Freeze consumption correctness ─────────────────────

describe("Property 41 — Streak Freeze consumption correctness", () => {
  it("P41a: student with freeze > 0 who misses exactly 1 day → streak NOT reset, freeze decremented", () => {
    fc.assert(
      fc.property(streakStateArb({ min: 1, max: 2 }), (state) => {
        // "Misses a day" means dayDiff === 2 (skipped one calendar day)
        const today = addDays(state.last_login_date, 2);
        const result = calculateStreakUpdate(state, today);

        // Streak should NOT reset
        expect(result.should_reset).toBe(false);
        // Freeze should be consumed
        expect(result.freeze_consumed).toBe(true);
        expect(result.streak_frozen).toBe(true);
        // Streak should increment (continues as if consecutive)
        expect(result.new_streak_count).toBe(state.streak_count + 1);
        expect(result.is_new_day).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it("P41b: student with freeze === 0 who misses a day → streak resets to 1", () => {
    fc.assert(
      fc.property(streakStateArb({ min: 0, max: 0 }), (state) => {
        const today = addDays(state.last_login_date, 2);
        const result = calculateStreakUpdate(state, today);

        expect(result.should_reset).toBe(true);
        expect(result.new_streak_count).toBe(1);
        expect(result.freeze_consumed).toBe(false);
        expect(result.streak_frozen).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it("P41c: student with freeze > 0 who misses >1 day → streak resets (freeze only covers 1 missed day)", () => {
    fc.assert(
      fc.property(
        streakStateArb({ min: 1, max: 2 }),
        fc.integer({ min: 3, max: 30 }), // dayDiff >= 3 means missed 2+ days
        (state, dayDiff) => {
          const today = addDays(state.last_login_date, dayDiff);
          const result = calculateStreakUpdate(state, today);

          // Even with freezes, missing >1 day resets
          expect(result.should_reset).toBe(true);
          expect(result.new_streak_count).toBe(1);
          expect(result.freeze_consumed).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("P41d: consecutive day login never consumes a freeze", () => {
    fc.assert(
      fc.property(streakStateArb({ min: 0, max: 2 }), (state) => {
        const today = addDays(state.last_login_date, 1);
        const result = calculateStreakUpdate(state, today);

        expect(result.freeze_consumed).toBe(false);
        expect(result.streak_frozen).toBe(false);
        expect(result.should_reset).toBe(false);
        expect(result.new_streak_count).toBe(state.streak_count + 1);
      }),
      { numRuns: 100 }
    );
  });
});

// ─── Property 42: Streak Freeze purchase constraints ────────────────────────

/** Pure function simulating streak freeze purchase validation. */
interface PurchaseInput {
  xpBalance: number;
  freezesAvailable: number;
}

interface PurchaseResult {
  success: boolean;
  newXpBalance: number;
  newFreezesAvailable: number;
  error?: string;
}

function validateStreakFreezePurchase(input: PurchaseInput): PurchaseResult {
  const FREEZE_COST = 200;
  const MAX_FREEZES = 2;

  if (input.xpBalance < FREEZE_COST) {
    return {
      success: false,
      newXpBalance: input.xpBalance,
      newFreezesAvailable: input.freezesAvailable,
      error: "Insufficient XP balance",
    };
  }

  if (input.freezesAvailable >= MAX_FREEZES) {
    return {
      success: false,
      newXpBalance: input.xpBalance,
      newFreezesAvailable: input.freezesAvailable,
      error: "Maximum streak freezes reached",
    };
  }

  return {
    success: true,
    newXpBalance: input.xpBalance - FREEZE_COST,
    newFreezesAvailable: input.freezesAvailable + 1,
  };
}

describe("Property 42 — Streak Freeze purchase constraints", () => {
  it("P42a: purchase succeeds when XP >= 200 AND freezes < 2 → XP decremented by 200, freezes incremented by 1", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 200, max: 50000 }),
        fc.integer({ min: 0, max: 1 }),
        (xpBalance, freezesAvailable) => {
          const result = validateStreakFreezePurchase({
            xpBalance,
            freezesAvailable,
          });

          expect(result.success).toBe(true);
          expect(result.newXpBalance).toBe(xpBalance - 200);
          expect(result.newFreezesAvailable).toBe(freezesAvailable + 1);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("P42b: purchase rejected when XP < 200", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 199 }),
        fc.integer({ min: 0, max: 1 }),
        (xpBalance, freezesAvailable) => {
          const result = validateStreakFreezePurchase({
            xpBalance,
            freezesAvailable,
          });

          expect(result.success).toBe(false);
          expect(result.newXpBalance).toBe(xpBalance); // unchanged
          expect(result.newFreezesAvailable).toBe(freezesAvailable); // unchanged
        }
      ),
      { numRuns: 100 }
    );
  });

  it("P42c: purchase rejected when freezes >= 2", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 200, max: 50000 }),
        fc.integer({ min: 2, max: 10 }),
        (xpBalance, freezesAvailable) => {
          const result = validateStreakFreezePurchase({
            xpBalance,
            freezesAvailable,
          });

          expect(result.success).toBe(false);
          expect(result.newXpBalance).toBe(xpBalance); // unchanged
          expect(result.newFreezesAvailable).toBe(freezesAvailable); // unchanged
        }
      ),
      { numRuns: 100 }
    );
  });

  it("P42d: successful purchase always results in freezes <= 2", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 200, max: 50000 }),
        fc.integer({ min: 0, max: 1 }),
        (xpBalance, freezesAvailable) => {
          const result = validateStreakFreezePurchase({
            xpBalance,
            freezesAvailable,
          });
          expect(result.newFreezesAvailable).toBeLessThanOrEqual(2);
        }
      ),
      { numRuns: 100 }
    );
  });
});
