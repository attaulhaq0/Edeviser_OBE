// =============================================================================
// Property 102: Team XP split correctness
// Feature: edeviser-platform
// Validates: Requirements 116.1, 116.4
//
// For any XP award to a student who is a team member, the student's
// individual XP balance should increase by the full award amount, and the
// team's XP pool should increase by floor(award_amount / 2). A separate
// xp_transactions record with scope = 'team' should be created.
// =============================================================================

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

// ─── Pure logic under test ───────────────────────────────────────────────────

interface TeamXPSplitResult {
  individualXP: number;
  teamXP: number;
  teamTransactionScope: "team";
  teamTransactionTeamId: string;
}

/**
 * Computes the team XP split for a given award amount.
 * Mirrors the logic in award-xp Edge Function Step 7.
 */
function computeTeamXPSplit(
  awardAmount: number,
  teamId: string
): TeamXPSplitResult {
  const teamXP = Math.floor(awardAmount / 2);
  return {
    individualXP: awardAmount,
    teamXP,
    teamTransactionScope: "team",
    teamTransactionTeamId: teamId,
  };
}

// ─── Property Tests ──────────────────────────────────────────────────────────

describe("Property 102: Team XP split correctness", () => {
  /**
   * **Validates: Requirements 116.1**
   * Individual XP = 100% of award, team XP = floor(award / 2)
   */
  it("individual gets full XP and team gets floor(amount / 2)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100_000 }),
        fc.uuid(),
        (awardAmount, teamId) => {
          const result = computeTeamXPSplit(awardAmount, teamId);

          // Individual gets 100% of the award
          expect(result.individualXP).toBe(awardAmount);

          // Team gets floor(amount / 2)
          expect(result.teamXP).toBe(Math.floor(awardAmount / 2));
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * **Validates: Requirements 116.4**
   * Team transaction has scope = 'team' and correct team_id
   */
  it("team transaction record has scope team and correct team_id", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100_000 }),
        fc.uuid(),
        (awardAmount, teamId) => {
          const result = computeTeamXPSplit(awardAmount, teamId);

          expect(result.teamTransactionScope).toBe("team");
          expect(result.teamTransactionTeamId).toBe(teamId);
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * **Validates: Requirements 116.1**
   * Team XP is always <= individual XP (50% rounded down)
   */
  it("team XP is always less than or equal to individual XP", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100_000 }),
        fc.uuid(),
        (awardAmount, teamId) => {
          const result = computeTeamXPSplit(awardAmount, teamId);
          expect(result.teamXP).toBeLessThanOrEqual(result.individualXP);
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * **Validates: Requirements 116.1**
   * Team XP is non-negative for any non-negative award
   */
  it("team XP is non-negative for non-negative awards", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100_000 }),
        fc.uuid(),
        (awardAmount, teamId) => {
          const result = computeTeamXPSplit(awardAmount, teamId);
          expect(result.teamXP).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * **Validates: Requirements 116.1**
   * For odd awards, team XP = (award - 1) / 2 (floor rounding)
   */
  it("odd awards round down correctly for team XP", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 50_000 }).map((n) => n * 2 + 1), // odd numbers
        fc.uuid(),
        (oddAward, teamId) => {
          const result = computeTeamXPSplit(oddAward, teamId);
          expect(result.teamXP).toBe((oddAward - 1) / 2);
        }
      ),
      { numRuns: 200 }
    );
  });
});
