// =============================================================================
// Property 103: Team leaderboard ordering and completeness
// Feature: edeviser-platform
// Validates: Requirements 117.1, 117.2
//
// For any team leaderboard query within a course, all teams in that course
// should be present, ordered by team XP descending (weekly or all-time).
// Each entry should include: rank, team name, avatar letter, member count,
// total XP, and weekly XP.
// =============================================================================

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// ─── Types mirroring the hook ────────────────────────────────────────────────

interface TeamLeaderboardEntry {
  team_id: string;
  team_name: string;
  avatar_letter: string;
  member_count: number;
  xp_total: number;
  xp_this_week: number;
  rank: number;
}

interface RawTeam {
  id: string;
  name: string;
  avatar_letter: string;
}

interface RawGamification {
  team_id: string;
  xp_total: number;
  xp_this_week: number;
}

type ViewMode = 'weekly' | 'all_time';

// ─── Pure logic under test (mirrors useTeamLeaderboard queryFn) ──────────────

function buildTeamLeaderboard(
  teams: RawTeam[],
  gamData: RawGamification[],
  memberCounts: Map<string, number>,
  view: ViewMode,
): TeamLeaderboardEntry[] {
  const gamMap = new Map(gamData.map((g) => [g.team_id, g]));

  const entries: TeamLeaderboardEntry[] = teams.map((t) => {
    const gam = gamMap.get(t.id);
    return {
      team_id: t.id,
      team_name: t.name,
      avatar_letter: t.avatar_letter,
      member_count: memberCounts.get(t.id) ?? 0,
      xp_total: gam?.xp_total ?? 0,
      xp_this_week: gam?.xp_this_week ?? 0,
      rank: 0,
    };
  });

  const sortKey = view === 'weekly' ? 'xp_this_week' : 'xp_total';
  entries.sort((a, b) => b[sortKey] - a[sortKey]);
  entries.forEach((e, i) => (e.rank = i + 1));

  return entries;
}

// ─── Generators ──────────────────────────────────────────────────────────────

const teamArb = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 30 }),
  avatar_letter: fc.string({ minLength: 1, maxLength: 1 }),
});

const gamArb = (teamId: string) =>
  fc.record({
    team_id: fc.constant(teamId),
    xp_total: fc.integer({ min: 0, max: 100_000 }),
    xp_this_week: fc.integer({ min: 0, max: 50_000 }),
  });

const viewArb = fc.constantFrom<ViewMode>('weekly', 'all_time');

// Generate a consistent set of teams with gamification data
const teamsWithDataArb = fc
  .array(teamArb, { minLength: 1, maxLength: 20 })
  .chain((teams) => {
    // Ensure unique IDs
    const uniqueTeams = teams.filter(
      (t, i, arr) => arr.findIndex((x) => x.id === t.id) === i,
    );
    if (uniqueTeams.length === 0) return fc.constant({ teams: [], gamData: [], memberCounts: new Map<string, number>() });

    const gamArbs = uniqueTeams.map((t) => gamArb(t.id));
    const memberCountArbs = uniqueTeams.map((t) =>
      fc.integer({ min: 2, max: 6 }).map((count) => [t.id, count] as const),
    );

    return fc.tuple(fc.tuple(...gamArbs), fc.tuple(...memberCountArbs)).map(
      ([gams, counts]) => ({
        teams: uniqueTeams,
        gamData: gams,
        memberCounts: new Map(counts),
      }),
    );
  });

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Property 103: Team leaderboard ordering and completeness', () => {
  /**
   * **Validates: Requirements 117.1**
   * All teams in the course are present in the leaderboard
   */
  it('all teams are present in the leaderboard', () => {
    fc.assert(
      fc.property(teamsWithDataArb, viewArb, ({ teams, gamData, memberCounts }, view) => {
        const result = buildTeamLeaderboard(teams, gamData, memberCounts, view);
        expect(result.length).toBe(teams.length);

        const resultIds = new Set(result.map((e) => e.team_id));
        for (const team of teams) {
          expect(resultIds.has(team.id)).toBe(true);
        }
      }),
      { numRuns: 200 },
    );
  });

  /**
   * **Validates: Requirements 117.1**
   * Teams are ordered by XP descending (weekly or all-time)
   */
  it('teams are ordered by XP descending for the selected view', () => {
    fc.assert(
      fc.property(teamsWithDataArb, viewArb, ({ teams, gamData, memberCounts }, view) => {
        const result = buildTeamLeaderboard(teams, gamData, memberCounts, view);
        const sortKey = view === 'weekly' ? 'xp_this_week' : 'xp_total';

        for (let i = 1; i < result.length; i++) {
          expect(result[i]![sortKey]).toBeLessThanOrEqual(result[i - 1]![sortKey]);
        }
      }),
      { numRuns: 200 },
    );
  });

  /**
   * **Validates: Requirements 117.2**
   * Each entry includes all required fields
   */
  it('each entry has rank, team_name, avatar_letter, member_count, xp_total, xp_this_week', () => {
    fc.assert(
      fc.property(teamsWithDataArb, viewArb, ({ teams, gamData, memberCounts }, view) => {
        const result = buildTeamLeaderboard(teams, gamData, memberCounts, view);

        for (const entry of result) {
          expect(typeof entry.rank).toBe('number');
          expect(entry.rank).toBeGreaterThanOrEqual(1);
          expect(typeof entry.team_name).toBe('string');
          expect(typeof entry.avatar_letter).toBe('string');
          expect(typeof entry.member_count).toBe('number');
          expect(entry.member_count).toBeGreaterThanOrEqual(0);
          expect(typeof entry.xp_total).toBe('number');
          expect(entry.xp_total).toBeGreaterThanOrEqual(0);
          expect(typeof entry.xp_this_week).toBe('number');
          expect(entry.xp_this_week).toBeGreaterThanOrEqual(0);
        }
      }),
      { numRuns: 200 },
    );
  });

  /**
   * **Validates: Requirements 117.1**
   * Ranks are sequential starting from 1
   */
  it('ranks are sequential from 1 to N', () => {
    fc.assert(
      fc.property(teamsWithDataArb, viewArb, ({ teams, gamData, memberCounts }, view) => {
        const result = buildTeamLeaderboard(teams, gamData, memberCounts, view);

        for (let i = 0; i < result.length; i++) {
          expect(result[i]!.rank).toBe(i + 1);
        }
      }),
      { numRuns: 200 },
    );
  });
});
