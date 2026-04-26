// =============================================================================
// Property Tests: Replacement Vote — Task 9.14
// Feature: team-challenges, Property P31
// =============================================================================

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

// ─── Types ───────────────────────────────────────────────────────────────────

type VoteStatus = 'pending' | 'approved' | 'rejected' | 'expired';

interface ReplacementVote {
  voteId: string;
  teamId: string;
  targetMemberId: string;
  initiatedAt: number; // epoch ms
  expiresAt: number; // epoch ms
  votesFor: number;
  votesAgainst: number;
  totalEligibleVoters: number; // active members excluding target
  status: VoteStatus;
}

interface VoteCooldown {
  teamId: string;
  targetMemberId: string;
  lastFailedVoteAt: number; // epoch ms
}

// ─── Constants ───────────────────────────────────────────────────────────────

/** Vote expires after 48 hours */
const VOTE_EXPIRY_MS = 48 * 60 * 60 * 1000;

/** Cooldown period after a failed vote: 7 days */
const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

// ─── Pure logic under test ───────────────────────────────────────────────────

/**
 * Determine vote outcome.
 * Approved when votes_for > 50% of active members (excluding target).
 */
function resolveVote(vote: ReplacementVote, now: number): VoteStatus {
  // Check expiry first
  if (now >= vote.expiresAt) {
    // If majority was reached before expiry, still approved
    if (vote.votesFor > vote.totalEligibleVoters / 2) {
      return 'approved';
    }
    return 'expired';
  }

  // Check if majority reached
  if (vote.votesFor > vote.totalEligibleVoters / 2) {
    return 'approved';
  }

  // Check if rejection is certain (remaining votes can't reach majority)
  const remainingVotes = vote.totalEligibleVoters - vote.votesFor - vote.votesAgainst;
  if (vote.votesFor + remainingVotes <= vote.totalEligibleVoters / 2) {
    return 'rejected';
  }

  return 'pending';
}

/**
 * Check if a new vote can be initiated against a target member.
 * Blocked during cooldown period (7 days after failed vote).
 */
function canInitiateVote(
  cooldowns: VoteCooldown[],
  teamId: string,
  targetMemberId: string,
  now: number,
): { allowed: boolean; cooldownRemainingMs?: number; error?: string } {
  const cooldown = cooldowns.find(
    (c) => c.teamId === teamId && c.targetMemberId === targetMemberId,
  );

  if (!cooldown) return { allowed: true };

  const cooldownEnd = cooldown.lastFailedVoteAt + COOLDOWN_MS;
  if (now < cooldownEnd) {
    return {
      allowed: false,
      cooldownRemainingMs: cooldownEnd - now,
      error: 'Cooldown period active after failed vote',
    };
  }

  return { allowed: true };
}

/**
 * Create a new replacement vote.
 */
