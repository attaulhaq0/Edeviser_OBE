// gradeScaleRuntime.test.ts — Phase 16: Grade scales + Framework resolution
import { describe, it, expect } from "vitest";
import { normalizePercent, toReportingResult, type GradeScaleBand } from "@/lib/assessmentStrategyEngine";
import { mapToLetterGrade, mapToGpaPoints } from "@/lib/letterGradeMapper";

const AF: GradeScaleBand[] = [
  { letter: "A", min_percent: 85, max_percent: 100, gpa_points: 4.0 }, { letter: "B", min_percent: 70, max_percent: 85, gpa_points: 3.0 },
  { letter: "C", min_percent: 55, max_percent: 70, gpa_points: 2.0 }, { letter: "D", min_percent: 50, max_percent: 55, gpa_points: 1.0 },
  { letter: "F", min_percent: 0, max_percent: 50, gpa_points: 0.0 },
];
const IG: GradeScaleBand[] = [
  { letter: "9", min_percent: 90, max_percent: 100, gpa_points: 4.0 }, { letter: "8", min_percent: 80, max_percent: 90, gpa_points: 4.0 },
  { letter: "7", min_percent: 70, max_percent: 80, gpa_points: 3.7 }, { letter: "6", min_percent: 60, max_percent: 70, gpa_points: 3.3 },
  { letter: "5", min_percent: 50, max_percent: 60, gpa_points: 3.0 }, { letter: "4", min_percent: 40, max_percent: 50, gpa_points: 2.0 },
  { letter: "3", min_percent: 30, max_percent: 40, gpa_points: 0.0 }, { letter: "2", min_percent: 20, max_percent: 30, gpa_points: 0.0 },
  { letter: "1", min_percent: 0, max_percent: 20, gpa_points: 0.0 },
];

describe("Grade Scale Runtime", () => {
  it("same 78% → B (A-F), 7 (IGCSE)", () => {
    const r = normalizePercent({ score: 78, maxScore: 100 });
    expect(toReportingResult(r, AF).displayGrade).toBe("B");
    expect(toReportingResult(r, IG).displayGrade).toBe("7");
  });
  it("matches letterGradeMapper for all values", () => {
    for (let p = 0; p <= 100; p++) {
      const r = normalizePercent({ score: p, maxScore: 100 });
      expect(toReportingResult(r, AF).displayGrade).toBe(mapToLetterGrade(p, AF));
    }
  });
  it("matches gpaMapper", () => {
    for (let p = 0; p <= 100; p += 10) {
      const r = normalizePercent({ score: p, maxScore: 100 });
      expect(toReportingResult(r, IG).gpaPoints).toBe(mapToGpaPoints(p, IG));
    }
  });
});

describe("Framework → Strategy Resolution", () => {
  const resolve = (fw: string) => fw === "MYP" ? "criterion" as const : fw === "IGCSE" ? "band_grade" as const : "percent" as const;
  const resolveScale = (fw: string) => fw === "IGCSE" ? IG : AF;
  it("MYP → criterion", () => expect(resolve("MYP")).toBe("criterion"));
  it("IGCSE → band_grade", () => expect(resolve("IGCSE")).toBe("band_grade"));
  it("MOEHE → percent", () => expect(resolve("MOEHE")).toBe("percent"));
  it("same 75% → DIFFERENT grades across frameworks", () => {
    const r = normalizePercent({ score: 75, maxScore: 100 });
    expect(toReportingResult(r, resolveScale("MOEHE")).displayGrade).toBe("B");
    expect(toReportingResult(r, resolveScale("IGCSE")).displayGrade).toBe("7");
  });
});