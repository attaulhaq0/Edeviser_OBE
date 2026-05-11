// =============================================================================
// Team Streak Calculator — Pure functions for team streak logic
// =============================================================================

import { daysBetween } from "@/lib/streakCalculator";

export interface TeamStreakState {
  streak_current: number;
  streak_longest: number;
  last_streak_date: string | null;
}

export interface TeamStreakResult {
  new_streak_current: number;
  new_streak_longest: number;
  is_new_day: boolean;
  streak_reset: boolean;
}

/**
 * Calculate team streak update.
 *
 * Rules:
 * - ALL members must have logged in on the same calendar day for streak to increment
 * - If any member misses a day, streak resets to 0
 * - Same day → no-op
 * - Consecutive day with all members logged in → increment
 * - Gap > 1 day → reset to 1 (if all logged in today) or 0
 */
export function calculateTeamStreakUpdate(
  current: TeamStreakState | null,
  todayUTC: string,
  allMembersLoggedIn: boolean
): TeamStreakResult {
  // No existing record
  if (!current || !current.last_streak_date) {
    if (allMembersLoggedIn) {
      return {
        new_streak_current: 1,
        new_streak_longest: Math.max(current?.streak_longest ?? 0, 1),
        is_new_day: true,
        streak_reset: false,
      };
    }
    return {
      new_streak_current: 0,
      new_streak_longest: current?.streak_longest ?? 0,
      is_new_day: true,
      streak_reset: false,
    };
  }

  const dayDiff = daysBetween(current.last_streak_date, todayUTC);

  // Same day — no-op
  if (dayDiff === 0) {
    return {
      new_streak_current: current.streak_current,
      new_streak_longest: current.streak_longest,
      is_new_day: false,
      streak_reset: false,
    };
  }

  // Not all members logged in — streak resets
  if (!allMembersLoggedIn) {
    return {
      new_streak_current: 0,
      new_streak_longest: current.streak_longest,
      is_new_day: true,
      streak_reset: current.streak_current > 0,
    };
  }

  // All members logged in
  if (dayDiff === 1) {
    // Consecutive day
    const newStreak = current.streak_current + 1;
    return {
      new_streak_current: newStreak,
      new_streak_longest: Math.max(current.streak_longest, newStreak),
      is_new_day: true,
      streak_reset: false,
    };
  }

  // Gap > 1 day — reset and start fresh
  return {
    new_streak_current: 1,
    new_streak_longest: current.streak_longest,
    is_new_day: true,
    streak_reset: current.streak_current > 0,
  };
}

// ─── Team Streak Milestones ──────────────────────────────────────────────────

export const TEAM_STREAK_MILESTONES: Record<number, number> = {
  7: 100,
  14: 250,
  30: 500,
};

export interface TeamStreakMilestoneResult {
  milestone_reached: number | null;
  xp_reward: number;
  badge_earned: boolean;
}

/**
 * Check if a team streak milestone was reached.
 * Returns the milestone details if the new streak count exactly matches a milestone.
 */
export function checkTeamStreakMilestone(
  newStreakCount: number
): TeamStreakMilestoneResult {
  const xp = TEAM_STREAK_MILESTONES[newStreakCount];
  if (xp !== undefined) {
    return {
      milestone_reached: newStreakCount,
      xp_reward: xp,
      badge_earned: true,
    };
  }
  return {
    milestone_reached: null,
    xp_reward: 0,
    badge_earned: false,
  };
}
