// =============================================================================
// Property 106: Personal Best leaderboard data integrity
// Feature: edeviser-platform
// **Validates: Requirements 129.1, 129.2**
// =============================================================================

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { computeWeeklyXP, getISOWeekStart } from '@/lib/personalBestLeaderboard';

// ─── Generators ──────────────────────────────────────────────────────────────

const refDate = new Date(2025, 6, 23, 12, 0, 0); // Fixed reference: July 23, 2025 local

/** Generate a transaction with a timestamp within the 8-week window */
const transactionArb = () => {
  const weekStart = getISOWeekStart(refDate);
  const eightWeeksAgoMs = new Date(weekStart).getTime() - 7 * 7 * 24 * 60 * 60 * 1000;
  const endOfCurrentWeekMs = new Date(weekStart).getTime() + 7 * 24 * 60 * 60 * 1000 - 1;

  return fc.record({
    xp_amount: fc.integer({ min: 1, max: 500 }),
    created_at: fc.integer({ min: eightWeeksAgoMs, max: endOfCurrentWeekMs })
      .map((ms) => new Date(ms).toISOString()),
  });
};

// ─── Properties ──────────────────────────────────────────────────────────────

describe('Property 106: Personal Best leaderboard data integrity', () => {
  it('always returns exactly 8 weeks', () => {
    fc.assert(
      fc.property(
        fc.array(transactionArb(), { minLength: 0, maxLength: 50 }),
        (transactions) => {
          const result = computeWeeklyXP(transactions, refDate);
          expect(result).toHaveLength(8);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('weekly XP equals sum of transactions within each ISO week', () => {
    fc.assert(
      fc.property(
        fc.array(transactionArb(), { minLength: 1, maxLength: 50 }),
        (transactions) => {
          const result = computeWeeklyXP(transactions, refDate);

          for (const week of result) {
            // Reconstruct the week boundaries the same way computeWeeklyXP does (UTC)
            const weekStartDate = new Date(week.weekStart + 'T00:00:00Z');
            const weekEndDate = new Date(weekStartDate);
            weekEndDate.setUTCDate(weekEndDate.getUTCDate() + 7);

            const expectedXP = transactions
              .filter((t) => {
                const d = new Date(t.created_at);
                return d >= weekStartDate && d < weekEndDate;
              })
              .reduce((sum, t) => sum + t.xp_amount, 0);

            expect(week.xp).toBe(expectedXP);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('isPersonalBest is true for exactly one week when max XP > 0', () => {
    fc.assert(
      fc.property(
        fc.array(transactionArb(), { minLength: 1, maxLength: 50 }),
        (transactions) => {
          const result = computeWeeklyXP(transactions, refDate);
          const maxXP = Math.max(...result.map((w) => w.xp));

          if (maxXP > 0) {
            const bestWeeks = result.filter((w) => w.isPersonalBest);
            expect(bestWeeks).toHaveLength(1);
            expect(bestWeeks[0].xp).toBe(maxXP);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('no week is marked personal best when all weeks have 0 XP', () => {
    const result = computeWeeklyXP([], refDate);
    const bestWeeks = result.filter((w) => w.isPersonalBest);
    expect(bestWeeks).toHaveLength(0);
  });

  it('exactly one week is marked as current week', () => {
    fc.assert(
      fc.property(
        fc.array(transactionArb(), { minLength: 0, maxLength: 30 }),
        (transactions) => {
          const result = computeWeeklyXP(transactions, refDate);
          const currentWeeks = result.filter((w) => w.isCurrentWeek);
          expect(currentWeeks).toHaveLength(1);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('all XP values are non-negative', () => {
    fc.assert(
      fc.property(
        fc.array(transactionArb(), { minLength: 0, maxLength: 50 }),
        (transactions) => {
          const result = computeWeeklyXP(transactions, refDate);
          for (const week of result) {
            expect(week.xp).toBeGreaterThanOrEqual(0);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
