// =============================================================================
// Property Tests: Challenge Rewards — Task 9.6
// Feature: team-challenges, Properties P13, P14
// =============================================================================

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

// ─── Pure logic under test ───────────────────────────────────────────────────

interface RewardDistribution {
  participantId: string;
  challengeId: string;
  xpAmount: number;
}

/**
 * Distribute challenge reward XP to team members.
 * Each member receives the FULL reward amount (not split).
 * Total distributed = reward_xp × member_count.
 */
function distributeTeamReward(
  challengeId: string,
  memberIds: string[],
  rewardXp: number,
): RewardDistribution[] {
  return memberIds.map((memberId) => ({
    participantId: memberId,
    challengeId,
    xpAmount: rewardXp,
  }));
}

/**
 * Check reward uniqueness. A reward should be granted at most once
 * per participant per challenge.
 */
function grantRewardIdempotent(
  grantedRewards: Set<string>,
  participantId: string,
  challengeId: string,
  rewardXp: number,
): { granted: boolean; xpAmount: number } {
  const key = `${challengeId}:${participantId}`;
  if (grantedRewards.has(key)) {
    return { granted: false, xpAmount: 0 };
  }
  grantedRewards.add(key);
  return { granted: true, xpAmount: rewardXp };
}

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Property P13: Full XP to each team member (not split)', () => {
  // Feature: team-challenges, Property 13: Reward distribution

  it('each member receives the full reward amount', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.array(fc.uuid(), { minLength: 2, maxLength: 6 }),
        fc.integer({ min: 50, max: 500 }),
        (challengeId, memberIds, rewardXp) => {
          const uniqueMembers = [...new Set(memberIds)];
          fc.pre(uniqueMembers.length >= 2);

          const distributions = distributeTeamReward(challengeId, uniqueMembers, rewardXp);

          for (const dist of distributions) {
            expect(dist.xpAmount).toBe(rewardXp);
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  it('total distributed XP = reward_xp × member_count', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.array(fc.uuid(), { minLength: 2, maxLength: 6 }),
        fc.integer({ min: 50, max: 500 }),
        (challengeId, memberIds, rewardXp) => {
          const uniqueMembers = [...new Set(memberIds)];
          fc.pre(uniqueMembers.length >= 2);

          const distributions = distributeTeamReward(challengeId, uniqueMembers, rewardXp);
          const totalDistributed = distributions.reduce((sum, d) => sum + d.xpAmount, 0);

          expect(totalDistributed).toBe(rewardXp * uniqueMembers.length);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('every member receives exactly one distribution entry', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.array(fc.uuid(), { minLength: 2, maxLength: 6 }),
        fc.integer({ min: 50, max: 500 }),
        (challengeId, memberIds, rewardXp) => {
          const uniqueMembers = [...new Set(memberIds)];
          fc.pre(uniqueMembers.length >= 2);

          const distributions = distributeTeamReward(challengeId, uniqueMembers, rewardXp);

          expect(distributions).toHaveLength(uniqueMembers.length);

          const recipientIds = distributions.map((d) => d.participantId);
          expect(new Set(recipientIds).size).toBe(uniqueMembers.length);

          for (const memberId of uniqueMembers) {
            expect(recipientIds).toContain(memberId);
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  it('all distributions reference the correct challenge ID', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.array(fc.uuid(), { minLength: 2, maxLength: 6 }),
        fc.integer({ min: 50, max: 500 }),
        (challengeId, memberIds, rewardXp) => {
          const uniqueMembers = [...new Set(memberIds)];
          fc.pre(uniqueMembers.length >= 2);

          const distributions = distributeTeamReward(challengeId, uniqueMembers, rewardXp);

          for (const dist of distributions) {
            expect(dist.challengeId).toBe(challengeId);
          }
        },
      ),
      { numRuns: 200 },
    );
  });
});

describe('Property P14: Reward uniqueness — at most once per participant per challenge', () => {
  // Feature: team-challenges, Property 14: Reward uniqueness

  it('first grant succeeds, second grant for same participant+challenge is rejected', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        fc.integer({ min: 50, max: 500 }),
        (challengeId, participantId, rewardXp) => {
          const grantedRewards = new Set<string>();

          const first = grantRewardIdempotent(grantedRewards, participantId, challengeId, rewardXp);
          const second = grantRewardIdempotent(grantedRewards, participantId, challengeId, rewardXp);

          expect(first.granted).toBe(true);
          expect(first.xpAmount).toBe(rewardXp);
          expect(second.granted).toBe(false);
          expect(second.xpAmount).toBe(0);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('same participant can receive rewards from different challenges', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        fc.integer({ min: 50, max: 500 }),
        (participantId, challenge1, challenge2, rewardXp) => {
          fc.pre(challenge1 !== challenge2);
          const grantedRewards = new Set<string>();

          const first = grantRewardIdempotent(grantedRewards, participantId, challenge1, rewardXp);
          const second = grantRewardIdempotent(grantedRewards, participantId, challenge2, rewardXp);

          expect(first.granted).toBe(true);
          expect(second.granted).toBe(true);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('different participants can receive rewards from the same challenge', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        fc.integer({ min: 50, max: 500 }),
        (challengeId, participant1, participant2, rewardXp) => {
          fc.pre(participant1 !== participant2);
          const grantedRewards = new Set<string>();

          const first = grantRewardIdempotent(grantedRewards, participant1, challengeId, rewardXp);
          const second = grantRewardIdempotent(grantedRewards, participant2, challengeId, rewardXp);

          expect(first.granted).toBe(true);
          expect(second.granted).toBe(true);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('total granted rewards never exceed participant count × challenge count', () => {
    fc.assert(
      fc.property(
        fc.array(fc.uuid(), { minLength: 1, maxLength: 5 }),
        fc.array(fc.uuid(), { minLength: 1, maxLength: 5 }),
        fc.integer({ min: 50, max: 500 }),
        (participantIds, challengeIds, rewardXp) => {
          const uniqueParticipants = [...new Set(participantIds)];
          const uniqueChallenges = [...new Set(challengeIds)];
          const grantedRewards = new Set<string>();
          let grantCount = 0;

          // Grant rewards for all combinations, twice
          for (let pass = 0; pass < 2; pass++) {
            for (const pid of uniqueParticipants) {
              for (const cid of uniqueChallenges) {
                const result = grantRewardIdempotent(grantedRewards, pid, cid, rewardXp);
                if (result.granted) grantCount++;
              }
            }
          }

          expect(grantCount).toBe(uniqueParticipants.length * uniqueChallenges.length);
        },
      ),
      { numRuns: 200 },
    );
  });
});
