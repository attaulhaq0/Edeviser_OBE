// =============================================================================
// letterGradeMapper — Maps percentage scores to letter grades using grade_scales
// =============================================================================

import type { GradeScale } from '@/types/app';
import { DEFAULT_GRADE_SCALES } from '@/types/app';

/**
 * Maps a percentage score to a letter grade using the institution's grade scale.
 * Grade scales are sorted by min_percent descending so the first match wins.
 * Falls back to DEFAULT_GRADE_SCALES when no scales are provided.
 */
export function mapToLetterGrade(
  percent: number,
  gradeScales: GradeScale[] = DEFAULT_GRADE_SCALES,
): string {
  const scales = gradeScales.length > 0 ? gradeScales : DEFAULT_GRADE_SCALES;
  const sorted = [...scales].sort((a, b) => b.min_percent - a.min_percent);

  for (const scale of sorted) {
    if (percent >= scale.min_percent && percent <= scale.max_percent) {
      return scale.letter;
    }
  }

  // If no match found (shouldn't happen with proper scales), return lowest grade
  const lowest = sorted[sorted.length - 1];
  return lowest?.letter ?? 'F';
}

/**
 * Maps a percentage score to GPA points using the institution's grade scale.
 */
export function mapToGpaPoints(
  percent: number,
  gradeScales: GradeScale[] = DEFAULT_GRADE_SCALES,
): number {
  const scales = gradeScales.length > 0 ? gradeScales : DEFAULT_GRADE_SCALES;
  const sorted = [...scales].sort((a, b) => b.min_percent - a.min_percent);

  for (const scale of sorted) {
    if (percent >= scale.min_percent && percent <= scale.max_percent) {
      return scale.gpa_points;
    }
  }

  const lowest = sorted[sorted.length - 1];
  return lowest?.gpa_points ?? 0;
}