function createVote(
  voteId: string,
  teamId: string,
  targetMemberId: string,
  activeMembers: string[],
  now: number,
): ReplacementVote {
  // Eligible voters = active members excluding the target
  const eligibleVoters = activeMembers.filter((m) => m !== targetMemberId);

  return {
    voteId,
    teamId,
    targetMemberId,
    initiatedAt: now,
    expiresAt: now + VOTE_EXPIRY_MS,
    votesFor: 0,
    votesAgainst: 0,
    totalEligibleVoters: eligibleVoters.length,
    status: 'pending',
  };
}

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Property P31: Vote approval, expiry, and cooldown', () => {
  // Feature: team-challenges, Property 31: Replacement vote rules

  it('vote is approved when votes_for > 50% of eligible voters', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        fc.integer({ min: 2, max: 10 }),
        (voteId, teamId, targetId, totalEligible) => {
          const majorityNeeded = Math.floor(totalEligible / 2) + 1;

          const vote: ReplacementVote = {
            voteId,
            teamId,
            targetMemberId: targetId,
            initiatedAt: 1750000000000,
            expiresAt: 1750000000000 + VOTE_EXPIRY_MS,
            votesFor: majorityNeeded,
            votesAgainst: 0,
            totalEligibleVoters: totalEligible,
            status: 'pending',
          };

          const now = 1750000000000 + 3600000; // 1 hour later, before expiry
          const result = resolveVote(vote, now);
          expect(result).toBe('approved');
        },
      ),
      { numRuns: 200 },
    );
  });

  it('vote with exactly 50% is NOT approved (needs strictly more than 50%)', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        fc.integer({ min: 2, max: 20 }).filter((n) => n % 2 === 0), // even numbers for clean 50%
        (voteId, teamId, targetId, totalEligible) => {
          const exactHalf = totalEligible / 2;

          const vote: ReplacementVote = {
            voteId,
            teamId,
            targetMemberId: targetId,
            initiatedAt: 1750000000000,
            expiresAt: 1750000000000 + VOTE_EXPIRY_MS,
            votesFor: exactHalf,
            votesAgainst: exactHalf,
            totalEligibleVoters: totalEligible,
            status: 'pending',
          };

          const now = 1750000000000 + 3600000;
          const result = resolveVote(vote, now);
          expect(result).not.toBe('approved');
        },
      ),
      { numRuns: 200 },
    );
  });

  it('vote expires after 48 hours if majority not reached', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        fc.integer({ min: 3, max: 10 }),
        (voteId, teamId, targetId, totalEligible) => {
          const vote: ReplacementVote = {
            voteId,
            teamId,
            targetMemberId: targetId,
            initiatedAt: 1750000000000,
            expiresAt: 1750000000000 + VOTE_EXPIRY_MS,
            votesFor: 0,
            votesAgainst: 0,
            totalEligibleVoters: totalEligible,
            status: 'pending',
          };

          // Check at exactly expiry time
          const result = resolveVote(vote, vote.expiresAt);
          expect(result).toBe('expired');
        },
      ),
      { numRuns: 200 },
    );
  });

  it('vote expires after 48 hours even with some votes', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        fc.integer({ min: 4, max: 10 }),
        (voteId, teamId, targetId, totalEligible) => {
          // Not enough votes for majority
          const vote: ReplacementVote = {
            voteId,
            teamId,
            targetMemberId: targetId,
            initiatedAt: 1750000000000,
            expiresAt: 1750000000000 + VOTE_EXPIRY_MS,
            votesFor: 1,
            votesAgainst: totalEligible - 1,
            totalEligibleVoters: totalEligible,
            status: 'pending',
          };

          const afterExpiry = vote.expiresAt + 1000;
          const result = resolveVote(vote, afterExpiry);
          expect(result).toBe('expired');
        },
      ),
      { numRuns: 200 },
    );
  });

  it('7-day cooldown blocks new vote after failed vote', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        fc.integer({ min: 0, max: COOLDOWN_MS - 1 }),
        (teamId, targetId, elapsedMs) => {
          const failedAt = 1750000000000;
          const cooldowns: VoteCooldown[] = [
            { teamId, targetMemberId: targetId, lastFailedVoteAt: failedAt },
          ];

          const now = failedAt + elapsedMs;
          const result = canInitiateVote(cooldowns, teamId, targetId, now);

          expect(result.allowed).toBe(false);
          expect(result.cooldownRemainingMs).toBeGreaterThan(0);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('vote is allowed after cooldown period expires', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        fc.integer({ min: 0, max: 86400000 }), // up to 1 day extra
        (teamId, targetId, extraMs) => {
          const failedAt = 1750000000000;
          const cooldowns: VoteCooldown[] = [
            { teamId, targetMemberId: targetId, lastFailedVoteAt: failedAt },
          ];

          const now = failedAt + COOLDOWN_MS + extraMs;
          const result = canInitiateVote(cooldowns, teamId, targetId, now);

          expect(result.allowed).toBe(true);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('no cooldown record means vote is always allowed', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        fc.integer({ min: 1700000000000, max: 1800000000000 }),
        (teamId, targetId, now) => {
          const cooldowns: VoteCooldown[] = [];
          const result = canInitiateVote(cooldowns, teamId, targetId, now);
          expect(result.allowed).toBe(true);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('eligible voters exclude the target member', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        fc.array(fc.uuid(), { minLength: 3, maxLength: 6 }),
        (voteId, teamId, memberIds) => {
          const uniqueMembers = [...new Set(memberIds)];
          fc.pre(uniqueMembers.length >= 3);

          const targetId = uniqueMembers[0]!;
          const now = 1750000000000;

          const vote = createVote(voteId, teamId, targetId, uniqueMembers, now);

          // Eligible voters = all members minus target
          expect(vote.totalEligibleVoters).toBe(uniqueMembers.length - 1);
          expect(vote.expiresAt).toBe(now + VOTE_EXPIRY_MS);
          expect(vote.status).toBe('pending');
        },
      ),
      { numRuns: 200 },
    );
  });

  it('vote before expiry with no majority stays pending', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        fc.integer({ min: 4, max: 10 }),
        fc.integer({ min: 1, max: VOTE_EXPIRY_MS - 1 }),
        (voteId, teamId, targetId, totalEligible, elapsedMs) => {
          const vote: ReplacementVote = {
            voteId,
            teamId,
            targetMemberId: targetId,
            initiatedAt: 1750000000000,
            expiresAt: 1750000000000 + VOTE_EXPIRY_MS,
            votesFor: 0,
            votesAgainst: 0,
            totalEligibleVoters: totalEligible,
            status: 'pending',
          };

          const now = vote.initiatedAt + elapsedMs;
          const result = resolveVote(vote, now);
          expect(result).toBe('pending');
        },
      ),
      { numRuns: 200 },
    );
  });
});
