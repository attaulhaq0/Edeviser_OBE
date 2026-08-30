// =============================================================================
// Unit Tests — getWeekStartDate local-time week anchor (Sunday regression)
// =============================================================================
// Regression guard for the UTC-conversion bug in `getWeekStartDate`: the old
// implementation returned `d.toISOString().split("T")[0]`, which shifts the
// Monday anchor back one day in every positive-UTC-offset timezone (Qatar is
// UTC+3 — the target market). On Sundays the wrong anchor pushed "today"
// outside the rendered week, so `buildPlannerWeek` offered zero suggested
// study sessions and Sunday planners showed bare "No items" placeholders.
// All inputs/outputs here are constructed in LOCAL time, so these assertions
// hold in every timezone with the fixed implementation and fail on Sundays
// in UTC+ timezones with the buggy one.

import { describe, it, expect } from "vitest";
import { getWeekStartDate } from "@/lib/plannerUtils";
import { buildPlannerWeek } from "@/lib/weeklyPlannerContent";

/** Parse a YYYY-MM-DD string as a LOCAL date (mirrors the planner pages). */
function parseLocal(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y as number, (m as number) - 1, d as number);
}

describe("getWeekStartDate local-time anchor (Sunday regression)", () => {
  it("anchors a Sunday on the Monday of the same week (2026-08-30 → 2026-08-24)", () => {
    const sunday = new Date(2026, 7, 30);
    expect(sunday.getDay()).toBe(0); // sanity: constructed date is a Sunday
    expect(getWeekStartDate(sunday)).toBe("2026-08-24");
  });

  it("anchors every weekday of a known week on the same Monday", () => {
    for (let day = 24; day <= 30; day++) {
      const date = new Date(2026, 7, day); // Mon Aug 24 … Sun Aug 30, 2026
      expect(getWeekStartDate(date)).toBe("2026-08-24");
    }
  });

  it("always returns a local Monday within 6 days before the input", () => {
    // Sweep one full year (2026) — month boundaries included: the anchor must
    // parse back as a Monday, must not be after the input, and must lag the
    // input by at most 6 days.
    for (let month = 0; month < 12; month++) {
      const daysInMonth = new Date(2026, month + 1, 0).getDate();
      for (const day of [1, 15, daysInMonth]) {
        const input = new Date(2026, month, day);
        const anchor = getWeekStartDate(input);
        const anchorDate = parseLocal(anchor);
        expect(anchorDate.getDay()).toBe(1); // Monday (local semantics)
        expect(anchorDate.getTime()).toBeLessThanOrEqual(input.getTime());
        const maxLag = (input.getTime() - anchorDate.getTime()) / 86400000;
        expect(maxLag).toBeGreaterThanOrEqual(0);
        expect(maxLag).toBeLessThanOrEqual(6);
      }
    }
  });

  it("keeps today inside the rendered week so Sundays still get suggestions", () => {
    const todayStr = "2026-08-30"; // Sunday
    const days = buildPlannerWeek({
      weekStartDate: getWeekStartDate(parseLocal(todayStr)),
      todayStr,
      sessions: [],
      tasks: [],
      deadlines: [],
      courses: [{ id: "course-1", name: "Chemistry 101" }],
    });
    expect(days).toHaveLength(7);
    const today = days.find((d) => d.isToday);
    expect(today?.date).toBe(todayStr);
    expect(today?.suggestions?.length ?? 0).toBeGreaterThanOrEqual(1);
  });
});
