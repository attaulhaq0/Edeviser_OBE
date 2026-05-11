// Feature: team-challenges, Property 15: Sort order
// Feature: team-challenges, Property 16: Anonymous entries
// Feature: team-challenges, Property 17: Team leaderboard sort and scope
// **Validates: Requirements 11.1, 11.3, 13.2, 13.3**

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

// ── Pure logic under test ────────────────────────────────────────────────────

interface LeaderboardEntry {
  participant_id: string;
  display_name: string;
  current_progress: number;
  completed_at: string | null;
  is_anonymous: boolean;
}

function sortLeaderboard(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  return [...entries].sort((a, b) => {
    if (b.current_progress !== a.current_progress)
      return b.current_progress - a.current_progress;
    if (a.completed_at && b.completed_at)
      return (
        new Date(a.completed_at).getTime() - new Date(b.completed_at).getTime()
      );
    if (a.completed_at) return -1;
    if (b.completed_at) return 1;
    return 0;
  });
}

function anonymizeEntry(entry: LeaderboardEntry): LeaderboardEntry {
  if (entry.is_anonymous) {
    return { ...entry, display_name: "Anonymous" };
  }
  return entry;
}

interface TeamLeaderboardEntry {
  team_id: string;
  team_name: string;
  course_id: string;
  xp_total: number;
}

function filterAndSortTeamLeaderboard(
  teams: TeamLeaderboardEntry[],
  courseId: string
): TeamLeaderboardEntry[] {
  return teams
    .filter((t) => t.course_id === courseId)
    .sort((a, b) => b.xp_total - a.xp_total);
}

// ── Generators ───────────────────────────────────────────────────────────────

const entryArb = fc.record({
  participant_id: fc.uuid(),
  display_name: fc.string({ minLength: 1, maxLength: 30 }),
  current_progress: fc.integer({ min: 0, max: 10000 }),
  completed_at: fc.oneof(
    fc
      .integer({ min: 1700000000000, max: 1800000000000 })
      .map((ms) => new Date(ms).toISOString()),
    fc.constant(null)
  ),
  is_anonymous: fc.boolean(),
});

const teamEntryArb = fc.record({
  team_id: fc.uuid(),
  team_name: fc.string({ minLength: 1, maxLength: 30 }),
  course_id: fc.uuid(),
  xp_total: fc.integer({ min: 0, max: 100000 }),
});

// ── Property Tests ───────────────────────────────────────────────────────────

describe("Property 15: Challenge leaderboard sort order", () => {
  it("entries are sorted by progress descending", () => {
    fc.assert(
      fc.property(
        fc.array(entryArb, { minLength: 2, maxLength: 20 }),
        (entries) => {
          const sorted = sortLeaderboard(entries);
          for (let i = 1; i < sorted.length; i++) {
            expect(sorted[i]!.current_progress).toBeLessThanOrEqual(
              sorted[i - 1]!.current_progress
            );
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("completed participants with same progress rank by earlier completion", () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        fc.integer({ min: 50, max: 500 }),
        (id1, id2, progress) => {
          const early: LeaderboardEntry = {
            participant_id: id1,
            display_name: "A",
            current_progress: progress,
            completed_at: "2025-01-01T00:00:00Z",
            is_anonymous: false,
          };
          const late: LeaderboardEntry = {
            participant_id: id2,
            display_name: "B",
            current_progress: progress,
            completed_at: "2025-01-02T00:00:00Z",
            is_anonymous: false,
          };
          const sorted = sortLeaderboard([late, early]);
          expect(sorted[0]!.participant_id).toBe(id1);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe("Property 16: Anonymous leaderboard entries", () => {
  it('anonymous participants display as "Anonymous"', () => {
    fc.assert(
      fc.property(entryArb, (entry) => {
        const anonymized = anonymizeEntry({ ...entry, is_anonymous: true });
        expect(anonymized.display_name).toBe("Anonymous");
      }),
      { numRuns: 100 }
    );
  });

  it("non-anonymous participants keep their name", () => {
    fc.assert(
      fc.property(entryArb, (entry) => {
        const result = anonymizeEntry({ ...entry, is_anonymous: false });
        expect(result.display_name).toBe(entry.display_name);
      }),
      { numRuns: 100 }
    );
  });
});

describe("Property 17: Team leaderboard sort and scope", () => {
  it("only teams from the specified course are included", () => {
    fc.assert(
      fc.property(
        fc.array(teamEntryArb, { minLength: 1, maxLength: 20 }),
        fc.uuid(),
        (teams, courseId) => {
          const result = filterAndSortTeamLeaderboard(teams, courseId);
          for (const t of result) {
            expect(t.course_id).toBe(courseId);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("teams are sorted by xp_total descending", () => {
    fc.assert(
      fc.property(
        fc.array(teamEntryArb, { minLength: 2, maxLength: 20 }),
        fc.uuid(),
        (teams, courseId) => {
          const withCourse = teams.map((t) => ({ ...t, course_id: courseId }));
          const result = filterAndSortTeamLeaderboard(withCourse, courseId);
          for (let i = 1; i < result.length; i++) {
            expect(result[i]!.xp_total).toBeLessThanOrEqual(
              result[i - 1]!.xp_total
            );
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
