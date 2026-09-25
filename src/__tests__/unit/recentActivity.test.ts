// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  hasRecentActivity,
  RECENT_ACTIVITY_WINDOW_MS,
} from "@/lib/recentActivity";

const now = Date.parse("2026-09-24T12:00:00.000Z");
const at = (ms: number) => new Date(ms).toISOString();

describe("profile last-seen hints are not online presence", () => {
  it("accepts only an actual past observation inside the five-minute window", () => {
    expect(hasRecentActivity(at(now), now)).toBe(true);
    expect(
      hasRecentActivity(at(now - RECENT_ACTIVITY_WINDOW_MS + 1), now)
    ).toBe(true);
    expect(hasRecentActivity(at(now - RECENT_ACTIVITY_WINDOW_MS), now)).toBe(
      false
    );
    expect(
      hasRecentActivity(at(now - RECENT_ACTIVITY_WINDOW_MS - 1), now)
    ).toBe(false);
  });

  it.each([null, undefined, "not-a-date", "", at(now + 1), at(now + 60_000)])(
    "does not invent activity from missing, malformed or future time %s",
    (value) => expect(hasRecentActivity(value, now)).toBe(false)
  );

  it("fails closed for an invalid browser clock rather than claiming activity", () => {
    expect(hasRecentActivity(at(now - 1000), Number.NaN)).toBe(false);
    expect(hasRecentActivity(at(now - 1000), Number.POSITIVE_INFINITY)).toBe(
      false
    );
  });
  it("recomputes both student consumers from last-seen, not a cached online bit", () => {
    const root = resolve(__dirname, "../../..");
    const friends = readFileSync(
      resolve(root, "src/features/student/friends/StudentFriendsPage.tsx"),
      "utf8"
    );
    const dashboard = readFileSync(
      resolve(
        root,
        "src/features/student/dashboard/StudentDashboardScreen.tsx"
      ),
      "utf8"
    );
    for (const source of [friends, dashboard]) {
      expect(source).toContain("hasRecentActivity(f.last_seen_at, observedAt)");
      expect(source).not.toContain("bg-transparent0");
      expect(source).not.toMatch(/f\.online\b|Online now/);
    }
    expect(friends).toContain(
      't("friends.recentActivityHeading", "Recently Active")'
    );
  });
});
