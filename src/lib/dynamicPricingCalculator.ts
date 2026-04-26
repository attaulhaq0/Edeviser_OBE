/**
 * Pure function to compute dynamic price from demand score and base price.
 *
 * Dynamic pricing adjusts item prices based on purchase frequency:
 * - High demand (many purchases) → price increases (up to 150% of base)
 * - Low demand (few purchases) → price decreases (down to 50% of base)
 *
 * Bounds: final price is always between 50% and 150% of base price.
 * Minimum price is always 1 XP.
 */

export interface DynamicPricingInput {
  basePrice: number;
  /** Number of purchases in the measurement window (e.g., last 7 days) */
  purchaseCount: number;
  /** Average purchase count across all items in the same category */
  categoryAveragePurchases: number;
  /** Whether dynamic pricing is enabled for this item */
  dynamicPricingEnabled: boolean;
}

export interface DynamicPricingResult {
  effectivePrice: number;
  adjustmentPercent: number;
  demandLevel: 'low' | 'normal' | 'high';
}

export const computeDynamicPrice = (input: DynamicPricingInput): DynamicPricingResult => {
  if (!input.dynamicPricingEnabled || input.categoryAveragePurchases <= 0) {
    return {
      effectivePrice: input.basePrice,
      adjustmentPercent: 0,
      demandLevel: 'normal',
    };
  }

  const demandRatio = input.purchaseCount / input.categoryAveragePurchases;

  // Map demand ratio to adjustment: ratio 2.0 → +50%, ratio 0.5 → -25%, ratio 0 → -50%
  let adjustmentPercent: number;
  if (demandRatio >= 1) {
    // High demand: scale linearly from 0% to +50% as ratio goes from 1 to 2+
    adjustmentPercent = Math.min(50, (demandRatio - 1) * 50);
  } else {
    // Low demand: scale linearly from 0% to -50% as ratio goes from 1 to 0
    adjustmentPercent = Math.max(-50, (demandRatio - 1) * 50);
  }

  const multiplier = 1 + adjustmentPercent / 100;
  const rawPrice = Math.round(input.basePrice * multiplier);

  // Enforce bounds: 50% to 150% of base price, minimum 1
  const lowerBound = Math.max(1, Math.round(input.basePrice * 0.5));
  const upperBound = Math.round(input.basePrice * 1.5);
  const effectivePrice = Math.max(lowerBound, Math.min(upperBound, rawPrice));

  const demandLevel: 'low' | 'normal' | 'high' =
    demandRatio < 0.5 ? 'low' : demandRatio > 1.5 ? 'high' : 'normal';

  return { effectivePrice, adjustmentPercent: Math.round(adjustmentPercent), demandLevel };
};
