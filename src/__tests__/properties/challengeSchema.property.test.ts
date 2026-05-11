// Feature: team-challenges, Property 8: Date constraint validation
// **Validates: Requirements 8.7, 8.8**

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { createChallengeSchema } from "@/lib/schemas/challenge";

// ── Generators ───────────────────────────────────────────────────────────────

const challengeTypeArb = fc.constantFrom(
  "academic",
  "habit",
  "xp_race",
  "blooms_climb",
  "cooperative"
) as fc.Arbitrary<
  "academic" | "habit" | "xp_race" | "blooms_climb" | "cooperative"
>;

function makeValidChallenge(
  startOffset: number,
  durationDays: number,
  type: string
) {
  const start = new Date("2025-06-01T00:00:00Z");
  start.setDate(start.getDate() + startOffset);
  const end = new Date(start);
  end.setDate(end.getDate() + durationDays);
  return {
    title: "Test Challenge",
    description: "A test challenge",
    challenge_type: type,
    participation_mode: "team",
    goal_target: 100,
    start_date: start.toISOString(),
    end_date: end.toISOString(),
    reward_xp: 100,
    reward_badge_id: null,
    xp_race_acknowledged: type === "xp_race" ? true : undefined,
  };
}

// ── Property Tests ───────────────────────────────────────────────────────────

describe("Property 8: Challenge schema date constraint validation", () => {
  it("rejects end_date before start_date", () => {
    fc.assert(
      fc.property(
        challengeTypeArb,
        fc.integer({ min: 2, max: 30 }),
        (type, daysBetween) => {
          const start = new Date("2025-06-15T00:00:00Z");
          const end = new Date(start);
          end.setDate(end.getDate() - daysBetween);
          const input = {
            title: "Test",
            description: "Desc",
            challenge_type: type,
            participation_mode: "team",
            goal_target: 100,
            start_date: start.toISOString(),
            end_date: end.toISOString(),
            reward_xp: 100,
            xp_race_acknowledged: type === "xp_race" ? true : undefined,
          };
          const result = createChallengeSchema.safeParse(input);
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("rejects duration less than 24 hours", () => {
    fc.assert(
      fc.property(
        challengeTypeArb,
        fc.integer({ min: 1, max: 23 }),
        (type, hours) => {
          const start = new Date("2025-06-15T00:00:00Z");
          const end = new Date(start.getTime() + hours * 60 * 60 * 1000);
          const input = {
            title: "Test",
            description: "Desc",
            challenge_type: type,
            participation_mode: "team",
            goal_target: 100,
            start_date: start.toISOString(),
            end_date: end.toISOString(),
            reward_xp: 100,
            xp_race_acknowledged: type === "xp_race" ? true : undefined,
          };
          const result = createChallengeSchema.safeParse(input);
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("rejects duration exceeding 90 days", () => {
    fc.assert(
      fc.property(
        challengeTypeArb,
        fc.integer({ min: 91, max: 200 }),
        (type, days) => {
          const input = makeValidChallenge(0, days, type);
          const result = createChallengeSchema.safeParse(input);
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("accepts valid date ranges (1-90 days)", () => {
    fc.assert(
      fc.property(
        challengeTypeArb,
        fc.integer({ min: 1, max: 90 }),
        (type, days) => {
          const input = makeValidChallenge(0, days, type);
          const result = createChallengeSchema.safeParse(input);
          expect(result.success).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("XP Race requires acknowledgment", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 90 }), (days) => {
        const input = makeValidChallenge(0, days, "xp_race");
        input.xp_race_acknowledged = undefined;
        const result = createChallengeSchema.safeParse(input);
        expect(result.success).toBe(false);
      }),
      { numRuns: 100 }
    );
  });
});
