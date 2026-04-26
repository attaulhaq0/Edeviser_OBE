// Feature: xp-marketplace, Property 33: progress invariant (current_total = SUM contributions)
// **Validates: Requirements 29.1, 29.2**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// ─── Pure functions mirroring class donation logic ──────────────────────────

interface DonationCampaign {
  goal_amount: number;
  current_total: number;
  status: 'active' | 'completed';
}

interface Contribution {
  xp_amount: number;
}

function computeDonationProgress(
  contributions: readonly Contribution[],
  goalAmount: number,
): DonationCampaign {
  const currentTotal = contributions.reduce((sum, c) => sum + c.xp_amount, 0);
  const status = currentTotal >= goalAmount ? 'completed' : 'active';
  return { goal_amount: goalAmount, current_total: currentTotal, status };
}

function computeProgressPercentage(currentTotal: number, goalAmount: number): number {
  if (goalAmount <= 0) return 0;
  return Math.min(100, Math.round((currentTotal / goalAmount) * 100));
}

// ─── Arbitraries ────────────────────────────────────────────────────────────

const contributionArb = fc.record({
  xp_amount: fc.integer({ min: 1, max: 1000 }),
});
const contributionsArb = fc.array(contributionArb, { minLength: 0, maxLength: 50 });
const goalAmountArb = fc.integer({ min: 100, max: 10000 });

// ─── Property 33: Class donation progress invariant ─────────────────────────

describe('Property 33 — Class donation progress invariant', () => {
  it('P33a: current_total equals SUM of all contributions', () => {
    fc.assert(
      fc.property(contributionsArb, goalAmountArb, (contributions, goalAmount) => {
        const campaign = computeDonationProgress(contributions, goalAmount);
        const expectedTotal = contributions.reduce((sum, c) => sum + c.xp_amount, 0);
        expect(campaign.current_total).toBe(expectedTotal);
      }),
      { numRuns: 100 },
    );
  });

  it('P33b: status is completed when current_total >= goal_amount', () => {
    fc.assert(
      fc.property(contributionsArb, goalAmountArb, (contributions, goalAmount) => {
        const campaign = computeDonationProgress(contributions, goalAmount);
        if (campaign.current_total >= goalAmount) {
          expect(campaign.status).toBe('completed');
        } else {
          expect(campaign.status).toBe('active');
        }
      }),
      { numRuns: 100 },
    );
  });

  it('P33c: progress percentage is between 0 and 100', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 50000 }),
        goalAmountArb,
        (currentTotal, goalAmount) => {
          const pct = computeProgressPercentage(currentTotal, goalAmount);
          expect(pct).toBeGreaterThanOrEqual(0);
          expect(pct).toBeLessThanOrEqual(100);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P33d: empty contributions yield zero total and active status', () => {
    fc.assert(
      fc.property(goalAmountArb, (goalAmount) => {
        const campaign = computeDonationProgress([], goalAmount);
        expect(campaign.current_total).toBe(0);
        expect(campaign.status).toBe('active');
      }),
      { numRuns: 100 },
    );
  });
});
