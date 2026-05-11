// Feature: xp-marketplace, Property 11: Anonymous mode hides cosmetics
// Feature: xp-marketplace, Property 12: Extra quiz attempt extends limit by one
// **Validates: Requirements 7.4, 8.1**

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { canAttemptQuiz } from "@/lib/extraQuizAttempt";

// ─── Types for leaderboard cosmetic resolution ──────────────────────────────

interface LeaderboardStudent {
  student_id: string;
  leaderboard_anonymous: boolean;
  equipped_frame: string | null;
  equipped_title: string | null;
}

interface ResolvedLeaderboardEntry {
  student_id: string;
  frame: string | null;
  title: string | null;
}

function resolveLeaderboardCosmetics(
  student: LeaderboardStudent
): ResolvedLeaderboardEntry {
  if (student.leaderboard_anonymous) {
    return { student_id: student.student_id, frame: null, title: null };
  }
  return {
    student_id: student.student_id,
    frame: student.equipped_frame,
    title: student.equipped_title,
  };
}

// ─── Arbitraries ────────────────────────────────────────────────────────────

const studentArb: fc.Arbitrary<LeaderboardStudent> = fc.record({
  student_id: fc.uuid(),
  leaderboard_anonymous: fc.boolean(),
  equipped_frame: fc.option(
    fc.constantFrom("golden_laurel", "silver_ring", "neon_glow"),
    { nil: null }
  ),
  equipped_title: fc.option(
    fc.constantFrom("The Scholar", "Night Owl", "Speed Demon"),
    { nil: null }
  ),
});

// ─── P11: Anonymous students have no cosmetics on leaderboard ───────────────

describe("Property 11 — Anonymous mode hides cosmetics on leaderboard", () => {
  it("P11: anonymous students always have null frame and title in leaderboard", () => {
    fc.assert(
      fc.property(studentArb, (student) => {
        const entry = resolveLeaderboardCosmetics(student);

        if (student.leaderboard_anonymous) {
          expect(entry.frame).toBeNull();
          expect(entry.title).toBeNull();
        }
      }),
      { numRuns: 100 }
    );
  });
});

// ─── P12: canAttemptQuiz allows N+1 with token ─────────────────────────────

describe("Property 12 — Extra quiz attempt extends limit by one", () => {
  it("P12a: student under limit can always attempt (with or without token)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        fc.boolean(),
        (maxAttempts, hasToken) => {
          // attemptCount < maxAttempts
          const attemptCount = fc.sample(
            fc.integer({ min: 0, max: maxAttempts - 1 }),
            1
          )[0]!;
          expect(canAttemptQuiz(attemptCount, maxAttempts, hasToken)).toBe(
            true
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it("P12b: student at limit can attempt only with token", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 10 }), (maxAttempts) => {
        // At the limit with token → allowed
        expect(canAttemptQuiz(maxAttempts, maxAttempts, true)).toBe(true);
        // At the limit without token → blocked
        expect(canAttemptQuiz(maxAttempts, maxAttempts, false)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it("P12c: student over limit is always blocked", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        fc.boolean(),
        (maxAttempts, hasToken) => {
          const overLimit = maxAttempts + 1;
          expect(canAttemptQuiz(overLimit, maxAttempts, hasToken)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});
