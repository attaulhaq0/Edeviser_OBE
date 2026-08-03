import { describe, expect, it } from "vitest";

import { getEffectiveChallengeStatus } from "@/lib/challengeLifecycle";

const now = new Date("2026-07-29T12:00:00.000Z");

describe("getEffectiveChallengeStatus", () => {
  it("treats an active row whose end date passed as completed", () => {
    expect(
      getEffectiveChallengeStatus(
        {
          status: "active",
          start_date: "2026-06-01T00:00:00.000Z",
          end_date: "2026-06-03T00:00:00.000Z",
        },
        now
      )
    ).toBe("completed");
  });

  it("keeps future and current challenges in their effective lifecycle states", () => {
    expect(
      getEffectiveChallengeStatus(
        {
          status: "draft",
          start_date: "2026-08-01T00:00:00.000Z",
          end_date: "2026-08-03T00:00:00.000Z",
        },
        now
      )
    ).toBe("upcoming");
    expect(
      getEffectiveChallengeStatus(
        {
          status: "active",
          start_date: "2026-07-28T00:00:00.000Z",
          end_date: "2026-07-31T00:00:00.000Z",
        },
        now
      )
    ).toBe("active");
  });

  it("keeps cancelled challenges distinct from completed ones", () => {
    expect(
      getEffectiveChallengeStatus(
        {
          status: "cancelled",
          start_date: "2026-07-28T00:00:00.000Z",
          end_date: "2026-07-31T00:00:00.000Z",
        },
        now
      )
    ).toBe("cancelled");
  });
});
