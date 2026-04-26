/**
 * Pure function to assign league tiers from XP percentiles.
 *
 * Tier distribution:
 * - Diamond: top 5% (percentile >= 95)
 * - Gold: top 20% (percentile >= 80)
 * - Silver: top 50% (percentile >= 50)
 * - Bronze: bottom 50% (percentile < 50)
 */

export type LeagueTier = 'bronze' | 'silver' | 'gold' | 'diamond';

export interface LeagueTierInput {
  studentXP: number;
  /** All student XP values in the cohort, sorted ascending */
  cohortXPValues: readonly number[];
}

export interface LeagueTierResult {
  tier: LeagueTier;
  percentile: number;
  rank: number;
  totalStudents: number;
}

export const computeLeagueTier = (input: LeagueTierInput): LeagueTierResult => {
  const { studentXP, cohortXPValues } = input;
  const totalStudents = cohortXPValues.length;

  if (totalStudents === 0) {
    return { tier: 'bronze', percentile: 0, rank: 1, totalStudents: 0 };
  }

  // Count how many students have XP less than this student
  const belowCount = cohortXPValues.filter((xp) => xp < studentXP).length;
  const percentile = Math.round((belowCount / totalStudents) * 100);

  // Rank: 1 = highest XP
  const aboveCount = cohortXPValues.filter((xp) => xp > studentXP).length;
  const rank = aboveCount + 1;

  const tier = assignTierFromPercentile(percentile);

  return { tier, percentile, rank, totalStudents };
};

export const assignTierFromPercentile = (percentile: number): LeagueTier => {
  if (percentile >= 95) return 'diamond';
  if (percentile >= 80) return 'gold';
  if (percentile >= 50) return 'silver';
  return 'bronze';
};

export interface PercentileBandResult {
  label: string;
  band: 'top5' | 'top10' | 'top25' | 'top50' | 'bottom50';
}

export const computePercentileBand = (percentile: number): PercentileBandResult => {
  if (percentile >= 95) return { label: 'Top 5%', band: 'top5' };
  if (percentile >= 90) return { label: 'Top 10%', band: 'top10' };
  if (percentile >= 75) return { label: 'Top 25%', band: 'top25' };
  if (percentile >= 50) return { label: 'Top 50%', band: 'top50' };
  return { label: 'Bottom 50%', band: 'bottom50' };
};
