// =============================================================================
// Property-Based Test: Mystery Reward Resolver
// Task 25.3 — P28: probability distribution (50/30/20 weights)
// Feature: xp-marketplace
// =============================================================================

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  resolveMysteryReward,
  getRewardProbabilities,
  DEFAULT_MYSTERY_WEIGHTS,
} from '@/lib/mysteryRewardResolver';

/**
 * **Validates: Requirements 6.1**
 * P28: Mystery reward resolution respects probability weights.
 */
describe('P28: Mystery reward probability distribution', () => {
  it('always returns a valid reward type for any roll in [0, 1)', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 0.9999, noNaN: true }),
        (roll) => {
          const result = resolveMysteryReward(roll);
          expect(['double_xp', 'cosmetic', 'boost']).toContain(result.type);
          expect(result.label).toBeTruthy();
          expect(result.description).toBeTruthy();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('roll < 0.5 always returns double_xp with default weights', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 0.4999, noNaN: true }),
        (roll) => {
          const result = resolveMysteryReward(roll, DEFAULT_MYSTERY_WEIGHTS);
          expect(result.type).toBe('double_xp');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('roll >= 0.5 and < 0.8 returns cosmetic with default weights', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.5, max: 0.7999, noNaN: true }),
        (roll) => {
          const result = resolveMysteryReward(roll, DEFAULT_MYSTERY_WEIGHTS);
          expect(result.type).toBe('cosmetic');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('roll >= 0.8 returns boost with default weights', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.8, max: 0.9999, noNaN: true }),
        (roll) => {
          const result = resolveMysteryReward(roll, DEFAULT_MYSTERY_WEIGHTS);
          expect(result.type).toBe('boost');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('probabilities sum to 1 for any valid weights', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 1, max: 100 }),
        (w1, w2, w3) => {
          const weights = [
            { type: 'double_xp' as const, weight: w1 },
            { type: 'cosmetic' as const, weight: w2 },
            { type: 'boost' as const, weight: w3 },
          ];
          const probs = getRewardProbabilities(weights);
          const sum = probs.reduce((s, p) => s + p.probability, 0);
          expect(Math.abs(sum - 1)).toBeLessThan(0.0001);
        },
      ),
      { numRuns: 100 },
    );
  });
});
