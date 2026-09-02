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

  // ── E1.11 (platform hardening): totality over the continuous [0, 100]
  // domain — the legacy integer-adjacent scales left real gaps (e.g. 84.0–85.0)
  // unclassified, and the old fallback rendered a passing 84.2% as "F". ──
  it("maps fractional percents inside band coverage (84.2 → B, never F)", () => {
    expect(mapToLetterGrade(84.2)).toBe("B");
    expect(mapToLetterGrade(84.99)).toBe("B");
    expect(mapToLetterGrade(69.5)).toBe("C");
    expect(mapToLetterGrade(54.5)).toBe("D");
    expect(mapToLetterGrade(49.9)).toBe("F");
  });

  it("maps legacy gapped scales via the nearest LOWER band (E1.11 live-data regression)", () => {
    // Exact scale found in the live institution_settings rows at audit time.
    const legacy: GradeScale[] = [
      { letter: "A", min_percent: 85, max_percent: 100, gpa_points: 4.0 },
      { letter: "B", min_percent: 70, max_percent: 84, gpa_points: 3.0 },
      { letter: "C", min_percent: 55, max_percent: 69, gpa_points: 2.0 },
      { letter: "D", min_percent: 50, max_percent: 54, gpa_points: 1.0 },
      { letter: "F", min_percent: 0, max_percent: 49, gpa_points: 0.0 },
    ];
    // The QA case: Olivia at 84.2% must read "B", not "F".
    expect(mapToLetterGrade(84.2, legacy)).toBe("B");
    expect(mapToLetterGrade(69.5, legacy)).toBe("C");
    expect(mapToLetterGrade(54.5, legacy)).toBe("D");
    expect(mapToLetterGrade(49.5, legacy)).toBe("F");
    // Exact band points keep their historical letters.
    expect(mapToLetterGrade(84, legacy)).toBe("B");
    expect(mapToLetterGrade(85, legacy)).toBe("A");
  });

  it("clamps out-of-range percentages to the nearest band", () => {
    expect(mapToLetterGrade(105)).toBe("A");
    expect(mapToLetterGrade(-1)).toBe("F");
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

  it("maps gapped-scale percents to the nearest lower band's GPA (E1.11)", () => {
    expect(mapToGpaPoints(84.2)).toBe(3.0);
    expect(mapToGpaPoints(69.5)).toBe(2.0);
    expect(mapToGpaPoints(49.9)).toBe(0.0);
  });
});
