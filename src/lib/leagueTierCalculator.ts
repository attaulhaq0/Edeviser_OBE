// =============================================================================
// League Tier Calculator — Pure function
// Assigns league tiers from XP percentiles:
//   Diamond: top 5%, Gold: top 20%, Silver: top 50%, Bronze: bottom 50%
// =============================================================================

/**
 * League tier names (lowercase for DB storage).
 */
export type LeagueTier = "diamond" | "gold" | "silver" | "bronze";

export interface StudentXP {
  studentId: string;
  xpTotal: number;
}

export interface TierAssignment {
  studentId: string;
  xpTotal: number;
  tier: LeagueTier;
  /** Percentile rank (0 = highest XP, 1 = lowest XP) */
  percentileRank: number;
}

/**
 * Tier thresholds as percentile rank cutoffs.
 * PERCENT_RANK() returns 0 for the top student and approaches 1 for the lowest.
 */
const TIER_THRESHOLDS: ReadonlyArray<{
  maxPercentile: number;
  tier: LeagueTier;
}> = [
  { maxPercentile: 0.05, tier: "diamond" },
  { maxPercentile: 0.2, tier: "gold" },
  { maxPercentile: 0.5, tier: "silver" },
  { maxPercentile: 1.0, tier: "bronze" },
];

/**
 * Assign a league tier based on a percentile rank value.
 *
 * @param percentileRank - Value between 0 (top) and 1 (bottom), matching
 *   SQL PERCENT_RANK() semantics (0 = highest XP).
 */
export function assignTierFromPercentile(percentileRank: number): LeagueTier {
  const clamped = Math.max(0, Math.min(1, percentileRank));
  for (const { maxPercentile, tier } of TIER_THRESHOLDS) {
    if (clamped <= maxPercentile) return tier;
  }
  return "bronze";
}

/**
 * Compute PERCENT_RANK for a sorted array of students.
 * Students are ranked by XP descending. Ties share the same rank.
 *
 * PERCENT_RANK = (rank - 1) / (N - 1) where rank is 0-based dense rank.
 * For a single student, percentile rank is 0.
 */
function computePercentileRanks(
  students: StudentXP[]
): Array<{ studentId: string; xpTotal: number; percentileRank: number }> {
  if (students.length === 0) return [];

  const first = students[0];
  if (students.length === 1 && first) {
    return [
      { studentId: first.studentId, xpTotal: first.xpTotal, percentileRank: 0 },
    ];
  }

  // Sort descending by XP
  const sorted = [...students].sort((a, b) => b.xpTotal - a.xpTotal);
  const n = sorted.length;

  const result: Array<{
    studentId: string;
    xpTotal: number;
    percentileRank: number;
  }> = [];

  for (let i = 0; i < n; i++) {
    const current = sorted[i];
    if (!current) continue;

    // Find the first occurrence of this XP value (for tie handling)
    let rank = i;
    while (rank > 0) {
      const prev = sorted[rank - 1];
      if (!prev || prev.xpTotal !== current.xpTotal) break;
      rank--;
    }
    const percentileRank = rank / (n - 1);
    result.push({
      studentId: current.studentId,
      xpTotal: current.xpTotal,
      percentileRank,
    });
  }

  return result;
}

/**
 * Assign league tiers to all students based on their XP totals.
 *
 * - Diamond: top 5% (percentile rank ≤ 0.05)
 * - Gold: top 20% (percentile rank ≤ 0.20)
 * - Silver: top 50% (percentile rank ≤ 0.50)
 * - Bronze: bottom 50% (percentile rank > 0.50)
 *
 * Every student receives exactly one tier. Tier boundaries are non-overlapping
 * and exhaustive.
 */
export function assignLeagueTiers(students: StudentXP[]): TierAssignment[] {
  const ranked = computePercentileRanks(students);

  return ranked.map(({ studentId, xpTotal, percentileRank }) => ({
    studentId,
    xpTotal,
    tier: assignTierFromPercentile(percentileRank),
    percentileRank,
  }));
}
