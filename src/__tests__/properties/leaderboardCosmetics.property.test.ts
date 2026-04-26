// Feature: xp-marketplace, Property 11: anonymous mode hides cosmetics on leaderboard
// Feature: xp-marketplace, Property 12: extra quiz attempt allows N+1 attempts
// **Validates: Requirements 7.4, 8.1**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// ─── Domain helpers ─────────────────────────────────────────────────────────

interface LeaderboardEntry {
  studentId: string;
  displayName: string;
  xp: number;
  isAnonymous: boolean;
  equippedFrame: string | null;
  equippedTitle: string | null;
}

interface RenderedLeaderboardEntry {
  studentId: string;
  displayName: string;
  xp: number;
  frame: string | null;
  title: string | null;
}

/**
 * Pure function: render leaderboard entries, hiding cosmetics for anonymous students.
 */
const renderLeaderboard = (entries: LeaderboardEntry[]): RenderedLeaderboardEntry[] => {
  return entries.map((entry) => ({
    studentId: entry.studentId,
    displayName: entry.isAnonymous ? 'Anonymous Student' : entry.displayName,
    xp: entry.xp,
    frame: entry.isAnonymous ? null : entry.equippedFrame,
    title: entry.isAnonymous ? null : entry.equippedTitle,
  }));
};

/**
 * Pure function: check if a student can attempt a quiz given their attempt count,
 * the configured limit, and whether they have an extra attempt token.
 */
const canAttemptQuiz = (
  currentAttempts: number,
  attemptLimit: number,
  hasExtraAttemptToken: boolean,
): boolean => {
  const effectiveLimit = hasExtraAttemptToken ? attemptLimit + 1 : attemptLimit;
  return currentAttempts < effectiveLimit;
};

// ─── Arbitraries ────────────────────────────────────────────────────────────

const leaderboardEntryArb: fc.Arbitrary<LeaderboardEntry> = fc.record({
  studentId: fc.uuid(),
  displayName: fc.stringMatching(/^[A-Za-z ]{3,20}$/),
  xp: fc.integer({ min: 0, max: 100000 }),
  isAnonymous: fc.boolean(),
  equippedFrame: fc.oneof(fc.constant(null), fc.constantFrom('gold_frame', 'silver_frame', 'diamond_frame')),
  equippedTitle: fc.oneof(fc.constant(null), fc.constantFrom('The Scholar', 'Night Owl', 'Perfectionist')),
});

const leaderboardArb = fc.array(leaderboardEntryArb, { minLength: 1, maxLength: 30 });

// ─── Property 11: anonymous mode hides cosmetics ────────────────────────────

describe('Property 11 — Anonymous mode hides cosmetics on leaderboard', () => {
  it('P11a: anonymous students have no frame or title displayed', () => {
    fc.assert(
      fc.property(leaderboardArb, (entries) => {
        const rendered = renderLeaderboard(entries);
        for (let i = 0; i < entries.length; i++) {
          if (entries[i]!.isAnonymous) {
            expect(rendered[i]!.frame).toBeNull();
            expect(rendered[i]!.title).toBeNull();
            expect(rendered[i]!.displayName).toBe('Anonymous Student');
          }
        }
      }),
      { numRuns: 100 },
    );
  });

  it('P11b: non-anonymous students retain their cosmetics', () => {
    fc.assert(
      fc.property(leaderboardArb, (entries) => {
        const rendered = renderLeaderboard(entries);
        for (let i = 0; i < entries.length; i++) {
          if (!entries[i]!.isAnonymous) {
            expect(rendered[i]!.frame).toBe(entries[i]!.equippedFrame);
            expect(rendered[i]!.title).toBe(entries[i]!.equippedTitle);
            expect(rendered[i]!.displayName).toBe(entries[i]!.displayName);
          }
        }
      }),
      { numRuns: 100 },
    );
  });

  it('P11c: XP values are always visible regardless of anonymous mode', () => {
    fc.assert(
      fc.property(leaderboardArb, (entries) => {
        const rendered = renderLeaderboard(entries);
        for (let i = 0; i < entries.length; i++) {
          expect(rendered[i]!.xp).toBe(entries[i]!.xp);
        }
      }),
      { numRuns: 100 },
    );
  });
});

// ─── Property 12: extra quiz attempt allows N+1 ─────────────────────────────

describe('Property 12 — Extra quiz attempt token allows N+1 attempts', () => {
  it('P12a: with token, student can attempt one more than the limit', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        (attemptLimit) => {
          // At the limit, without token: cannot attempt
          expect(canAttemptQuiz(attemptLimit, attemptLimit, false)).toBe(false);
          // At the limit, with token: can attempt
          expect(canAttemptQuiz(attemptLimit, attemptLimit, true)).toBe(true);
          // At limit+1, with token: cannot attempt
          expect(canAttemptQuiz(attemptLimit + 1, attemptLimit, true)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P12b: without token, student cannot exceed the limit', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        fc.integer({ min: 0, max: 20 }),
        (attemptLimit, currentAttempts) => {
          const canAttempt = canAttemptQuiz(currentAttempts, attemptLimit, false);
          if (currentAttempts >= attemptLimit) {
            expect(canAttempt).toBe(false);
          } else {
            expect(canAttempt).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
