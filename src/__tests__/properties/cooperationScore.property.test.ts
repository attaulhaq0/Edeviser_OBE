// Feature: team-challenges, Property 23: Cooperation Score formula
// Feature: team-challenges, Property 24: Cooperative challenge no leaderboard
// Feature: team-challenges, Property 25: XP Race limit
// **Validates: Requirements 31.4, 32.1, 33.2, 33.3**

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { computeGiniCoefficient } from "@/lib/teamHealthCalculator";

// ── Pure logic under test ────────────────────────────────────────────────────

function computeCooperationScore(
  memberContributions: number[],
  threshold: number,
  teamTotalXp: number
): number {
  if (memberContributions.length === 0) return 0;
  const gini = computeGiniCoefficient(memberContributions);
  const aboveThreshold = memberContributions.filter((c) => {
    if (teamTotalXp <= 0) return true;
    return c / teamTotalXp >= threshold;
  }).length;
  const pctAbove = aboveThreshold / memberContributions.length;
  return Math.round(100 * (1 - gini) * pctAbove);
}

function shouldShowLeaderboard(challengeType: string): boolean {
  return challengeType !== "cooperative";
}

function canCreateXpRace(activeXpRaceCount: number): boolean {
  return activeXpRaceCount < 2;
}

// ── Property Tests ───────────────────────────────────────────────────────────

describe("Property 23: Cooperation Score formula correctness", () => {
  it("score is between 0 and 100", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 1000 }), {
          minLength: 2,
          maxLength: 6,
        }),
        (contributions) => {
          const total = contributions.reduce((s, v) => s + v, 0);
          const score = computeCooperationScore(contributions, 0.2, total);
          expect(score).toBeGreaterThanOrEqual(0);
          expect(score).toBeLessThanOrEqual(100);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("equal contributions above threshold yields score of 100", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 5 }),
        fc.integer({ min: 100, max: 500 }),
        (memberCount, xpPerMember) => {
          // Each member's share = 1/memberCount. For threshold 0.2, need memberCount <= 5
          // so each member's share >= 0.2
          fc.pre(1 / memberCount >= 0.2);
          const contributions = Array(memberCount).fill(
            xpPerMember
          ) as number[];
          const total = xpPerMember * memberCount;
          const score = computeCooperationScore(contributions, 0.2, total);
          expect(score).toBe(100);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("one member doing all work yields low score", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 6 }),
        fc.integer({ min: 100, max: 1000 }),
        (memberCount, totalXp) => {
          const contributions = [
            totalXp,
            ...Array(memberCount - 1).fill(0),
          ] as number[];
          const score = computeCooperationScore(contributions, 0.2, totalXp);
          // With one member doing all work, most members are below threshold
          expect(score).toBeLessThan(50);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe("Property 24: Cooperative challenge has no competitive leaderboard", () => {
  it("cooperative type hides leaderboard", () => {
    fc.assert(
      fc.property(fc.constant("cooperative"), (type) => {
        expect(shouldShowLeaderboard(type)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it("non-cooperative types show leaderboard", () => {
    fc.assert(
      fc.property(
        fc.constantFrom("academic", "habit", "xp_race", "blooms_climb"),
        (type) => {
          expect(shouldShowLeaderboard(type)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe("Property 25: XP Race concurrent limit", () => {
  it("allows creation when fewer than 2 active", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 1 }), (count) => {
        expect(canCreateXpRace(count)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it("blocks creation when 2 or more active", () => {
    fc.assert(
      fc.property(fc.integer({ min: 2, max: 10 }), (count) => {
        expect(canCreateXpRace(count)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });
});
