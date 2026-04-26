// =============================================================================
// Team Health Calculator — Unit tests (Task 13.3)
// =============================================================================

import { describe, it, expect } from 'vitest';
import {
  computeGiniCoefficient,
  detectEngagementTrend,
  trendToScore,
  classifyHealthStatus,
  computeTeamHealth,
  type TeamHealthInput,
} from '@/lib/teamHealthCalculator';

// ─── Gini Coefficient ────────────────────────────────────────────────────────

describe('computeGiniCoefficient', () => {
  it('returns 0 for equal values', () => {
    expect(computeGiniCoefficient([100, 100, 100, 100])).toBe(0);
  });

  it('returns 0 for a single value', () => {
    expect(computeGiniCoefficient([500])).toBe(0);
  });

  it('returns 0 for empty array', () => {
    expect(computeGiniCoefficient([])).toBe(0);
  });

  it('returns 0 for all zeros', () => {
    expect(computeGiniCoefficient([0, 0, 0])).toBe(0);
  });

  it('approaches (N-1)/N when one member has all XP', () => {
    // For N=4, max Gini = (4-1)/4 = 0.75
    const gini = computeGiniCoefficient([0, 0, 0, 1000]);
    expect(gini).toBeCloseTo(0.75, 2);
  });

  it('approaches (N-1)/N for N=5', () => {
    // For N=5, max Gini = (5-1)/5 = 0.8
    const gini = computeGiniCoefficient([0, 0, 0, 0, 1000]);
    expect(gini).toBeCloseTo(0.8, 2);
  });

  it('returns a value between 0 and 1 for mixed values', () => {
    const gini = computeGiniCoefficient([10, 50, 100, 200]);
    expect(gini).toBeGreaterThan(0);
    expect(gini).toBeLessThan(1);
  });
});

// ─── Engagement Trend Detection ──────────────────────────────────────────────

describe('detectEngagementTrend', () => {
  it('returns "rising" for >10% increase', () => {
    expect(detectEngagementTrend(120, 100)).toBe('rising');
  });

  it('returns "stable" for ±10% change', () => {
    expect(detectEngagementTrend(105, 100)).toBe('stable');
    expect(detectEngagementTrend(95, 100)).toBe('stable');
  });

  it('returns "declining" for >10% decrease', () => {
    expect(detectEngagementTrend(80, 100)).toBe('declining');
  });

  it('returns "rising" when last week was 0 and this week > 0', () => {
    expect(detectEngagementTrend(50, 0)).toBe('rising');
  });

  it('returns "stable" when both weeks are 0', () => {
    expect(detectEngagementTrend(0, 0)).toBe('stable');
  });

  it('returns "stable" at exactly +10%', () => {
    expect(detectEngagementTrend(110, 100)).toBe('stable');
  });

  it('returns "stable" at exactly -10%', () => {
    expect(detectEngagementTrend(90, 100)).toBe('stable');
  });
});

// ─── Trend Score ─────────────────────────────────────────────────────────────

describe('trendToScore', () => {
  it('returns 100 for rising', () => {
    expect(trendToScore('rising')).toBe(100);
  });

  it('returns 75 for stable', () => {
    expect(trendToScore('stable')).toBe(75);
  });

  it('returns 25 for declining', () => {
    expect(trendToScore('declining')).toBe(25);
  });
});

// ─── Health Status Classification ────────────────────────────────────────────

describe('classifyHealthStatus', () => {
  it('returns "healthy" for score >= 70', () => {
    expect(classifyHealthStatus(70)).toBe('healthy');
    expect(classifyHealthStatus(100)).toBe('healthy');
  });

  it('returns "needs_attention" for score 40-69', () => {
    expect(classifyHealthStatus(40)).toBe('needs_attention');
    expect(classifyHealthStatus(69)).toBe('needs_attention');
  });

  it('returns "at_risk" for score < 40', () => {
    expect(classifyHealthStatus(39)).toBe('at_risk');
    expect(classifyHealthStatus(0)).toBe('at_risk');
  });
});

