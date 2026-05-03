// =============================================================================
// Property-Based Test: Personal Best
// Task 25.9 — P36: comparison correctness
// Feature: xp-marketplace
// =============================================================================

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { computeWeeklyXP } from '@/lib/personalBestLeaderboard';

/**
 * **Validates: Requirements 129.1**
 * P36: Personal best comparison is correct — exactly one week is marked as personal best.
 */
describe('P36: Personal best comparison correctness', () => {
  it('exactly one week is marked as personal best when there is XP', () => {
    const referenceDate = new Date();
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            xp_amount: fc.integer({ min: 1, max: 100 }),
            created_at: fc.date({
              min: new Date(referenceDate.getTime() - 55 * 24 * 60 * 60 * 1000),
              max: referenceDate,
            }).map((d) => d.toISOString()),
          }),
          { minLength: 1, maxLength: 50 },
        ),
        (transactions) => {
          const weeks = computeWeeklyXP(transactions, referenceDate);
          const bestWeeks = weeks.filter((w) => w.isPersonalBest);

          // If any week has XP > 0, exactly one should be personal best
          const hasXP = weeks.some((w) => w.xp > 0);
          if (hasXP) {
            expect(bestWeeks.length).toBe(1);
            const bestWeek = bestWeeks[0]!;
            // The personal best should have the highest XP
            for (const w of weeks) {
              expect(w.xp).toBeLessThanOrEqual(bestWeek.xp);
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('returns 8 weeks (7 historical + current)', () => {
    const weeks = computeWeeklyXP([]);
    expect(weeks.length).toBe(8);
  });

  it('exactly one week is marked as current week', () => {
    const weeks = computeWeeklyXP([]);
    const currentWeeks = weeks.filter((w) => w.isCurrentWeek);
    expect(currentWeeks.length).toBe(1);
  });
});
