// Feature: xp-marketplace, Property 28: probability distribution (50/30/20 weights)
// **Validates: Requirements 26.5, 26.6**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { resolveMysteryReward, type MysteryRewardWeights } from '@/lib/mysteryRewardResolver';

// ─── Property 28: Mystery reward box probability distribution ───────────────

describe('Property 28 — Mystery reward box probability distribution', () => {
  it('P28a: outcome is always one of xp_multiplier, cosmetic, or boost', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 999 }), (randomValue) => {
        const result = resolveMysteryReward({ randomValue });
        expect(['xp_multiplier', 'cosmetic', 'boost']).toContain(result.type);
      }),
      { numRuns: 100 },
    );
  });

  it('P28b: randomValue 0-49 yields xp_multiplier with default weights', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 49 }), (randomValue) => {
        const result = resolveMysteryReward({ randomValue });
        expect(result.type).toBe('xp_multiplier');
        expect(result.xpMultiplier).toBe(2.0);
      }),
      { numRuns: 100 },
    );
  });

  it('P28c: randomValue 50-79 yields cosmetic with default weights', () => {
    fc.assert(
      fc.property(fc.integer({ min: 50, max: 79 }), (randomValue) => {
        const result = resolveMysteryReward({ randomValue });
        expect(result.type).toBe('cosmetic');
      }),
      { numRuns: 100 },
    );
  });

  it('P28d: randomValue 80-99 yields boost with default weights', () => {
    fc.assert(
      fc.property(fc.integer({ min: 80, max: 99 }), (randomValue) => {
        const result = resolveMysteryReward({ randomValue });
        expect(result.type).toBe('boost');
        expect(result.boostDurationMinutes).toBe(30);
      }),
      { numRuns: 100 },
    );
  });

  it('P28e: distribution approximates 50/30/20 over many samples', () => {
    const counts = { xp_multiplier: 0, cosmetic: 0, boost: 0 };
    const total = 1000;
    for (let i = 0; i < total; i++) {
      const result = resolveMysteryReward({ randomValue: i });
      counts[result.type]++;
    }
    // Within 10% tolerance of expected distribution
    expect(counts.xp_multiplier / total).toBeCloseTo(0.5, 1);
    expect(counts.cosmetic / total).toBeCloseTo(0.3, 1);
    expect(counts.boost / total).toBeCloseTo(0.2, 1);
  });

  it('P28f: custom weights are respected', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 99 }), (randomValue) => {
        const weights: MysteryRewardWeights = { xp_multiplier: 10, cosmetic: 10, boost: 80 };
        const result = resolveMysteryReward({ randomValue, weights });
        const normalized = Math.abs(Math.round(randomValue)) % 100;
        if (normalized < 10) expect(result.type).toBe('xp_multiplier');
        else if (normalized < 20) expect(result.type).toBe('cosmetic');
        else expect(result.type).toBe('boost');
      }),
      { numRuns: 100 },
    );
  });

  it('P28g: result always has a description', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 999 }), (randomValue) => {
        const result = resolveMysteryReward({ randomValue });
        expect(result.description).toBeTruthy();
        expect(result.description.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 },
    );
  });
});
