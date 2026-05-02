// Unit test: teamHealthCalculator — Gini coefficient, health score formula, engagement trend
import { describe, it, expect } from 'vitest';
import {
  computeGiniCoefficient,
  detectEngagementTrend,
  trendToScore,
  classifyHealthStatus,
  computeTeamHealth,
} from '@/lib/teamHealthCalculator';

describe('teamHealthCalculator', () => {
  describe('computeGiniCoefficient', () => {
    it('returns 0 for equal contributions', () => {
      expect(computeGiniCoefficient([100, 100, 100])).toBe(0);
    });

    it('returns 0 for single member', () => {
      expect(computeGiniCoefficient([500])).toBe(0);
    });

    it('returns 0 for all zeros', () => {
      expect(computeGiniCoefficient([0, 0, 0])).toBe(0);
    });

    it('returns value between 0 and 1', () => {
      const gini = computeGiniCoefficient([100, 50, 10, 0]);
      expect(gini).toBeGreaterThan(0);
      expect(gini).toBeLessThanOrEqual(1);
    });

    it('higher inequality yields higher Gini', () => {
      const equal = computeGiniCoefficient([100, 100, 100]);
      const unequal = computeGiniCoefficient([300, 0, 0]);
      expect(unequal).toBeGreaterThan(equal);
    });
  });

  describe('detectEngagementTrend', () => {
    it('rising when >10% increase', () => {
      expect(detectEngagementTrend(120, 100)).toBe('rising');
    });

    it('declining when >10% decrease', () => {
      expect(detectEngagementTrend(80, 100)).toBe('declining');
    });

    it('stable within ±10%', () => {
      expect(detectEngagementTrend(105, 100)).toBe('stable');
      expect(detectEngagementTrend(95, 100)).toBe('stable');
    });

    it('rising when last week was 0 and this week > 0', () => {
      expect(detectEngagementTrend(50, 0)).toBe('rising');
    });

    it('stable when both weeks are 0', () => {
      expect(detectEngagementTrend(0, 0)).toBe('stable');
    });
  });

  describe('trendToScore', () => {
    it('rising → 100', () => {
      expect(trendToScore('rising')).toBe(100);
    });

    it('stable → 60', () => {
      expect(trendToScore('stable')).toBe(60);
    });

    it('declining → 20', () => {
      expect(trendToScore('declining')).toBe(20);
    });
  });

  describe('classifyHealthStatus', () => {
    it('≥70 → healthy', () => {
      expect(classifyHealthStatus(70)).toBe('healthy');
      expect(classifyHealthStatus(100)).toBe('healthy');
    });

    it('40-69 → needs_attention', () => {
      expect(classifyHealthStatus(40)).toBe('needs_attention');
      expect(classifyHealthStatus(69)).toBe('needs_attention');
    });

    it('<40 → at_risk', () => {
      expect(classifyHealthStatus(39)).toBe('at_risk');
      expect(classifyHealthStatus(0)).toBe('at_risk');
    });
  });

  describe('computeTeamHealth', () => {
    it('returns score between 0 and 100', () => {
      const result = computeTeamHealth({
        memberXpContributions: [100, 100, 100],
        thisWeekXp: 300,
        lastWeekXp: 250,
        participationRate: 0.8,
        overlapRate: 0.7,
      });
      expect(result.healthScore).toBeGreaterThanOrEqual(0);
      expect(result.healthScore).toBeLessThanOrEqual(100);
    });

    it('perfect team gets high score', () => {
      const result = computeTeamHealth({
        memberXpContributions: [100, 100, 100],
        thisWeekXp: 400,
        lastWeekXp: 300,
        participationRate: 1.0,
        overlapRate: 1.0,
      });
      expect(result.healthScore).toBeGreaterThanOrEqual(80);
      expect(result.healthStatus).toBe('healthy');
    });

    it('inactive team gets low score', () => {
      const result = computeTeamHealth({
        memberXpContributions: [0, 0, 0],
        thisWeekXp: 0,
        lastWeekXp: 100,
        participationRate: 0,
        overlapRate: 0,
      });
      expect(result.healthScore).toBeLessThan(40);
      expect(result.healthStatus).toBe('at_risk');
    });

    it('returns consistent status with score', () => {
      const result = computeTeamHealth({
        memberXpContributions: [50, 30, 20],
        thisWeekXp: 100,
        lastWeekXp: 100,
        participationRate: 0.5,
        overlapRate: 0.5,
      });
      expect(result.healthStatus).toBe(classifyHealthStatus(result.healthScore));
    });
  });
});
