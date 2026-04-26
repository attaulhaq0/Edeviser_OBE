// Feature: xp-marketplace, Property 1: balance = SUM(earned) - SUM(spent), always >= 0
// Feature: xp-marketplace, Property 2: balance is never negative
// **Validates: Requirements 1.1, 1.6**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { computeXPBalance } from '@/lib/xpBalanceCalculator';

// ─── Arbitraries ────────────────────────────────────────────────────────────

const xpTransactionArb = fc.record({
  xp_amount: fc.integer({ min: 1, max: 10000 }),
});

const xpPurchaseArb = fc.record({
  xp_cost: fc.integer({ min: 1, max: 5000 }),
});

const transactionsArb = fc.array(xpTransactionArb, { minLength: 0, maxLength: 50 });
const purchasesArb = fc.array(xpPurchaseArb, { minLength: 0, maxLength: 30 });

// ─── Property 1: balance = SUM(earned) - SUM(spent), clamped to 0 ──────────

describe('Property 1 — XP balance computation correctness', () => {
  it('P1a: balance equals max(0, total earned - total spent)', () => {
    fc.assert(
      fc.property(transactionsArb, purchasesArb, (transactions, purchases) => {
        const totalEarned = transactions.reduce((s, t) => s + t.xp_amount, 0);
        const totalSpent = purchases.reduce((s, p) => s + p.xp_cost, 0);
        const expected = Math.max(0, totalEarned - totalSpent);

        expect(computeXPBalance(transactions, purchases)).toBe(expected);
      }),
      { numRuns: 100 },
    );
  });

  it('P1b: empty transactions and purchases yields zero balance', () => {
    expect(computeXPBalance([], [])).toBe(0);
  });

  it('P1c: no purchases means balance equals total earned', () => {
    fc.assert(
      fc.property(transactionsArb, (transactions) => {
        const totalEarned = transactions.reduce((s, t) => s + t.xp_amount, 0);
        expect(computeXPBalance(transactions, [])).toBe(totalEarned);
      }),
      { numRuns: 100 },
    );
  });
});

// ─── Property 2: balance is never negative ──────────────────────────────────

describe('Property 2 — XP balance non-negativity', () => {
  it('P2a: balance is always >= 0 regardless of inputs', () => {
    fc.assert(
      fc.property(transactionsArb, purchasesArb, (transactions, purchases) => {
        expect(computeXPBalance(transactions, purchases)).toBeGreaterThanOrEqual(0);
      }),
      { numRuns: 100 },
    );
  });

  it('P2b: even when spending exceeds earning, balance is 0', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({ xp_amount: fc.integer({ min: 1, max: 10 }) }), { minLength: 1, maxLength: 5 }),
        fc.array(fc.record({ xp_cost: fc.integer({ min: 1000, max: 5000 }) }), { minLength: 1, maxLength: 10 }),
        (transactions, purchases) => {
          expect(computeXPBalance(transactions, purchases)).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });
});
