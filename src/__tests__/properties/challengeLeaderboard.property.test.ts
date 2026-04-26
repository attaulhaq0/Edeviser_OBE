// =============================================================================
// Property Tests: Challenge Leaderboard — Task 9.7
// Feature: team-challenges, Properties P15, P16, P17
// =============================================================================

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

// ─── Types ───────────────────────────────────────────────────────────────────

interface LeaderboardEntry {
  participantId: string;
  participantName: string;
  currentProgress: number;
  completedAt: string | null;
  isAnonymous: boolean;
  rank: number;
}

interface TeamLeaderboardEntry {
  teamId: string;
  teamName: string;
  courseId: string;
  xpTotal: number;
  rank: number;
}

// ─── Pure logic under test ───────────────────────────────────────────────────

/**
 * Sort challenge leaderboard entries:
 * 1. By current_progress DESC
 * 2. Ties broken by earlier completed_at (null = not completed, sorted last among ties)
 */
function sortChallengeLeaderboard(entries: Omit<LeaderboardEntry, 'rank'>[]): LeaderboardEntry[] {
  const sorted = [...entries].sort((a, b) => {
    // Primary: progress descending
    if (b.currentProgress !== a.currentProgress) {
      return b.currentProgress - a.currentProgress;
    }

    // Secondary: earlier completed_at wins
    if (a.completedAt === null && b.completedAt === null) return 0;
    if (a.completedAt === null) return 1; // a not completed, b completed → b first
    if (b.completedAt === null) return -1; // b not completed, a completed → a first
    return a.completedAt.localeCompare(b.completedAt); // earlier date first
  });

  return sorted.map((entry, i) => ({ ...entry, rank: i + 1 }));
}

/**
 * Apply anonymity to leaderboard entries.
 * Anonymous entries show "Anonymous" as their name.
 */
function applyAnonymity(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  return entries.map((entry) => ({
    ...entry,
    participantName: entry.isAnonymous ? 'Anonymous' : entry.participantName,
  }));
}

/**
 * Build team leaderboard scoped to a specific course, sorted by xp_total DESC.
 */
function buildTeamLeaderboard(
  teams: { teamId: string; teamName: string; courseId: string; xpTotal: number }[],
  courseId: string,
): TeamLeaderboardEntry[] {
  const filtered = teams.filter((t) => t.courseId === courseId);
  const sorted = [...filtered].sort((a, b) => b.xpTotal - a.xpTotal);
  return sorted.map((t, i) => ({ ...t, rank: i + 1 }));
}

// ─── Generators ──────────────────────────────────────────────────────────────

const completedAtArb = fc.oneof(
  fc.constant(null),
  fc.date({ min: new Date('2025-01-01'), max: new Date('2026-12-31') })
    .filter((d) => !isNaN(d.getTime()))
    .map((d) => d.toISOString()),
);

