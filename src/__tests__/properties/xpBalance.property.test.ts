// Feature: xp-marketplace, Property 1: XP Balance computation correctness
// Feature: xp-marketplace, Property 2: XP Balance non-negativity
// **Validates: Requirements 1.1, 1.6, 4.3**

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  computeXPBalance,
  type XPTransaction,
  type XPPurchase,
} from "@/lib/xpBalanceCalculator";

// ─── Arbitraries ────────────────────────────────────────────────────────────

const xpTransactionArb: fc.Arbitrary<XPTransaction> = fc.record({
  xp_amount: fc.integer({ min: 1, max: 10_000 }),
});

const purchaseStatusArb = fc.constantFrom<XPPurchase["status"]>(
  "active",
  "consumed",
  "expired",
  "refunded"
);

const xpPurchaseArb: fc.Arbitrary<XPPurchase> = fc.record({
  xp_cost: fc.integer({ min: 1, max: 5_000 }),
  status: purchaseStatusArb,
});

// ─── P1: Balance = SUM(earnings) - SUM(non-refunded purchases) ──────────────

describe("Property 1 — XP Balance computation correctness", () => {
  it("P1: balance equals SUM(xp_amounts) minus SUM(non-refunded xp_costs), floored at 0", () => {
    fc.assert(
      fc.property(
        fc.array(xpTransactionArb, { minLength: 0, maxLength: 20 }),
        fc.array(xpPurchaseArb, { minLength: 0, maxLength: 20 }),
        (transactions, purchases) => {
          const balance = computeXPBalance(transactions, purchases);

          const totalEarned = transactions.reduce((s, t) => s + t.xp_amount, 0);
          const totalSpent = purchases.reduce(
            (s, p) => (p.status !== "refunded" ? s + p.xp_cost : s),
            0
          );
          const expected = Math.max(0, totalEarned - totalSpent);

          expect(balance).toBe(expected);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── P2: Balance >= 0 ───────────────────────────────────────────────────────

describe("Property 2 — XP Balance non-negativity", () => {
  it("P2: balance is always >= 0 regardless of inputs", () => {
    fc.assert(
      fc.property(
        fc.array(xpTransactionArb, { minLength: 0, maxLength: 20 }),
        fc.array(xpPurchaseArb, { minLength: 0, maxLength: 20 }),
        (transactions, purchases) => {
          const balance = computeXPBalance(transactions, purchases);
          expect(balance).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});
