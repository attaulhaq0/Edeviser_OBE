/**
 * Pure function to compute the effective sale price for a marketplace item.
 *
 * When multiple sale events apply, only the HIGHEST discount is used (no stacking).
 * Effective price = GREATEST(1, price - floor(price * highest_discount / 100))
 *
 * Returns the original price when no active sales exist.
 */

export interface ActiveSaleEvent {
  discount_percentage: number;
}

export const computeSalePrice = (
  basePrice: number,
  activeSales: readonly ActiveSaleEvent[],
): number => {
  if (activeSales.length === 0) return basePrice;

  const highestDiscount = Math.max(
    ...activeSales.map((s) => s.discount_percentage),
  );

  return Math.max(1, basePrice - Math.floor((basePrice * highestDiscount) / 100));
};
