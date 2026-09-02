// =============================================================================
// gradebookCalc — exclude-and-renormalize final-grade policy (QA FAIL-04)
//
// Feature: qa-hardening-2026-09, FAIL-04
// Policy: categories with ZERO graded assessments are excluded from the final
// weighted calculation — never counted as 0%. The weights of excluded
// categories are removed from the denominator (renormalize), so a student
// graded in only some categories is evaluated against those categories'
// combined weight. When no category has graded work, the final grade is
// null ("not yet gradable").
// =============================================================================

import { describe, it, expect } from "vitest";
import { computeFinalWeightedGrade } from "@/lib/gradebookCalc";

describe("computeFinalWeightedGrade — exclude-and-renormalize policy", () => {
  it("returns a null final when nothing at all is graded (all categories excluded)", () => {
    const result = computeFinalWeightedGrade([
      { weight_percent: 20, hasGradedWork: false, subtotal_percent: 0 },
      { weight_percent: 30, hasGradedWork: false, subtotal_percent: 0 },
      { weight_percent: 50, hasGradedWork: false, subtotal_percent: 0 },
    ]);
    expect(result.finalPercent).toBeNull();
    expect(result.effectiveWeightTotal).toBe(0);
    expect(result.excludedWeightTotal).toBe(100);
  });

  it("returns a null final for an empty category list", () => {
    const result = computeFinalWeightedGrade([]);
    expect(result.finalPercent).toBeNull();
    expect(result.effectiveWeightTotal).toBe(0);
    expect(result.excludedWeightTotal).toBe(0);
  });

  it("renormalizes a single graded category — QA 88.3% case (not 17.7%)", () => {
    // QA FAIL-04 scenario: only the Quizzes category (weight 20%) is graded,
    // with an 88.3% subtotal. The old behavior computed 88.3 × 20% = 17.7% → F.
    // Exclude-and-renormalize: the final IS 88.3%.
    const result = computeFinalWeightedGrade([
      { weight_percent: 20, hasGradedWork: true, subtotal_percent: 88.3 },
      { weight_percent: 30, hasGradedWork: false, subtotal_percent: 0 },
      { weight_percent: 50, hasGradedWork: false, subtotal_percent: 0 },
    ]);
    expect(result.finalPercent).toBe(88.3);
    expect(result.effectiveWeightTotal).toBe(20);
    expect(result.excludedWeightTotal).toBe(80);
  });

  it("renormalizes across a subset of graded categories", () => {
    // Two graded (40% @ 70, 10% @ 90) → (70×40 + 90×10) / 50 = (2800 + 900) / 50 = 74
    const result = computeFinalWeightedGrade([
      { weight_percent: 40, hasGradedWork: true, subtotal_percent: 70 },
      { weight_percent: 10, hasGradedWork: true, subtotal_percent: 90 },
      { weight_percent: 50, hasGradedWork: false, subtotal_percent: 0 },
    ]);
    expect(result.finalPercent).toBe(74);
    expect(result.effectiveWeightTotal).toBe(50);
    expect(result.excludedWeightTotal).toBe(50);
  });

  it("matches the plain weighted average when every category is graded", () => {
    const result = computeFinalWeightedGrade([
      { weight_percent: 60, hasGradedWork: true, subtotal_percent: 80 },
      { weight_percent: 40, hasGradedWork: true, subtotal_percent: 90 },
    ]);
    expect(result.finalPercent).toBe(84);
    expect(result.effectiveWeightTotal).toBe(100);
    expect(result.excludedWeightTotal).toBe(0);
  });
});
