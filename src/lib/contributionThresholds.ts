// =============================================================================
// Contribution Thresholds — Task 1.24
// Default threshold (20%), status transition rules
// =============================================================================

export type ContributionStatus = 'active' | 'warning' | 'inactive';

/** Default minimum contribution percentage (configurable per institution) */
export const DEFAULT_CONTRIBUTION_THRESHOLD = 20;

/** Number of consecutive days below threshold before transitioning to "warning" */
export const DAYS_TO_WARNING = 3;

/** Number of consecutive days below threshold before transitioning to "inactive" */
export const DAYS_TO_INACTIVE = 5;

/** Minimum consecutive active days required for "Team Player" badge eligibility */
export const TEAM_PLAYER_BADGE_DAYS = 14;

/**
 * Compute the contribution status based on consecutive low days.
 */
export function computeContributionStatus(consecutiveLowDays: number): ContributionStatus {
  if (consecutiveLowDays >= DAYS_TO_INACTIVE) return 'inactive';
  if (consecutiveLowDays >= DAYS_TO_WARNING) return 'warning';
  return 'active';
}

/**
 * Determine if a member's contribution percentage meets the threshold.
 *
 * @param memberXp - XP earned by the member in the last 7 days (course-scoped)
 * @param teamTotalXp - Total XP earned by all team members in the last 7 days
 * @param threshold - Contribution threshold percentage (default 20%)
 * @returns true if the member meets or exceeds the threshold
 */
export function meetsContributionThreshold(
  memberXp: number,
  teamTotalXp: number,
  threshold: number = DEFAULT_CONTRIBUTION_THRESHOLD,
): boolean {
  if (teamTotalXp <= 0) return true; // No team activity — no one is below threshold
  const contributionPercent = (memberXp / teamTotalXp) * 100;
  return contributionPercent >= threshold;
}

/**
 * Update contribution tracking for a single member.
 * Returns the new status and updated consecutive_low_days.
 */
export function updateContributionTracking(
  currentConsecutiveLowDays: number,
  meetsThreshold: boolean,
): { status: ContributionStatus; consecutiveLowDays: number } {
  if (meetsThreshold) {
    return { status: 'active', consecutiveLowDays: 0 };
  }

  const newConsecutiveLowDays = currentConsecutiveLowDays + 1;
  return {
    status: computeContributionStatus(newConsecutiveLowDays),
    consecutiveLowDays: newConsecutiveLowDays,
  };
}
