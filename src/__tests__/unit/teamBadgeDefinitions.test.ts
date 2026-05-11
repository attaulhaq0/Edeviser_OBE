// Unit test: teamBadgeDefinitions — all 6 badges + Team Player defined
import { describe, it, expect } from "vitest";
import {
  TEAM_BADGE_DEFINITIONS,
  getTeamBadgeById,
  getAllTeamBadgeIds,
} from "@/lib/teamBadgeDefinitions";

describe("teamBadgeDefinitions", () => {
  const EXPECTED_BADGE_IDS = [
    "team_spirit",
    "streak_squad",
    "streak_champions",
    "streak_legends",
    "full_house",
    "quest_conquerors",
    "team_player",
  ];

  it("defines exactly 7 badges (6 team + Team Player)", () => {
    expect(TEAM_BADGE_DEFINITIONS.length).toBe(7);
  });

  it("contains all expected badge IDs", () => {
    const ids = getAllTeamBadgeIds();
    for (const expectedId of EXPECTED_BADGE_IDS) {
      expect(ids).toContain(expectedId);
    }
  });

  it("each badge has required fields", () => {
    for (const badge of TEAM_BADGE_DEFINITIONS) {
      expect(badge.id).toBeTruthy();
      expect(badge.name).toBeTruthy();
      expect(badge.description).toBeTruthy();
      expect(badge.icon).toBeTruthy();
      expect(badge.category).toBe("team");
      expect(typeof badge.isMystery).toBe("boolean");
      expect(badge.condition).toBeTruthy();
      expect(typeof badge.xpReward).toBe("number");
      expect(badge.xpReward).toBeGreaterThan(0);
    }
  });

  it("getTeamBadgeById returns correct badge", () => {
    for (const id of EXPECTED_BADGE_IDS) {
      const badge = getTeamBadgeById(id);
      expect(badge).toBeDefined();
      expect(badge!.id).toBe(id);
    }
  });

  it("getTeamBadgeById returns undefined for unknown ID", () => {
    expect(getTeamBadgeById("nonexistent")).toBeUndefined();
  });

  it("Team Player badge has correct properties", () => {
    const teamPlayer = getTeamBadgeById("team_player");
    expect(teamPlayer).toBeDefined();
    expect(teamPlayer!.name).toBe("Team Player");
    expect(teamPlayer!.category).toBe("team");
  });

  it("all badge IDs are unique", () => {
    const ids = getAllTeamBadgeIds();
    expect(new Set(ids).size).toBe(ids.length);
  });
});
