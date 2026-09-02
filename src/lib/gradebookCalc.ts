/**
 * Gradebook final-grade policy (QA hardening 2026-09, FAIL-04).
 *
 * Policy: a category with ZERO graded assessments is EXCLUDED from the final
 * weighted calculation (exclude-and-renormalize), never counted as 0%.
 * The weights of excluded categories are dropped from the denominator so a
 * student graded only in the categories that actually have graded work is
 * evaluated fairly against those categories' combined weight.
 *
 * Rationale: counting ungraded categories as zero produced misleading F
 * grades for students with no grades in configured-but-not-yet-assessed
 * categories (QA report GB-02/GB-03). If ALL categories are ungraded there
 * is nothing to compute — the final grade is null ("not yet gradable").
 *
 * Feature: QA hardening FAIL-04, Property 1: final percent equals the
 * weighted sum of graded categories divided by their combined weight.
 */
export interface GradebookWeightedCategory {
  readonly weight_percent: number;
  /** True when at least one assessment in this category has a graded score. */
  readonly hasGradedWork: boolean;
  /** Category subtotal in percent (0 when nothing is graded). */
  readonly subtotal_percent: number;
}

export interface FinalWeightedGradeResult {
  /** Final weighted percent; null when no category has graded work. */
  readonly finalPercent: number | null;
  /** Sum of weights actually included in the denominator. */
  readonly effectiveWeightTotal: number;
  /** Sum of weights excluded because the category had zero graded work. */
  readonly excludedWeightTotal: number;
}

export const computeFinalWeightedGrade = (
  categories: readonly GradebookWeightedCategory[]
): FinalWeightedGradeResult => {
  const totalWeight = categories.reduce(
    (sum, cat) => sum + cat.weight_percent,
    0
  );
  const gradedCategories = categories.filter((cat) => cat.hasGradedWork);
  const effectiveWeightTotal = gradedCategories.reduce(
    (sum, cat) => sum + cat.weight_percent,
    0
  );

  if (effectiveWeightTotal <= 0) {
    return {
      finalPercent: null,
      effectiveWeightTotal: 0,
      excludedWeightTotal: totalWeight,
    };
  }

  const weightedSum = gradedCategories.reduce(
    (sum, cat) => sum + (cat.subtotal_percent * cat.weight_percent) / 100,
    0
  );
  const finalPercent = (weightedSum / effectiveWeightTotal) * 100;

  return {
    finalPercent: Math.round(finalPercent * 100) / 100,
    effectiveWeightTotal,
    excludedWeightTotal: totalWeight - effectiveWeightTotal,
  };
};
