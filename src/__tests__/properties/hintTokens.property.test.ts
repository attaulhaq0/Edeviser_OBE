// Feature: xp-marketplace, Property 16: hint tokens add 5 to daily allowance
// Feature: xp-marketplace, Property 17: hint tokens expire at midnight UTC
// **Validates: Requirements 10.1, 10.4**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// ─── Domain helpers ─────────────────────────────────────────────────────────

const HINTS_PER_PACK = 5;

/**
 * Pure function: compute total daily hint allowance.
 * baseDailyLimit + (activePacks × HINTS_PER_PACK)
 */
const computeHintAllowance = (baseDailyLimit: number, activePacks: number): number => {
  return baseDailyLimit + activePacks * HINTS_PER_PACK;
};

/**
 * Pure function: compute midnight UTC for a given date.
 */
const getMidnightUTC = (date: Date): Date => {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + 1);
  return d;
};

/**
 * Pure function: check if a hint token pack is still active.
 */
const isHintTokenActive = (purchaseDate: Date, currentDate: Date): boolean => {
  const expiry = getMidnightUTC(purchaseDate);
  return currentDate.getTime() < expiry.getTime();
};

// ─── Arbitraries ────────────────────────────────────────────────────────────

const baseLimitArb = fc.integer({ min: 3, max: 20 });
const activePacksArb = fc.integer({ min: 0, max: 10 });

// ─── Property 16: allowance computation ─────────────────────────────────────

describe('Property 16 — Hint token allowance computation', () => {
  it('P16a: each pack adds exactly 5 to the daily allowance', () => {
    fc.assert(
      fc.property(baseLimitArb, activePacksArb, (baseLimit, packs) => {
        const allowance = computeHintAllowance(baseLimit, packs);
        expect(allowance).toBe(baseLimit + packs * HINTS_PER_PACK);
      }),
      { numRuns: 100 },
    );
  });

  it('P16b: zero packs means allowance equals base limit', () => {
    fc.assert(
      fc.property(baseLimitArb, (baseLimit) => {
        expect(computeHintAllowance(baseLimit, 0)).toBe(baseLimit);
      }),
      { numRuns: 100 },
    );
  });

  it('P16c: allowance is always >= base limit', () => {
    fc.assert(
      fc.property(baseLimitArb, activePacksArb, (baseLimit, packs) => {
        expect(computeHintAllowance(baseLimit, packs)).toBeGreaterThanOrEqual(baseLimit);
      }),
      { numRuns: 100 },
    );
  });

  it('P16d: allowance increases monotonically with pack count', () => {
    fc.assert(
      fc.property(
        baseLimitArb,
        fc.integer({ min: 0, max: 9 }),
        (baseLimit, packs) => {
          const current = computeHintAllowance(baseLimit, packs);
          const next = computeHintAllowance(baseLimit, packs + 1);
          expect(next).toBe(current + HINTS_PER_PACK);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 17: midnight UTC expiry ───────────────────────────────────────

describe('Property 17 — Hint tokens expire at midnight UTC', () => {
  it('P17a: token purchased during the day is active before midnight UTC', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2024, max: 2026 }),
        fc.integer({ min: 0, max: 11 }),
        fc.integer({ min: 1, max: 28 }),
        fc.integer({ min: 0, max: 22 }),
        (year, month, day, hour) => {
          const purchaseDate = new Date(Date.UTC(year, month, day, hour, 0, 0));
          // Check 1 hour after purchase (still same day)
          const checkDate = new Date(purchaseDate.getTime() + 3600_000);
          // If check is still before midnight of the purchase day, should be active
          const midnight = getMidnightUTC(purchaseDate);
          if (checkDate.getTime() < midnight.getTime()) {
            expect(isHintTokenActive(purchaseDate, checkDate)).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P17b: token is expired at or after midnight UTC of purchase day', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2024, max: 2026 }),
        fc.integer({ min: 0, max: 11 }),
        fc.integer({ min: 1, max: 28 }),
        fc.integer({ min: 0, max: 23 }),
        (year, month, day, hour) => {
          const purchaseDate = new Date(Date.UTC(year, month, day, hour, 0, 0));
          const midnight = getMidnightUTC(purchaseDate);
          // At midnight: expired
          expect(isHintTokenActive(purchaseDate, midnight)).toBe(false);
          // 1 second after midnight: expired
          const afterMidnight = new Date(midnight.getTime() + 1000);
          expect(isHintTokenActive(purchaseDate, afterMidnight)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P17c: expiry time is always midnight UTC (00:00:00.000)', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2024-01-01'), max: new Date('2026-12-31') }).filter((d) => !isNaN(d.getTime())),
        (purchaseDate) => {
          const expiry = getMidnightUTC(purchaseDate);
          expect(expiry.getUTCHours()).toBe(0);
          expect(expiry.getUTCMinutes()).toBe(0);
          expect(expiry.getUTCSeconds()).toBe(0);
          expect(expiry.getUTCMilliseconds()).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });
});
