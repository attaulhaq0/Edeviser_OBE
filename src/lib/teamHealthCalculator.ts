// =============================================================================
// Team Health Calculator — Task 1.25
// Gini coefficient computation, health score formula, engagement trend detection
// =============================================================================

export type EngagementTrend = 'rising' | 'stable' | 'declining';
export type HealthStatus = 'healthy' | 'needs_attention' | 'at_risk';

export interface TeamHealthInput {
  /** XP contributions per member for the current week */
  memberXpContributions: number[];
  /** Total team XP this week */
  teamXpThisWeek: number;
  /** Total team XP last week (for trend detection) */
  teamXpLastWeek: number;
  /** Number of available challenges the team could have joined */
  availableChallenges: number;
  /** Number of challenges the team actually participated in */
  participatedChallenges: number;
  /** Number of days (out of 7) where 2+ members were active */
  daysWithMultipleActiveMembers: number;
}

export interface TeamHealthResult {
  healthScore: number;
  healthStatus: HealthStatus;
  giniCoefficient: number;
  engagementTrend: EngagementTrend;
  challengeParticipationRate: number;
  activityOverlapRate: number;
}

/**
 * Compute the Gini coefficient for a set of values.
 * Returns 0 for perfect equality, approaches 1 for maximum inequality.
 * For N=0 or N=1, returns 0.
 */
export function computeGiniCoefficient(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, v) => acc + v, 0);

  if (sum === 0) return 0; // All zeros — perfect equality

  let numerator = 0;
  for (let i = 0; i < n; i++) {
    numerator += (2 * (i + 1) - n - 1) * sorted[i]!;
  }

  return numerator / (n * sum);
}

/**
 * Detect engagement trend based on week-over-week XP change.
 * - Rising: > +10% change
 * - Declining: > -10% change
 * - Stable: within ±10%
 */
export function detectEngagementTrend(
  thisWeekXp: number,
  lastWeekXp: number,
): EngagementTrend {
  if (lastWeekXp === 0) {
    return thisWeekXp > 0 ? 'rising' : 'stable';
  }

  const changePercent = ((thisWeekXp - lastWeekXp) / lastWeekXp) * 100;

  if (changePercent > 10) return 'rising';
  if (changePercent < -10) return 'declining';
  return 'stable';
}

/**
 * Map engagement trend to a numeric score for the health formula.
 */
export function trendToScore(trend: EngagementTrend): number {
  switch (trend) {
    case 'rising':
      return 100;
    case 'stable':
      return 75;
    case 'declining':
      return 25;
  }
}

/**
 * Classify health status based on health score.
 */
export function classifyHealthStatus(healthScore: number): HealthStatus {
  if (healthScore >= 70) return 'healthy';
  if (healthScore >= 40) return 'needs_attention';
  return 'at_risk';
}

/**
 * Compute the full team health score and related metrics.
 *
 * Formula:
 *   health = 0.30 × (1 − Gini) × 100
 *          + 0.25 × trend_score
 *          + 0.25 × participation_rate × 100
 *          + 0.20 × overlap_rate × 100
 *
 * Score is clamped to [0, 100].
 */
export function computeTeamHealth(input: TeamHealthInput): TeamHealthResult {
  const gini = computeGiniCoefficient(input.memberXpContributions);
  const trend = detectEngagementTrend(input.teamXpThisWeek, input.teamXpLastWeek);
  const trendScore = trendToScore(trend);

  const participationRate =
    input.availableChallenges > 0
      ? input.participatedChallenges / input.availableChallenges
      : 1; // No challenges available — full participation by default

  const overlapRate = input.daysWithMultipleActiveMembers / 7;

  const rawScore =
    0.3 * (1 - gini) * 100 +
    0.25 * trendScore +
    0.25 * participationRate * 100 +
    0.2 * overlapRate * 100;

  const healthScore = Math.round(Math.max(0, Math.min(100, rawScore)));

  return {
    healthScore,
    healthStatus: classifyHealthStatus(healthScore),
    giniCoefficient: Math.round(gini * 1000) / 1000, // 3 decimal places
    engagementTrend: trend,
    challengeParticipationRate: Math.round(participationRate * 100) / 100,
    activityOverlapRate: Math.round(overlapRate * 100) / 100,
  };
}
