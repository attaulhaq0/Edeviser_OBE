import { describe, expect, it } from "vitest";
import {
  measuredPercent,
  measuredCloMappingCoverage,
  measuredEvidenceCourseCoverage,
} from "@/lib/coordinatorCoverageView";

describe("coordinator visual percentages never invent academic evidence", () => {
  it.each([0, 50, 100])("preserves a real bounded %s measurement", (value) => {
    expect(measuredPercent(value)).toBe(value);
  });
  it.each([
    null,
    undefined,
    "50",
    Number.NaN,
    Number.POSITIVE_INFINITY,
    -1,
    101,
  ])("rejects an absent or impossible displayed percent %s", (value) =>
    expect(measuredPercent(value)).toBeNull()
  );
  it("requires a configured CLO denominator without recomputing the reported value", () => {
    expect(
      measuredCloMappingCoverage({
        totalClos: 10,
        mappedClos: 5,
        coveragePercent: 50,
      })
    ).toBe(50);
    expect(
      measuredCloMappingCoverage({
        totalClos: 0,
        mappedClos: 0,
        coveragePercent: 0,
      })
    ).toBeNull();
    expect(
      measuredCloMappingCoverage({
        totalClos: 10,
        mappedClos: 11,
        coveragePercent: 100,
      })
    ).toBeNull();
    expect(
      measuredCloMappingCoverage({
        totalClos: 10,
        mappedClos: -1,
        coveragePercent: 0,
      })
    ).toBeNull();
    expect(measuredCloMappingCoverage(undefined)).toBeNull();
  });
  it("treats a missing/zero course denominator as unmeasured evidence readiness", () => {
    expect(measuredEvidenceCourseCoverage(null)).toBeNull();
    expect(
      measuredEvidenceCourseCoverage({ readinessPercent: 0, courses: [] })
    ).toBeNull();
    expect(
      measuredEvidenceCourseCoverage({
        readinessPercent: 0,
        courses: ["course"],
      })
    ).toBe(0);
    expect(
      measuredEvidenceCourseCoverage({
        readinessPercent: 50,
        courses: ["a", "b"],
      })
    ).toBe(50);
    expect(
      measuredEvidenceCourseCoverage({
        readinessPercent: 120,
        courses: ["course"],
      })
    ).toBeNull();
  });
});
