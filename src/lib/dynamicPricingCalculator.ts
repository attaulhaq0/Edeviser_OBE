// =============================================================================
// Dynamic Pricing Calculator — Pure function
// Computes dynamic price from demand score and base price with bounds (50%–150%)
// =============================================================================

/**
 * Demand level classification based on purchase frequency percentiles.
 */
export type DemandLevel = "low" | "normal" | "high";

export interface DynamicPricingInput {
  /** Base XP price of the item */
  basePrice: number;
  /** Number of purchases in the measurement window (e.g., last 30 days) */
  purchaseCount: number;
  /** 25th percentile of purchase counts across all items */
  p25: number;
  /** 75th percentile of purchase counts across all items */
  p75: number;
}

export interface DynamicPricingResult {
  /** The dynamically adjusted price (integer, ≥ 1) */
  dynamicPrice: number;
  /** The demand level classification */
  demandLevel: DemandLevel;
  /** Multiplier applied to the base price (0.5–1.5) */
  multiplier: number;
  /** Whether the price differs from the base price */
  isAdjusted: boolean;
}

/**
 * Lower bound multiplier — item price cannot drop below 50% of base.
 */
const MIN_MULTIPLIER = 0.5;

/**
 * Upper bound multiplier — item price cannot exceed 150% of base.
 */
const MAX_MULTIPLIER = 1.5;

/**
 * Classify demand level based on purchase count relative to percentiles.
 */
export function classifyDemand(
  purchaseCount: number,
  p25: number,
  p75: number
): DemandLevel {
  if (purchaseCount > p75) return "high";
  if (purchaseCount < p25) return "low";
  return "normal";
}

/**
 * Compute the dynamic price for a marketplace item based on demand.
 *
 * - High demand (above p75): price increases up to 150% of base
 * - Low demand (below p25): price decreases to 50% of base
 * - Normal demand: price stays at base (no override)
 *
 * The result is always an integer ≥ 1 and within [50%, 150%] of base price.
 */
export function computeDynamicPrice(
  input: DynamicPricingInput
): DynamicPricingResult {
  const { basePrice, purchaseCount, p25, p75 } = input;

  // Guard: base price must be positive
  if (basePrice <= 0) {
    return {
      dynamicPrice: 1,
      demandLevel: "normal",
      multiplier: 1,
      isAdjusted: false,
    };
  }

  const demandLevel = classifyDemand(purchaseCount, p25, p75);

  let multiplier = 1;

  if (demandLevel === "high") {
    // Scale linearly from 1.0 at p75 to MAX_MULTIPLIER at 2×p75
    const range = Math.max(p75, 1); // avoid division by zero
    const excess = purchaseCount - p75;
    const scale = Math.min(excess / range, 1); // cap at 1
    multiplier = 1 + scale * (MAX_MULTIPLIER - 1);
  } else if (demandLevel === "low") {
    // Scale linearly from 1.0 at p25 down to MIN_MULTIPLIER at 0
    const range = Math.max(p25, 1); // avoid division by zero
    const deficit = p25 - purchaseCount;
    const scale = Math.min(deficit / range, 1); // cap at 1
    multiplier = 1 - scale * (1 - MIN_MULTIPLIER);
  }

  // Clamp multiplier to bounds
  multiplier = Math.max(MIN_MULTIPLIER, Math.min(MAX_MULTIPLIER, multiplier));

  // Compute final price, ensure integer ≥ 1
  const dynamicPrice = Math.max(1, Math.floor(basePrice * multiplier));

  return {
    dynamicPrice,
    demandLevel,
    multiplier,
    isAdjusted: demandLevel !== "normal",
  };
}
