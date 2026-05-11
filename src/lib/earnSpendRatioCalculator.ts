// =============================================================================
// Earn/Spend Ratio Calculator — Pure function
// Computes earn/spend ratio and inflation status for the XP economy
// =============================================================================

/**
 * Inflation status of the XP economy.
 * - healthy: ratio between 2 and 4 (inclusive) — balanced economy
 * - inflationary: ratio > 4 — too much XP in circulation, not enough spending
 * - deflationary: ratio < 2 — too much spending relative to earning
 * - no_spending: no XP has been spent yet (ratio is undefined)
 */
export type InflationStatus =
  | "healthy"
  | "inflationary"
  | "deflationary"
  | "no_spending";

export interface EarnSpendInput {
  /** Total XP earned across all students (non-negative) */
  totalEarned: number;
  /** Total XP spent across all students (non-negative) */
  totalSpent: number;
}

export interface EarnSpendResult {
  /** The earn/spend ratio, or null if no spending */
  ratio: number | null;
  /** Inflation status classification */
  status: InflationStatus;
  /** Total earned XP */
  totalEarned: number;
  /** Total spent XP */
  totalSpent: number;
  /** Human-readable label for the status */
  statusLabel: string;
}

/**
 * Healthy ratio lower bound (inclusive).
 */
const HEALTHY_LOWER = 2;

/**
 * Healthy ratio upper bound (inclusive).
 */
const HEALTHY_UPPER = 4;

/**
 * Classify the inflation status based on the earn/spend ratio.
 */
export function classifyInflation(ratio: number | null): InflationStatus {
  if (ratio === null) return "no_spending";
  if (ratio >= HEALTHY_LOWER && ratio <= HEALTHY_UPPER) return "healthy";
  if (ratio > HEALTHY_UPPER) return "inflationary";
  return "deflationary";
}

/**
 * Get a human-readable label for an inflation status.
 */
export function getStatusLabel(status: InflationStatus): string {
  switch (status) {
    case "healthy":
      return "Healthy";
    case "inflationary":
      return "Inflationary";
    case "deflationary":
      return "Deflationary";
    case "no_spending":
      return "No spending yet";
  }
}

/**
 * Compute the earn/spend ratio and inflation status for an institution.
 *
 * - Ratio = totalEarned / totalSpent (rounded to 2 decimal places)
 * - If totalSpent is 0, ratio is null and status is 'no_spending'
 * - Healthy range: 2:1 to 4:1
 * - Inflationary: ratio > 4 (too much XP, not enough sinks)
 * - Deflationary: ratio < 2 (too much spending)
 */
export function computeEarnSpendRatio(input: EarnSpendInput): EarnSpendResult {
  const totalEarned = Math.max(0, input.totalEarned);
  const totalSpent = Math.max(0, input.totalSpent);

  const ratio =
    totalSpent > 0 ? Math.round((totalEarned / totalSpent) * 100) / 100 : null;

  const status = classifyInflation(ratio);
  const statusLabel = getStatusLabel(status);

  return {
    ratio,
    status,
    totalEarned,
    totalSpent,
    statusLabel,
  };
}
