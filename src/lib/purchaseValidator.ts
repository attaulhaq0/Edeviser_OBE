/**
 * Pure function to validate purchase eligibility.
 *
 * Checks (in order):
 * 1. Item is active
 * 2. Student level meets item level_requirement
 * 3. Stock is available (limited: quantity > 0)
 * 4. Not already owned (one_per_student)
 * 5. Balance is sufficient
 */

export type PurchaseErrorCode =
  | 'ITEM_INACTIVE'
  | 'LEVEL_REQUIREMENT'
  | 'OUT_OF_STOCK'
  | 'ALREADY_OWNED'
  | 'INSUFFICIENT_BALANCE';

export interface PurchaseValidationResult {
  valid: boolean;
  error_code?: PurchaseErrorCode;
}

export interface PurchaseValidationInput {
  balance: number;
  effectivePrice: number;
  studentLevel: number;
  itemLevelRequirement: number;
  stockType: 'unlimited' | 'limited' | 'one_per_student';
  stockQuantity: number | null;
  alreadyOwned: boolean;
  isActive: boolean;
}

export const validatePurchase = (
  input: PurchaseValidationInput,
): PurchaseValidationResult => {
  if (!input.isActive) {
    return { valid: false, error_code: 'ITEM_INACTIVE' };
  }

  if (input.studentLevel < input.itemLevelRequirement) {
    return { valid: false, error_code: 'LEVEL_REQUIREMENT' };
  }

  if (input.stockType === 'limited' && (input.stockQuantity ?? 0) <= 0) {
    return { valid: false, error_code: 'OUT_OF_STOCK' };
  }

  if (input.stockType === 'one_per_student' && input.alreadyOwned) {
    return { valid: false, error_code: 'ALREADY_OWNED' };
  }

  if (input.balance < input.effectivePrice) {
    return { valid: false, error_code: 'INSUFFICIENT_BALANCE' };
  }

  return { valid: true };
};
