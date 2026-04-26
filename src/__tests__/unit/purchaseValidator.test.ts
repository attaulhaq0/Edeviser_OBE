import { describe, it, expect } from 'vitest';
import { validatePurchase } from '@/lib/purchaseValidator';
import type { PurchaseValidationInput } from '@/lib/purchaseValidator';

const validInput: PurchaseValidationInput = {
  balance: 500,
  effectivePrice: 200,
  studentLevel: 5,
  itemLevelRequirement: 3,
  stockType: 'unlimited',
  stockQuantity: null,
  alreadyOwned: false,
  isActive: true,
};

describe('validatePurchase', () => {
  it('returns valid for a passing purchase', () => {
    expect(validatePurchase(validInput)).toEqual({ valid: true });
  });

  it('rejects inactive items', () => {
    const result = validatePurchase({ ...validInput, isActive: false });
    expect(result).toEqual({ valid: false, error_code: 'ITEM_INACTIVE' });
  });

  it('rejects when student level is below requirement', () => {
    const result = validatePurchase({ ...validInput, studentLevel: 2 });
    expect(result).toEqual({ valid: false, error_code: 'LEVEL_REQUIREMENT' });
  });

  it('allows purchase when student level equals requirement', () => {
    const result = validatePurchase({ ...validInput, studentLevel: 3 });
    expect(result).toEqual({ valid: true });
  });

  it('rejects out of stock limited items', () => {
    const result = validatePurchase({
      ...validInput,
      stockType: 'limited',
      stockQuantity: 0,
    });
    expect(result).toEqual({ valid: false, error_code: 'OUT_OF_STOCK' });
  });

  it('allows limited items with stock remaining', () => {
    const result = validatePurchase({
      ...validInput,
      stockType: 'limited',
      stockQuantity: 5,
    });
    expect(result).toEqual({ valid: true });
  });

  it('rejects already owned one_per_student items', () => {
    const result = validatePurchase({
      ...validInput,
      stockType: 'one_per_student',
      alreadyOwned: true,
    });
    expect(result).toEqual({ valid: false, error_code: 'ALREADY_OWNED' });
  });

  it('allows one_per_student items not yet owned', () => {
    const result = validatePurchase({
      ...validInput,
      stockType: 'one_per_student',
      alreadyOwned: false,
    });
    expect(result).toEqual({ valid: true });
  });

  it('rejects insufficient balance', () => {
    const result = validatePurchase({ ...validInput, balance: 100 });
    expect(result).toEqual({ valid: false, error_code: 'INSUFFICIENT_BALANCE' });
  });

  it('allows purchase when balance equals price', () => {
    const result = validatePurchase({ ...validInput, balance: 200 });
    expect(result).toEqual({ valid: true });
  });

  it('checks inactive before level requirement', () => {
    const result = validatePurchase({
      ...validInput,
      isActive: false,
      studentLevel: 1,
    });
    expect(result.error_code).toBe('ITEM_INACTIVE');
  });

  it('handles null stockQuantity for limited items as out of stock', () => {
    const result = validatePurchase({
      ...validInput,
      stockType: 'limited',
      stockQuantity: null,
    });
    expect(result).toEqual({ valid: false, error_code: 'OUT_OF_STOCK' });
  });
});
