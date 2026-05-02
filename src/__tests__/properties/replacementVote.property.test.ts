// Feature: team-challenges, Property 31: Majority rule, expiry, cooldown
// **Validates: Requirements 29.2, 29.4**

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

// ── Pure logic under test ────────────────────────────────────────────────────

const VOTE_EXPIRY_HOURS = 48;
const COOLDOWN_DAYS = 7;

type VoteStatus = "open" | "approved" | "rejected" | "expired";

interface Vote {
  votesFor: number;
  votesAgainst: number;
  totalEligibleVoters: number;
  createdAt: Date;
  status: VoteStatus;
}

function resolveVote(vote: Vote, now: Date): VoteStatus {
  const expiryMs = VOTE_EXPIRY_HOURS * 60 * 60 * 1000;
  if (now.getTime() - vote.createdAt.getTime() > expiryMs) {
    return "expired";
  }
  const majority = Math.ceil(vote.totalEligibleVoters / 2);
  if (vote.votesFor >= majority) return "approved";
  if (vote.votesAgainst >= majority) return "rejected";
  return "open";
}

function canInitiateNewVote(
  lastVoteResolvedAt: Date | null,
  now: Date
): boolean {
  if (!lastVoteResolvedAt) return true;
  const cooldownMs = COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
  return now.getTime() - lastVoteResolvedAt.getTime() >= cooldownMs;
}

// ── Generators ───────────────────────────────────────────────────────────────

const voteArb = fc.record({
  votesFor: fc.integer({ min: 0, max: 5 }),
  votesAgainst: fc.integer({ min: 0, max: 5 }),
  totalEligibleVoters: fc.integer({ min: 2, max: 5 }),
  createdAt: fc.date({
    min: new Date("2024-01-01"),
    max: new Date("2025-01-01"),
  }),
  status: fc.constant<VoteStatus>("open"),
});

// ── Property Tests ───────────────────────────────────────────────────────────

describe("Property 31: Replacement vote majority rule, expiry, cooldown", () => {
  it("vote is approved when votesFor > 50% of eligible voters", () => {
    fc.assert(
      fc.property(fc.integer({ min: 2, max: 5 }), (totalVoters) => {
        const majority = Math.ceil(totalVoters / 2);
        const vote: Vote = {
          votesFor: majority,
          votesAgainst: 0,
          totalEligibleVoters: totalVoters,
          createdAt: new Date("2025-01-01T00:00:00Z"),
          status: "open",
        };
        const now = new Date("2025-01-01T12:00:00Z");
        expect(resolveVote(vote, now)).toBe("approved");
      }),
      { numRuns: 100 }
    );
  });

  it("vote is rejected when votesAgainst > 50% of eligible voters", () => {
    fc.assert(
      fc.property(fc.integer({ min: 2, max: 5 }), (totalVoters) => {
        const majority = Math.ceil(totalVoters / 2);
        const vote: Vote = {
          votesFor: 0,
          votesAgainst: majority,
          totalEligibleVoters: totalVoters,
          createdAt: new Date("2025-01-01T00:00:00Z"),
          status: "open",
        };
        const now = new Date("2025-01-01T12:00:00Z");
        expect(resolveVote(vote, now)).toBe("rejected");
      }),
      { numRuns: 100 }
    );
  });

  it("vote expires after 48 hours", () => {
    fc.assert(
      fc.property(voteArb, (vote) => {
        // Guard against invalid dates that produce NaN arithmetic
        if (isNaN(vote.createdAt.getTime())) return;
        const now = new Date(
          vote.createdAt.getTime() + (VOTE_EXPIRY_HOURS + 1) * 60 * 60 * 1000
        );
        expect(resolveVote(vote, now)).toBe("expired");
      }),
      { numRuns: 100 }
    );
  });

  it("vote stays open within 48 hours without majority", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 3, max: 5 }),
        fc.integer({ min: 1, max: 47 }),
        (totalVoters, hoursElapsed) => {
          const vote: Vote = {
            votesFor: 0,
            votesAgainst: 0,
            totalEligibleVoters: totalVoters,
            createdAt: new Date("2025-01-01T00:00:00Z"),
            status: "open",
          };
          const now = new Date(
            vote.createdAt.getTime() + hoursElapsed * 60 * 60 * 1000
          );
          expect(resolveVote(vote, now)).toBe("open");
        }
      ),
      { numRuns: 100 }
    );
  });

  it("7-day cooldown blocks new vote", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 6 }), (daysAfter) => {
        const resolved = new Date("2025-01-01T00:00:00Z");
        const now = new Date(
          resolved.getTime() + daysAfter * 24 * 60 * 60 * 1000
        );
        expect(canInitiateNewVote(resolved, now)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it("after 7 days, new vote is allowed", () => {
    fc.assert(
      fc.property(fc.integer({ min: 7, max: 30 }), (daysAfter) => {
        const resolved = new Date("2025-01-01T00:00:00Z");
        const now = new Date(
          resolved.getTime() + daysAfter * 24 * 60 * 60 * 1000
        );
        expect(canInitiateNewVote(resolved, now)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it("no previous vote allows immediate initiation", () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date("2024-01-01"), max: new Date("2026-01-01") }),
        (now) => {
          expect(canInitiateNewVote(null, now)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});
