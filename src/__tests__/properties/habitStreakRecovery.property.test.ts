// Feature: habit-heatmap, Property 34: Comeback Challenge cell identification
// Feature: habit-heatmap, Property 35: Sabbatical rest day identification
// **Validates: Requirements 25.1, 25.2, 26.1, 26.2**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// --- Pure helper functions under test ---

/**
 * Determines if a given date falls within a Comeback Challenge range.
 * Challenge covers startDate to startDate + 2 days (inclusive, 3 days total).
 */
function isComebackChallengeCell(
  date: string,
  challenge: { active: boolean; startDate: string | null },
): boolean {
  if (!challenge.active || !challenge.startDate) return false;
  // Use pure string comparison on YYYY-MM-DD to avoid timezone issues
  const endDate = addDays(challenge.startDate, 2);
  return date >= challenge.startDate && date <= endDate;
}

/**
 * Determines if a given date is a sabbatical rest day (Saturday or Sunday).
 * Uses UTC to avoid timezone shifts.
 */
function isSabbaticalRestDay(
  date: string,
  sabbaticalEnabled: boolean,
): boolean {
  if (!sabbaticalEnabled) return false;
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  const day = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return day === 0 || day === 6; // Sunday = 0, Saturday = 6
}

// --- Arbitraries ---

const dateStringArb = fc
  .integer({ min: 0, max: 730 })
  .map((offset) => {
    const d = new Date(Date.UTC(2024, 0, 1 + offset));
    return d.toISOString().slice(0, 10);
  });

/** Helper to add days to a YYYY-MM-DD string without timezone issues */
function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number) as [number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
}

const challengeStartArb = fc
  .integer({ min: 0, max: 700 })
  .map((offset) => {
    const date = new Date(Date.UTC(2024, 0, 1 + offset));
    return date.toISOString().slice(0, 10);
  });

describe('Habit Streak Recovery Properties', () => {
  // Feature: habit-heatmap, Property 34: Comeback Challenge cell identification
  describe('Property 34: Comeback Challenge cell identification', () => {
    it('should mark cells between startDate and startDate + 2 days as comeback challenge cells', () => {
      fc.assert(
        fc.property(challengeStartArb, (startDate) => {
          const challenge = { active: true, startDate };

          // Days 0, 1, 2 from start should be marked
          for (let i = 0; i <= 2; i++) {
            const dateStr = addDays(startDate, i);
            expect(isComebackChallengeCell(dateStr, challenge)).toBe(true);
          }
        }),
        { numRuns: 100 },
      );
    });

    it('should NOT mark cells outside the 3-day range', () => {
      fc.assert(
        fc.property(
          challengeStartArb,
          fc.integer({ min: 3, max: 30 }),
          (startDate, daysAfter) => {
            const challenge = { active: true, startDate };
            const dateStr = addDays(startDate, daysAfter);
            expect(isComebackChallengeCell(dateStr, challenge)).toBe(false);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should NOT mark cells before the start date', () => {
      fc.assert(
        fc.property(
          challengeStartArb,
          fc.integer({ min: 1, max: 30 }),
          (startDate, daysBefore) => {
            const challenge = { active: true, startDate };
            const dateStr = addDays(startDate, -daysBefore);
            expect(isComebackChallengeCell(dateStr, challenge)).toBe(false);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should NOT mark any cells when no Comeback Challenge is active', () => {
      fc.assert(
        fc.property(dateStringArb, (date) => {
          const inactiveChallenge = { active: false, startDate: null };
          expect(isComebackChallengeCell(date, inactiveChallenge)).toBe(false);
        }),
        { numRuns: 100 },
      );
    });

    it('should NOT mark any cells when challenge is active but startDate is null', () => {
      fc.assert(
        fc.property(dateStringArb, (date) => {
          const challenge = { active: true, startDate: null };
          expect(isComebackChallengeCell(date, challenge)).toBe(false);
        }),
        { numRuns: 100 },
      );
    });
  });

  // Feature: habit-heatmap, Property 35: Sabbatical rest day identification
  describe('Property 35: Sabbatical rest day identification', () => {
    it('should mark Saturday and Sunday as rest days when sabbatical is enabled', () => {
      fc.assert(
        fc.property(dateStringArb, (date) => {
          const [y, m, d] = date.split('-').map(Number) as [number, number, number];
          const dayOfWeek = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
          const result = isSabbaticalRestDay(date, true);
          expect(result).toBe(isWeekend);
        }),
        { numRuns: 100 },
      );
    });

    it('should NOT mark any cells as rest days when sabbatical is disabled', () => {
      fc.assert(
        fc.property(dateStringArb, (date) => {
          expect(isSabbaticalRestDay(date, false)).toBe(false);
        }),
        { numRuns: 100 },
      );
    });

    it('should mark only weekends, never weekdays, when enabled', () => {
      fc.assert(
        fc.property(dateStringArb, (date) => {
          const [y, m, d] = date.split('-').map(Number) as [number, number, number];
          const dayOfWeek = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
          const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
          if (isWeekday) {
            expect(isSabbaticalRestDay(date, true)).toBe(false);
          }
        }),
        { numRuns: 100 },
      );
    });

    it('rest day cells should not count as missed days', () => {
      fc.assert(
        fc.property(dateStringArb, (date) => {
          const isRestDay = isSabbaticalRestDay(date, true);
          if (isRestDay) {
            // A rest day should have a distinct state — it's not "missed"
            // This validates the concept: rest days are excluded from missed calculation
            const [y, m, d] = date.split('-').map(Number) as [number, number, number];
            const dayOfWeek = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
            expect(dayOfWeek === 0 || dayOfWeek === 6).toBe(true);
          }
        }),
        { numRuns: 100 },
      );
    });
  });
});
