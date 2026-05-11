// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import {
  createMarketplaceItemSchema,
  updateMarketplaceItemSchema,
  createSaleEventSchema,
  purchaseRequestSchema,
  deadlineExtensionSchema,
  marketplaceItemCategorySchema,
  marketplaceItemSubCategorySchema,
  stockTypeSchema,
} from "@/lib/marketplaceSchemas";

// ── createMarketplaceItemSchema ─────────────────────────────────────────────

describe("createMarketplaceItemSchema", () => {
  const validItem = {
    name: "Ocean Blue Theme",
    description: "A calming ocean-inspired color palette",
    category: "cosmetic",
    sub_category: "profile_theme",
    xp_price: 500,
    level_requirement: 5,
    stock_type: "unlimited",
    stock_quantity: null,
    icon_identifier: "palette",
  };

  it("accepts a valid full payload", () => {
    const result = createMarketplaceItemSchema.safeParse(validItem);
    expect(result.success).toBe(true);
  });

  it("accepts payload with optional metadata", () => {
    const result = createMarketplaceItemSchema.safeParse({
      ...validItem,
      metadata: { theme_id: "ocean_blue", accent_primary: "#0ea5e9" },
    });
    expect(result.success).toBe(true);
  });

  it("applies default level_requirement of 0", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { level_requirement: _levelReq, ...withoutLevel } = validItem;
    const result = createMarketplaceItemSchema.safeParse(withoutLevel);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.level_requirement).toBe(0);
    }
  });

  it("rejects empty name", () => {
    const result = createMarketplaceItemSchema.safeParse({
      ...validItem,
      name: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects name exceeding 100 characters", () => {
    const result = createMarketplaceItemSchema.safeParse({
      ...validItem,
      name: "a".repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty description", () => {
    const result = createMarketplaceItemSchema.safeParse({
      ...validItem,
      description: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects description exceeding 500 characters", () => {
    const result = createMarketplaceItemSchema.safeParse({
      ...validItem,
      description: "a".repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid category", () => {
    const result = createMarketplaceItemSchema.safeParse({
      ...validItem,
      category: "invalid",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid sub_category", () => {
    const result = createMarketplaceItemSchema.safeParse({
      ...validItem,
      sub_category: "invalid",
    });
    expect(result.success).toBe(false);
  });

  it("rejects zero xp_price", () => {
    const result = createMarketplaceItemSchema.safeParse({
      ...validItem,
      xp_price: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative xp_price", () => {
    const result = createMarketplaceItemSchema.safeParse({
      ...validItem,
      xp_price: -100,
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-integer xp_price", () => {
    const result = createMarketplaceItemSchema.safeParse({
      ...validItem,
      xp_price: 99.5,
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative level_requirement", () => {
    const result = createMarketplaceItemSchema.safeParse({
      ...validItem,
      level_requirement: -1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid stock_type", () => {
    const result = createMarketplaceItemSchema.safeParse({
      ...validItem,
      stock_type: "rare",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty icon_identifier", () => {
    const result = createMarketplaceItemSchema.safeParse({
      ...validItem,
      icon_identifier: "",
    });
    expect(result.success).toBe(false);
  });

  it("accepts all valid categories", () => {
    for (const cat of ["cosmetic", "educational_perk", "power_up"]) {
      const result = marketplaceItemCategorySchema.safeParse(cat);
      expect(result.success).toBe(true);
    }
  });

  it("accepts all valid sub_categories", () => {
    const subs = [
      "profile_theme",
      "avatar_frame",
      "display_title",
      "extra_quiz_attempt",
      "deadline_extension",
      "hint_token",
      "xp_boost",
      "streak_shield",
    ];
    for (const sub of subs) {
      const result = marketplaceItemSubCategorySchema.safeParse(sub);
      expect(result.success).toBe(true);
    }
  });

  it("accepts all valid stock types", () => {
    for (const st of ["unlimited", "limited", "one_per_student"]) {
      const result = stockTypeSchema.safeParse(st);
      expect(result.success).toBe(true);
    }
  });
});

// ── updateMarketplaceItemSchema ─────────────────────────────────────────────

describe("updateMarketplaceItemSchema", () => {
  it("accepts partial updates", () => {
    const result = updateMarketplaceItemSchema.safeParse({ xp_price: 300 });
    expect(result.success).toBe(true);
  });

  it("accepts empty object (no changes)", () => {
    const result = updateMarketplaceItemSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("rejects invalid field values in partial update", () => {
    const result = updateMarketplaceItemSchema.safeParse({ xp_price: -5 });
    expect(result.success).toBe(false);
  });
});

// ── createSaleEventSchema ───────────────────────────────────────────────────

describe("createSaleEventSchema", () => {
  const validSale = {
    name: "Weekend Flash Sale",
    discount_percentage: 25,
    start_date: "2025-01-01T00:00:00Z",
    end_date: "2025-01-08T00:00:00Z",
    item_ids: ["550e8400-e29b-41d4-a716-446655440000"],
  };

  it("accepts a valid sale event", () => {
    const result = createSaleEventSchema.safeParse(validSale);
    expect(result.success).toBe(true);
  });

  it("rejects discount below 5", () => {
    const result = createSaleEventSchema.safeParse({
      ...validSale,
      discount_percentage: 4,
    });
    expect(result.success).toBe(false);
  });

  it("rejects discount above 90", () => {
    const result = createSaleEventSchema.safeParse({
      ...validSale,
      discount_percentage: 91,
    });
    expect(result.success).toBe(false);
  });

  it("rejects end_date before start_date", () => {
    const result = createSaleEventSchema.safeParse({
      ...validSale,
      start_date: "2025-01-08T00:00:00Z",
      end_date: "2025-01-01T00:00:00Z",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty item_ids array", () => {
    const result = createSaleEventSchema.safeParse({
      ...validSale,
      item_ids: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-UUID item_ids", () => {
    const result = createSaleEventSchema.safeParse({
      ...validSale,
      item_ids: ["not-a-uuid"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty name", () => {
    const result = createSaleEventSchema.safeParse({ ...validSale, name: "" });
    expect(result.success).toBe(false);
  });
});

// ── purchaseRequestSchema ───────────────────────────────────────────────────

describe("purchaseRequestSchema", () => {
  it("accepts valid UUID item_id", () => {
    const result = purchaseRequestSchema.safeParse({
      item_id: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(true);
  });

  it("rejects non-UUID item_id", () => {
    const result = purchaseRequestSchema.safeParse({ item_id: "not-a-uuid" });
    expect(result.success).toBe(false);
  });

  it("rejects missing item_id", () => {
    const result = purchaseRequestSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

// ── deadlineExtensionSchema ─────────────────────────────────────────────────

describe("deadlineExtensionSchema", () => {
  it("accepts valid UUIDs", () => {
    const result = deadlineExtensionSchema.safeParse({
      purchase_id: "550e8400-e29b-41d4-a716-446655440000",
      assignment_id: "550e8400-e29b-41d4-a716-446655440001",
    });
    expect(result.success).toBe(true);
  });

  it("rejects non-UUID purchase_id", () => {
    const result = deadlineExtensionSchema.safeParse({
      purchase_id: "bad",
      assignment_id: "550e8400-e29b-41d4-a716-446655440001",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing assignment_id", () => {
    const result = deadlineExtensionSchema.safeParse({
      purchase_id: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(false);
  });
});
