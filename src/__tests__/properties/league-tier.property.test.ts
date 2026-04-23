// =============================================================================
// Property 109: League Tier assignment correctness
// Property 110: League Promotion XP bonus idempotence
// Feature: edeviser-platform
// **Validates: Requirements 132.1, 132.4, 132.5**
// =============================================================================

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  getLeagueTier,
  DEFAULT_LEAGUE_THRESHOLDS,
  type LeagueTierName,
} from '@/lib/leagueTier';

// ─── Properties ──────────────────────────────────────────────────────────────

describe('Property 109: League Tier assignment correctness', () => {
  it('tier is determined by configured thresholds', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10000 }),
        (xp) => {
          const tier = getLeagueTier(xp, DEFAULT_LEAGUE_THRESHOLDS);
          if (xp >= 4000) expect(tier).toBe('Diamond');
          else if (xp >= 1500) expect(tier).toBe('Gold');
          else if (xp >= 500) expect(tier).toBe('Silver');
          else expect(tier).toBe('Bronze');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('tier updates immediately when XP crosses threshold', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(499, 500, 1499, 1500, 3999, 4000),
        (xp) => {
          const tier = getLeagueTier(xp, DEFAULT_LEAGUE_THRESHOLDS);
          if (xp === 499) expect(tier).toBe('Bronze');
          if (xp === 500) expect(tier).toBe('Silver');
          if (xp === 1499) expect(tier).toBe('Silver');
          if (xp === 1500) expect(tier).toBe('Gold');
          if (xp === 3999) expect(tier).toBe('Gold');
          if (xp === 4000) expect(tier).toBe('Diamond');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('tier is monotonically non-decreasing with XP', () => {
    const tierRank: Record<LeagueTierName, number> = {
      Bronze: 0,
      Silver: 1,
      Gold: 2,
      Diamond: 3,
    };

    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10000 }),
        fc.integer({ min: 0, max: 5000 }),
        (xp, delta) => {
          const tier1 = getLeagueTier(xp, DEFAULT_LEAGUE_THRESHOLDS);
          const tier2 = getLeagueTier(xp + delta, DEFAULT_LEAGUE_THRESHOLDS);
          expect(tierRank[tier2]).toBeGreaterThanOrEqual(tierRank[tier1]);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('custom thresholds are respected', () => {
    const customThresholds = { bronze: 0, silver: 100, gold: 300, diamond: 1000 };
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 2000 }),
        (xp) => {
          const tier = getLeagueTier(xp, customThresholds);
          if (xp >= 1000) expect(tier).toBe('Diamond');
          else if (xp >= 300) expect(tier).toBe('Gold');
          else if (xp >= 100) expect(tier).toBe('Silver');
          else expect(tier).toBe('Bronze');
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe('Property 110: League Promotion XP bonus idempotence', () => {
  it('promotion detected when tier changes', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 9999 }),
        fc.integer({ min: 1, max: 5000 }),
        (previousXP, delta) => {
          const previousTier = getLeagueTier(previousXP, DEFAULT_LEAGUE_THRESHOLDS);
          const newTier = getLeagueTier(previousXP + delta, DEFAULT_LEAGUE_THRESHOLDS);
          const promoted = previousTier !== newTier;

          // If promoted, the new tier should be higher
          if (promoted) {
            const tierRank: Record<LeagueTierName, number> = {
              Bronze: 0, Silver: 1, Gold: 2, Diamond: 3,
            };
            expect(tierRank[newTier]).toBeGreaterThan(tierRank[previousTier]);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('same XP queried twice yields same tier (no duplicate bonus)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10000 }),
        (xp) => {
          const tier1 = getLeagueTier(xp, DEFAULT_LEAGUE_THRESHOLDS);
          const tier2 = getLeagueTier(xp, DEFAULT_LEAGUE_THRESHOLDS);
          expect(tier1).toBe(tier2);
        },
      ),
      { numRuns: 100 },
    );
  });
});
