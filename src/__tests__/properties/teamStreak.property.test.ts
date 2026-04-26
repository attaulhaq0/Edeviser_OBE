// =============================================================================
// Property Tests: Team Streak — Task 9.3
// Feature: team-challenges, Properties P5, P6, P7
// =============================================================================

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

// ─── Pure logic under test ───────────────────────────────────────────────────

/**
 * Compute team streak from an array of daily habit completion booleans.
 * true = at least one member completed a habit that day.
 * false = no member completed a habit that day (resets streak).
 * Streak counts consecutive true days from the end of the array.
 */
function computeTeamStreak(dailyHabits: boolean[]): number {
  let streak = 0;
  for (let i = dailyHabits.length - 1; i >= 0; i--) {
    if (dailyHabits[i]) streak++;
    else break;
  }
  return streak;
}

/** Streak milestone thresholds and their corresponding badge keys */
const STREAK_MILESTONES: Record<number, string> = {
  7: 'streak_squad',
  14: 'streak_champions',
  30: 'streak_legends',
};

/**
 * Check which streak badges should be awarded based on current streak.
 * Returns badge keys for all milestones that the streak has reached.
 */
function getEarnedStreakBadges(streak: number): string[] {
  return Object.entries(STREAK_MILESTONES)
    .filter(([threshold]) => streak >= Number(threshold))
    .map(([, badgeKey]) => badgeKey);
}

/**
 * Award badges idempotently. Given already-earned badges and new eligible badges,
 * returns the final set (union, no duplicates).
 */
