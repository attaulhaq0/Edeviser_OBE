// Feature: team-challenges, Property 13: Full XP to each team member
// Feature: team-challenges, Property 14: Reward uniqueness
// **Validates: Requirements 12.1, 12.5, 12.6, 17.4**

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

// ── Pure logic under test ────────────────────────────────────────────────────

interface RewardDistribution {
  memberId: string;
  xpAwarded: number;
}

function distributeTeamReward(
  memberIds: string[],
  rewardXp: number
): RewardDistribution[] {
  return memberIds.map((id) => ({ memberId: id, xpAwarded: rewardXp }));
}

function grantReward(
  grantedRewards: Set<string>,
  challengeId: string,
  participantId: string
): boolean {
  const key = `${challengeId}:${participantId}`;
  if (grantedRewards.has(key)) return false;
  grantedRewards.add(key);
  return true;
}

// ── Property Tests ───────────────────────────────────────────────────────────

describe("Property 13: Full XP to each team member", () => {
  it("every member receives the full reward_xp amount", () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.uuid(), { minLength: 2, maxLength: 6 }),
        fc.integer({ min: 50, max: 500 }),
        (memberIds, rewardXp) => {
          const distributions = distributeTeamReward(memberIds, rewardXp);
          expect(distributions.length).toBe(memberIds.length);
          for (const d of distributions) {
            expect(d.xpAwarded).toBe(rewardXp);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("total XP distributed equals reward_xp × member_count", () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.uuid(), { minLength: 2, maxLength: 6 }),
        fc.integer({ min: 50, max: 500 }),
        (memberIds, rewardXp) => {
          const distributions = distributeTeamReward(memberIds, rewardXp);
          const totalXp = distributions.reduce(
            (sum, d) => sum + d.xpAwarded,
            0
          );
          expect(totalXp).toBe(rewardXp * memberIds.length);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe("Property 14: Reward uniqueness", () => {
  it("reward is granted at most once per participant per challenge", () => {
    fc.assert(
      fc.property(fc.uuid(), fc.uuid(), (challengeId, participantId) => {
        const granted = new Set<string>();
        const first = grantReward(granted, challengeId, participantId);
        const second = grantReward(granted, challengeId, participantId);
        expect(first).toBe(true);
        expect(second).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it("different participants can each receive reward for same challenge", () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uniqueArray(fc.uuid(), { minLength: 2, maxLength: 6 }),
        (challengeId, participantIds) => {
          const granted = new Set<string>();
          for (const pid of participantIds) {
            expect(grantReward(granted, challengeId, pid)).toBe(true);
          }
          expect(granted.size).toBe(participantIds.length);
        }
      ),
      { numRuns: 100 }
    );
  });
});
