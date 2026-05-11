import { describe, it, expect } from "vitest";
import {
  getLeagueTier,
  DEFAULT_LEAGUE_THRESHOLDS,
  TIER_COLORS,
  TIER_BORDER_COLORS,
  type LeagueTierName,
} from "@/lib/leagueTier";

describe("getLeagueTier", () => {
  it("returns Bronze for 0 XP", () => {
    expect(getLeagueTier(0)).toBe("Bronze");
  });

  it("returns Bronze for 499 XP", () => {
    expect(getLeagueTier(499)).toBe("Bronze");
  });

  it("returns Silver for 500 XP", () => {
    expect(getLeagueTier(500)).toBe("Silver");
  });

  it("returns Silver for 1499 XP", () => {
    expect(getLeagueTier(1499)).toBe("Silver");
  });

  it("returns Gold for 1500 XP", () => {
    expect(getLeagueTier(1500)).toBe("Gold");
  });

  it("returns Gold for 3999 XP", () => {
    expect(getLeagueTier(3999)).toBe("Gold");
  });

  it("returns Diamond for 4000 XP", () => {
    expect(getLeagueTier(4000)).toBe("Diamond");
  });

  it("returns Diamond for very high XP", () => {
    expect(getLeagueTier(99999)).toBe("Diamond");
  });

  it("uses custom thresholds", () => {
    const custom = { bronze: 0, silver: 100, gold: 500, diamond: 1000 };
    expect(getLeagueTier(99, custom)).toBe("Bronze");
    expect(getLeagueTier(100, custom)).toBe("Silver");
    expect(getLeagueTier(500, custom)).toBe("Gold");
    expect(getLeagueTier(1000, custom)).toBe("Diamond");
  });

  it("handles negative XP as Bronze", () => {
    expect(getLeagueTier(-10)).toBe("Bronze");
  });
});

describe("DEFAULT_LEAGUE_THRESHOLDS", () => {
  it("has correct default values", () => {
    expect(DEFAULT_LEAGUE_THRESHOLDS).toEqual({
      bronze: 0,
      silver: 500,
      gold: 1500,
      diamond: 4000,
    });
  });
});

describe("TIER_COLORS", () => {
  it("has color classes for all tiers", () => {
    const tiers: LeagueTierName[] = ["Bronze", "Silver", "Gold", "Diamond"];
    for (const tier of tiers) {
      expect(TIER_COLORS[tier]).toBeDefined();
      expect(typeof TIER_COLORS[tier]).toBe("string");
    }
  });

  it("uses correct gamification colors", () => {
    expect(TIER_COLORS.Bronze).toContain("amber-600");
    expect(TIER_COLORS.Silver).toContain("gray-400");
    expect(TIER_COLORS.Gold).toContain("yellow-400");
    expect(TIER_COLORS.Diamond).toContain("blue-400");
  });
});

describe("TIER_BORDER_COLORS", () => {
  it("has border color classes for all tiers", () => {
    const tiers: LeagueTierName[] = ["Bronze", "Silver", "Gold", "Diamond"];
    for (const tier of tiers) {
      expect(TIER_BORDER_COLORS[tier]).toBeDefined();
    }
  });
});
