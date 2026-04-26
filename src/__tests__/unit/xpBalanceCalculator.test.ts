import { describe, it, expect } from 'vitest';
import { computeXPBalance } from '@/lib/xpBalanceCalculator';

describe('computeXPBalance', () => {
  it('returns 0 for empty arrays', () => {
    expect(computeXPBalance([], [])).toBe(0);
  });

  it('returns total earned when no purchases', () => {
    const transactions = [{ xp_amount: 100 }, { xp_amount: 50 }];
    expect(computeXPBalance(transactions, [])).toBe(150);
  });

  it('subtracts purchases from earnings', () => {
    const transactions = [{ xp_amount: 200 }];
    const purchases = [{ xp_cost: 75 }];
    expect(computeXPBalance(transactions, purchases)).toBe(125);
  });

  it('returns 0 when purchases exceed earnings', () => {
    const transactions = [{ xp_amount: 50 }];
    const purchases = [{ xp_cost: 100 }];
    expect(computeXPBalance(transactions, purchases)).toBe(0);
  });

  it('handles multiple transactions and purchases', () => {
    const transactions = [
      { xp_amount: 100 },
      { xp_amount: 200 },
      { xp_amount: 50 },
    ];
    const purchases = [{ xp_cost: 80 }, { xp_cost: 120 }];
    expect(computeXPBalance(transactions, purchases)).toBe(150);
  });

  it('returns 0 when exactly balanced', () => {
    const transactions = [{ xp_amount: 100 }];
    const purchases = [{ xp_cost: 100 }];
    expect(computeXPBalance(transactions, purchases)).toBe(0);
  });
});
