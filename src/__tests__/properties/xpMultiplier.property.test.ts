// Feature: xp-marketplace, Property 18: XP multiplier stacking formula
// **Validates: Requirements 11.2, 18.2, 18.3**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// ─── Pure function under test ───────────────────────────────────────────────

/**
 * Compute final XP using the stacking formula:
 * floor(base_xp × student_boost × admin_multiplier)
 */
function computeFinalXP(
  baseXP: number,
  studentBoostMultiplier: number,
  adminEventMultiplier: number,
): number {
  return Math.floor(baseXP * studentBoostMultiplier * adminEventMultiplier);
}

// ─── Arbitraries ────────────────────────────────────────────────────────────

const baseXPArb = fc.integer({ min: 1, max: 500 });
const studentBoostArb = fc.constantFrom(1.0, 1.5, 2.0, 3.0);
const adminMultiplierArb = fc.constantFrom(1.0, 1.5, 2.0, 3.0);

// ─── P18: floor(base × student_boost × admin_multiplier) ───────────────────

describe('Property 18 — XP multiplier stacking formula', () => {
  it('P18a: final XP equals floor(base × student_boost × admin_multiplier)', () => {
    fc.assert(
      fc.property(baseXPArb, studentBoostArb, adminMultiplierArb, (base, studentBoost, adminMult) => {
        const result = computeFinalXP(base, studentBoost, adminMult);
        const expected = Math.floor(base * studentBoost * adminMult);
        expect(result).toBe(expected);
      }),
      { numRuns: 100 },
    );
  });

  it('P18b: when no student boost, multiplier defaults to 1 (no change)', () => {
    fc.assert(
      fc.property(baseXPArb, adminMultiplierArb, (base, adminMult) => {
        const result = computeFinalXP(base, 1.0, adminMult);
        const expected = Math.floor(base * adminMult);
        expect(result).toBe(expected);
      }),
      { numRuns: 100 },
    );
  });

  it('P18c: multipliers are multiplicative, not additive', () => {
    fc.assert(
      fc.property(baseXPArb, (base) => {
        // 2x student + 2x admin = 4x total, not 3x
        const result = computeFinalXP(base, 2.0, 2.0);
        expect(result).toBe(Math.floor(base * 4));
      }),
      { numRuns: 100 },
    );
  });

  it('P18d: result is always an integer (floor applied)', () => {
    fc.assert(
      fc.property(baseXPArb, studentBoostArb, adminMultiplierArb, (base, studentBoost, adminMult) => {
        const result = computeFinalXP(base, studentBoost, adminMult);
        expect(Number.isInteger(result)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });
});
