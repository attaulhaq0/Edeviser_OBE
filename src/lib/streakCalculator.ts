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
  const a = new Date(dateA + "T00:00:00Z");
  const b = new Date(dateB + "T00:00:00Z");
  return Math.floor(Math.abs(a.getTime() - b.getTime()) / 86_400_000);
}

/**
 * Determine the streak milestone reached at a given streak count.
 * Returns the milestone number if the count exactly matches, otherwise null.
 */
export function checkMilestone(streakCount: number): number | null {
  return STREAK_MILESTONES.includes(
    streakCount as (typeof STREAK_MILESTONES)[number]
  )
    ? streakCount
    : null;
}

// ─── Comeback Challenge Types ───────────────────────────────────────────────

export interface ComebackChallengeState {
  comeback_challenge_active: boolean;
  comeback_challenge_days_completed: number;
  comeback_challenge_streak_to_restore: number;
}

export interface ComebackChallengeResult {
  /** Whether the challenge is now active */
  active: boolean;
  /** Number of days completed (0-3) */
  days_completed: number;
  /** Streak value to restore on completion */
  streak_to_restore: number;
  /** Whether the challenge was just completed (3 days done) */
  just_completed: boolean;
  /** Whether the challenge was cancelled (missed a day) */
  just_cancelled: boolean;
}

/**
 * Calculate the streak value to restore after a Comeback Challenge.
 * Returns floor(lostStreak / 2) per Requirement 124.3.
 */
export function calculateStreakToRestore(lostStreak: number): number {
  return Math.floor(lostStreak / 2);
}

/**
 * Process Comeback Challenge state on daily login.
 *
 * Rules (Requirement 124):
 * - On streak break: activate challenge, set streak_to_restore = floor(lost_streak / 2)
 * - On daily login during active challenge with habits completed: increment days_completed
 * - On daily login during active challenge without habits completed: cancel challenge
 * - On 3 days completed: restore streak, deactivate challenge
 */
export function processComebackChallenge(
  challengeState: ComebackChallengeState,
  streakBroken: boolean,
  lostStreak: number,
  habitsCompletedToday: boolean
): ComebackChallengeResult {
  // Case 1: Streak just broke — activate a new challenge
  if (streakBroken && lostStreak > 1) {
    return {
      active: true,
      days_completed: 0,
      streak_to_restore: calculateStreakToRestore(lostStreak),
      just_completed: false,
      just_cancelled: false,
    };
  }

  // Case 2: Challenge is active — process daily progress
  if (challengeState.comeback_challenge_active) {
    if (habitsCompletedToday) {
      const newDaysCompleted =
        challengeState.comeback_challenge_days_completed + 1;

      // 3 days completed — challenge succeeded
      if (newDaysCompleted >= 3) {
        return {
          active: false,
          days_completed: 3,
          streak_to_restore:
            challengeState.comeback_challenge_streak_to_restore,
          just_completed: true,
          just_cancelled: false,
        };
      }

      // Still in progress
      return {
        active: true,
        days_completed: newDaysCompleted,
        streak_to_restore: challengeState.comeback_challenge_streak_to_restore,
        just_completed: false,
        just_cancelled: false,
      };
    }

    // Habits not completed — cancel challenge (Requirement 124.4)
    return {
      active: false,
      days_completed: 0,
      streak_to_restore: 0,
      just_completed: false,
      just_cancelled: true,
    };
  }

  // Case 3: No active challenge and no streak break — no change
  return {
    active: false,
    days_completed: 0,
    streak_to_restore: 0,
    just_completed: false,
    just_cancelled: false,
  };
}

/**
 * Check if a given date is a Streak Sabbatical rest day (Saturday or Sunday).
 * Returns false when sabbatical is not enabled.
 */
export function isStreakSabbaticalDay(
  sabbaticalEnabled: boolean,
  dateStr: string
): boolean {
  if (!sabbaticalEnabled) return false;
  const d = new Date(dateStr + "T00:00:00Z");
  const day = d.getUTCDay();
  return day === 0 || day === 6; // Sunday = 0, Saturday = 6
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
 * - When streakSabbaticalEnabled, weekend days in the gap are excluded from the day count
 */
export function calculateStreakUpdate(
  current: StreakState | null,
  todayUTC: string,
  streakSabbaticalEnabled = false
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

  // Streak Sabbatical: count weekend days in the gap and subtract them
  let effectiveDayDiff = dayDiff;
  if (streakSabbaticalEnabled && dayDiff > 1) {
    let weekendDaysInGap = 0;
    const gapStart = new Date(current.last_login_date + "T00:00:00Z");
    for (let i = 1; i < dayDiff; i++) {
      const checkDate = new Date(gapStart.getTime() + i * 86_400_000);
      const dow = checkDate.getUTCDay();
      if (dow === 0 || dow === 6) weekendDaysInGap++;
    }
    effectiveDayDiff = dayDiff - weekendDaysInGap;
  }

  // After sabbatical adjustment, check if effectively consecutive
  if (effectiveDayDiff <= 1) {
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

  // Missed exactly 1 effective day (effectiveDayDiff === 2) with freeze available
  if (effectiveDayDiff === 2 && current.streak_freezes_available > 0) {
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

  // Missed more than 1 effective day or no freeze → reset
  return {
    new_streak_count: 1,
    streak_frozen: false,
    freeze_consumed: false,
    milestone_reached: null,
    should_reset: true,
    is_new_day: true,
  };
}