// ─── Full Health Score Formula ───────────────────────────────────────────────

describe('computeTeamHealth', () => {
  it('computes health score using the formula: 0.30×(1−Gini)×100 + 0.25×trend_score + 0.25×participation×100 + 0.20×overlap×100', () => {
    const input: TeamHealthInput = {
      memberXpContributions: [100, 100, 100, 100], // Gini = 0
      teamXpThisWeek: 400,
      teamXpLastWeek: 300, // >10% increase → rising → 100
      availableChallenges: 10,
      participatedChallenges: 10, // participation = 1.0
      daysWithMultipleActiveMembers: 7, // overlap = 1.0
    };

    const result = computeTeamHealth(input);

    // 0.30 × (1-0) × 100 + 0.25 × 100 + 0.25 × 100 + 0.20 × 100
    // = 30 + 25 + 25 + 20 = 100
    expect(result.healthScore).toBe(100);
    expect(result.healthStatus).toBe('healthy');
    expect(result.giniCoefficient).toBe(0);
    expect(result.engagementTrend).toBe('rising');
  });

  it('returns lower score for unequal contributions', () => {
    const input: TeamHealthInput = {
      memberXpContributions: [0, 0, 0, 400], // High Gini
      teamXpThisWeek: 400,
      teamXpLastWeek: 400, // stable → 75
      availableChallenges: 10,
      participatedChallenges: 5, // participation = 0.5
      daysWithMultipleActiveMembers: 3, // overlap ≈ 0.43
    };

    const result = computeTeamHealth(input);
    expect(result.healthScore).toBeLessThan(70);
    expect(result.giniCoefficient).toBeGreaterThan(0.5);
  });

  it('clamps score to 0 minimum', () => {
    const input: TeamHealthInput = {
      memberXpContributions: [0, 0, 0, 1000], // High Gini
      teamXpThisWeek: 100,
      teamXpLastWeek: 1000, // declining → 25
      availableChallenges: 10,
      participatedChallenges: 0, // participation = 0
      daysWithMultipleActiveMembers: 0, // overlap = 0
    };

    const result = computeTeamHealth(input);
    expect(result.healthScore).toBeGreaterThanOrEqual(0);
  });

  it('clamps score to 100 maximum', () => {
    const input: TeamHealthInput = {
      memberXpContributions: [250, 250, 250, 250],
      teamXpThisWeek: 1000,
      teamXpLastWeek: 500,
      availableChallenges: 5,
      participatedChallenges: 5,
      daysWithMultipleActiveMembers: 7,
    };

    const result = computeTeamHealth(input);
    expect(result.healthScore).toBeLessThanOrEqual(100);
  });

  it('defaults to full participation when no challenges available', () => {
    const input: TeamHealthInput = {
      memberXpContributions: [100, 100],
      teamXpThisWeek: 200,
      teamXpLastWeek: 200,
      availableChallenges: 0,
      participatedChallenges: 0,
      daysWithMultipleActiveMembers: 4,
    };

    const result = computeTeamHealth(input);
    expect(result.challengeParticipationRate).toBe(1);
  });

  it('returns all computed metrics', () => {
    const input: TeamHealthInput = {
      memberXpContributions: [50, 100, 150],
      teamXpThisWeek: 300,
      teamXpLastWeek: 250,
      availableChallenges: 4,
      participatedChallenges: 3,
      daysWithMultipleActiveMembers: 5,
    };

    const result = computeTeamHealth(input);
    expect(typeof result.healthScore).toBe('number');
    expect(['healthy', 'needs_attention', 'at_risk']).toContain(result.healthStatus);
    expect(typeof result.giniCoefficient).toBe('number');
    expect(['rising', 'stable', 'declining']).toContain(result.engagementTrend);
    expect(typeof result.challengeParticipationRate).toBe('number');
    expect(typeof result.activityOverlapRate).toBe('number');
  });
});
