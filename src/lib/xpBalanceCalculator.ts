/**
 * Pure function to compute a student's spendable XP balance.
 *
 * Balance = GREATEST(0, SUM(transactions.xp_amount) - SUM(purchases.xp_cost))
 *
 * Handles empty arrays and guarantees a non-negative result.
 */

export interface XPTransaction {
  xp_amount: number;
}

export interface XPPurchase {
  xp_cost: number;
}

export const computeXPBalance = (
  transactions: readonly XPTransaction[],
  purchases: readonly XPPurchase[],
): number => {
  const totalEarned = transactions.reduce((sum, t) => sum + t.xp_amount, 0);
  const totalSpent = purchases.reduce((sum, p) => sum + p.xp_cost, 0);
  return Math.max(0, totalEarned - totalSpent);
};
