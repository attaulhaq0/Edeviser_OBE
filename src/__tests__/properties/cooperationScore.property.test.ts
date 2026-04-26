// =============================================================================
// Property Tests: Cooperation Score — Task 9.11
// Feature: team-challenges, Properties P23, P24, P25
// =============================================================================

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { computeGiniCoefficient } from '@/lib/teamHealthCalculator';
import { meetsContributionThreshold, DEFAULT_CONTRIBUTION_THRESHOLD } from '@/lib/contributionThresholds';
import { CHALLENGE_TYPES } from '@/lib/challengeTypes';

// ─── Pure logic under test ───────────────────────────────────────────────────

/**
 * Cooperation Score = 100 × (1 − Gini) × (% members above threshold)
 */
function computeCooperationScore(
  memberXpContributions: number[],
  teamTotalXp: number,
  threshold: number = DEFAULT_CONTRIBUTION_THRESHOLD,
): number {
  if (memberXpContributions.length === 0) return 100;

  const gini = computeGiniCoefficient(memberXpContributions);
  const activeCount = memberXpContributions.filter((xp) =>
    meetsContributionThreshold(xp, teamTotalXp, threshold),
  ).length;
  const activePercent = activeCount / memberXpContributions.length;

  const raw = 100 * (1 - gini) * activePercent;
  return Math.round(Math.max(0, Math.min(100, raw)));
}

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Property P23: Cooperation Score formula', () => {
  it('score is always between 0 and 100', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 10000 }), { minLength: 2, maxLength: 6 }),
        (contributions) => {
          const total = contributions.reduce((a, b) => a + b, 0);
          const score = computeCooperationScore(contributions, total);
          expect(score).toBeGreaterThanOrEqual(0);
          expect(score).toBeLessThanOrEqual(100);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('perfect equality with all active members gives score near 100', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 5000 }),
        fc.integer({ min: 2, max: 6 }),
        (xpPerMember, memberCount) => {
          const contributions = Array(memberCount).fill(xpPerMember) as number[];
          const total = xpPerMember * memberCount;
          const score = computeCooperationScore(contributions, total);
          // With perfect equality, Gini = 0, all members active → score ≈ 100
          // Each member contributes 1/memberCount of total, threshold is 20%
          // For 6 members, each contributes ~16.7% which is below 20% threshold
          // So for 6 members, no one meets threshold → score = 0
          // For 2-5 members, each contributes >= 20% → score ≈ 100
          if (memberCount <= 5) {
            expect(score).toBeGreaterThanOrEqual(90);
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  it('team with all inactive members (zero XP) gets score of 100 (no activity = no penalty)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 6 }),
        (memberCount) => {
          const contributions = Array(memberCount).fill(0);
          const score = computeCooperationScore(contributions, 0);
          // All zeros: Gini = 0, meetsThreshold returns true when teamTotal = 0
          expect(score).toBe(100);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('more inactive members reduces the score', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 500, max: 5000 }),
        (activeXp) => {
          // 4-member team: all active vs 2 active + 2 inactive
          const allActive = [activeXp, activeXp, activeXp, activeXp];
          const halfActive = [activeXp * 2, activeXp * 2, 0, 0];

          const totalAll = allActive.reduce((a, b) => a + b, 0);
          const totalHalf = halfActive.reduce((a, b) => a + b, 0);

          const scoreAll = computeCooperationScore(allActive, totalAll);
          const scoreHalf = computeCooperationScore(halfActive, totalHalf);

          expect(scoreAll).toBeGreaterThanOrEqual(scoreHalf);
        },
      ),
      { numRuns: 200 },
    );
  });
});

describe('Property P24: Cooperative challenge no leaderboard', () => {
  it('cooperative challenge type has showsLeaderboard = false', () => {
    expect(CHALLENGE_TYPES.cooperative.showsLeaderboard).toBe(false);
  });

  it('all non-cooperative types have showsLeaderboard = true', () => {
    const nonCooperative = ['academic', 'habit', 'xp_race', 'blooms_climb'] as const;
    for (const type of nonCooperative) {
      expect(CHALLENGE_TYPES[type].showsLeaderboard).toBe(true);
    }
  });
});

describe('Property P25: XP Race limit', () => {
  it('XP Race max concurrent per course is 2', () => {
    expect(CHALLENGE_TYPES.xp_race.maxConcurrentPerCourse).toBe(2);
  });

  it('XP Race requires acknowledgment', () => {
    expect(CHALLENGE_TYPES.xp_race.requiresAcknowledgment).toBe(true);
  });

  it('non-XP-Race types do not require acknowledgment', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('academic' as const, 'habit' as const, 'blooms_climb' as const, 'cooperative' as const),
        (typeId) => {
          expect(CHALLENGE_TYPES[typeId].requiresAcknowledgment).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });
});
