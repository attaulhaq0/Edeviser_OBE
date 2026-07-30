import { describe, expect, it } from "vitest";

import { formatNotificationTitle } from "@/lib/notificationPresentation";

describe("formatNotificationTitle", () => {
  it("humanizes badge identifiers without changing other notification titles", () => {
    expect(formatNotificationTitle("Badge earned: rising_star")).toBe(
      "Badge earned: Rising Star"
    );
    expect(formatNotificationTitle("Badge earned: night-owl")).toBe(
      "Badge earned: Night Owl"
    );
    expect(formatNotificationTitle("Grade Released")).toBe("Grade Released");
  });
});
