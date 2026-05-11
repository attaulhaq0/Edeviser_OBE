// Contribution accountability thresholds and status transition rules.
// Used by the daily contribution status cron job (01:00 UTC) to detect free-riding.

export type ContributionStatus = "active" | "warning" | "inactive";

/** Default minimum contribution threshold as a percentage of team weekly XP */
export const DEFAULT_CONTRIBUTION_THRESHOLD = 0.2;

/** Number of consecutive low-contribution days before transitioning to 'warning' */
export const WARNING_THRESHOLD_DAYS = 3;

/** Number of consecutive low-contribution days before transitioning to 'inactive' */
export const INACTIVE_THRESHOLD_DAYS = 5;

/**
 * Compute the contribution status based on consecutive low-contribution days.
 *
 * Status transition rules:
 * - 0–2 consecutive low days → 'active'
 * - 3–4 consecutive low days → 'warning'
 * - 5+ consecutive low days → 'inactive'
 * - When contribution rises back above threshold → 'active' (reset consecutive_low_days to 0)
 */
export function computeContributionStatus(
  consecutiveLowDays: number
): ContributionStatus {
  if (consecutiveLowDays >= INACTIVE_THRESHOLD_DAYS) {
    return "inactive";
  }
  if (consecutiveLowDays >= WARNING_THRESHOLD_DAYS) {
    return "warning";
  }
  return "active";
}

/**
 * Determine whether a member's contribution is below the threshold.
 *
 * @param memberXp - XP earned by the member in the evaluation period
 * @param teamTotalXp - Total XP earned by the team in the evaluation period
 * @param threshold - Minimum contribution percentage (default 20%)
 * @returns true if the member is below the threshold
 */
export function isBelowThreshold(
  memberXp: number,
  teamTotalXp: number,
  threshold: number = DEFAULT_CONTRIBUTION_THRESHOLD
): boolean {
  if (teamTotalXp <= 0) {
    // If the team earned no XP, no one is below threshold
    return false;
  }
  return memberXp / teamTotalXp < threshold;
}
