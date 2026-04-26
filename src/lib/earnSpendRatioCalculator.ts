/**
 * Pure function to compute earn/spend ratio and inflation status.
 *
 * Target ratio: 3:1 (students earn 3x what they spend).
 * - Healthy: ratio between 2:1 and 5:1
 * - Inflationary: ratio > 5:1 (too much XP in circulation, not enough spending)
 * - Deflationary: ratio < 2:1 (students spending too fast, may run out)
 */

export type InflationStatus = 'healthy' | 'inflationary' | 'deflationary';

export interface EarnSpendRatioInput {
  totalEarned: number;
  totalSpent: number;
}

export interface EarnSpendRatioResult {
  ratio: number;
  status: InflationStatus;
  earnedFormatted: string;
  spentFormatted: string;
}

export const computeEarnSpendRatio = (input: EarnSpendRatioInput): EarnSpendRatioResult => {
  const { totalEarned, totalSpent } = input;

  // Avoid division by zero
  const ratio = totalSpent > 0 ? totalEarned / totalSpent : totalEarned > 0 ? Infinity : 0;

  let status: InflationStatus;
  if (ratio === 0 || ratio === Infinity) {
    // Edge case: no spending at all is inflationary (XP accumulating with no sink)
    status = totalEarned > 0 ? 'inflationary' : 'healthy';
  } else if (ratio > 5) {
    status = 'inflationary';
  } else if (ratio < 2) {
    status = 'deflationary';
  } else {
    status = 'healthy';
  }

  return {
    ratio: Number.isFinite(ratio) ? Math.round(ratio * 100) / 100 : 0,
    status,
    earnedFormatted: totalEarned.toLocaleString(),
    spentFormatted: totalSpent.toLocaleString(),
  };
};

export interface XPVelocityInput {
  /** XP earned per week over the measurement period */
  weeklyEarnings: readonly number[];
  /** XP spent per week over the measurement period */
  weeklySpending: readonly number[];
}

export interface XPVelocityResult {
  avgWeeklyEarning: number;
  avgWeeklySpending: number;
  netWeeklyFlow: number;
  trend: 'accumulating' | 'balanced' | 'depleting';
}

export const computeXPVelocity = (input: XPVelocityInput): XPVelocityResult => {
  const { weeklyEarnings, weeklySpending } = input;

  const weeks = Math.max(weeklyEarnings.length, 1);
  const avgWeeklyEarning = Math.round(
    weeklyEarnings.reduce((s, v) => s + v, 0) / weeks,
  );
  const avgWeeklySpending = Math.round(
    weeklySpending.reduce((s, v) => s + v, 0) / Math.max(weeklySpending.length, 1),
  );
  const netWeeklyFlow = avgWeeklyEarning - avgWeeklySpending;

  const trend: 'accumulating' | 'balanced' | 'depleting' =
    netWeeklyFlow > avgWeeklyEarning * 0.3
      ? 'accumulating'
      : netWeeklyFlow < -avgWeeklyEarning * 0.1
        ? 'depleting'
        : 'balanced';

  return { avgWeeklyEarning, avgWeeklySpending, netWeeklyFlow, trend };
};
