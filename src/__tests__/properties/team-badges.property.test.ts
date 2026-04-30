// Feature: edeviser-platform, Property 104: Team badge idempotency
// **Validates: Requirements 118.2, 118.5**

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  checkTeamBadgeEligibility,
  awardTeamBadgesIdempotent,
  type TeamBadgeState,
  type TeamBadgeId,
} from "@/lib/teamBadgeChecker";

const ALL_TEAM_BADGES: TeamBadgeId[] = [
  "team_spirit",
  "unstoppable",
  "dream_team",
  "study_squad",
];

const teamBadgeStateArb = fc.record({
  xp_total: fc.integer({ min: 0, max: 10000 }),
  challenge_wins: fc.integer({ min: 0, max: 20 }),
  all_members_perfect_day: fc.boolean(),
  team_streak_current: fc.integer({ min: 0, max: 365 }),
});

const alreadyEarnedArb = fc
  .subarray(ALL_TEAM_BADGES)
  .map((arr) => new Set<string>(arr));

describe("Property 104: Team badge idempotency", () => {
  it("awarding badges twice with the same state produces the same result", () => {
    fc.assert(
      fc.property(
        teamBadgeStateArb,
        alreadyEarnedArb,
        (state: TeamBadgeState, alreadyEarned: Set<string>) => {
          // First award pass
          const eligible1 = checkTeamBadgeEligibility(state, alreadyEarned);
          const afterFirst = awardTeamBadgesIdempotent(
            alreadyEarned,
            eligible1
          );

          // Second award pass with same state but updated earned set
          const eligible2 = checkTeamBadgeEligibility(state, afterFirst);
          const afterSecond = awardTeamBadgesIdempotent(afterFirst, eligible2);

          // Idempotency: second pass should not add any new badges
          expect(afterSecond.size).toBe(afterFirst.size);
          for (const badge of afterFirst) {
            expect(afterSecond.has(badge)).toBe(true);
          }
        }
      ),
      { numRuns: 200 }
    );
  });

  it("already-earned badges are never re-awarded", () => {
    fc.assert(
      fc.property(
        teamBadgeStateArb,
        alreadyEarnedArb,
        (state: TeamBadgeState, alreadyEarned: Set<string>) => {
          const results = checkTeamBadgeEligibility(state, alreadyEarned);

          for (const result of results) {
            if (alreadyEarned.has(result.badge_id)) {
              // Badge already earned — must NOT be eligible again
              expect(result.eligible).toBe(false);
            }
          }
        }
      ),
      { numRuns: 200 }
    );
  });

  it("badge set only grows, never shrinks", () => {
    fc.assert(
      fc.property(
        teamBadgeStateArb,
        alreadyEarnedArb,
        (state: TeamBadgeState, alreadyEarned: Set<string>) => {
          const eligible = checkTeamBadgeEligibility(state, alreadyEarned);
          const afterAward = awardTeamBadgesIdempotent(alreadyEarned, eligible);

          // All previously earned badges must still be present
          for (const badge of alreadyEarned) {
            expect(afterAward.has(badge)).toBe(true);
          }
          // Size can only grow or stay the same
          expect(afterAward.size).toBeGreaterThanOrEqual(alreadyEarned.size);
        }
      ),
      { numRuns: 200 }
    );
  });
});
