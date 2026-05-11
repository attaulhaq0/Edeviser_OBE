// Unit test: contributionThresholds — default threshold 20%, status transition rules
import { describe, it, expect } from "vitest";
import {
  computeContributionStatus,
  isBelowThreshold,
  DEFAULT_CONTRIBUTION_THRESHOLD,
  WARNING_THRESHOLD_DAYS,
  INACTIVE_THRESHOLD_DAYS,
} from "@/lib/contributionThresholds";

describe("contributionThresholds", () => {
  it("default threshold is 20%", () => {
    expect(DEFAULT_CONTRIBUTION_THRESHOLD).toBe(0.2);
  });

  it("warning threshold is 3 days", () => {
    expect(WARNING_THRESHOLD_DAYS).toBe(3);
  });

  it("inactive threshold is 5 days", () => {
    expect(INACTIVE_THRESHOLD_DAYS).toBe(5);
  });

  describe("computeContributionStatus", () => {
    it("0 days → active", () => {
      expect(computeContributionStatus(0)).toBe("active");
    });

    it("2 days → active", () => {
      expect(computeContributionStatus(2)).toBe("active");
    });

    it("3 days → warning", () => {
      expect(computeContributionStatus(3)).toBe("warning");
    });

    it("4 days → warning", () => {
      expect(computeContributionStatus(4)).toBe("warning");
    });

    it("5 days → inactive", () => {
      expect(computeContributionStatus(5)).toBe("inactive");
    });

    it("10 days → inactive", () => {
      expect(computeContributionStatus(10)).toBe("inactive");
    });
  });

  describe("isBelowThreshold", () => {
    it("member with 10 XP out of 100 total is below 20% threshold", () => {
      expect(isBelowThreshold(10, 100)).toBe(true);
    });

    it("member with 25 XP out of 100 total is above 20% threshold", () => {
      expect(isBelowThreshold(25, 100)).toBe(false);
    });

    it("member with exactly 20% is not below threshold", () => {
      expect(isBelowThreshold(20, 100)).toBe(false);
    });

    it("zero team XP means no one is below threshold", () => {
      expect(isBelowThreshold(0, 0)).toBe(false);
    });

    it("custom threshold is respected", () => {
      expect(isBelowThreshold(10, 100, 0.15)).toBe(true);
      expect(isBelowThreshold(20, 100, 0.15)).toBe(false);
    });
  });
});
