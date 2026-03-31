// Feature: edeviser-platform, Property 102: Streak Sabbatical weekend exclusion
// **Validates: Requirements 125.1, 125.2**
//
// For any institution with streak_sabbatical_enabled = true, a student's streak
// should not be reset for missing Saturday or Sunday logins. The streak should
// only be evaluated on weekdays (Monday–Friday). When sabbatical is disabled,
// all 7 days count toward streak requirements.

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  calculateStreakUpdate,
  isStreakSabbaticalDay,
  type StreakState,
} from '@/lib/streakCalculator';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Generate a YYYY-MM-DD date string from a Date object */
function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Add N days to a date */
function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return toDateStr(d);
}

/** Get the UTC day of week (0=Sun, 6=Sat) */
function getDayOfWeek(dateStr: string): number {
  return new Date(dateStr + 'T00:00:00Z').getUTCDay();
}


// ─── Arbitraries ────────────────────────────────────────────────────────────

/** Generate a date string in 2025 */
const dateArb = fc.integer({ min: 0, max: 364 }).map((offset) => {
  const d = new Date('2025-01-01T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + offset);
  return toDateStr(d);
});

/** Generate a streak state with a last login date */
const streakStateArb = fc.record({
  streak_count: fc.integer({ min: 1, max: 200 }),
  last_login_date: dateArb,
  streak_freezes_available: fc.integer({ min: 0, max: 2 }),
});

// ─── Property Tests ─────────────────────────────────────────────────────────

describe('Property 102: Streak Sabbatical weekend exclusion', () => {
  it('isStreakSabbaticalDay returns true only for Saturday/Sunday when enabled', () => {
    fc.assert(
      fc.property(dateArb, (dateStr) => {
        const result = isStreakSabbaticalDay(true, dateStr);
        const dow = getDayOfWeek(dateStr);
        const expectedWeekend = dow === 0 || dow === 6;
        expect(result).toBe(expectedWeekend);
      }),
      { numRuns: 200 },
    );
  });

  it('isStreakSabbaticalDay always returns false when disabled', () => {
    fc.assert(
      fc.property(dateArb, (dateStr) => {
        expect(isStreakSabbaticalDay(false, dateStr)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it('streak is NOT reset when gap contains only weekend days and sabbatical is enabled', () => {
    // Generate a Friday last login, then login on Monday (gap = Sat + Sun)
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 50 }), // week offset
        fc.integer({ min: 1, max: 200 }), // streak count
        (weekOffset, streakCount) => {
          // Find a Friday in 2025
          const baseDate = new Date('2025-01-03T00:00:00Z'); // Jan 3, 2025 is Friday
          baseDate.setUTCDate(baseDate.getUTCDate() + weekOffset * 7);
          const fridayStr = toDateStr(baseDate);

          // Monday is 3 days later
          const mondayStr = addDays(fridayStr, 3);

          const state: StreakState = {
            streak_count: streakCount,
            last_login_date: fridayStr,
            streak_freezes_available: 0,
          };

          const result = calculateStreakUpdate(state, mondayStr, true);

          // With sabbatical enabled, the 2 weekend days in the gap should be excluded
          // effectiveDayDiff = 3 - 2 = 1, so streak should continue
          expect(result.should_reset).toBe(false);
          expect(result.new_streak_count).toBe(streakCount + 1);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('streak IS reset when gap contains only weekend days but sabbatical is DISABLED', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 50 }),
        fc.integer({ min: 2, max: 200 }),
        (weekOffset, streakCount) => {
          const baseDate = new Date('2025-01-03T00:00:00Z'); // Friday
          baseDate.setUTCDate(baseDate.getUTCDate() + weekOffset * 7);
          const fridayStr = toDateStr(baseDate);
          const mondayStr = addDays(fridayStr, 3);

          const state: StreakState = {
            streak_count: streakCount,
            last_login_date: fridayStr,
            streak_freezes_available: 0,
          };

          const result = calculateStreakUpdate(state, mondayStr, false);

          // Without sabbatical, dayDiff = 3 > 2, so streak resets
          expect(result.should_reset).toBe(true);
          expect(result.new_streak_count).toBe(1);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('consecutive weekday logins maintain streak regardless of sabbatical setting', () => {
    fc.assert(
      fc.property(
        streakStateArb,
        fc.boolean(), // sabbatical enabled
        ({ streak_count, last_login_date, streak_freezes_available }, sabbaticalEnabled) => {
          const nextDay = addDays(last_login_date, 1);

          const state: StreakState = {
            streak_count,
            last_login_date,
            streak_freezes_available,
          };

          const result = calculateStreakUpdate(state, nextDay, sabbaticalEnabled);

          // dayDiff = 1 always means consecutive, regardless of sabbatical
          expect(result.should_reset).toBe(false);
          expect(result.new_streak_count).toBe(streak_count + 1);
          expect(result.is_new_day).toBe(true);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('weekday gaps still reset streak even with sabbatical enabled', () => {
    // Generate a gap that spans only weekdays (no weekends to exclude)
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 200 }), // streak count
        (streakCount) => {
          // Monday to Thursday: 3 weekday gap, no weekends
          // Mon Jan 6 to Thu Jan 9 = dayDiff 3, 0 weekend days in gap
          const mondayStr = '2025-01-06';
          const thursdayStr = '2025-01-09';

          const state: StreakState = {
            streak_count: streakCount,
            last_login_date: mondayStr,
            streak_freezes_available: 0,
          };

          const result = calculateStreakUpdate(state, thursdayStr, true);

          // effectiveDayDiff = 3 - 0 = 3, so streak resets
          expect(result.should_reset).toBe(true);
          expect(result.new_streak_count).toBe(1);
        },
      ),
      { numRuns: 100 },
    );
  });
});
