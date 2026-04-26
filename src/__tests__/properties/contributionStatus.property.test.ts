// =============================================================================
// Property Tests: Contribution Status — Task 9.10
// Feature: team-challenges, Properties P21, P22
// =============================================================================

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  computeContributionStatus,
  meetsContributionThreshold,
  updateContributionTracking,
  DEFAULT_CONTRIBUTION_THRESHOLD,
  DAYS_TO_WARNING,
  DAYS_TO_INACTIVE,
} from '@/lib/contributionThresholds';

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Property P21: Contribution status transitions', () => {
  it('0 consecutive low days → active', () => {
    expect(computeContributionStatus(0)).toBe('active');
  });

  it('days < DAYS_TO_WARNING → active', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: DAYS_TO_WARNING - 1 }),
        (days) => {
          expect(computeContributionStatus(days)).toBe('active');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('DAYS_TO_WARNING <= days < DAYS_TO_INACTIVE → warning', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: DAYS_TO_WARNING, max: DAYS_TO_INACTIVE - 1 }),
        (days) => {
          expect(computeContributionStatus(days)).toBe('warning');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('days >= DAYS_TO_INACTIVE → inactive', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: DAYS_TO_INACTIVE, max: 100 }),
        (days) => {
          expect(computeContributionStatus(days)).toBe('inactive');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('meeting threshold resets consecutive low days to 0', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        (currentDays) => {
          const result = updateContributionTracking(currentDays, true);
          expect(result.status).toBe('active');
          expect(result.consecutiveLowDays).toBe(0);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('not meeting threshold increments consecutive low days', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        (currentDays) => {
          const result = updateContributionTracking(currentDays, false);
          expect(result.consecutiveLowDays).toBe(currentDays + 1);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('status transitions are monotonic (active → warning → inactive)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 50 }),
        (startDays) => {
          // Simulate consecutive days below threshold
          let days = startDays;
          const statuses: string[] = [];
          for (let i = 0; i < 10; i++) {
            const result = updateContributionTracking(days, false);
            statuses.push(result.status);
            days = result.consecutiveLowDays;
          }

          // Status should never go backwards (inactive → warning or warning → active)
          const order = { active: 0, warning: 1, inactive: 2 };
          for (let i = 1; i < statuses.length; i++) {
            expect(order[statuses[i] as keyof typeof order]).toBeGreaterThanOrEqual(
              order[statuses[i - 1] as keyof typeof order],
            );
          }
        },
      ),
      { numRuns: 200 },
    );
  });
});

describe('Property P22: Institution threshold configuration', () => {
  it('default threshold is 20%', () => {
    expect(DEFAULT_CONTRIBUTION_THRESHOLD).toBe(20);
  });

  it('member with at least threshold% meets the threshold', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 10000 }),
        fc.integer({ min: 10, max: 50 }),
        (teamTotal, threshold) => {
          // Give the member slightly more than threshold to avoid floating point edge cases
          const memberXp = Math.ceil((teamTotal * (threshold + 1)) / 100);
          fc.pre(memberXp <= teamTotal);
          expect(meetsContributionThreshold(memberXp, teamTotal, threshold)).toBe(true);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('member with 0 XP when team has XP does not meet threshold', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100000 }),
        fc.integer({ min: 1, max: 50 }),
        (teamTotal, threshold) => {
          expect(meetsContributionThreshold(0, teamTotal, threshold)).toBe(false);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('when team total is 0, everyone meets threshold', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1000 }),
        fc.integer({ min: 1, max: 50 }),
        (memberXp, threshold) => {
          expect(meetsContributionThreshold(memberXp, 0, threshold)).toBe(true);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('higher threshold makes it harder to meet', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }),
        fc.integer({ min: 100, max: 10000 }),
        (memberXp, teamTotal) => {
          fc.pre(memberXp < teamTotal);
          const meetsLow = meetsContributionThreshold(memberXp, teamTotal, 5);
          const meetsHigh = meetsContributionThreshold(memberXp, teamTotal, 50);
          // If you meet the high threshold, you must meet the low one
          if (meetsHigh) {
            expect(meetsLow).toBe(true);
          }
        },
      ),
      { numRuns: 200 },
    );
  });
});
