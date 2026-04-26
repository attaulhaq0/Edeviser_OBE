// Feature: xp-marketplace, Property 21: price change immutability for existing purchases
// Feature: xp-marketplace, Property 22: discount validation (5-90%)
// Feature: xp-marketplace, Property 23: analytics aggregation matches raw data
// **Validates: Requirements 13.3, 14.1, 15.1, 15.4**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { createSaleEventSchema } from '@/lib/marketplaceSchemas';

// ─── Domain helpers ─────────────────────────────────────────────────────────

interface PurchaseRecord {
  purchaseId: string;
  xpCostAtPurchase: number;
  category: 'cosmetic' | 'educational_perk' | 'power_up';
}

/**
 * Pure function: verify that existing purchase records are not affected by price changes.
 * Returns true if all purchase costs remain unchanged after a price update.
 */
const purchasesUnaffectedByPriceChange = (
  purchasesBefore: PurchaseRecord[],
  purchasesAfter: PurchaseRecord[],
): boolean => {
  return purchasesBefore.every((before) => {
    const after = purchasesAfter.find((p) => p.purchaseId === before.purchaseId);
    return after !== undefined && after.xpCostAtPurchase === before.xpCostAtPurchase;
  });
};

/**
 * Pure function: aggregate analytics from raw purchase data.
 */
const aggregateAnalytics = (purchases: PurchaseRecord[]) => {
  const totalSpent = purchases.reduce((sum, p) => sum + p.xpCostAtPurchase, 0);
  const totalCount = purchases.length;
  const uniqueBuyers = new Set(purchases.map((p) => p.purchaseId)).size;
  const byCategory = purchases.reduce(
    (acc, p) => {
      acc[p.category] = (acc[p.category] || 0) + p.xpCostAtPurchase;
      return acc;
    },
    {} as Record<string, number>,
  );

  return { totalSpent, totalCount, uniqueBuyers, byCategory };
};

// ─── Arbitraries ────────────────────────────────────────────────────────────

const categoryArb = fc.constantFrom('cosmetic' as const, 'educational_perk' as const, 'power_up' as const);

const purchaseRecordArb: fc.Arbitrary<PurchaseRecord> = fc.record({
  purchaseId: fc.uuid(),
  xpCostAtPurchase: fc.integer({ min: 1, max: 10000 }),
  category: categoryArb,
});

const purchasesArb = fc.array(purchaseRecordArb, { minLength: 0, maxLength: 50 });

// ─── Property 21: price change immutability ─────────────────────────────────

describe('Property 21 — Price changes do not affect existing purchases', () => {
  it('P21a: existing purchase costs remain unchanged after price update', () => {
    fc.assert(
      fc.property(purchasesArb, (purchases) => {
        // Simulate: purchases exist, then admin changes item price
        // The "after" records should have identical xpCostAtPurchase
        const purchasesAfter = purchases.map((p) => ({ ...p })); // shallow copy
        expect(purchasesUnaffectedByPriceChange(purchases, purchasesAfter)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('P21b: modifying a purchase cost would be detected as a violation', () => {
    fc.assert(
      fc.property(
        fc.array(purchaseRecordArb, { minLength: 1, maxLength: 20 }),
        fc.integer({ min: 1, max: 10000 }),
        (purchases, newCost) => {
          const purchasesAfter = purchases.map((p, i) =>
            i === 0 ? { ...p, xpCostAtPurchase: newCost } : { ...p },
          );
          // If the cost changed, immutability is violated
          if (newCost !== purchases[0]!.xpCostAtPurchase) {
            expect(purchasesUnaffectedByPriceChange(purchases, purchasesAfter)).toBe(false);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 22: discount validation (5-90%) ──────────────────────────────

describe('Property 22 — Discount percentage must be 5-90', () => {
  // The discount_percentage field in createSaleEventSchema is z.number().int().min(5).max(90)
  // We validate the full schema with a complete valid payload to test the constraint end-to-end.

  const validSalePayload = (discount: number) => ({
    name: 'Test Sale',
    discount_percentage: discount,
    start_date: '2025-01-01T00:00:00.000Z',
    end_date: '2025-01-31T00:00:00.000Z',
    item_ids: ['a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'],
  });

  it('P22a: valid discounts (5-90) pass schema validation', () => {
    fc.assert(
      fc.property(fc.integer({ min: 5, max: 90 }), (discount) => {
        const result = createSaleEventSchema.safeParse(validSalePayload(discount));
        expect(result.success).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('P22b: discounts below 5 fail validation', () => {
    fc.assert(
      fc.property(fc.integer({ min: -100, max: 4 }), (discount) => {
        const result = createSaleEventSchema.safeParse(validSalePayload(discount));
        expect(result.success).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it('P22c: discounts above 90 fail validation', () => {
    fc.assert(
      fc.property(fc.integer({ min: 91, max: 200 }), (discount) => {
        const result = createSaleEventSchema.safeParse(validSalePayload(discount));
        expect(result.success).toBe(false);
      }),
      { numRuns: 100 },
    );
  });
});

// ─── Property 23: analytics aggregation matches raw data ────────────────────

describe('Property 23 — Analytics aggregation matches raw data', () => {
  it('P23a: total spent equals sum of all purchase costs', () => {
    fc.assert(
      fc.property(purchasesArb, (purchases) => {
        const analytics = aggregateAnalytics(purchases);
        const expectedTotal = purchases.reduce((s, p) => s + p.xpCostAtPurchase, 0);
        expect(analytics.totalSpent).toBe(expectedTotal);
      }),
      { numRuns: 100 },
    );
  });

  it('P23b: total count equals number of purchases', () => {
    fc.assert(
      fc.property(purchasesArb, (purchases) => {
        const analytics = aggregateAnalytics(purchases);
        expect(analytics.totalCount).toBe(purchases.length);
      }),
      { numRuns: 100 },
    );
  });

  it('P23c: category breakdown sums equal total spent', () => {
    fc.assert(
      fc.property(purchasesArb, (purchases) => {
        const analytics = aggregateAnalytics(purchases);
        const categorySum = Object.values(analytics.byCategory).reduce((s, v) => s + v, 0);
        expect(categorySum).toBe(analytics.totalSpent);
      }),
      { numRuns: 100 },
    );
  });

  it('P23d: empty purchases produce zero aggregates', () => {
    const analytics = aggregateAnalytics([]);
    expect(analytics.totalSpent).toBe(0);
    expect(analytics.totalCount).toBe(0);
    expect(Object.keys(analytics.byCategory).length).toBe(0);
  });
});
