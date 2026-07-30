// =============================================================================
// Journal insight derivation — presentation metrics must never use demo values.
// =============================================================================

import { describe, expect, it } from "vitest";

import {
  computeJournalStreak,
  getJournalInsights,
} from "@/lib/journalInsights";

const now = new Date("2026-07-28T12:00:00.000Z"); // Tuesday

describe("journalInsights", () => {
  it("derives the consecutive streak from real entry dates", () => {
    expect(
      computeJournalStreak(
        ["2026-07-28T08:00:00.000Z", "2026-07-27T08:00:00.000Z"],
        now
      )
    ).toBe(2);
  });

  it("allows yesterday's reflection to keep a streak alive", () => {
    expect(computeJournalStreak(["2026-07-27T08:00:00.000Z"], now)).toBe(1);
  });

  it("counts this week's entries, substantive reflections, and calendar days", () => {
    const longReflection = Array.from({ length: 50 }, () => "reflect").join(
      " "
    );
    const insights = getJournalInsights(
      [
        { created_at: "2026-07-27T08:00:00.000Z", content: longReflection },
        { created_at: "2026-07-27T12:00:00.000Z", content: "A short note" },
        { created_at: "2026-07-20T08:00:00.000Z", content: longReflection },
      ],
      now
    );

    expect(insights.entriesThisWeek).toBe(2);
    expect(insights.substantiveThisWeek).toBe(1);
    expect(insights.totalEntries).toBe(3);
    // Two entries on Monday still represent one reflected-on calendar day.
    expect(insights.days.filter((day) => day.hasEntry)).toHaveLength(1);
  });
});
