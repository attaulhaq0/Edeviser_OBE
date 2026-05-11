// =============================================================================
// Most Improved leaderboard utility (Task 147.2)
// Calculates improvement: (current_4_week_xp - previous_4_week_xp) / previous_4_week_xp * 100
// Excludes students with zero previous XP, returns top 20.
// Requirements: 130.1, 130.2, 130.3, 130.4
// =============================================================================

export interface MostImprovedEntry {
  student_id: string;
  student_name: string;
  current_4_week_xp: number;
  previous_4_week_xp: number;
  improvement_percent: number;
  xp_delta: number;
}

/**
 * Calculate improvement percentage.
 * Formula: (current - previous) / previous * 100
 * Returns null when previous XP is zero (excluded per Requirement 130.3).
 */
export function calculateImprovement(
  current4WeekXP: number,
  previous4WeekXP: number
): number | null {
  if (previous4WeekXP <= 0) return null;
  return ((current4WeekXP - previous4WeekXP) / previous4WeekXP) * 100;
}

/**
 * Rank students by improvement and return top 20.
 * Excludes students with zero or negative previous XP.
 */
export function rankMostImproved(
  entries: Array<{
    student_id: string;
    student_name: string;
    current_4_week_xp: number;
    previous_4_week_xp: number;
  }>
): MostImprovedEntry[] {
  return entries
    .map((e) => {
      const improvement = calculateImprovement(
        e.current_4_week_xp,
        e.previous_4_week_xp
      );
      if (improvement === null) return null;
      return {
        ...e,
        improvement_percent: Math.round(improvement * 100) / 100,
        xp_delta: e.current_4_week_xp - e.previous_4_week_xp,
      };
    })
    .filter((e): e is MostImprovedEntry => e !== null)
    .sort((a, b) => b.improvement_percent - a.improvement_percent)
    .slice(0, 20);
}
