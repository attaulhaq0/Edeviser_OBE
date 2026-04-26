// Feature: xp-marketplace, Property 27: ratio computation and inflation status
// **Validates: Requirements 27.1, 27.3**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { computeEarnSpendRatio, type EarnSpendRatioInput } from '@/lib/earnSpendRatioCalculator';

// ─── Arbitraries ────────────────────────────────────────────────────────────

const earnedArb = fc.integer({ min: 0, max: 1_000_000 });

// ─── Property 27: Earn/spend ratio computation correctness ──────────────────

describe('Property 27 — Earn/spend ratio computation and inflation status', () => {
  it('P27a: ratio equals E/S when S > 0', () => {
    fc.assert(
      fc.property(earnedArb, fc.integer({ min: 1, max: 500_000 }), (earned, spent) => {
        const input: EarnSpendRatioInput = { totalEarned: earned, totalSpent: spent };
        const result = computeEarnSpendRatio(input);
        const expectedRatio = Math.round((earned / spent) * 100) / 100;
        expect(result.ratio).toBe(expectedRatio);
      }),
      { numRuns: 100 },
    );
  });

  it('P27b: status is healthy when 2 <= ratio <= 5', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100_000 }),
        (spent) => {
          // Pick earned so ratio is between 2 and 5
          const ratio = 3; // middle of healthy range
          const earned = spent * ratio;
          const result = computeEarnSpendRatio({ totalEarned: earned, totalSpent: spent });
          expect(result.status).toBe('healthy');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P27c: status is inflationary when ratio > 5', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 50_000 }),
        (spent) => {
          const earned = spent * 6; // ratio = 6 > 5
          const result = computeEarnSpendRatio({ totalEarned: earned, totalSpent: spent });
          expect(result.status).toBe('inflationary');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P27d: status is deflationary when ratio < 2', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 100_000 }),
        (spent) => {
          const earned = Math.floor(spent * 1.5); // ratio = 1.5 < 2
          const result = computeEarnSpendRatio({ totalEarned: earned, totalSpent: spent });
          expect(result.status).toBe('deflationary');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P27e: zero spending with positive earning is inflationary', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 1_000_000 }), (earned) => {
        const result = computeEarnSpendRatio({ totalEarned: earned, totalSpent: 0 });
        expect(result.status).toBe('inflationary');
      }),
      { numRuns: 100 },
    );
  });

  it('P27f: zero earned and zero spent is healthy', () => {
    const result = computeEarnSpendRatio({ totalEarned: 0, totalSpent: 0 });
    expect(result.status).toBe('healthy');
    expect(result.ratio).toBe(0);
  });
});
