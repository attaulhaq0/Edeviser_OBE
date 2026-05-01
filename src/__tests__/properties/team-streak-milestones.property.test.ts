// Feature: edeviser-platform, Property 106: Team streak milestone rewards
// **Validates: Requirements 119.5**

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  checkTeamStreakMilestone,
  TEAM_STREAK_MILESTONES,
} from "@/lib/teamStreakCalculator";

const MILESTONE_DAYS = [7, 14, 30];

describe("Property 106: Team streak milestone rewards", () => {
  it("milestone days always produce correct XP reward", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...MILESTONE_DAYS),
        (milestoneDay: number) => {
          const result = checkTeamStreakMilestone(milestoneDay);
          expect(result.milestone_reached).toBe(milestoneDay);
          expect(result.xp_reward).toBe(TEAM_STREAK_MILESTONES[milestoneDay]);
          expect(result.badge_earned).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("non-milestone days produce no reward", () => {
    fc.assert(
      fc.property(
        fc
          .integer({ min: 0, max: 365 })
          .filter((n) => !MILESTONE_DAYS.includes(n)),
        (nonMilestoneDay: number) => {
          const result = checkTeamStreakMilestone(nonMilestoneDay);
          expect(result.milestone_reached).toBeNull();
          expect(result.xp_reward).toBe(0);
          expect(result.badge_earned).toBe(false);
        }
      ),
      { numRuns: 200 }
    );
  });

  it("XP rewards increase with higher milestones", () => {
    const rewards = MILESTONE_DAYS.map((d) => checkTeamStreakMilestone(d));
    for (let i = 1; i < rewards.length; i++) {
      expect(rewards[i]!.xp_reward).toBeGreaterThan(rewards[i - 1]!.xp_reward);
    }
  });

  it("milestone XP values match spec: 7→100, 14→250, 30→500", () => {
    expect(checkTeamStreakMilestone(7).xp_reward).toBe(100);
    expect(checkTeamStreakMilestone(14).xp_reward).toBe(250);
    expect(checkTeamStreakMilestone(30).xp_reward).toBe(500);
  });
});
