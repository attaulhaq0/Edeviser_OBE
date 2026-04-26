// =============================================================================
// Property Tests: Team Health — Task 9.13
// Feature: team-challenges, Properties P29, P30, P32
// =============================================================================

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  computeGiniCoefficient,
  computeTeamHealth,
  classifyHealthStatus,
  detectEngagementTrend,
  type TeamHealthInput,
} from '@/lib/teamHealthCalculator';

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Property P29: Health score formula', () => {
  const teamHealthInputArb = fc.record({
    memberXpContributions: fc.array(fc.integer({ min: 0, max: 10000 }), { minLength: 2, maxLength: 6 }),
    teamXpThisWeek: fc.integer({ min: 0, max: 50000 }),
    teamXpLastWeek: fc.integer({ min: 0, max: 50000 }),
    availableChallenges: fc.integer({ min: 0, max: 10 }),
    participatedChallenges: fc.integer({ min: 0, max: 10 }),
    daysWithMultipleActiveMembers: fc.integer({ min: 0, max: 7 }),
  }).filter((input) => input.participatedChallenges <= input.availableChallenges);

  it('health score is always between 0 and 100', () => {
    fc.assert(
      fc.property(teamHealthInputArb, (input: TeamHealthInput) => {
        const result = computeTeamHealth(input);
        expect(result.healthScore).toBeGreaterThanOrEqual(0);
        expect(result.healthScore).toBeLessThanOrEqual(100);
      }),
      { numRuns: 200 },
    );
  });

  it('health score is an integer', () => {
    fc.assert(
      fc.property(teamHealthInputArb, (input: TeamHealthInput) => {
        const result = computeTeamHealth(input);
        expect(Number.isInteger(result.healthScore)).toBe(true);
      }),
      { numRuns: 200 },
    );
  });

  it('perfect team (equal XP, rising trend, full participation, full overlap) scores high', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 5000 }),
        fc.integer({ min: 2, max: 6 }),
        (xpPerMember, memberCount) => {
          const input: TeamHealthInput = {
            memberXpContributions: Array(memberCount).fill(xpPerMember),
            teamXpThisWeek: xpPerMember * memberCount,
            teamXpLastWeek: Math.floor(xpPerMember * memberCount * 0.5), // rising
            availableChallenges: 3,
            participatedChallenges: 3,
            daysWithMultipleActiveMembers: 7,
          };
          const result = computeTeamHealth(input);
          expect(result.healthScore).toBeGreaterThanOrEqual(80);
        },
      ),
      { numRuns: 200 },
    );
  });
});

describe('Property P30: Health status classification', () => {
  it('score >= 70 is healthy', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 70, max: 100 }),
        (score) => {
          expect(classifyHealthStatus(score)).toBe('healthy');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('score 40-69 is needs_attention', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 40, max: 69 }),
        (score) => {
          expect(classifyHealthStatus(score)).toBe('needs_attention');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('score < 40 is at_risk', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 39 }),
        (score) => {
          expect(classifyHealthStatus(score)).toBe('at_risk');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('classification is consistent with computeTeamHealth output', () => {
    const teamHealthInputArb = fc.record({
      memberXpContributions: fc.array(fc.integer({ min: 0, max: 10000 }), { minLength: 2, maxLength: 6 }),
      teamXpThisWeek: fc.integer({ min: 0, max: 50000 }),
      teamXpLastWeek: fc.integer({ min: 0, max: 50000 }),
      availableChallenges: fc.integer({ min: 0, max: 10 }),
      participatedChallenges: fc.integer({ min: 0, max: 10 }),
      daysWithMultipleActiveMembers: fc.integer({ min: 0, max: 7 }),
    }).filter((input) => input.participatedChallenges <= input.availableChallenges);

    fc.assert(
      fc.property(teamHealthInputArb, (input: TeamHealthInput) => {
        const result = computeTeamHealth(input);
        expect(result.healthStatus).toBe(classifyHealthStatus(result.healthScore));
      }),
      { numRuns: 200 },
    );
  });
});

describe('Property P32: Gini coefficient bounds', () => {
  it('Gini is always between 0 and 1', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 100000 }), { minLength: 2, maxLength: 20 }),
        (values) => {
          const gini = computeGiniCoefficient(values);
          expect(gini).toBeGreaterThanOrEqual(0);
          expect(gini).toBeLessThanOrEqual(1);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('Gini is 0 for equal values', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10000 }),
        fc.integer({ min: 2, max: 10 }),
        (value, count) => {
          const values = Array(count).fill(value);
          const gini = computeGiniCoefficient(values);
          expect(gini).toBeCloseTo(0, 5);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('Gini is 0 for all zeros', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 10 }),
        (count) => {
          const values = Array(count).fill(0);
          const gini = computeGiniCoefficient(values);
          expect(gini).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Gini is 0 for single element', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100000 }),
        (value) => {
          const gini = computeGiniCoefficient([value]);
          expect(gini).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Gini increases with inequality', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 5000 }),
        fc.integer({ min: 2, max: 6 }),
        (baseXp, memberCount) => {
          // Equal distribution
          const equal = Array(memberCount).fill(baseXp);
          // Unequal: one member has all XP
          const unequal = Array(memberCount).fill(0);
          unequal[0] = baseXp * memberCount;

          const giniEqual = computeGiniCoefficient(equal);
          const giniUnequal = computeGiniCoefficient(unequal);

          expect(giniUnequal).toBeGreaterThan(giniEqual);
        },
      ),
      { numRuns: 200 },
    );
  });
});

describe('Engagement trend detection', () => {
  it('rising when this week > last week by more than 10%', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 10000 }),
        (lastWeek) => {
          const thisWeek = Math.ceil(lastWeek * 1.11); // > 10% increase
          expect(detectEngagementTrend(thisWeek, lastWeek)).toBe('rising');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('declining when this week < last week by more than 10%', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 10000 }),
        (lastWeek) => {
          const thisWeek = Math.floor(lastWeek * 0.89); // > 10% decrease
          expect(detectEngagementTrend(thisWeek, lastWeek)).toBe('declining');
        },
      ),
      { numRuns: 100 },
    );
  });
});
