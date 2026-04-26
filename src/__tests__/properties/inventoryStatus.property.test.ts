// Feature: xp-marketplace, Property 24: inventory status resolution (active/consumed/expired)
// Feature: xp-marketplace, Property 25: display fields present for all inventory items
// **Validates: Requirements 5.2, 5.3, 5.4, 5.5**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// ─── Domain types ───────────────────────────────────────────────────────────

type PurchaseStatus = 'active' | 'consumed' | 'expired' | 'refunded';
type ItemCategory = 'cosmetic' | 'educational_perk' | 'power_up';

interface InventoryItem {
  purchaseId: string;
  itemName: string;
  category: ItemCategory;
  xpCost: number;
  purchasedAt: Date;
  status: PurchaseStatus;
  consumedAt: Date | null;
  expiresAt: Date | null;
}

interface DisplayItem {
  purchaseId: string;
  itemName: string;
  category: ItemCategory;
  xpCost: number;
  purchasedAt: Date;
  displayStatus: PurchaseStatus;
}

// ─── Domain helpers ─────────────────────────────────────────────────────────

/**
 * Pure function: resolve the effective status of an inventory item.
 * - If status is 'consumed' or 'refunded', keep as-is
 * - If status is 'active' and expiresAt is in the past, resolve to 'expired'
 * - Otherwise keep 'active'
 */
const resolveInventoryStatus = (item: InventoryItem, now: Date): PurchaseStatus => {
  if (item.status === 'consumed' || item.status === 'refunded') {
    return item.status;
  }
  if (item.status === 'expired') {
    return 'expired';
  }
  // status is 'active'
  if (item.expiresAt && item.expiresAt.getTime() <= now.getTime()) {
    return 'expired';
  }
  return 'active';
};

/**
 * Pure function: map inventory items to display items with resolved status.
 */
const toDisplayItems = (items: InventoryItem[], now: Date): DisplayItem[] => {
  return items.map((item) => ({
    purchaseId: item.purchaseId,
    itemName: item.itemName,
    category: item.category,
    xpCost: item.xpCost,
    purchasedAt: item.purchasedAt,
    displayStatus: resolveInventoryStatus(item, now),
  }));
};

// ─── Arbitraries ────────────────────────────────────────────────────────────

const statusArb = fc.constantFrom('active' as const, 'consumed' as const, 'expired' as const, 'refunded' as const);
const categoryArb = fc.constantFrom('cosmetic' as const, 'educational_perk' as const, 'power_up' as const);
const nowDate = new Date('2025-06-15T12:00:00Z');

const inventoryItemArb: fc.Arbitrary<InventoryItem> = fc.record({
  purchaseId: fc.uuid(),
  itemName: fc.stringMatching(/^[A-Za-z ]{3,30}$/),
  category: categoryArb,
  xpCost: fc.integer({ min: 1, max: 10000 }),
  purchasedAt: fc.date({ min: new Date('2024-01-01'), max: new Date('2025-06-15') }),
  status: statusArb,
  consumedAt: fc.oneof(fc.constant(null), fc.date({ min: new Date('2024-01-01'), max: new Date('2025-06-15') })),
  expiresAt: fc.oneof(
    fc.constant(null),
    fc.date({ min: new Date('2024-01-01'), max: new Date('2025-06-14') }), // past
    fc.date({ min: new Date('2025-06-16'), max: new Date('2026-12-31') }), // future
  ),
});

const inventoryArb = fc.array(inventoryItemArb, { minLength: 0, maxLength: 30 });

// ─── Property 24: status resolution ─────────────────────────────────────────

describe('Property 24 — Inventory status resolution', () => {
  it('P24a: consumed items always resolve to consumed', () => {
    fc.assert(
      fc.property(inventoryItemArb, (item) => {
        const consumed = { ...item, status: 'consumed' as const };
        expect(resolveInventoryStatus(consumed, nowDate)).toBe('consumed');
      }),
      { numRuns: 100 },
    );
  });

  it('P24b: refunded items always resolve to refunded', () => {
    fc.assert(
      fc.property(inventoryItemArb, (item) => {
        const refunded = { ...item, status: 'refunded' as const };
        expect(resolveInventoryStatus(refunded, nowDate)).toBe('refunded');
      }),
      { numRuns: 100 },
    );
  });

  it('P24c: active items with past expiresAt resolve to expired', () => {
    fc.assert(
      fc.property(
        inventoryItemArb,
        fc.date({ min: new Date('2024-01-01T00:00:00Z'), max: new Date('2025-06-14T23:59:59Z'), noInvalidDate: true }),
        (item, pastDate) => {
          const active = { ...item, status: 'active' as const, expiresAt: pastDate };
          expect(resolveInventoryStatus(active, nowDate)).toBe('expired');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P24d: active items with future expiresAt resolve to active', () => {
    fc.assert(
      fc.property(
        inventoryItemArb,
        fc.date({ min: new Date('2025-06-16T00:00:00Z'), max: new Date('2026-12-31T23:59:59Z'), noInvalidDate: true }),
        (item, futureDate) => {
          const active = { ...item, status: 'active' as const, expiresAt: futureDate };
          expect(resolveInventoryStatus(active, nowDate)).toBe('active');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P24e: active items with no expiresAt resolve to active', () => {
    fc.assert(
      fc.property(inventoryItemArb, (item) => {
        const active = { ...item, status: 'active' as const, expiresAt: null };
        expect(resolveInventoryStatus(active, nowDate)).toBe('active');
      }),
      { numRuns: 100 },
    );
  });

  it('P24f: resolved status is always a valid PurchaseStatus', () => {
    fc.assert(
      fc.property(inventoryItemArb, (item) => {
        const status = resolveInventoryStatus(item, nowDate);
        expect(['active', 'consumed', 'expired', 'refunded']).toContain(status);
      }),
      { numRuns: 100 },
    );
  });
});

// ─── Property 25: display fields present ────────────────────────────────────

describe('Property 25 — Display fields present for all inventory items', () => {
  it('P25a: every display item has all required fields', () => {
    fc.assert(
      fc.property(inventoryArb, (items) => {
        const displayItems = toDisplayItems(items, nowDate);
        for (const item of displayItems) {
          expect(typeof item.purchaseId).toBe('string');
          expect(item.purchaseId.length).toBeGreaterThan(0);
          expect(typeof item.itemName).toBe('string');
          expect(item.itemName.length).toBeGreaterThan(0);
          expect(['cosmetic', 'educational_perk', 'power_up']).toContain(item.category);
          expect(item.xpCost).toBeGreaterThan(0);
          expect(item.purchasedAt).toBeInstanceOf(Date);
          expect(['active', 'consumed', 'expired', 'refunded']).toContain(item.displayStatus);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('P25b: display items count matches input count', () => {
    fc.assert(
      fc.property(inventoryArb, (items) => {
        const displayItems = toDisplayItems(items, nowDate);
        expect(displayItems.length).toBe(items.length);
      }),
      { numRuns: 100 },
    );
  });

  it('P25c: display item preserves purchase cost from original', () => {
    fc.assert(
      fc.property(inventoryArb, (items) => {
        const displayItems = toDisplayItems(items, nowDate);
        for (let i = 0; i < items.length; i++) {
          expect(displayItems[i]!.xpCost).toBe(items[i]!.xpCost);
        }
      }),
      { numRuns: 100 },
    );
  });
});
