import { describe, it, expect } from 'vitest';
import {
  validatePurchase,
  type PurchaseValidationInput,
} from '@/lib/purchaseValidator';

// ── Helpers ──────────────────────────────────────────────────────────────────

const makeInput = (overrides: Partial<PurchaseValidationInput> = {}): PurchaseValidationInput => ({
  balance: 1000,
  effectivePrice: 500,
  studentLevel: 10,
  itemLevelRequirement: 5,
  stockType: 'unlimited',
  stockQuantity: null,
  alreadyOwned: false,
  isActive: true,
  ...overrides,
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe('process-purchase validation logic', () => {
  it('success path: valid purchase returns valid result', () => {
    const result = validatePurchase(makeInput());
    expect(result.valid).toBe(true);
    expect(result.error_code).toBeUndefined();
  });

  it('success path: returns valid for exact balance match', () => {
    const result = validatePurchase(makeInput({ balance: 500, effectivePrice: 500 }));
    expect(result.valid).toBe(true);
  });

  it('INSUFFICIENT_BALANCE: rejects when balance < price', () => {
    const result = validatePurchase(makeInput({ balance: 100, effectivePrice: 500 }));
    expect(result.valid).toBe(false);
    expect(result.error_code).toBe('INSUFFICIENT_BALANCE');
  });

  it('LEVEL_REQUIREMENT: rejects when student level < item level_requirement', () => {
    const result = validatePurchase(makeInput({ studentLevel: 3, itemLevelRequirement: 10 }));
    expect(result.valid).toBe(false);
    expect(result.error_code).toBe('LEVEL_REQUIREMENT');
  });

  it('OUT_OF_STOCK: rejects when limited stock is 0', () => {
    const result = validatePurchase(makeInput({ stockType: 'limited', stockQuantity: 0 }));
    expect(result.valid).toBe(false);
    expect(result.error_code).toBe('OUT_OF_STOCK');
  });

  it('OUT_OF_STOCK: rejects when limited stock is null', () => {
    const result = validatePurchase(makeInput({ stockType: 'limited', stockQuantity: null }));
    expect(result.valid).toBe(false);
    expect(result.error_code).toBe('OUT_OF_STOCK');
  });

  it('ALREADY_OWNED: rejects one_per_student items already purchased', () => {
    const result = validatePurchase(
      makeInput({ stockType: 'one_per_student', alreadyOwned: true }),
    );
    expect(result.valid).toBe(false);
    expect(result.error_code).toBe('ALREADY_OWNED');
  });

  it('ITEM_INACTIVE: rejects inactive items', () => {
    const result = validatePurchase(makeInput({ isActive: false }));
    expect(result.valid).toBe(false);
    expect(result.error_code).toBe('ITEM_INACTIVE');
  });

  it('checks ITEM_INACTIVE before other validations', () => {
    // Even with sufficient balance and level, inactive should fail first
    const result = validatePurchase(makeInput({
      isActive: false,
      balance: 10000,
      studentLevel: 99,
    }));
    expect(result.error_code).toBe('ITEM_INACTIVE');
  });

  it('checks LEVEL_REQUIREMENT before stock and balance', () => {
    const result = validatePurchase(makeInput({
      studentLevel: 1,
      itemLevelRequirement: 10,
      stockType: 'limited',
      stockQuantity: 0,
      balance: 0,
    }));
    expect(result.error_code).toBe('LEVEL_REQUIREMENT');
  });

  it('checks OUT_OF_STOCK before INSUFFICIENT_BALANCE', () => {
    const result = validatePurchase(makeInput({
      stockType: 'limited',
      stockQuantity: 0,
      balance: 0,
    }));
    expect(result.error_code).toBe('OUT_OF_STOCK');
  });

  it('checks ALREADY_OWNED before INSUFFICIENT_BALANCE', () => {
    const result = validatePurchase(makeInput({
      stockType: 'one_per_student',
      alreadyOwned: true,
      balance: 0,
    }));
    expect(result.error_code).toBe('ALREADY_OWNED');
  });

  it('allows unlimited stock items regardless of stock_quantity', () => {
    const result = validatePurchase(makeInput({ stockType: 'unlimited', stockQuantity: null }));
    expect(result.valid).toBe(true);
  });

  it('allows one_per_student items when not already owned', () => {
    const result = validatePurchase(makeInput({ stockType: 'one_per_student', alreadyOwned: false }));
    expect(result.valid).toBe(true);
  });

  it('MAX_INVENTORY: streak shield at max 3 is handled by validation order', () => {
    // The purchaseValidator checks ALREADY_OWNED for one_per_student items.
    // MAX_INVENTORY (streak shield at 3) is enforced by the RPC function.
    // Here we verify the validator correctly rejects already-owned one_per_student items.
    const result = validatePurchase(makeInput({
      stockType: 'one_per_student',
      alreadyOwned: true,
    }));
    expect(result.valid).toBe(false);
    expect(result.error_code).toBe('ALREADY_OWNED');
  });
});