const leaderboardEntryArb = fc.record({
  participantId: fc.uuid(),
  participantName: fc.string({ minLength: 2, maxLength: 30 }),
  currentProgress: fc.integer({ min: 0, max: 10000 }),
  completedAt: completedAtArb,
  isAnonymous: fc.boolean(),
});

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Property P15: Sort by current_progress DESC, ties broken by earlier completed_at', () => {
  // Feature: team-challenges, Property 15: Leaderboard sort order

  it('entries are sorted by progress descending', () => {
    fc.assert(
      fc.property(
        fc.array(leaderboardEntryArb, { minLength: 1, maxLength: 30 }),
        (entries) => {
          const sorted = sortChallengeLeaderboard(entries);

          for (let i = 1; i < sorted.length; i++) {
            expect(sorted[i]!.currentProgress).toBeLessThanOrEqual(sorted[i - 1]!.currentProgress);
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  it('ties in progress are broken by earlier completed_at', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }),
        fc.date({ min: new Date('2025-01-01'), max: new Date('2025-06-01') }).filter((d) => !isNaN(d.getTime())),
        fc.date({ min: new Date('2025-06-02'), max: new Date('2025-12-31') }).filter((d) => !isNaN(d.getTime())),
        (progress, earlyDate, lateDate) => {
          const entries = [
            { participantId: 'late', participantName: 'Late', currentProgress: progress, completedAt: lateDate.toISOString(), isAnonymous: false },
            { participantId: 'early', participantName: 'Early', currentProgress: progress, completedAt: earlyDate.toISOString(), isAnonymous: false },
          ];

          const sorted = sortChallengeLeaderboard(entries);

          expect(sorted[0]!.participantId).toBe('early');
          expect(sorted[1]!.participantId).toBe('late');
        },
      ),
      { numRuns: 200 },
    );
  });

  it('completed entries rank above non-completed entries at same progress', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }),
        fc.date({ min: new Date('2025-01-01'), max: new Date('2026-12-31') }).filter((d) => !isNaN(d.getTime())),
        (progress, completedDate) => {
          const entries = [
            { participantId: 'incomplete', participantName: 'Incomplete', currentProgress: progress, completedAt: null, isAnonymous: false },
            { participantId: 'complete', participantName: 'Complete', currentProgress: progress, completedAt: completedDate.toISOString(), isAnonymous: false },
          ];

          const sorted = sortChallengeLeaderboard(entries);

          expect(sorted[0]!.participantId).toBe('complete');
          expect(sorted[1]!.participantId).toBe('incomplete');
        },
      ),
      { numRuns: 200 },
    );
  });

  it('ranks are sequential from 1 to N', () => {
    fc.assert(
      fc.property(
        fc.array(leaderboardEntryArb, { minLength: 1, maxLength: 30 }),
        (entries) => {
          const sorted = sortChallengeLeaderboard(entries);

          for (let i = 0; i < sorted.length; i++) {
            expect(sorted[i]!.rank).toBe(i + 1);
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  it('all original entries are preserved (no entries lost or added)', () => {
    fc.assert(
      fc.property(
        fc.array(leaderboardEntryArb, { minLength: 1, maxLength: 30 }),
        (entries) => {
          const sorted = sortChallengeLeaderboard(entries);
          expect(sorted).toHaveLength(entries.length);

          const originalIds = new Set(entries.map((e) => e.participantId));
          const sortedIds = new Set(sorted.map((e) => e.participantId));
          expect(sortedIds).toEqual(originalIds);
        },
      ),
      { numRuns: 200 },
    );
  });
});

describe('Property P16: Anonymous entries show "Anonymous" name', () => {
  // Feature: team-challenges, Property 16: Anonymous leaderboard entries

  it('anonymous entries display "Anonymous" as name', () => {
    fc.assert(
      fc.property(
        fc.array(leaderboardEntryArb, { minLength: 1, maxLength: 20 }),
        (entries) => {
          const sorted = sortChallengeLeaderboard(entries);
          const withAnonymity = applyAnonymity(sorted);

          for (const entry of withAnonymity) {
            if (entry.isAnonymous) {
              expect(entry.participantName).toBe('Anonymous');
            }
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  it('non-anonymous entries retain their original name', () => {
    fc.assert(
      fc.property(
        fc.array(leaderboardEntryArb, { minLength: 1, maxLength: 20 }),
        (entries) => {
          const sorted = sortChallengeLeaderboard(entries);
          const withAnonymity = applyAnonymity(sorted);

          for (let i = 0; i < withAnonymity.length; i++) {
            if (!withAnonymity[i]!.isAnonymous) {
              expect(withAnonymity[i]!.participantName).toBe(sorted[i]!.participantName);
            }
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  it('anonymity does not affect sort order or rank', () => {
    fc.assert(
      fc.property(
        fc.array(leaderboardEntryArb, { minLength: 1, maxLength: 20 }),
        (entries) => {
          const sorted = sortChallengeLeaderboard(entries);
          const withAnonymity = applyAnonymity(sorted);

          for (let i = 0; i < sorted.length; i++) {
            expect(withAnonymity[i]!.rank).toBe(sorted[i]!.rank);
            expect(withAnonymity[i]!.currentProgress).toBe(sorted[i]!.currentProgress);
            expect(withAnonymity[i]!.participantId).toBe(sorted[i]!.participantId);
          }
        },
      ),
      { numRuns: 200 },
    );
  });
});

describe('Property P17: Team leaderboard scoped to course, sorted by xp_total DESC', () => {
  // Feature: team-challenges, Property 17: Team leaderboard scope and sort

  it('only teams from the specified course are included', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        fc.array(
          fc.record({
            teamId: fc.uuid(),
            teamName: fc.string({ minLength: 1, maxLength: 20 }),
            courseId: fc.uuid(),
            xpTotal: fc.integer({ min: 0, max: 50000 }),
          }),
          { minLength: 1, maxLength: 20 },
        ),
        (targetCourse, otherCourse, teams) => {
          fc.pre(targetCourse !== otherCourse);

          // Mix teams from target and other courses
          const mixedTeams = teams.map((t, i) => ({
            ...t,
            courseId: i % 2 === 0 ? targetCourse : otherCourse,
          }));

          const leaderboard = buildTeamLeaderboard(mixedTeams, targetCourse);

          for (const entry of leaderboard) {
            expect(entry.courseId).toBe(targetCourse);
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  it('teams are sorted by xp_total descending', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.array(
          fc.record({
            teamId: fc.uuid(),
            teamName: fc.string({ minLength: 1, maxLength: 20 }),
            xpTotal: fc.integer({ min: 0, max: 50000 }),
          }),
          { minLength: 1, maxLength: 20 },
        ),
        (courseId, teams) => {
          const courseTeams = teams.map((t) => ({ ...t, courseId }));
          const leaderboard = buildTeamLeaderboard(courseTeams, courseId);

          for (let i = 1; i < leaderboard.length; i++) {
            expect(leaderboard[i]!.xpTotal).toBeLessThanOrEqual(leaderboard[i - 1]!.xpTotal);
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  it('ranks are sequential from 1 to N within the course', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.array(
          fc.record({
            teamId: fc.uuid(),
            teamName: fc.string({ minLength: 1, maxLength: 20 }),
            xpTotal: fc.integer({ min: 0, max: 50000 }),
          }),
          { minLength: 1, maxLength: 20 },
        ),
        (courseId, teams) => {
          const courseTeams = teams.map((t) => ({ ...t, courseId }));
          const leaderboard = buildTeamLeaderboard(courseTeams, courseId);

          for (let i = 0; i < leaderboard.length; i++) {
            expect(leaderboard[i]!.rank).toBe(i + 1);
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  it('empty course returns empty leaderboard', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        (targetCourse, otherCourse) => {
          fc.pre(targetCourse !== otherCourse);

          const teams = [
            { teamId: 'team1', teamName: 'Team 1', courseId: otherCourse, xpTotal: 1000 },
          ];

          const leaderboard = buildTeamLeaderboard(teams, targetCourse);
          expect(leaderboard).toHaveLength(0);
        },
      ),
      { numRuns: 100 },
    );
  });
});
