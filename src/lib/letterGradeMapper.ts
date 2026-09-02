// =============================================================================
// letterGradeMapper — Maps percentage scores to letter grades using grade_scales
// =============================================================================

import type { GradeScale } from "@/types/app";
import { DEFAULT_GRADE_SCALES } from "@/types/app";

/**
 * Maps a percentage score to a letter grade using the institution's grade scale.
 * Grade scales are sorted by min_percent descending so the first match wins
 * (boundary points shared by two touching bands belong to the HIGHER band).
 * Falls back to DEFAULT_GRADE_SCALES when no scales are provided.
 *
 * E1.11 (platform hardening): legacy integer-adjacent scales (e.g. B 70–84,
 * A 85–100) leave real gaps (84.0–85.0) unclassified. A percent that matches no
 * band maps to the NEAREST LOWER band (84.2 → B), never to the previous
 * lowest-grade fallback that rendered a passing 84.2% as "F".
 */
export function mapToLetterGrade(
  percent: number,
  gradeScales: GradeScale[] = DEFAULT_GRADE_SCALES
): string {
  const scales = gradeScales.length > 0 ? gradeScales : DEFAULT_GRADE_SCALES;
  const sorted = [...scales].sort((a, b) => b.min_percent - a.min_percent);

  for (const scale of sorted) {
    if (percent >= scale.min_percent && percent <= scale.max_percent) {
      return scale.letter;
    }
  }

  // No exact band (gapped scale, or out-of-range percent): the first band in
  // descending order whose max is below the percent is the nearest LOWER
  // band; percents above every band map to the top band, below every band
  // to the lowest.
  for (const scale of sorted) {
    if (percent > scale.max_percent) {
      return scale.letter;
    }
  }
  const lowest = sorted[sorted.length - 1];
  return lowest?.letter ?? "F";
}

/**
 * Maps a percentage score to GPA points using the institution's grade scale.
 * E1.11: mirrors mapToLetterGrade's nearest-lower-band fallback so a gapped
 * scale can never produce "B" for the letter yet 0.0 for the GPA.
 */
export function mapToGpaPoints(
  percent: number,
  gradeScales: GradeScale[] = DEFAULT_GRADE_SCALES
): number {
  const scales = gradeScales.length > 0 ? gradeScales : DEFAULT_GRADE_SCALES;
  const sorted = [...scales].sort((a, b) => b.min_percent - a.min_percent);

  for (const scale of sorted) {
    if (percent >= scale.min_percent && percent <= scale.max_percent) {
      return scale.gpa_points;
    }
  }

  for (const scale of sorted) {
    if (percent > scale.max_percent) {
      return scale.gpa_points;
    }
  }
  const lowest = sorted[sorted.length - 1];
  return lowest?.gpa_points ?? 0;
}
