// Feature: xp-marketplace, Property 24: Inventory item status resolution
// Feature: xp-marketplace, Property 25: Marketplace item display contains required fields
// **Validates: Requirements 5.4, 5.5, 3.2, 5.2**

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

// ─── Types ──────────────────────────────────────────────────────────────────

type PurchaseStatus = "active" | "consumed" | "expired" | "refunded";

interface InventoryItem {
  purchase_id: string;
  item_name: string;
  item_category: string;
  item_sub_category: string;
  xp_cost: number;
  status: PurchaseStatus;
  purchased_at: string;
  boost_expires_at: string | null;
}

interface MarketplaceItemDisplay {
  name: string;
  description: string;
  xp_price: number;
  level_requirement: number;
  is_active: boolean;
}

// ─── Pure functions under test ──────────────────────────────────────────────

function resolveInventoryStatus(
  item: InventoryItem,
  now: Date
): { displayStatus: string; isUsable: boolean } {
  if (item.status === "refunded")
    return { displayStatus: "Refunded", isUsable: false };
  if (item.status === "consumed")
    return { displayStatus: "Consumed", isUsable: false };
  if (item.status === "expired")
    return { displayStatus: "Expired", isUsable: false };

  // Active — check if boost has expired
  if (
    item.boost_expires_at &&
    new Date(item.boost_expires_at).getTime() < now.getTime()
  ) {
    return { displayStatus: "Expired", isUsable: false };
  }

  return { displayStatus: "Active", isUsable: true };
}

function hasRequiredDisplayFields(item: MarketplaceItemDisplay): boolean {
  return (
    typeof item.name === "string" &&
    item.name.length > 0 &&
    typeof item.description === "string" &&
    item.description.length > 0 &&
    typeof item.xp_price === "number" &&
    item.xp_price > 0 &&
    typeof item.is_active === "boolean"
  );
}

// ─── Arbitraries ────────────────────────────────────────────────────────────

const statusArb = fc.constantFrom<PurchaseStatus>(
  "active",
  "consumed",
  "expired",
  "refunded"
);

const inventoryItemArb: fc.Arbitrary<InventoryItem> = fc.record({
  purchase_id: fc.uuid(),
  item_name: fc.constantFrom("Ocean Blue", "Extra Quiz Attempt", "2x XP Boost"),
  item_category: fc.constantFrom("cosmetic", "educational_perk", "power_up"),
  item_sub_category: fc.constantFrom(
    "profile_theme",
    "extra_quiz_attempt",
    "xp_boost"
  ),
  xp_cost: fc.integer({ min: 1, max: 5_000 }),
  status: statusArb,
  purchased_at: fc
    .integer({
      min: new Date("2024-01-01").getTime(),
      max: new Date("2025-12-31").getTime(),
    })
    .map((ts) => new Date(ts).toISOString()),
  boost_expires_at: fc.option(
    fc
      .integer({
        min: new Date("2024-01-01").getTime(),
        max: new Date("2026-12-31").getTime(),
      })
      .map((ts) => new Date(ts).toISOString()),
    { nil: null }
  ),
});

const displayItemArb: fc.Arbitrary<MarketplaceItemDisplay> = fc.record({
  name: fc.string({ minLength: 1, maxLength: 100 }),
  description: fc.string({ minLength: 1, maxLength: 500 }),
  xp_price: fc.integer({ min: 1, max: 50_000 }),
  level_requirement: fc.integer({ min: 0, max: 50 }),
  is_active: fc.boolean(),
});

// ─── P24: Status resolution (active/consumed/expired/refunded) ──────────────

describe("Property 24 — Inventory item status resolution", () => {
  it("P24: status resolves correctly based on purchase status and boost expiry", () => {
    fc.assert(
      fc.property(inventoryItemArb, (item) => {
        const now = new Date();
        const result = resolveInventoryStatus(item, now);

        if (item.status === "refunded") {
          expect(result.displayStatus).toBe("Refunded");
          expect(result.isUsable).toBe(false);
        } else if (item.status === "consumed") {
          expect(result.displayStatus).toBe("Consumed");
          expect(result.isUsable).toBe(false);
        } else if (item.status === "expired") {
          expect(result.displayStatus).toBe("Expired");
          expect(result.isUsable).toBe(false);
        } else {
          // Active — check boost expiry
          if (
            item.boost_expires_at &&
            new Date(item.boost_expires_at).getTime() < now.getTime()
          ) {
            expect(result.displayStatus).toBe("Expired");
            expect(result.isUsable).toBe(false);
          } else {
            expect(result.displayStatus).toBe("Active");
            expect(result.isUsable).toBe(true);
          }
        }
      }),
      { numRuns: 100 }
    );
  });
});

// ─── P25: Display fields always present ─────────────────────────────────────

describe("Property 25 — Marketplace item display contains required fields", () => {
  it("P25: every marketplace item has name, description, xp_price, and is_active", () => {
    fc.assert(
      fc.property(displayItemArb, (item) => {
        expect(hasRequiredDisplayFields(item)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });
});
