// Feature: habit-heatmap, Property 29: Streak milestone detection — deterministic regressions
// **Validates: Requirements 23.2, 26.3 (milestone values must be unique — first win)**

import { describe, it, expect } from "vitest";
import { detectStreakMilestones } from "@/lib/streakMilestones";
import type { HeatmapDay } from "@/types/habits";

const day = (date: string, academicCount: number): HeatmapDay => ({
  date,
  academicCount,
  wellnessCount: 0,
  totalCount: academicCount,
  habits: [],
});

const dateFromOffset = (base: Date, offset: number): string => {
  const d = new Date(base);
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};

describe("detectStreakMilestones", () => {
  it("should not duplicate a milestone when the same threshold is reached twice", () => {
    // Regression: CI seed 159986709 produced two separate 30-day streaks in
    // a 110-day window, yielding two { days: 30 } entries. Property 29
    // requires each milestone value to appear at most once (first win).
    const base = new Date("2024-01-01T00:00:00");
    const days: HeatmapDay[] = [
      ...Array.from({ length: 27 }, (_, i) => day(dateFromOffset(base, i), 0)), // idle
      ...Array.from({ length: 30 }, (_, i) =>
        day(dateFromOffset(base, 27 + i), 1)
      ), // streak #1 → 30 at index 56
      ...Array.from({ length: 2 }, (_, i) =>
        day(dateFromOffset(base, 57 + i), 0)
      ), // reset
      ...Array.from({ length: 30 }, (_, i) =>
        day(dateFromOffset(base, 59 + i), 1)
      ), // streak #2 → 30 again
      ...Array.from({ length: 21 }, (_, i) =>
        day(dateFromOffset(base, 89 + i), 0)
      ), // idle tail
    ];
    const milestones = detectStreakMilestones(days);

    expect(milestones).toHaveLength(1);
    expect(milestones[0]!.days).toBe(30);
    expect(milestones[0]!.achievedDate).toBe(dateFromOffset(base, 56));
  });

  it("should emit higher milestones exactly once across repeated threshold crossings", () => {
    const base = new Date("2024-01-01T00:00:00");
    const days: HeatmapDay[] = [
      ...Array.from({ length: 30 }, (_, i) => day(dateFromOffset(base, i), 1)), // → 30
      ...Array.from({ length: 1 }, (_, i) =>
        day(dateFromOffset(base, 30 + i), 0)
      ), // reset
      ...Array.from({ length: 60 }, (_, i) =>
        day(dateFromOffset(base, 31 + i), 1)
      ), // → 30 again (skip) and 60 once
      ...Array.from({ length: 40 }, (_, i) =>
        day(dateFromOffset(base, 91 + i), 1)
      ), // → 100 once
    ];
    const milestones = detectStreakMilestones(days);

    expect(milestones.map((m) => m.days)).toEqual([30, 60, 100]);
    expect(milestones[0]!.achievedDate).toBe(dateFromOffset(base, 29));
    expect(milestones[1]!.achievedDate).toBe(dateFromOffset(base, 90));
    expect(milestones[2]!.achievedDate).toBe(dateFromOffset(base, 130));
  });

  it("should return no milestones when no days are active", () => {
    const base = new Date("2024-01-01T00:00:00");
    const days: HeatmapDay[] = Array.from({ length: 110 }, (_, i) =>
      day(dateFromOffset(base, i), 0)
    );

    expect(detectStreakMilestones(days)).toEqual([]);
  });
});
