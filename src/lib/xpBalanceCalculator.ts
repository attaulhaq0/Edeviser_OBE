// =============================================================================
// XP Balance Calculator — Pure function: compute XP balance from transactions
// =============================================================================

export interface XPTransaction {
  xp_amount: number;
}

export interface XPPurchase {
  xp_cost: number;
  status: 'active' | 'consumed' | 'expired' | 'refunded';
}

/**
 * Compute the spendable XP balance for a student.
 *
 * Balance = GREATEST(0, SUM(xp_amounts) − SUM(xp_costs where status ≠ 'refunded'))
 *
 * Refunded purchases are excluded from the spent total because the XP
 * was returned to the student.
 */
export function computeXPBalance(
  transactions: readonly XPTransaction[],
  purchases: readonly XPPurchase[],
): number {
  const totalEarned = transactions.reduce(
    (sum, tx) => sum + tx.xp_amount,
    0,
  );

  const totalSpent = purchases.reduce(
    (sum, p) => (p.status !== 'refunded' ? sum + p.xp_cost : sum),
    0,
  );

  return Math.max(0, totalEarned - totalSpent);
}
