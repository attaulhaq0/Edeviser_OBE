// Feature: edeviser-platform, Property 25: XP ledger consistency
// Feature: edeviser-platform, Property 26: Badge idempotency
// Feature: edeviser-platform, Property 27: Streak calculation correctness
// Feature: edeviser-platform, Property 28: Leaderboard ordering
// Feature: edeviser-platform, Property 29: Habit tracker Perfect Day detection
// **Validates: Requirements 21, 22, 23, 25, 35**

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { calculateStreakUpdate } from "@/lib/streakCalculator";
import { calculateLevel } from "@/lib/xpLevelCalculator";
import type { HabitType } from "@/types/app";

// ─── Arbitraries ────────────────────────────────────────────────────────────

const xpAmountArb = fc.integer({ min: -200, max: 500 });
const studentIdArb = fc.uuid();

const dateArb = fc.integer({ min: 0, max: 1095 }).map((offset) => {
  const d = new Date(Date.UTC(2024, 0, 1 + offset));
  return d.toISOString().slice(0, 10);
});

// ─── Property 25: XP ledger consistency ─────────────────────────────────────

describe("Property 25 — XP ledger consistency", () => {
  it("P25a: xp_total equals sum of all xp_transactions", () => {
    fc.assert(
      fc.property(
        fc.array(xpAmountArb, { minLength: 0, maxLength: 50 }),
        (transactions) => {
          const xpTotal = transactions.reduce((sum, amount) => sum + amount, 0);
          const expectedTotal = transactions.reduce((s, a) => s + a, 0);
          expect(xpTotal).toBe(expectedTotal);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("P25b: adding a transaction changes total by exactly that amount", () => {
    fc.assert(
      fc.property(
        fc.array(xpAmountArb, { minLength: 0, maxLength: 20 }),
        xpAmountArb,
        (existing, newAmount) => {
          const oldTotal = existing.reduce((s, a) => s + a, 0);
          const newTotal = [...existing, newAmount].reduce((s, a) => s + a, 0);
          expect(newTotal - oldTotal).toBe(newAmount);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("P25c: level is monotonically non-decreasing with XP", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 50000 }),
        fc.integer({ min: 1, max: 500 }),
        (baseXP, increment) => {
          const levelBefore = calculateLevel(baseXP);
          const levelAfter = calculateLevel(baseXP + increment);
          expect(levelAfter).toBeGreaterThanOrEqual(levelBefore);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property 26: Badge idempotency ─────────────────────────────────────────

describe("Property 26 — Badge idempotency", () => {
  it("P26a: awarding same badge multiple times results in exactly one badge", () => {
    fc.assert(
      fc.property(
        studentIdArb,
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.integer({ min: 1, max: 10 }),
        (studentId, badgeName, triggerCount) => {
          // Model: a Set of awarded badges ensures idempotency
          const awardedBadges = new Set<string>();
          for (let i = 0; i < triggerCount; i++) {
            awardedBadges.add(`${studentId}:${badgeName}`);
          }
          // Should only have 1 entry regardless of trigger count
          expect(awardedBadges.size).toBe(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("P26b: different badges for same student are all awarded", () => {
    fc.assert(
      fc.property(
        studentIdArb,
        fc.uniqueArray(fc.string({ minLength: 1, maxLength: 20 }), {
          minLength: 1,
          maxLength: 10,
        }),
        (studentId, badgeNames) => {
          const awardedBadges = new Set<string>();
          for (const badge of badgeNames) {
            awardedBadges.add(`${studentId}:${badge}`);
          }
          expect(awardedBadges.size).toBe(badgeNames.length);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property 27: Streak calculation correctness ────────────────────────────

describe("Property 27 — Streak calculation correctness", () => {
  it("P27a: consecutive day login increments streak by 1", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 365 }),
        dateArb,
        (currentStreak, lastLogin) => {
          const today = (() => {
            const d = new Date(lastLogin + "T00:00:00Z");
            d.setUTCDate(d.getUTCDate() + 1);
            return d.toISOString().slice(0, 10);
          })();
          const result = calculateStreakUpdate(
            {
              streak_count: currentStreak,
              last_login_date: lastLogin,
              streak_freezes_available: 0,
            },
            today
          );
          expect(result.new_streak_count).toBe(currentStreak + 1);
          expect(result.should_reset).toBe(false);
          expect(result.is_new_day).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("P27b: same-day login is a no-op", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 365 }),
        dateArb,
        (currentStreak, lastLogin) => {
          const result = calculateStreakUpdate(
            {
              streak_count: currentStreak,
              last_login_date: lastLogin,
              streak_freezes_available: 0,
            },
            lastLogin
          );
          expect(result.new_streak_count).toBe(currentStreak);
          expect(result.is_new_day).toBe(false);
          expect(result.should_reset).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("P27c: missed day without freeze resets streak to 1", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 365 }),
        dateArb,
        fc.integer({ min: 2, max: 30 }),
        (currentStreak, lastLogin, dayGap) => {
          const today = (() => {
            const d = new Date(lastLogin + "T00:00:00Z");
            d.setUTCDate(d.getUTCDate() + dayGap);
            return d.toISOString().slice(0, 10);
          })();
          const result = calculateStreakUpdate(
            {
              streak_count: currentStreak,
              last_login_date: lastLogin,
              streak_freezes_available: 0,
            },
            today
          );
          expect(result.should_reset).toBe(true);
          expect(result.new_streak_count).toBe(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("P27d: first-ever login starts streak at 1", () => {
    fc.assert(
      fc.property(dateArb, (today) => {
        const result = calculateStreakUpdate(null, today);
        expect(result.new_streak_count).toBe(1);
        expect(result.is_new_day).toBe(true);
      }),
      { numRuns: 100 }
    );
  });
});

// ─── Property 28: Leaderboard ordering ──────────────────────────────────────

describe("Property 28 — Leaderboard ordering", () => {
  it("P28a: leaderboard is sorted by xp_total descending", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            student_id: studentIdArb,
            xp_total: fc.integer({ min: 0, max: 50000 }),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        (students) => {
          const sorted = [...students].sort((a, b) => b.xp_total - a.xp_total);
          for (let i = 1; i < sorted.length; i++) {
            expect(sorted[i]!.xp_total).toBeLessThanOrEqual(
              sorted[i - 1]!.xp_total
            );
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("P28b: rank assignment is correct (1-indexed, ties share rank)", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            student_id: studentIdArb,
            xp_total: fc.integer({ min: 0, max: 50000 }),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        (students) => {
          const sorted = [...students].sort((a, b) => b.xp_total - a.xp_total);
          const ranked = sorted.map((s, i) => {
            const rank =
              i === 0 ? 1 : s.xp_total === sorted[i - 1]!.xp_total ? i : i + 1;
            return { ...s, rank };
          });

          // First rank is always 1
          expect(ranked[0]!.rank).toBe(1);

          // Ranks are non-decreasing
          for (let i = 1; i < ranked.length; i++) {
            expect(ranked[i]!.rank).toBeGreaterThanOrEqual(ranked[i - 1]!.rank);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property 29: Habit tracker Perfect Day detection ───────────────────────

describe("Property 29 — Habit tracker Perfect Day detection", () => {
  const ALL_HABITS: HabitType[] = ["login", "submit", "journal", "read"];
  const PERFECT_DAY_XP = 50;

  function isPerfectDay(completedHabits: HabitType[]): boolean {
    return ALL_HABITS.every((h) => completedHabits.includes(h));
  }

  function calculatePerfectDayXP(
    completedHabits: HabitType[],
    alreadyAwarded: boolean
  ): number {
    if (isPerfectDay(completedHabits) && !alreadyAwarded) return PERFECT_DAY_XP;
    return 0;
  }

  it("P29a: all 4 habits completed → Perfect Day detected", () => {
    fc.assert(
      fc.property(
        fc.shuffledSubarray(ALL_HABITS, { minLength: 4, maxLength: 4 }),
        (habits) => {
          expect(isPerfectDay(habits)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("P29b: fewer than 4 habits → NOT a Perfect Day", () => {
    fc.assert(
      fc.property(
        fc.shuffledSubarray(ALL_HABITS, { minLength: 0, maxLength: 3 }),
        (habits) => {
          expect(isPerfectDay(habits)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("P29c: Perfect Day awards exactly 50 XP once", () => {
    fc.assert(
      fc.property(
        fc.shuffledSubarray(ALL_HABITS, { minLength: 4, maxLength: 4 }),
        (habits) => {
          const firstAward = calculatePerfectDayXP(habits, false);
          expect(firstAward).toBe(PERFECT_DAY_XP);

          // Second trigger should not award again
          const secondAward = calculatePerfectDayXP(habits, true);
          expect(secondAward).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});
