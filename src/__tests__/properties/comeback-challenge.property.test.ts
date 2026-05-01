// =============================================================================
// Property 101: Comeback Challenge streak restoration accuracy
// Feature: edeviser-platform
// **Validates: Requirements 124.2, 124.3, 124.4**
// =============================================================================

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  calculateStreakToRestore,
  processComebackChallenge,
  type ComebackChallengeState,
} from "@/lib/streakCalculator";

// ─── Generators ──────────────────────────────────────────────────────────────

const challengeStateArb: fc.Arbitrary<ComebackChallengeState> = fc.record({
  comeback_challenge_active: fc.boolean(),
  comeback_challenge_days_completed: fc.integer({ min: 0, max: 2 }),
  comeback_challenge_streak_to_restore: fc.integer({ min: 0, max: 500 }),
});

// ─── Properties ──────────────────────────────────────────────────────────────

describe("Property 101: Comeback Challenge streak restoration accuracy", () => {
  it("restored streak equals floor(lost_streak / 2)", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 1000 }), (lostStreak) => {
        const restored = calculateStreakToRestore(lostStreak);
        expect(restored).toBe(Math.floor(lostStreak / 2));
      }),
      { numRuns: 100 }
    );
  });

  it("restored streak never exceeds original lost streak", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 1000 }), (lostStreak) => {
        const restored = calculateStreakToRestore(lostStreak);
        expect(restored).toBeLessThanOrEqual(lostStreak);
      }),
      { numRuns: 100 }
    );
  });

  it("completing 3 days restores streak and deactivates challenge", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 500 }), (streakToRestore) => {
        const state: ComebackChallengeState = {
          comeback_challenge_active: true,
          comeback_challenge_days_completed: 2,
          comeback_challenge_streak_to_restore: streakToRestore,
        };
        const result = processComebackChallenge(state, false, 0, true);
        expect(result.just_completed).toBe(true);
        expect(result.active).toBe(false);
        expect(result.days_completed).toBe(3);
        expect(result.streak_to_restore).toBe(streakToRestore);
      }),
      { numRuns: 100 }
    );
  });

  it("missing a day during active challenge cancels it", () => {
    fc.assert(
      fc.property(
        challengeStateArb.filter((s) => s.comeback_challenge_active),
        (state) => {
          const result = processComebackChallenge(state, false, 0, false);
          expect(result.just_cancelled).toBe(true);
          expect(result.active).toBe(false);
          expect(result.days_completed).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("streak break with lost streak > 1 activates new challenge", () => {
    fc.assert(
      fc.property(fc.integer({ min: 2, max: 500 }), (lostStreak) => {
        const state: ComebackChallengeState = {
          comeback_challenge_active: false,
          comeback_challenge_days_completed: 0,
          comeback_challenge_streak_to_restore: 0,
        };
        const result = processComebackChallenge(state, true, lostStreak, false);
        expect(result.active).toBe(true);
        expect(result.streak_to_restore).toBe(Math.floor(lostStreak / 2));
      }),
      { numRuns: 100 }
    );
  });
});
