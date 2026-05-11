import { describe, it, expect } from "vitest";
import { getBadgeById, getBadgesByCategory } from "@/lib/badgeDefinitions";

// ─── Edge Function constants (mirrored for testing) ─────────────────────────

const VALID_TRIGGERS = [
  "xp_award",
  "submission",
  "streak_update",
  "grade",
  "journal",
  "habit_log",
] as const;

const BADGE_XP: Record<string, number> = {
  streak_7: 50,
  streak_14: 75,
  streak_30: 100,
  streak_60: 150,
  streak_100: 250,
  first_submission: 25,
  perfect_score: 75,
  all_clos_met: 100,
  journal_10: 50,
  perfect_week: 100,
  speed_demon: 75,
  night_owl: 75,
  perfectionist: 100,
  habit_master: 100,
  wellness_warrior: 75,
  full_spectrum: 150,
};

// ─── Pure logic helpers (mirrored from Edge Function for testability) ────────

/**
 * Counts active days from academic + wellness date arrays.
 * Returns the number of distinct dates with at least one habit.
 */
function countActiveDays(
  academicDates: string[],
  wellnessDates: string[]
): number {
  const all = new Set([...academicDates, ...wellnessDates]);
  return all.size;
}

/**
 * Finds the longest consecutive run in a sorted array of date strings.
 */
function longestConsecutiveRun(sortedDates: string[]): number {
  if (sortedDates.length === 0) return 0;
  const distinct = [...new Set(sortedDates)].sort();
  let longest = 1;
  let current = 1;
  for (let i = 1; i < distinct.length; i++) {
    const prev = new Date(distinct[i - 1]!);
    const curr = new Date(distinct[i]!);
    const diffDays = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays === 1) {
      current++;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }
  return longest;
}

/**
 * Counts days where all 4 academic habits are true AND at least 1 wellness habit is logged.
 */
function countFullSpectrumDays(
  perfectAcademicDates: string[],
  wellnessDates: string[]
): number {
  const wellnessSet = new Set(wellnessDates);
  let count = 0;
  const perfectSet = new Set(perfectAcademicDates);
  for (const date of perfectSet) {
    if (wellnessSet.has(date)) count++;
  }
  return count;
}

// ─── Helper to generate consecutive date strings ────────────────────────────

