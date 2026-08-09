import { describe, expect, it } from "vitest";
import {
  buildNoorSeedPlan,
  NOOR_INSTITUTION_ID,
  NOOR_INSTITUTION_NAME,
  NOOR_INSTITUTION_SLUG,
  type NoorSeedSnapshot,
} from "@/lib/noorSeedPlan";

const snapshot: NoorSeedSnapshot = {
  institution: {
    id: NOOR_INSTITUTION_ID,
    name: NOOR_INSTITUTION_NAME,
    slug: NOOR_INSTITUTION_SLUG,
  },
  counts: {
    currentCalendarEvents: 1,
    upcomingReviewSchedules: 0,
    parentReminders: 0,
    recentActivity: 285,
    notifications: 934,
    todayHabitLogs: 1,
    journalEntries: 2,
    upcomingAssignments: 4,
    invitations: 0,
  },
};

describe("Noor seed dry-run plan", () => {
  it("is deterministic for the same snapshot and planning time", () => {
    const now = new Date("2026-08-05T12:00:00.000Z");
    expect(buildNoorSeedPlan(snapshot, now)).toEqual(
      buildNoorSeedPlan(snapshot, now)
    );
  });

  it("fills only missing date-sensitive coverage and preserves meaningful rows", () => {
    const plan = buildNoorSeedPlan(
      snapshot,
      new Date("2026-08-05T12:00:00.000Z")
    );
    expect(plan.totals).toEqual({
      insert: 8,
      update: 0,
      unchanged: 5,
      blocked: 1,
    });
    expect(
      plan.entries.filter((entry) => entry.operation === "insert")
    ).toHaveLength(8);
    expect(plan.entries).toContainEqual(
      expect.objectContaining({
        table: "assignments",
        operation: "unchanged",
      })
    );
  });

  it("keeps generated deadlines relative and in the future", () => {
    const now = new Date("2026-08-05T12:00:00.000Z");
    const plan = buildNoorSeedPlan(snapshot, now);
    for (const entry of plan.entries.filter(
      (candidate) => candidate.operation === "insert"
    )) {
      const dateValue =
        entry.values?.start_date ??
        entry.values?.next_review_at ??
        entry.values?.remind_at;
      expect(dateValue).toBeTypeOf("string");
      expect(new Date(String(dateValue)).getTime()).toBeGreaterThan(
        now.getTime()
      );
    }
  });

  it("never plans invitation or token fixture writes", () => {
    const plan = buildNoorSeedPlan(
      snapshot,
      new Date("2026-08-05T12:00:00.000Z")
    );
    expect(plan.entries).toContainEqual(
      expect.objectContaining({
        table: "invitations",
        operation: "blocked",
      })
    );
  });

  it("fails closed when the production tenant identity differs", () => {
    expect(() =>
      buildNoorSeedPlan(
        {
          ...snapshot,
          institution: { ...snapshot.institution, slug: "wrong" },
        },
        new Date("2026-08-05T12:00:00.000Z")
      )
    ).toThrow(/identity mismatch/);
  });
});
