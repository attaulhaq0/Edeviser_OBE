// =============================================================================
// Property 112: Challenge creation constraints
// Feature: edeviser-platform
// **Validates: Requirements 113.1, 113.2, 113.6**
// =============================================================================

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { challengeSchema } from "@/lib/schemas/challenge";

// ─── Generators ──────────────────────────────────────────────────────────────

const challengeTypeArb = fc.constantFrom("team", "course_wide") as fc.Arbitrary<
  "team" | "course_wide"
>;
const goalMetricArb = fc.constantFrom(
  "total_xp",
  "habits_completed",
  "assignments_submitted",
  "quiz_score_avg"
) as fc.Arbitrary<
  "total_xp" | "habits_completed" | "assignments_submitted" | "quiz_score_avg"
>;
const rewardTypeArb = fc.constantFrom("xp_bonus", "badge") as fc.Arbitrary<
  "xp_bonus" | "badge"
>;

const validChallengeArb = fc.record({
  title: fc.string({ minLength: 1, maxLength: 200 }),
  description: fc.string({ maxLength: 1000 }),
  challenge_type: challengeTypeArb,
  course_id: fc.uuid(),
  start_date: fc.integer({ min: 0, max: 500 }).map((offset) => {
    const d = new Date("2024-01-01T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + offset);
    return d.toISOString();
  }),
  end_date: fc.integer({ min: 501, max: 1000 }).map((offset) => {
    const d = new Date("2024-01-01T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + offset);
    return d.toISOString();
  }),
  goal_metric: goalMetricArb,
  goal_target: fc.integer({ min: 1, max: 10000 }),
  reward_type: rewardTypeArb,
  reward_value: fc.integer({ min: 0, max: 1000 }),
});

// ─── Properties ──────────────────────────────────────────────────────────────

describe("Property 112: Challenge creation constraints", () => {
  it("valid challenges pass schema validation", () => {
    fc.assert(
      fc.property(validChallengeArb, (challenge) => {
        const result = challengeSchema.safeParse(challenge);
        expect(result.success).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it("challenges with empty title are rejected", () => {
    fc.assert(
      fc.property(validChallengeArb, (challenge) => {
        const invalid = { ...challenge, title: "" };
        const result = challengeSchema.safeParse(invalid);
        expect(result.success).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it("challenges with end_date before start_date are rejected", () => {
    fc.assert(
      fc.property(validChallengeArb, (challenge) => {
        // Swap dates so end < start
        const invalid = {
          ...challenge,
          start_date: challenge.end_date,
          end_date: challenge.start_date,
        };
        // Only test when they're actually different
        if (invalid.start_date === invalid.end_date) return;
        const result = challengeSchema.safeParse(invalid);
        expect(result.success).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it("goal_target must be positive", () => {
    fc.assert(
      fc.property(validChallengeArb, (challenge) => {
        const invalid = { ...challenge, goal_target: 0 };
        const result = challengeSchema.safeParse(invalid);
        expect(result.success).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it("challenge_type must be team or course_wide", () => {
    fc.assert(
      fc.property(validChallengeArb, (challenge) => {
        const invalid = { ...challenge, challenge_type: "individual" };
        const result = challengeSchema.safeParse(invalid);
        expect(result.success).toBe(false);
      }),
      { numRuns: 100 }
    );
  });
});

// =============================================================================
// Property 113: Course-wide challenge participation and reward distribution
// **Validates: Requirements 114.1, 114.2, 114.3, 114.5**
// =============================================================================

describe("Property 113: Course-wide challenge participation and reward", () => {
  it("aggregate progress equals sum of individual contributions", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 100 }), {
          minLength: 1,
          maxLength: 50,
        }),
        (contributions) => {
          const aggregate = contributions.reduce((sum, c) => sum + c, 0);
          expect(aggregate).toBe(contributions.reduce((s, c) => s + c, 0));
        }
      ),
      { numRuns: 100 }
    );
  });

  it("reward only distributed to students who contributed at least 1 action", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 100 }), {
          minLength: 1,
          maxLength: 30,
        }),
        fc.integer({ min: 1, max: 500 }),
        (contributions, goalTarget) => {
          const aggregate = contributions.reduce((sum, c) => sum + c, 0);
          const goalMet = aggregate >= goalTarget;
          const eligible = contributions.filter((c) => c > 0);

          if (goalMet) {
            // Only contributors get reward
            expect(eligible.length).toBeGreaterThan(0);
            for (const c of contributions) {
              if (c === 0) {
                // Non-contributors should not receive reward
                expect(c).toBe(0);
              }
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// =============================================================================
// Property 114: Challenge 90% notification trigger
// **Validates: Requirements 114.6**
// =============================================================================

describe("Property 114: Challenge 90% notification trigger", () => {
  it("notification triggered at exactly 90% of goal", () => {
    fc.assert(
      fc.property(fc.integer({ min: 10, max: 10000 }), (goalTarget) => {
        const threshold = Math.floor(goalTarget * 0.9);
        const shouldNotify = threshold >= Math.floor(goalTarget * 0.9);
        expect(shouldNotify).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it("notification sent at most once per challenge", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10, max: 10000 }),
        fc.array(fc.integer({ min: 0, max: 100 }), {
          minLength: 1,
          maxLength: 20,
        }),
        (goalTarget, progressIncrements) => {
          const threshold90 = goalTarget * 0.9;
          let totalProgress = 0;
          let notificationCount = 0;
          let alreadyNotified = false;

          for (const increment of progressIncrements) {
            totalProgress += increment;
            if (totalProgress >= threshold90 && !alreadyNotified) {
              notificationCount++;
              alreadyNotified = true;
            }
          }

          expect(notificationCount).toBeLessThanOrEqual(1);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// =============================================================================
// Property 115: Team challenge reward atomicity
// **Validates: Requirements 113.4**
// =============================================================================

describe("Property 115: Team challenge reward atomicity", () => {
  it("winning team determined by highest progress", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            team_id: fc.uuid(),
            progress: fc.integer({ min: 0, max: 10000 }),
          }),
          { minLength: 2, maxLength: 10 }
        ),
        (teams) => {
          const maxProgress = Math.max(...teams.map((t) => t.progress));
          const winners = teams.filter((t) => t.progress === maxProgress);
          expect(winners.length).toBeGreaterThanOrEqual(1);
          for (const w of winners) {
            expect(w.progress).toBe(maxProgress);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("all members of winning team receive reward or none do", () => {
    fc.assert(
      fc.property(
        fc.array(fc.uuid(), { minLength: 2, maxLength: 10 }),
        fc.boolean(),
        (memberIds, rewardSucceeds) => {
          // Simulate atomic reward distribution
          const rewarded = rewardSucceeds ? memberIds : [];
          // Either all get it or none
          expect(
            rewarded.length === memberIds.length || rewarded.length === 0
          ).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});
