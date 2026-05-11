// =============================================================================
// Purchase Validator — Pure function: validate purchase eligibility
// =============================================================================

import type {
  MarketplaceItemSubCategory,
  StockType,
} from "@/lib/marketplaceSchemas";

export interface PurchaseValidationInput {
  balance: number;
  studentLevel: number;
  item: {
    xp_price: number;
    level_requirement: number;
    stock_type: StockType;
    stock_quantity: number | null;
    is_active: boolean;
    sub_category: MarketplaceItemSubCategory;
  };
  alreadyOwned: boolean;
  currentStreakFreezes: number;
  effectivePrice: number;
}

export type PurchaseErrorCode =
  | "ITEM_INACTIVE"
  | "LEVEL_REQUIREMENT"
  | "OUT_OF_STOCK"
  | "ALREADY_OWNED"
  | "MAX_INVENTORY"
  | "INSUFFICIENT_BALANCE";

export interface PurchaseValidationResult {
  valid: boolean;
  error_code?: PurchaseErrorCode;
}

/**
 * Validate whether a student is eligible to purchase a marketplace item.
 *
 * Checks are evaluated in priority order:
 * 1. ITEM_INACTIVE — item must be active
 * 2. LEVEL_REQUIREMENT — student level must meet the item's gate
 * 3. OUT_OF_STOCK — limited items must have remaining stock
 * 4. ALREADY_OWNED — one-per-student items cannot be re-purchased
 * 5. MAX_INVENTORY — streak shields capped at 3
 * 6. INSUFFICIENT_BALANCE — student must have enough XP
 */
export function validatePurchase(
  input: PurchaseValidationInput
): PurchaseValidationResult {
  const {
    balance,
    studentLevel,
    item,
    alreadyOwned,
    currentStreakFreezes,
    effectivePrice,
  } = input;

  if (!item.is_active) {
    return { valid: false, error_code: "ITEM_INACTIVE" };
  }

  if (studentLevel < item.level_requirement) {
    return { valid: false, error_code: "LEVEL_REQUIREMENT" };
  }

  if (
    item.stock_type === "limited" &&
    (item.stock_quantity === null || item.stock_quantity <= 0)
  ) {
    return { valid: false, error_code: "OUT_OF_STOCK" };
  }

  if (item.stock_type === "one_per_student" && alreadyOwned) {
    return { valid: false, error_code: "ALREADY_OWNED" };
  }

  if (item.sub_category === "streak_shield" && currentStreakFreezes >= 3) {
    return { valid: false, error_code: "MAX_INVENTORY" };
  }

  if (balance < effectivePrice) {
    return { valid: false, error_code: "INSUFFICIENT_BALANCE" };
  }

  return { valid: true };
}
