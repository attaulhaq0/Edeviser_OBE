// Task 6.3: Leaderboard minimum-cohort gate (pure business logic)
// Requirements: 6.1, 6.2, 6.2a, 6.4

/**
 * Discriminated result of the leaderboard gate.
 * - `locked`   → render the "unlocks when more students join" state; never award rank/medals.
 * - `unlocked` → render the ranked leaderboard.
 */
export type LeaderboardState = "locked" | "unlocked";

/**
 * Determines whether the leaderboard is locked or unlocked for a cohort.
 *
 * Rules (Requirement 6):
 * - WHILE there are no eligible (non-opted-out) students, the leaderboard is
 *   ALWAYS locked, regardless of the configured minimum (R6.2a). This also
 *   prevents a misconfigured `minCohort <= 0` from unlocking an empty cohort.
 * - WHILE the eligible count is below the configured minimum, it is locked (R6.1).
 * - WHEN the eligible count reaches or exceeds the configured minimum, it is
 *   unlocked (R6.2).
 * - The locked result is what guarantees no #1 position or medal is awarded (R6.4);
 *   that enforcement lives in the consuming UI, which must not render rankings
 *   while this function returns `"locked"`.
 *
 * This function is pure and total: it returns a defined `LeaderboardState` for
 * every finite numeric input. Non-finite inputs (NaN/Infinity) are treated
 * conservatively as locked, since an undetermined cohort size must never reveal
 * rankings.
 *
 * @param eligibleCount - Count of eligible (non-opted-out) students in the cohort.
 * @param minCohort - Configured minimum cohort size (from `institution_settings`).
 */
export function leaderboardState(
  eligibleCount: number,
  minCohort: number
): LeaderboardState {
  // Undetermined inputs must never unlock the leaderboard.
  if (!Number.isFinite(eligibleCount) || !Number.isFinite(minCohort)) {
    return "locked";
  }

  // R6.2a: zero (or negative) eligible students ⇒ always locked.
  if (eligibleCount <= 0) return "locked";

  // R6.1 / R6.2: gate on the configured minimum.
  return eligibleCount >= minCohort ? "unlocked" : "locked";
}
