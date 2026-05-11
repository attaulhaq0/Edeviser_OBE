import { describe, it, expect } from "vitest";
import {
  getLevelAwareIntensityLevel,
  getLevelForDate,
  computeLevelRelativeConsistencyScore,
  getLevelMaxHabits,
} from "@/lib/levelAwareHeatmap";
import type { LevelProgressionPoint } from "@/types/habits";

// ---------------------------------------------------------------------------
// getLevelMaxHabits
// ---------------------------------------------------------------------------

describe("getLevelMaxHabits", () => {
  it("returns the level number itself", () => {
    expect(getLevelMaxHabits(1)).toBe(1);
    expect(getLevelMaxHabits(2)).toBe(2);
    expect(getLevelMaxHabits(3)).toBe(3);
    expect(getLevelMaxHabits(4)).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// getLevelAwareIntensityLevel
// ---------------------------------------------------------------------------

describe("getLevelAwareIntensityLevel", () => {
  it("returns 0 when count is 0", () => {
    expect(getLevelAwareIntensityLevel(0, 4)).toBe(0);
  });

  it("returns 0 when levelMax is 0", () => {
    expect(getLevelAwareIntensityLevel(3, 0)).toBe(0);
  });

  it("Level 1 student with 1 habit → full intensity (4)", () => {
    expect(getLevelAwareIntensityLevel(1, 1)).toBe(4);
  });

  it("Level 4 student with 1 habit → intensity 1 (ratio 0.25)", () => {
    expect(getLevelAwareIntensityLevel(1, 4)).toBe(1);
  });

  it("Level 4 student with 4 habits → full intensity (4)", () => {
    expect(getLevelAwareIntensityLevel(4, 4)).toBe(4);
  });

  it("Level 2 student with 1 habit → intensity 2 (ratio 0.5)", () => {
    expect(getLevelAwareIntensityLevel(1, 2)).toBe(2);
  });

  it("Level 4 student with 3 habits → intensity 3 (ratio 0.75)", () => {
    expect(getLevelAwareIntensityLevel(3, 4)).toBe(3);
  });

  it("count exceeding levelMax → full intensity (4)", () => {
    expect(getLevelAwareIntensityLevel(5, 2)).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// getLevelForDate
// ---------------------------------------------------------------------------

describe("getLevelForDate", () => {
  const history: LevelProgressionPoint[] = [
    { date: "2025-01-01", level: 1 },
    { date: "2025-02-15", level: 2 },
    { date: "2025-04-01", level: 3 },
  ];

  it("returns default level 4 when history is empty", () => {
    expect(getLevelForDate("2025-03-01", [])).toBe(4);
  });

  it("returns default level 4 when date is before all history entries", () => {
    expect(getLevelForDate("2024-12-31", history)).toBe(4);
  });

  it("returns level 1 for date on first entry", () => {
    expect(getLevelForDate("2025-01-01", history)).toBe(1);
  });

  it("returns level 1 for date between first and second entry", () => {
    expect(getLevelForDate("2025-01-15", history)).toBe(1);
  });

  it("returns level 2 for date on second entry", () => {
    expect(getLevelForDate("2025-02-15", history)).toBe(2);
  });

  it("returns level 3 for date after last entry", () => {
    expect(getLevelForDate("2025-05-01", history)).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// computeLevelRelativeConsistencyScore
// ---------------------------------------------------------------------------

describe("computeLevelRelativeConsistencyScore", () => {
  const history: LevelProgressionPoint[] = [{ date: "2025-01-01", level: 2 }];

  it("returns 0 when all days are sabbatical", () => {
    const days = [
      { date: "2025-01-04", academicCount: 2 },
      { date: "2025-01-05", academicCount: 1 },
    ];
    const sabbatical = new Set(["2025-01-04", "2025-01-05"]);
    expect(
      computeLevelRelativeConsistencyScore(days, history, sabbatical)
    ).toBe(0);
  });

  it("returns 100 when all eligible days meet level requirement", () => {
    const days = [
      { date: "2025-01-06", academicCount: 2 },
      { date: "2025-01-07", academicCount: 3 },
    ];
    expect(computeLevelRelativeConsistencyScore(days, history, new Set())).toBe(
      100
    );
  });

  it("returns 50 when half the days meet level requirement", () => {
    const days = [
      { date: "2025-01-06", academicCount: 2 },
      { date: "2025-01-07", academicCount: 1 },
    ];
    expect(computeLevelRelativeConsistencyScore(days, history, new Set())).toBe(
      50
    );
  });

  it("excludes sabbatical dates from calculation", () => {
    const days = [
      { date: "2025-01-06", academicCount: 2 },
      { date: "2025-01-07", academicCount: 0 },
      { date: "2025-01-08", academicCount: 2 },
    ];
    const sabbatical = new Set(["2025-01-07"]);
    // Only 2 eligible days, both meet requirement → 100%
    expect(
      computeLevelRelativeConsistencyScore(days, history, sabbatical)
    ).toBe(100);
  });

  it("returns 0 when no days have data", () => {
    expect(computeLevelRelativeConsistencyScore([], history, new Set())).toBe(
      0
    );
  });
});
