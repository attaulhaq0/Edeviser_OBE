// Team Health Calculator — AI-powered team health monitoring.
// Computes Gini coefficient, engagement trends, and composite health scores.
// Used by the weekly health computation cron job (Monday 02:00 UTC).

export type EngagementTrend = "rising" | "stable" | "declining";
export type HealthStatus = "healthy" | "needs_attention" | "at_risk";

export interface TeamHealthInput {
  /** XP contributions per member for the current evaluation period */
  memberXpContributions: number[];
  /** Total team XP this week */
  thisWeekXp: number;
  /** Total team XP last week */
  lastWeekXp: number;
  /** Challenge participation rate (0–1): fraction of available challenges the team joined */
  participationRate: number;
  /** Activity overlap rate (0–1): fraction of days with 2+ active members out of 7 */
  overlapRate: number;
}

export interface TeamHealthResult {
  healthScore: number;
  healthStatus: HealthStatus;
  giniCoefficient: number;
  engagementTrend: EngagementTrend;
}

// ── Health score weights ──────────────────────────────────────────────────────
const WEIGHT_EQUALITY = 0.3;
const WEIGHT_TREND = 0.25;
const WEIGHT_PARTICIPATION = 0.25;
const WEIGHT_OVERLAP = 0.2;

// ── Engagement trend thresholds ───────────────────────────────────────────────
const TREND_INCREASE_THRESHOLD = 0.1; // >10% increase = rising
const TREND_DECREASE_THRESHOLD = 0.1; // >10% decrease = declining

/**
 * Compute the Gini coefficient from an array of XP contributions.
 *
 * The Gini coefficient measures inequality in a distribution:
 * - 0 = perfect equality (all members contribute equally)
 * - 1 = maximum inequality (one member contributes everything)
 *
 * Uses the relative mean absolute difference formula:
 * G = (Σ|xi - xj|) / (2 * n * Σxi)
 *
 * @param values - Array of non-negative contribution values
 * @returns Gini coefficient between 0 and 1
 */
export function computeGiniCoefficient(values: number[]): number {
  if (values.length <= 1) {
    return 0;
  }

  const sum = values.reduce((acc, v) => acc + v, 0);
  if (sum === 0) {
    return 0;
  }

  const n = values.length;
  let absoluteDifferenceSum = 0;

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      absoluteDifferenceSum += Math.abs((values[i] ?? 0) - (values[j] ?? 0));
    }
  }

  return absoluteDifferenceSum / (2 * n * sum);
}

/**
 * Detect the engagement trend by comparing this week's XP to last week's XP.
 *
 * - Rising: >10% increase
 * - Declining: >10% decrease
 * - Stable: within ±10%
 *
 * If last week's XP is 0, any positive XP this week is 'rising', zero is 'stable'.
 */
export function detectEngagementTrend(
  thisWeekXp: number,
  lastWeekXp: number
): EngagementTrend {
  if (lastWeekXp === 0) {
    return thisWeekXp > 0 ? "rising" : "stable";
  }

  const changeRatio = (thisWeekXp - lastWeekXp) / lastWeekXp;

  if (changeRatio > TREND_INCREASE_THRESHOLD) {
    return "rising";
  }
  if (changeRatio < -TREND_DECREASE_THRESHOLD) {
    return "declining";
  }
  return "stable";
}

/**
 * Convert an engagement trend to a numeric score (0–100) for the health formula.
 *
 * - Rising: 100
 * - Stable: 60
 * - Declining: 20
 */
export function trendToScore(trend: EngagementTrend): number {
  switch (trend) {
    case "rising":
      return 100;
    case "stable":
      return 60;
    case "declining":
      return 20;
  }
}

/**
 * Classify health status based on the composite health score.
 *
 * - ≥70: 'healthy'
 * - 40–69: 'needs_attention'
 * - <40: 'at_risk'
 */
export function classifyHealthStatus(healthScore: number): HealthStatus {
  if (healthScore >= 70) {
    return "healthy";
  }
  if (healthScore >= 40) {
    return "needs_attention";
  }
  return "at_risk";
}

/**
 * Compute the composite team health score and classification.
 *
 * Formula:
 *   health = 0.30 × (1 − Gini) × 100
 *          + 0.25 × trend_score
 *          + 0.25 × participation × 100
 *          + 0.20 × overlap × 100
 *
 * @param input - Team health input data
 * @returns Health score (0–100), status, Gini coefficient, and engagement trend
 */
export function computeTeamHealth(input: TeamHealthInput): TeamHealthResult {
  const giniCoefficient = computeGiniCoefficient(input.memberXpContributions);
  const engagementTrend = detectEngagementTrend(
    input.thisWeekXp,
    input.lastWeekXp
  );
  const trendScore = trendToScore(engagementTrend);

  // Clamp rates to [0, 1]
  const participation = Math.max(0, Math.min(1, input.participationRate));
  const overlap = Math.max(0, Math.min(1, input.overlapRate));

  const rawScore =
    WEIGHT_EQUALITY * (1 - giniCoefficient) * 100 +
    WEIGHT_TREND * trendScore +
    WEIGHT_PARTICIPATION * participation * 100 +
    WEIGHT_OVERLAP * overlap * 100;

  // Clamp to [0, 100] and round
  const healthScore = Math.round(Math.max(0, Math.min(100, rawScore)));
  const healthStatus = classifyHealthStatus(healthScore);

  return {
    healthScore,
    healthStatus,
    giniCoefficient,
    engagementTrend,
  };
}
