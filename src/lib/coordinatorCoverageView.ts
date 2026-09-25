/** Presentation admissibility, not a new academic coverage calculation. */
export const measuredPercent = (value: unknown): number | null =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  value >= 0 &&
  value <= 100
    ? value
    : null;

export interface CloMappingCoverage {
  totalClos: number;
  mappedClos: number;
  coveragePercent: number;
}

/** A zero denominator or inconsistent mapping counts are unknown, not measured 0%. */
export const measuredCloMappingCoverage = (
  coverage: CloMappingCoverage | null | undefined
): number | null => {
  if (
    !coverage ||
    !Number.isSafeInteger(coverage.totalClos) ||
    coverage.totalClos <= 0 ||
    !Number.isSafeInteger(coverage.mappedClos) ||
    coverage.mappedClos < 0 ||
    coverage.mappedClos > coverage.totalClos
  )
    return null;
  return measuredPercent(coverage.coveragePercent);
};
/** Evidence-coverage denominator is courses, never the independent pack items. */
export const measuredEvidenceCourseCoverage = (
  data:
    | {
        readonly readinessPercent: unknown;
        readonly courses: readonly unknown[];
      }
    | null
    | undefined
): number | null =>
  data && Array.isArray(data.courses) && data.courses.length > 0
    ? measuredPercent(data.readinessPercent)
    : null;
