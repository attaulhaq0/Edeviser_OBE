// Feature: xp-marketplace, Property 29: tier assignment from percentiles
// Feature: xp-marketplace, Property 30: percentile band display
// **Validates: Requirements 32.1, 32.2, 32.4**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  computeLeagueTier,
  assignTierFromPercentile,
  computePercentileBand,
} from '@/lib/leagueTierCalculator';

// ─── Arbitraries ────────────────────────────────────────────────────────────

const xpArb = fc.integer({ min: 0, max: 100_000 });
const cohortArb = fc.array(fc.integer({ min: 0, max: 100_000 }), { minLength: 1, maxLength: 100 })
  .map((arr) => [...arr].sort((a, b) => a - b));
const percentileArb = fc.integer({ min: 0, max: 100 });

// ─── Property 29: League tier assignment from percentiles ───────────────────

describe('Property 29 — League tier assignment from percentiles', () => {
  it('P29a: tier boundaries are correct — Diamond >= 95, Gold >= 80, Silver >= 50, Bronze < 50', () => {
    fc.assert(
      fc.property(percentileArb, (percentile) => {
        const tier = assignTierFromPercentile(percentile);
        if (percentile >= 95) expect(tier).toBe('diamond');
        else if (percentile >= 80) expect(tier).toBe('gold');
        else if (percentile >= 50) expect(tier).toBe('silver');
        else expect(tier).toBe('bronze');
      }),
      { numRuns: 100 },
    );
  });

  it('P29b: every student gets exactly one tier', () => {
    fc.assert(
      fc.property(xpArb, cohortArb, (studentXP, cohort) => {
        const result = computeLeagueTier({ studentXP, cohortXPValues: cohort });
        expect(['bronze', 'silver', 'gold', 'diamond']).toContain(result.tier);
      }),
      { numRuns: 100 },
    );
  });

  it('P29c: higher XP never results in lower tier within same cohort', () => {
    fc.assert(
      fc.property(
        cohortArb,
        fc.integer({ min: 0, max: 50_000 }),
        fc.integer({ min: 0, max: 50_000 }),
        (cohort, xp1, delta) => {
          const xp2 = xp1 + delta;
          const tier1 = computeLeagueTier({ studentXP: xp1, cohortXPValues: cohort });
          const tier2 = computeLeagueTier({ studentXP: xp2, cohortXPValues: cohort });
          const tierOrder = { bronze: 0, silver: 1, gold: 2, diamond: 3 };
          expect(tierOrder[tier2.tier]).toBeGreaterThanOrEqual(tierOrder[tier1.tier]);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P29d: percentile is between 0 and 100', () => {
    fc.assert(
      fc.property(xpArb, cohortArb, (studentXP, cohort) => {
        const result = computeLeagueTier({ studentXP, cohortXPValues: cohort });
        expect(result.percentile).toBeGreaterThanOrEqual(0);
        expect(result.percentile).toBeLessThanOrEqual(100);
      }),
      { numRuns: 100 },
    );
  });
});

// ─── Property 30: Percentile band display ───────────────────────────────────

describe('Property 30 — Percentile band display for non-top-10 students', () => {
  it('P30a: percentile band is one of the defined bands', () => {
    fc.assert(
      fc.property(percentileArb, (percentile) => {
        const result = computePercentileBand(percentile);
        expect(['top5', 'top10', 'top25', 'top50', 'bottom50']).toContain(result.band);
      }),
      { numRuns: 100 },
    );
  });

  it('P30b: band boundaries are correct', () => {
    fc.assert(
      fc.property(percentileArb, (percentile) => {
        const result = computePercentileBand(percentile);
        if (percentile >= 95) expect(result.band).toBe('top5');
        else if (percentile >= 90) expect(result.band).toBe('top10');
        else if (percentile >= 75) expect(result.band).toBe('top25');
        else if (percentile >= 50) expect(result.band).toBe('top50');
        else expect(result.band).toBe('bottom50');
      }),
      { numRuns: 100 },
    );
  });

  it('P30c: label is human-readable', () => {
    fc.assert(
      fc.property(percentileArb, (percentile) => {
        const result = computePercentileBand(percentile);
        expect(result.label).toBeTruthy();
        expect(result.label.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 },
    );
  });
});
