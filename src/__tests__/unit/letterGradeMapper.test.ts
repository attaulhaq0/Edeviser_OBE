import { describe, it, expect } from "vitest";
import { mapToLetterGrade, mapToGpaPoints } from "@/lib/letterGradeMapper";
import type { GradeScale } from "@/types/app";

describe("mapToLetterGrade", () => {
  it("maps 90% to A with default scales", () => {
    expect(mapToLetterGrade(90)).toBe("A");
  });

  it("maps 85% to A (boundary)", () => {
    expect(mapToLetterGrade(85)).toBe("A");
  });

  it("maps 84% to B", () => {
    expect(mapToLetterGrade(84)).toBe("B");
  });

  it("maps 70% to B (boundary)", () => {
    expect(mapToLetterGrade(70)).toBe("B");
  });

  it("maps 55% to C", () => {
    expect(mapToLetterGrade(55)).toBe("C");
  });

  it("maps 50% to D", () => {
    expect(mapToLetterGrade(50)).toBe("D");
  });

  it("maps 49% to F", () => {
    expect(mapToLetterGrade(49)).toBe("F");
  });

  it("maps 0% to F", () => {
    expect(mapToLetterGrade(0)).toBe("F");
  });

  it("maps 100% to A", () => {
    expect(mapToLetterGrade(100)).toBe("A");
  });

  it("uses custom grade scales when provided", () => {
    const customScales: GradeScale[] = [
      { letter: "A+", min_percent: 95, max_percent: 100, gpa_points: 4.0 },
      { letter: "A", min_percent: 90, max_percent: 94, gpa_points: 3.7 },
      { letter: "B", min_percent: 80, max_percent: 89, gpa_points: 3.0 },
      { letter: "C", min_percent: 60, max_percent: 79, gpa_points: 2.0 },
      { letter: "F", min_percent: 0, max_percent: 59, gpa_points: 0.0 },
    ];

    expect(mapToLetterGrade(96, customScales)).toBe("A+");
    expect(mapToLetterGrade(92, customScales)).toBe("A");
    expect(mapToLetterGrade(85, customScales)).toBe("B");
    expect(mapToLetterGrade(65, customScales)).toBe("C");
    expect(mapToLetterGrade(30, customScales)).toBe("F");
  });

  it("falls back to DEFAULT_GRADE_SCALES when empty array provided", () => {
    expect(mapToLetterGrade(90, [])).toBe("A");
    expect(mapToLetterGrade(49, [])).toBe("F");
  });
});

describe("mapToGpaPoints", () => {
  it("maps A range to 4.0", () => {
    expect(mapToGpaPoints(90)).toBe(4.0);
  });

  it("maps B range to 3.0", () => {
    expect(mapToGpaPoints(75)).toBe(3.0);
  });

  it("maps C range to 2.0", () => {
    expect(mapToGpaPoints(60)).toBe(2.0);
  });

  it("maps D range to 1.0", () => {
    expect(mapToGpaPoints(52)).toBe(1.0);
  });

  it("maps F range to 0.0", () => {
    expect(mapToGpaPoints(30)).toBe(0.0);
  });

  it("uses custom scales", () => {
    const customScales: GradeScale[] = [
      { letter: "A", min_percent: 90, max_percent: 100, gpa_points: 4.0 },
      { letter: "F", min_percent: 0, max_percent: 89, gpa_points: 0.0 },
    ];
    expect(mapToGpaPoints(95, customScales)).toBe(4.0);
    expect(mapToGpaPoints(50, customScales)).toBe(0.0);
  });

  it("falls back to DEFAULT_GRADE_SCALES when empty array provided", () => {
    expect(mapToGpaPoints(90, [])).toBe(4.0);
  });
});