function generateConsecutiveDates(startDate: string, count: number): string[] {
  const dates: string[] = [];
  const start = new Date(startDate);
  for (let i = 0; i < count; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("Habit Badge Trigger Validation", () => {
  it("habit_log is a valid trigger", () => {
    expect(VALID_TRIGGERS).toContain("habit_log");
  });

  it("all original triggers remain valid", () => {
    expect(VALID_TRIGGERS).toContain("xp_award");
    expect(VALID_TRIGGERS).toContain("submission");
    expect(VALID_TRIGGERS).toContain("streak_update");
    expect(VALID_TRIGGERS).toContain("grade");
    expect(VALID_TRIGGERS).toContain("journal");
  });
});

describe("Habit Master Badge — 30+ active days", () => {
  it("awards badge when exactly 30 active days", () => {
    const dates = generateConsecutiveDates("2025-01-01", 30);
    expect(countActiveDays(dates, [])).toBe(30);
  });

  it("awards badge when more than 30 active days", () => {
    const dates = generateConsecutiveDates("2025-01-01", 45);
    expect(countActiveDays(dates, [])).toBeGreaterThanOrEqual(30);
  });

  it("does not award badge with fewer than 30 active days", () => {
    const dates = generateConsecutiveDates("2025-01-01", 29);
    expect(countActiveDays(dates, [])).toBeLessThan(30);
  });

  it("counts wellness-only days toward active days", () => {
    const academicDates = generateConsecutiveDates("2025-01-01", 20);
    const wellnessDates = generateConsecutiveDates("2025-01-21", 10);
    expect(countActiveDays(academicDates, wellnessDates)).toBe(30);
  });

  it("deduplicates overlapping academic and wellness dates", () => {
    const academicDates = generateConsecutiveDates("2025-01-01", 30);
    const wellnessDates = generateConsecutiveDates("2025-01-01", 30);
    expect(countActiveDays(academicDates, wellnessDates)).toBe(30);
  });

  it("has correct XP reward of 100", () => {
    expect(BADGE_XP["habit_master"]).toBe(100);
  });
});

describe("Wellness Warrior Badge — 14 consecutive wellness days", () => {
  it("awards badge with exactly 14 consecutive days", () => {
    const dates = generateConsecutiveDates("2025-02-01", 14);
    expect(longestConsecutiveRun(dates)).toBe(14);
  });

  it("awards badge with more than 14 consecutive days", () => {
    const dates = generateConsecutiveDates("2025-02-01", 20);
    expect(longestConsecutiveRun(dates)).toBeGreaterThanOrEqual(14);
  });

  it("does not award badge with 13 consecutive days", () => {
    const dates = generateConsecutiveDates("2025-02-01", 13);
    expect(longestConsecutiveRun(dates)).toBeLessThan(14);
  });

  it("handles gaps correctly — finds longest run", () => {
    const run1 = generateConsecutiveDates("2025-01-01", 10);
    const run2 = generateConsecutiveDates("2025-01-15", 14);
    const allDates = [...run1, ...run2].sort();
    expect(longestConsecutiveRun(allDates)).toBe(14);
  });

  it("handles duplicate dates in input", () => {
    const dates = generateConsecutiveDates("2025-02-01", 14);
    const withDupes = [...dates, ...dates]; // each date appears twice
    expect(longestConsecutiveRun(withDupes)).toBe(14);
  });

  it("returns 0 for empty input", () => {
    expect(longestConsecutiveRun([])).toBe(0);
  });

  it("has correct XP reward of 75", () => {
    expect(BADGE_XP["wellness_warrior"]).toBe(75);
  });
});

describe("Full Spectrum Badge — 7 days with all academic + wellness", () => {
  it("awards badge with exactly 7 full spectrum days", () => {
    const perfectDates = generateConsecutiveDates("2025-03-01", 7);
    const wellnessDates = generateConsecutiveDates("2025-03-01", 7);
    expect(countFullSpectrumDays(perfectDates, wellnessDates)).toBe(7);
  });

  it("awards badge with more than 7 full spectrum days", () => {
    const perfectDates = generateConsecutiveDates("2025-03-01", 10);
    const wellnessDates = generateConsecutiveDates("2025-03-01", 10);
    expect(
      countFullSpectrumDays(perfectDates, wellnessDates)
    ).toBeGreaterThanOrEqual(7);
  });

  it("does not award badge with fewer than 7 full spectrum days", () => {
    const perfectDates = generateConsecutiveDates("2025-03-01", 6);
    const wellnessDates = generateConsecutiveDates("2025-03-01", 6);
    expect(countFullSpectrumDays(perfectDates, wellnessDates)).toBeLessThan(7);
  });

  it("only counts days present in both sets", () => {
    const perfectDates = generateConsecutiveDates("2025-03-01", 10);
    const wellnessDates = generateConsecutiveDates("2025-03-05", 10);
    // Overlap: Mar 5-10 = 6 days
    expect(countFullSpectrumDays(perfectDates, wellnessDates)).toBe(6);
  });

  it("returns 0 when no wellness dates overlap", () => {
    const perfectDates = generateConsecutiveDates("2025-03-01", 10);
    const wellnessDates = generateConsecutiveDates("2025-04-01", 10);
    expect(countFullSpectrumDays(perfectDates, wellnessDates)).toBe(0);
  });

  it("has correct XP reward of 150", () => {
    expect(BADGE_XP["full_spectrum"]).toBe(150);
  });
});

describe("Badge Definitions — habit badges", () => {
  it("includes habit_master badge definition", () => {
    const badge = getBadgeById("habit_master");
    expect(badge).toBeDefined();
    expect(badge!.name).toBe("Habit Master");
    expect(badge!.icon).toBe("🏆");
    expect(badge!.category).toBe("habit");
    expect(badge!.xpReward).toBe(100);
    expect(badge!.isMystery).toBe(false);
  });

  it("includes wellness_warrior badge definition", () => {
    const badge = getBadgeById("wellness_warrior");
    expect(badge).toBeDefined();
    expect(badge!.name).toBe("Wellness Warrior");
    expect(badge!.icon).toBe("🧘");
    expect(badge!.category).toBe("habit");
    expect(badge!.xpReward).toBe(75);
    expect(badge!.isMystery).toBe(false);
  });

  it("includes full_spectrum badge definition", () => {
    const badge = getBadgeById("full_spectrum");
    expect(badge).toBeDefined();
    expect(badge!.name).toBe("Full Spectrum");
    expect(badge!.icon).toBe("🌈");
    expect(badge!.category).toBe("habit");
    expect(badge!.xpReward).toBe(150);
    expect(badge!.isMystery).toBe(false);
  });

  it("all three habit badges are in the habit category", () => {
    const habitBadges = getBadgesByCategory("habit");
    expect(habitBadges.length).toBe(3);
    const ids = habitBadges.map((b) => b.id);
    expect(ids).toContain("habit_master");
    expect(ids).toContain("wellness_warrior");
    expect(ids).toContain("full_spectrum");
  });

  it("habit badges have meaningful descriptions", () => {
    const habitBadges = getBadgesByCategory("habit");
    for (const badge of habitBadges) {
      expect(badge.description.length).toBeGreaterThan(10);
      expect(badge.condition.length).toBeGreaterThan(5);
    }
  });
});
