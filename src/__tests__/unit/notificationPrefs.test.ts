import { describe, it, expect } from "vitest";
import {
  parseNotificationPrefs,
  mergeNotificationPrefs,
  DEFAULT_NOTIFICATION_PREFS,
} from "@/lib/notificationPrefs";

// Feature: Me page (T30/E3.I) — notification preferences card. The helpers
// parse the live profiles.notification_preferences jsonb shape tolerantly.

describe("parseNotificationPrefs", () => {
  it("returns defaults for null/undefined (column not set)", () => {
    expect(parseNotificationPrefs(null)).toEqual(DEFAULT_NOTIFICATION_PREFS);
    expect(parseNotificationPrefs(undefined)).toEqual(
      DEFAULT_NOTIFICATION_PREFS
    );
  });

  it("parses the live column default shape", () => {
    const parsed = parseNotificationPrefs({
      quiet_hours: { end: "07:00", start: "22:00", enabled: false },
      muted_courses: ["c1"],
      email_streak_risk: true,
      email_grade_released: true,
      email_new_assignment: true,
      email_weekly_summary: true,
    });
    expect(parsed.email_weekly_summary).toBe(true);
    expect(parsed.muted_courses).toEqual(["c1"]);
    expect(parsed.quiet_hours.start).toBe("22:00");
  });

  it("falls back per-field on malformed values", () => {
    const parsed = parseNotificationPrefs({
      email_new_assignment: "yes",
      quiet_hours: { start: 22, enabled: "true" },
      muted_courses: ["a", 5, null],
    });
    expect(parsed.email_new_assignment).toBe(true);
    expect(parsed.quiet_hours.start).toBe("22:00");
    expect(parsed.quiet_hours.enabled).toBe(false);
    expect(parsed.muted_courses).toEqual(["a"]);
  });
});

describe("mergeNotificationPrefs", () => {
  it("merges a partial patch without mutating the current object", () => {
    const current = parseNotificationPrefs(null);
    const next = mergeNotificationPrefs(current, {
      email_streak_risk: false,
    });
    expect(next.email_streak_risk).toBe(false);
    expect(current.email_streak_risk).toBe(true);
    expect(next.email_new_assignment).toBe(true);
  });

  it("merges quiet_hours shallowly (partial time patch keeps the rest)", () => {
    const current = parseNotificationPrefs({
      ...DEFAULT_NOTIFICATION_PREFS,
      quiet_hours: { enabled: true, start: "21:00", end: "06:00" },
    });
    const next = mergeNotificationPrefs(current, {
      quiet_hours: { enabled: false, start: "21:00", end: "06:00" },
    });
    expect(next.quiet_hours.enabled).toBe(false);
    expect(next.quiet_hours.start).toBe("21:00");
  });
});
