// Feature: student-experience-remediation, Property 2: Leaderboard locked exactly when ineligible cohort
// **Validates: Requirements 6.1, 6.2, 6.4**
//
// Property statement (design.md):
//   For any non-negative eligible-student count and any non-negative configured
//   minimum cohort size, `leaderboardState(eligibleCount, minCohort)` returns
//   "locked" if and only if `eligibleCount === 0` OR `eligibleCount < minCohort`,
//   and returns "unlocked" otherwise; consequently whenever the result is
//   "locked" no ranking or medal is produced.

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { leaderboardState, type LeaderboardState } from "@/lib/leaderboardGate";

// --- Arbitraries ---

// Non-negative counts (Requirement 6 speaks of non-negative cohort sizes).
const nonNegativeArb = fc.nat({ max: 100_000 });

describe("leaderboardGate property tests", () => {
  // Property 2: Leaderboard locked exactly when ineligible cohort
  describe("Property 2: Leaderboard locked exactly when ineligible cohort", () => {
    it("returns 'locked' iff eligibleCount === 0 OR eligibleCount < minCohort, else 'unlocked'", () => {
      fc.assert(
        fc.property(
          nonNegativeArb,
          nonNegativeArb,
          (eligibleCount, minCohort) => {
            const result = leaderboardState(eligibleCount, minCohort);

            // The exact biconditional from the design property.
            const shouldBeLocked =
              eligibleCount === 0 || eligibleCount < minCohort;

            expect(result).toBe(shouldBeLocked ? "locked" : "unlocked");
          }
        ),
        { numRuns: 200 }
      );
    });

    it("is total: always returns exactly 'locked' or 'unlocked' for non-negative inputs", () => {
      fc.assert(
        fc.property(
          nonNegativeArb,
          nonNegativeArb,
          (eligibleCount, minCohort) => {
            const result: LeaderboardState = leaderboardState(
              eligibleCount,
              minCohort
            );
            expect(result === "locked" || result === "unlocked").toBe(true);
          }
        ),
        { numRuns: 200 }
      );
    });

    it("zero eligible students is always locked, regardless of the configured minimum (R6.2a/6.4)", () => {
      fc.assert(
        fc.property(nonNegativeArb, (minCohort) => {
          // Includes minCohort === 0, which must still NOT unlock an empty cohort.
          expect(leaderboardState(0, minCohort)).toBe("locked");
        }),
        { numRuns: 100 }
      );
    });

    it("unlocks exactly at and above the configured minimum when at least one student is eligible (R6.2)", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 100_000 }), // at least one eligible student
          fc.integer({ min: 1, max: 100_000 }),
          (eligibleCount, minCohort) => {
            const result = leaderboardState(eligibleCount, minCohort);
            if (eligibleCount >= minCohort) {
              expect(result).toBe("unlocked");
            } else {
              expect(result).toBe("locked");
            }
          }
        ),
        { numRuns: 200 }
      );
    });

    it("stays locked while strictly below the minimum (R6.1)", () => {
      fc.assert(
        fc.property(
          // Build an eligibleCount strictly below minCohort: pick a positive
          // gap and a minimum, then derive the eligible count below it.
          fc.integer({ min: 1, max: 100_000 }),
          fc.integer({ min: 1, max: 100_000 }),
          (minCohort, gap) => {
            const eligibleCount = Math.max(
              0,
              minCohort - (gap % minCohort) - 1
            );
            fc.pre(eligibleCount < minCohort);
            expect(leaderboardState(eligibleCount, minCohort)).toBe("locked");
          }
        ),
        { numRuns: 200 }
      );
    });
  });
});
