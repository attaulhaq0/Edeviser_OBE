// Feature: xp-marketplace, Property 6: purchase validation correctness
// **Validates: Requirements 4.2, 4.5, 4.6**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  validatePurchase,
  type PurchaseValidationInput,
  type PurchaseErrorCode,
} from '@/lib/purchaseValidator';

// ─── Arbitraries ────────────────────────────────────────────────────────────

const stockTypeArb = fc.constantFrom('unlimited' as const, 'limited' as const, 'one_per_student' as const);

const validInputArb: fc.Arbitrary<PurchaseValidationInput> = fc.record({
  balance: fc.integer({ min: 100, max: 50000 }),
  effectivePrice: fc.integer({ min: 1, max: 100 }),
  studentLevel: fc.integer({ min: 5, max: 100 }),
  itemLevelRequirement: fc.integer({ min: 0, max: 5 }),
  stockType: fc.constant('unlimited' as const),
  stockQuantity: fc.constant(null),
  alreadyOwned: fc.constant(false),
  isActive: fc.constant(true),
});

const fullInputArb: fc.Arbitrary<PurchaseValidationInput> = fc.record({
  balance: fc.integer({ min: 0, max: 50000 }),
  effectivePrice: fc.integer({ min: 1, max: 10000 }),
  studentLevel: fc.integer({ min: 0, max: 100 }),
  itemLevelRequirement: fc.integer({ min: 0, max: 100 }),
  stockType: stockTypeArb,
  stockQuantity: fc.oneof(fc.constant(null), fc.integer({ min: 0, max: 100 })),
  alreadyOwned: fc.boolean(),
  isActive: fc.boolean(),
});

// ─── Property 6: purchase validation correctness ────────────────────────────

describe('Property 6 — Purchase validation correctness', () => {
  it('P6a: valid inputs always pass validation', () => {
    fc.assert(
      fc.property(validInputArb, (input) => {
        const result = validatePurchase(input);
        expect(result.valid).toBe(true);
        expect(result.error_code).toBeUndefined();
      }),
      { numRuns: 100 },
    );
  });

  it('P6b: inactive item always returns ITEM_INACTIVE', () => {
    fc.assert(
      fc.property(fullInputArb, (input) => {
        const result = validatePurchase({ ...input, isActive: false });
        expect(result.valid).toBe(false);
        expect(result.error_code).toBe('ITEM_INACTIVE');
      }),
      { numRuns: 100 },
    );
  });

  it('P6c: insufficient level returns LEVEL_REQUIREMENT (when item is active)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 49 }),
        fc.integer({ min: 50, max: 100 }),
        (studentLevel, requirement) => {
          const result = validatePurchase({
            balance: 99999,
            effectivePrice: 1,
            studentLevel,
            itemLevelRequirement: requirement,
            stockType: 'unlimited',
            stockQuantity: null,
            alreadyOwned: false,
            isActive: true,
          });
          expect(result.valid).toBe(false);
          expect(result.error_code).toBe('LEVEL_REQUIREMENT');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P6d: out of stock returns OUT_OF_STOCK', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 5, max: 100 }),
        (level) => {
          const result = validatePurchase({
            balance: 99999,
            effectivePrice: 1,
            studentLevel: level,
            itemLevelRequirement: 0,
            stockType: 'limited',
            stockQuantity: 0,
            alreadyOwned: false,
            isActive: true,
          });
          expect(result.valid).toBe(false);
          expect(result.error_code).toBe('OUT_OF_STOCK');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P6e: already owned one_per_student returns ALREADY_OWNED', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 50000 }),
        (balance) => {
          const result = validatePurchase({
            balance,
            effectivePrice: 1,
            studentLevel: 10,
            itemLevelRequirement: 0,
            stockType: 'one_per_student',
            stockQuantity: null,
            alreadyOwned: true,
            isActive: true,
          });
          expect(result.valid).toBe(false);
          expect(result.error_code).toBe('ALREADY_OWNED');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P6f: insufficient balance returns INSUFFICIENT_BALANCE', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 99 }),
        fc.integer({ min: 100, max: 10000 }),
        (balance, price) => {
          const result = validatePurchase({
            balance,
            effectivePrice: price,
            studentLevel: 10,
            itemLevelRequirement: 0,
            stockType: 'unlimited',
            stockQuantity: null,
            alreadyOwned: false,
            isActive: true,
          });
          expect(result.valid).toBe(false);
          expect(result.error_code).toBe('INSUFFICIENT_BALANCE');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P6g: error priority order — ITEM_INACTIVE checked first', () => {
    fc.assert(
      fc.property(fullInputArb, (input) => {
        // When item is inactive, error is always ITEM_INACTIVE regardless of other fields
        const result = validatePurchase({ ...input, isActive: false });
        expect(result.error_code).toBe('ITEM_INACTIVE');
      }),
      { numRuns: 100 },
    );
  });

  it('P6h: error priority — LEVEL_REQUIREMENT before stock/balance checks', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 4 }),
        fc.integer({ min: 5, max: 100 }),
        (studentLevel, requirement) => {
          const result = validatePurchase({
            balance: 0,
            effectivePrice: 99999,
            studentLevel,
            itemLevelRequirement: requirement,
            stockType: 'limited',
            stockQuantity: 0,
            alreadyOwned: true,
            isActive: true,
          });
          expect(result.error_code).toBe('LEVEL_REQUIREMENT');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P6i: result is always either valid or has an error_code', () => {
    fc.assert(
      fc.property(fullInputArb, (input) => {
        const result = validatePurchase(input);
        if (result.valid) {
          expect(result.error_code).toBeUndefined();
        } else {
          expect(result.error_code).toBeDefined();
          const validCodes: PurchaseErrorCode[] = [
            'ITEM_INACTIVE',
            'LEVEL_REQUIREMENT',
            'OUT_OF_STOCK',
            'ALREADY_OWNED',
            'INSUFFICIENT_BALANCE',
          ];
          expect(validCodes).toContain(result.error_code);
        }
      }),
      { numRuns: 100 },
    );
  });
});
