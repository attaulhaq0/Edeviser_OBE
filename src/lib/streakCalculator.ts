// =============================================================================
// Streak Calculator — Pure functions for streak update logic
// =============================================================================

export interface StreakState {
  streak_count: number;
  last_login_date: string | null;
  streak_freezes_available: number;
}

export interface StreakResult {
  new_streak_count: number;
  streak_frozen: boolean;
  freeze_consumed: boolean;
  milestone_reached: number | null;
  should_reset: boolean;
  is_new_day: boolean;
}

export const STREAK_MILESTONES = [7, 14, 30, 60, 100] as const;

export const MILESTONE_XP: Record<number, number> = {
  7: 100,
  14: 100,
  30: 250,
  60: 250,
  100: 500,
};

/**
 * Calculate the number of calendar days between two YYYY-MM-DD date strings.
 * Returns the absolute difference in days.
 */
export function daysBetween(dateA: string, dateB: string): number {
  const a = new Date(dateA + 'T00:00:00Z');
  const b = new Date(dateB + 'T00:00:00Z');
  return Math.floor(Math.abs(a.getTime() - b.getTime()) / 86_400_000);
}

/**
 * Determine the streak milestone reached at a given streak count.
 * Returns the milestone number if the count exactly matches, otherwise null.
 */
export function checkMilestone(streakCount: number): number | null {
  return STREAK_MILESTONES.includes(streakCount as typeof STREAK_MILESTONES[number])
    ? streakCount
    : null;
}

/**
 * Calculate the streak update given the current state and today's UTC date.
 *
 * Rules:
 * - Same day login → no-op (is_new_day = false)
 * - Yesterday → increment streak by 1
 * - Missed exactly 1 day + freeze available → consume freeze, keep streak
 * - Missed >1 day or no freeze → reset streak to 1
 * - No existing record (null) → new streak of 1
 */
export function calculateStreakUpdate(
  current: StreakState | null,
  todayUTC: string,
): StreakResult {
  // No existing record — first login ever
  if (!current || !current.last_login_date) {
    return {
      new_streak_count: 1,
      streak_frozen: false,
      freeze_consumed: false,
      milestone_reached: null,
      should_reset: false,
      is_new_day: true,
    };
  }

  const dayDiff = daysBetween(current.last_login_date, todayUTC);

  // Same day — no-op
  if (dayDiff === 0) {
    return {
      new_streak_count: current.streak_count,
      streak_frozen: false,
      freeze_consumed: false,
      milestone_reached: null,
      should_reset: false,
      is_new_day: false,
    };
  }

  // Consecutive day (yesterday)
  if (dayDiff === 1) {
    const newCount = current.streak_count + 1;
    return {
      new_streak_count: newCount,
      streak_frozen: false,
      freeze_consumed: false,
      milestone_reached: checkMilestone(newCount),
      should_reset: false,
      is_new_day: true,
    };
  }

  // Missed exactly 1 day (dayDiff === 2) with freeze available
  if (dayDiff === 2 && current.streak_freezes_available > 0) {
    const newCount = current.streak_count + 1;
    return {
      new_streak_count: newCount,
      streak_frozen: true,
      freeze_consumed: true,
      milestone_reached: checkMilestone(newCount),
      should_reset: false,
      is_new_day: true,
    };
  }

  // Missed more than 1 day or no freeze → reset
  return {
    new_streak_count: 1,
    streak_frozen: false,
    freeze_consumed: false,
    milestone_reached: null,
    should_reset: true,
    is_new_day: true,
  };
}
