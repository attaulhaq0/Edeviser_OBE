// =============================================================================
// Sale Price Calculator — Pure functions: apply discounts to item prices
// =============================================================================

export interface ActiveDiscount {
  discount_percentage: number;
}

/**
 * Return the highest discount percentage from a list of active discounts.
 * Returns 0 when no discounts are active.
 */
export function getHighestDiscount(
  activeDiscounts: readonly ActiveDiscount[],
): number {
  if (activeDiscounts.length === 0) return 0;
  return Math.max(...activeDiscounts.map((d) => d.discount_percentage));
}

/**
 * Compute the effective sale price for an item.
 *
 * Formula: GREATEST(1, base_price − floor(base_price × max_discount / 100))
 *
 * Takes the highest active discount and applies it. The minimum price is 1 XP
 * to prevent free items via extreme discounts.
 */
export function computeSalePrice(
  basePrice: number,
  activeDiscounts: readonly ActiveDiscount[],
): number {
  const maxDiscount = getHighestDiscount(activeDiscounts);
  if (maxDiscount === 0) return basePrice;

  const discountedPrice = basePrice - Math.floor((basePrice * maxDiscount) / 100);
  return Math.max(1, discountedPrice);
}