function awardBadgesIdempotent(
  alreadyEarned: Set<string>,
  newBadges: string[],
): Set<string> {
  const result = new Set(alreadyEarned);
  for (const badge of newBadges) {
    result.add(badge);
  }
  return result;
}

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Property P5: Streak = consecutive days where at least one member completed a habit', () => {
  // Feature: team-challenges, Property 5: Streak computation

  it('streak counts consecutive true days from the end', () => {
    fc.assert(
      fc.property(
        fc.array(fc.boolean(), { minLength: 1, maxLength: 90 }),
        (dailyHabits) => {
          const streak = computeTeamStreak(dailyHabits);

          // Verify by counting from the end manually
          let expected = 0;
          for (let i = dailyHabits.length - 1; i >= 0; i--) {
            if (dailyHabits[i]) expected++;
            else break;
          }
          expect(streak).toBe(expected);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('streak is 0 when the last day has no habits', () => {
    fc.assert(
      fc.property(
        fc.array(fc.boolean(), { minLength: 1, maxLength: 90 }),
        (prefix) => {
          // Force last day to false
          const dailyHabits = [...prefix, false];
          const streak = computeTeamStreak(dailyHabits);
          expect(streak).toBe(0);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('streak equals array length when all days are true', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 90 }),
        (length) => {
          const dailyHabits = Array(length).fill(true);
          const streak = computeTeamStreak(dailyHabits);
          expect(streak).toBe(length);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('a false day resets the streak to 0', () => {
    fc.assert(
      fc.property(
        fc.array(fc.boolean(), { minLength: 0, maxLength: 30 }),
        fc.array(fc.constant(true), { minLength: 0, maxLength: 30 }),
        (prefix, trailingTrues) => {
          // Insert a false day, then trailing trues
          const dailyHabits = [...prefix, false, ...trailingTrues];
          const streak = computeTeamStreak(dailyHabits);
          expect(streak).toBe(trailingTrues.length);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('streak is always between 0 and array length', () => {
    fc.assert(
      fc.property(
        fc.array(fc.boolean(), { minLength: 0, maxLength: 90 }),
        (dailyHabits) => {
          const streak = computeTeamStreak(dailyHabits);
          expect(streak).toBeGreaterThanOrEqual(0);
          expect(streak).toBeLessThanOrEqual(dailyHabits.length);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('empty array gives streak of 0', () => {
    expect(computeTeamStreak([])).toBe(0);
  });
});

describe('Property P6: Streak milestones trigger badge awards', () => {
  // Feature: team-challenges, Property 6: Streak milestone badges

  it('streak >= 7 earns streak_squad', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 7, max: 365 }),
        (streak) => {
          const badges = getEarnedStreakBadges(streak);
          expect(badges).toContain('streak_squad');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('streak >= 14 earns streak_champions', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 14, max: 365 }),
        (streak) => {
          const badges = getEarnedStreakBadges(streak);
          expect(badges).toContain('streak_champions');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('streak >= 30 earns streak_legends', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 30, max: 365 }),
        (streak) => {
          const badges = getEarnedStreakBadges(streak);
          expect(badges).toContain('streak_legends');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('streak < 7 earns no streak badges', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 6 }),
        (streak) => {
          const badges = getEarnedStreakBadges(streak);
          expect(badges).toHaveLength(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('streak >= 30 earns all three streak badges', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 30, max: 365 }),
        (streak) => {
          const badges = getEarnedStreakBadges(streak);
          expect(badges).toContain('streak_squad');
          expect(badges).toContain('streak_champions');
          expect(badges).toContain('streak_legends');
          expect(badges).toHaveLength(3);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('milestone badges are monotonically inclusive (higher streak includes lower badges)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 365 }),
        fc.integer({ min: 0, max: 365 }),
        (streak1, streak2) => {
          const lower = Math.min(streak1, streak2);
          const higher = Math.max(streak1, streak2);
          const badgesLower = getEarnedStreakBadges(lower);
          const badgesHigher = getEarnedStreakBadges(higher);

          // Higher streak should earn at least all badges that lower streak earns
          for (const badge of badgesLower) {
            expect(badgesHigher).toContain(badge);
          }
        },
      ),
      { numRuns: 200 },
    );
  });
});

describe('Property P7: Badge idempotence', () => {
  // Feature: team-challenges, Property 7: Badge idempotence

  const allStreakBadges = ['streak_squad', 'streak_champions', 'streak_legends'];
  const alreadyEarnedArb = fc.subarray(allStreakBadges).map((arr) => new Set<string>(arr));

  it('awarding the same badge twice results in one record', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 365 }),
        alreadyEarnedArb,
        (streak, alreadyEarned) => {
          const newBadges = getEarnedStreakBadges(streak);

          // First award
          const afterFirst = awardBadgesIdempotent(alreadyEarned, newBadges);

          // Second award with same badges
          const afterSecond = awardBadgesIdempotent(afterFirst, newBadges);

          // Idempotent: second pass produces same result
          expect(afterSecond.size).toBe(afterFirst.size);
          for (const badge of afterFirst) {
            expect(afterSecond.has(badge)).toBe(true);
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  it('badge set only grows, never shrinks', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 365 }),
        alreadyEarnedArb,
        (streak, alreadyEarned) => {
          const newBadges = getEarnedStreakBadges(streak);
          const afterAward = awardBadgesIdempotent(alreadyEarned, newBadges);

          // All previously earned badges must still be present
          for (const badge of alreadyEarned) {
            expect(afterAward.has(badge)).toBe(true);
          }
          expect(afterAward.size).toBeGreaterThanOrEqual(alreadyEarned.size);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('no duplicate entries in the badge set after multiple awards', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 365 }), { minLength: 1, maxLength: 10 }),
        (streakHistory) => {
          let earned = new Set<string>();

          for (const streak of streakHistory) {
            const newBadges = getEarnedStreakBadges(streak);
            earned = awardBadgesIdempotent(earned, newBadges);
          }

          // Set inherently has no duplicates, but verify size matches array conversion
          const asArray = [...earned];
          expect(new Set(asArray).size).toBe(asArray.length);
        },
      ),
      { numRuns: 200 },
    );
  });
});
