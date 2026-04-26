// Feature: xp-marketplace, Property 19: max one active boost at a time
// Feature: xp-marketplace, Property 20: streak shield cap at 3
// **Validates: Requirements 11.7, 12.1, 12.3**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// ─── Domain helpers ─────────────────────────────────────────────────────────

interface ActiveBoost {
  studentId: string;
  multiplier: number;
  expiresAt: Date;
}

const MAX_STREAK_SHIELDS = 3;

/**
 * Pure function: check if a student can activate a new boost.
 * Only one active boost at a time.
 */
const canActivateBoost = (activeBoosts: ActiveBoost[], studentId: string, now: Date): boolean => {
  const currentActive = activeBoosts.filter(
    (b) => b.studentId === studentId && b.expiresAt.getTime() > now.getTime(),
  );
  return currentActive.length === 0;
};

/**
 * Pure function: check if a student can purchase a streak shield.
 * Max 3 total.
 */
const canPurchaseStreakShield = (currentFreezes: number): boolean => {
  return currentFreezes < MAX_STREAK_SHIELDS;
};

/**
 * Pure function: compute new freeze count after purchase.
 */
const applyStreakShieldPurchase = (currentFreezes: number): number => {
  if (currentFreezes >= MAX_STREAK_SHIELDS) return currentFreezes;
  return currentFreezes + 1;
};

// ─── Arbitraries ────────────────────────────────────────────────────────────

const nowArb = fc.date({ min: new Date('2025-01-01'), max: new Date('2025-12-31') });

// ─── Property 19: one active boost at a time ────────────────────────────────

describe('Property 19 — Max one active boost at a time', () => {
  it('P19a: cannot activate boost when one is already active', () => {
    fc.assert(
      fc.property(fc.uuid(), nowArb, (studentId, now) => {
        const existingBoost: ActiveBoost = {
          studentId,
          multiplier: 2,
          expiresAt: new Date(now.getTime() + 1800_000), // 30 min from now
        };
        expect(canActivateBoost([existingBoost], studentId, now)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it('P19b: can activate boost when no active boost exists', () => {
    fc.assert(
      fc.property(fc.uuid(), nowArb, (studentId, now) => {
        expect(canActivateBoost([], studentId, now)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('P19c: can activate boost when previous boost has expired', () => {
    fc.assert(
      fc.property(fc.uuid(), nowArb, (studentId, now) => {
        const expiredBoost: ActiveBoost = {
          studentId,
          multiplier: 2,
          expiresAt: new Date(now.getTime() - 1000), // expired 1 second ago
        };
        expect(canActivateBoost([expiredBoost], studentId, now)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('P19d: other students active boosts do not block this student', () => {
    fc.assert(
      fc.property(fc.uuid(), fc.uuid(), nowArb, (studentId, otherStudentId, now) => {
        if (studentId === otherStudentId) return; // skip identical UUIDs
        const otherBoost: ActiveBoost = {
          studentId: otherStudentId,
          multiplier: 2,
          expiresAt: new Date(now.getTime() + 1800_000),
        };
        expect(canActivateBoost([otherBoost], studentId, now)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });
});

// ─── Property 20: streak shield cap at 3 ────────────────────────────────────

describe('Property 20 — Streak shield cap at 3', () => {
  it('P20a: cannot purchase when already at max (3)', () => {
    expect(canPurchaseStreakShield(3)).toBe(false);
  });

  it('P20b: can purchase when below max', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 2 }), (currentFreezes) => {
        expect(canPurchaseStreakShield(currentFreezes)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('P20c: purchase increments by exactly 1', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 2 }), (currentFreezes) => {
        const newCount = applyStreakShieldPurchase(currentFreezes);
        expect(newCount).toBe(currentFreezes + 1);
      }),
      { numRuns: 100 },
    );
  });

  it('P20d: purchase at max keeps count unchanged', () => {
    fc.assert(
      fc.property(fc.integer({ min: 3, max: 10 }), (currentFreezes) => {
        const newCount = applyStreakShieldPurchase(currentFreezes);
        expect(newCount).toBe(currentFreezes); // no change when at or above cap
      }),
      { numRuns: 100 },
    );
  });

  it('P20e: freeze count never exceeds 3 after any number of purchases', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 3 }),
        fc.integer({ min: 1, max: 10 }),
        (startFreezes, purchaseAttempts) => {
          let count = startFreezes;
          for (let i = 0; i < purchaseAttempts; i++) {
            if (canPurchaseStreakShield(count)) {
              count = applyStreakShieldPurchase(count);
            }
          }
          expect(count).toBeLessThanOrEqual(MAX_STREAK_SHIELDS);
        },
      ),
      { numRuns: 100 },
    );
  });
});
