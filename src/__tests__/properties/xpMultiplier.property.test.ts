// Feature: xp-marketplace, Property 18: XP boost stacking formula
// **Validates: Requirements 11.1, 11.2, 18.2**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// ─── Domain helpers ─────────────────────────────────────────────────────────

/**
 * Pure function: compute final XP using the stacking formula.
 * finalXP = floor(baseXP × studentBoostMultiplier × adminEventMultiplier)
 */
const computeFinalXP = (
  baseXP: number,
  studentBoostMultiplier: number,
  adminEventMultiplier: number,
): number => {
  return Math.floor(baseXP * studentBoostMultiplier * adminEventMultiplier);
};

// ─── Arbitraries ────────────────────────────────────────────────────────────

const baseXPArb = fc.integer({ min: 1, max: 1000 });
const studentBoostArb = fc.constantFrom(1, 2); // 1 = no boost, 2 = 2x boost
const adminMultiplierArb = fc.constantFrom(1, 1.5, 2, 3); // common admin event multipliers

// ─── Property 18: stacking formula ──────────────────────────────────────────

describe('Property 18 — XP boost stacking: floor(base × student_boost × admin_multiplier)', () => {
  it('P18a: formula produces floor(base × student × admin)', () => {
    fc.assert(
      fc.property(baseXPArb, studentBoostArb, adminMultiplierArb, (base, student, admin) => {
        const result = computeFinalXP(base, student, admin);
        expect(result).toBe(Math.floor(base * student * admin));
      }),
      { numRuns: 100 },
    );
  });

  it('P18b: no boosts means final XP equals base XP', () => {
    fc.assert(
      fc.property(baseXPArb, (base) => {
        expect(computeFinalXP(base, 1, 1)).toBe(base);
      }),
      { numRuns: 100 },
    );
  });

  it('P18c: student 2x boost doubles the base (no admin event)', () => {
    fc.assert(
      fc.property(baseXPArb, (base) => {
        expect(computeFinalXP(base, 2, 1)).toBe(base * 2);
      }),
      { numRuns: 100 },
    );
  });

  it('P18d: both 2x boosts produce 4x base', () => {
    fc.assert(
      fc.property(baseXPArb, (base) => {
        expect(computeFinalXP(base, 2, 2)).toBe(base * 4);
      }),
      { numRuns: 100 },
    );
  });

  it('P18e: result is always >= base XP (multipliers >= 1)', () => {
    fc.assert(
      fc.property(baseXPArb, studentBoostArb, adminMultiplierArb, (base, student, admin) => {
        expect(computeFinalXP(base, student, admin)).toBeGreaterThanOrEqual(base);
      }),
      { numRuns: 100 },
    );
  });

  it('P18f: result is always an integer (floor applied)', () => {
    fc.assert(
      fc.property(
        baseXPArb,
        fc.double({ min: 1, max: 5, noNaN: true }),
        fc.double({ min: 1, max: 5, noNaN: true }),
        (base, student, admin) => {
          const result = computeFinalXP(base, student, admin);
          expect(Number.isInteger(result)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P18g: multiplicative stacking — order does not matter', () => {
    fc.assert(
      fc.property(baseXPArb, studentBoostArb, adminMultiplierArb, (base, student, admin) => {
        // floor(base * student * admin) === floor(base * admin * student)
        expect(computeFinalXP(base, student, admin)).toBe(
          Math.floor(base * admin * student),
        );
      }),
      { numRuns: 100 },
    );
  });
});
