// Task 124.2: Cohen's d effect size utility

export interface CohortData {
  label: string;
  mean: number;
  stdDev: number;
  n: number;
}

/**
 * Calculate Cohen's d effect size between two cohorts.
 * Only valid when both cohorts have n ≥ 20.
 */
export const calculateCohensD = (cohort1: CohortData, cohort2: CohortData): number | null => {
  if (cohort1.n < 20 || cohort2.n < 20) return null;

  const pooledVariance =
    ((cohort1.n - 1) * cohort1.stdDev ** 2 + (cohort2.n - 1) * cohort2.stdDev ** 2) /
    (cohort1.n + cohort2.n - 2);

  const pooledStdDev = Math.sqrt(pooledVariance);
  if (pooledStdDev === 0) return 0;

  return (cohort1.mean - cohort2.mean) / pooledStdDev;
};

/**
 * Detect "Significant Gap" when ≥15 percentage point difference.
 */
export const hasSignificantGap = (mean1: number, mean2: number): boolean => {
  return Math.abs(mean1 - mean2) >= 15;
};

export const interpretCohensD = (d: number): string => {
  const abs = Math.abs(d);
  if (abs < 0.2) return 'Negligible';
  if (abs < 0.5) return 'Small';
  if (abs < 0.8) return 'Medium';
  return 'Large';
};
