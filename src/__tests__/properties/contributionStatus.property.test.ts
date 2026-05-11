// Feature: team-challenges, Property 21: Contribution status transitions
// Feature: team-challenges, Property 22: Institution threshold configuration
// **Validates: Requirements 27.2-27.5**

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  computeContributionStatus,
  isBelowThreshold,
  DEFAULT_CONTRIBUTION_THRESHOLD,
  WARNING_THRESHOLD_DAYS,
  INACTIVE_THRESHOLD_DAYS,
} from "@/lib/contributionThresholds";

// ── Property Tests ───────────────────────────────────────────────────────────

describe("Property 21: Contribution status transitions", () => {
  it("0-2 consecutive low days → active", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 2 }), (days) => {
        expect(computeContributionStatus(days)).toBe("active");
      }),
      { numRuns: 100 }
    );
  });

  it("3-4 consecutive low days → warning", () => {
    fc.assert(
      fc.property(fc.integer({ min: 3, max: 4 }), (days) => {
        expect(computeContributionStatus(days)).toBe("warning");
      }),
      { numRuns: 100 }
    );
  });

  it("5+ consecutive low days → inactive", () => {
    fc.assert(
      fc.property(fc.integer({ min: 5, max: 100 }), (days) => {
        expect(computeContributionStatus(days)).toBe("inactive");
      }),
      { numRuns: 100 }
    );
  });

  it("transition thresholds are correct", () => {
    expect(WARNING_THRESHOLD_DAYS).toBe(3);
    expect(INACTIVE_THRESHOLD_DAYS).toBe(5);
  });

  it("status transitions are monotonic with increasing low days", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 50 }),
        fc.integer({ min: 1, max: 10 }),
        (baseDays, increment) => {
          const statusOrder = { active: 0, warning: 1, inactive: 2 };
          const s1 = computeContributionStatus(baseDays);
          const s2 = computeContributionStatus(baseDays + increment);
          expect(statusOrder[s2]).toBeGreaterThanOrEqual(statusOrder[s1]);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe("Property 22: Institution threshold configuration", () => {
  it("default threshold is 20%", () => {
    expect(DEFAULT_CONTRIBUTION_THRESHOLD).toBe(0.2);
  });

  it("member below threshold is detected with default", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 100, max: 1000 }),
        (memberXp, teamXp) => {
          fc.pre(teamXp > 0);
          const ratio = memberXp / teamXp;
          const below = isBelowThreshold(memberXp, teamXp);
          expect(below).toBe(ratio < DEFAULT_CONTRIBUTION_THRESHOLD);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("custom threshold is respected", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 100, max: 1000 }),
        fc.double({ min: 0.05, max: 0.5, noNaN: true }),
        (memberXp, teamXp, threshold) => {
          fc.pre(teamXp > 0);
          const ratio = memberXp / teamXp;
          const below = isBelowThreshold(memberXp, teamXp, threshold);
          expect(below).toBe(ratio < threshold);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("zero team XP means no one is below threshold", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 100 }), (memberXp) => {
        expect(isBelowThreshold(memberXp, 0)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });
});
