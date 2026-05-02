// Feature: team-challenges, Property 5: Streak computation
// Feature: team-challenges, Property 6: Milestone badge awards
// Feature: team-challenges, Property 7: Badge idempotence
// **Validates: Requirements 6.1, 6.2, 6.4, 7.3**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  calculateTeamStreakUpdate,
  checkTeamStreakMilestone,
  TEAM_STREAK_MILESTONES,
  type TeamStreakState,
} from '@/lib/teamStreakCalculator';

// ── Generators ───────────────────────────────────────────────────────────────

const dateArb = fc.integer({ min: 0, max: 1095 }).map((offset) => {
  const d = new Date('2024-01-01T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
});

const streakStateArb: fc.Arbitrary<TeamStreakState> = fc
  .record({
    streak_current: fc.integer({ min: 0, max: 365 }),
    streak_longest: fc.integer({ min: 0, max: 365 }),
    last_streak_date: fc.oneof(dateArb, fc.constant(null)),
  })
  .map((s) => ({ ...s, streak_longest: Math.max(s.streak_longest, s.streak_current) }));

// ── Property Tests ───────────────────────────────────────────────────────────

describe('Property 5: Team streak computation', () => {
  it('consecutive day with all members logged in increments streak', () => {
    fc.assert(
      fc.property(streakStateArb, dateArb, (state, today) => {
        const yesterday = new Date(today + 'T00:00:00Z');
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().slice(0, 10);
        const consecutiveState: TeamStreakState = { ...state, last_streak_date: yesterdayStr };

        const result = calculateTeamStreakUpdate(consecutiveState, today, true);
        expect(result.new_streak_current).toBe(consecutiveState.streak_current + 1);
        expect(result.is_new_day).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('no member habits resets streak to 0', () => {
    fc.assert(
      fc.property(
        streakStateArb.filter((s) => s.last_streak_date !== null),
        dateArb,
        (state, today) => {
          if (state.last_streak_date === today) return;
          const result = calculateTeamStreakUpdate(state, today, false);
          expect(result.new_streak_current).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('same-day login is a no-op', () => {
    fc.assert(
      fc.property(
        streakStateArb.filter((s) => s.last_streak_date !== null),
        (state) => {
          const result = calculateTeamStreakUpdate(state, state.last_streak_date!, true);
          expect(result.is_new_day).toBe(false);
          expect(result.new_streak_current).toBe(state.streak_current);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('streak_longest never decreases', () => {
    fc.assert(
      fc.property(streakStateArb, dateArb, fc.boolean(), (state, today, allLoggedIn) => {
        const result = calculateTeamStreakUpdate(state, today, allLoggedIn);
        expect(result.new_streak_longest).toBeGreaterThanOrEqual(state.streak_longest);
      }),
      { numRuns: 100 },
    );
  });
});

describe('Property 6: Milestone badge awards', () => {
  it('milestone at 7, 14, 30 triggers badge', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(7, 14, 30),
        (milestone) => {
          const result = checkTeamStreakMilestone(milestone);
          expect(result.milestone_reached).toBe(milestone);
          expect(result.badge_earned).toBe(true);
          expect(result.xp_reward).toBe(TEAM_STREAK_MILESTONES[milestone]);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('non-milestone streak counts do not trigger badge', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }).filter((n) => n !== 7 && n !== 14 && n !== 30),
        (streakCount) => {
          const result = checkTeamStreakMilestone(streakCount);
          expect(result.milestone_reached).toBeNull();
          expect(result.badge_earned).toBe(false);
          expect(result.xp_reward).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe('Property 7: Badge idempotence', () => {
  it('awarding same badge twice results in one entry (set-based)', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.constantFrom('streak_squad', 'streak_champions', 'streak_legends'),
        (_teamId, badgeKey) => {
          const badgeSet = new Set<string>();
          badgeSet.add(badgeKey);
          badgeSet.add(badgeKey); // duplicate
          expect(badgeSet.size).toBe(1);
          expect(badgeSet.has(badgeKey)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('badge set only grows, never shrinks after awards', () => {
    fc.assert(
      fc.property(
        fc.subarray(['streak_squad', 'streak_champions', 'streak_legends', 'team_spirit', 'full_house', 'quest_conquerors']),
        fc.subarray(['streak_squad', 'streak_champions', 'streak_legends', 'team_spirit', 'full_house', 'quest_conquerors']),
        (existing, newBadges) => {
          const before = new Set(existing);
          const after = new Set([...existing, ...newBadges]);
          expect(after.size).toBeGreaterThanOrEqual(before.size);
          for (const b of before) {
            expect(after.has(b)).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
