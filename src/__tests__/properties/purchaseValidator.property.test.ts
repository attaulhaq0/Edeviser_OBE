// Feature: xp-marketplace, Property 6: Purchase validation correctness
// **Validates: Requirements 4.2, 4.5, 4.6, 3.3, 3.7**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { validatePurchase, type PurchaseValidationInput } from '@/lib/purchaseValidator';
import type { MarketplaceItemSubCategory, StockType } from '@/lib/marketplaceSchemas';

// ─── Arbitraries ────────────────────────────────────────────────────────────

const subCategoryArb = fc.constantFrom<MarketplaceItemSubCategory>(
  'profile_theme', 'avatar_frame', 'display_title',
  'extra_quiz_attempt', 'deadline_extension', 'hint_token',
  'xp_boost', 'streak_shield',
);

const stockTypeArb = fc.constantFrom<StockType>('unlimited', 'limited', 'one_per_student');

const validationInputArb: fc.Arbitrary<PurchaseValidationInput> = fc.record({
  balance: fc.integer({ min: 0, max: 50_000 }),
  studentLevel: fc.integer({ min: 1, max: 50 }),
  item: fc.record({
    xp_price: fc.integer({ min: 1, max: 10_000 }),
    level_requirement: fc.integer({ min: 0, max: 50 }),
    stock_type: stockTypeArb,
    stock_quantity: fc.oneof(fc.constant(null), fc.integer({ min: 0, max: 100 })),
    is_active: fc.boolean(),
    sub_category: subCategoryArb,
  }),
  alreadyOwned: fc.boolean(),
  currentStreakFreezes: fc.integer({ min: 0, max: 5 }),
  effectivePrice: fc.integer({ min: 1, max: 10_000 }),
});

// ─── P6: Purchase validation returns correct error codes ────────────────────

describe('Property 6 — Purchase validation correctness', () => {
  it('P6: validatePurchase returns correct error codes for all invalid states', () => {
    fc.assert(
      fc.property(validationInputArb, (input) => {
        const result = validatePurchase(input);

        // Check priority order of error codes
        if (!input.item.is_active) {
          expect(result).toEqual({ valid: false, error_code: 'ITEM_INACTIVE' });
          return;
        }

        if (input.studentLevel < input.item.level_requirement) {
          expect(result).toEqual({ valid: false, error_code: 'LEVEL_REQUIREMENT' });
          return;
        }

        if (
          input.item.stock_type === 'limited' &&
          (input.item.stock_quantity === null || input.item.stock_quantity <= 0)
        ) {
          expect(result).toEqual({ valid: false, error_code: 'OUT_OF_STOCK' });
          return;
        }

        if (input.item.stock_type === 'one_per_student' && input.alreadyOwned) {
          expect(result).toEqual({ valid: false, error_code: 'ALREADY_OWNED' });
          return;
        }

        if (input.item.sub_category === 'streak_shield' && input.currentStreakFreezes >= 3) {
          expect(result).toEqual({ valid: false, error_code: 'MAX_INVENTORY' });
          return;
        }

        if (input.balance < input.effectivePrice) {
          expect(result).toEqual({ valid: false, error_code: 'INSUFFICIENT_BALANCE' });
          return;
        }

        // All checks passed
        expect(result).toEqual({ valid: true });
      }),
      { numRuns: 100 },
    );
  });
});
