// assessmentStrategyRuntime.test.ts — Phase 16: Strategy engine verification
import { describe, it, expect } from "vitest";
import { normalizePercent, normalizeCriterion, normalizeBandGrade, normalizeComponent, normalizeAssessment, toReportingResult, type GradeScaleBand } from "@/lib/assessmentStrategyEngine";

const IB: GradeScaleBand[] = [
  { letter: "7", min_percent: 88, max_percent: 100, gpa_points: 4.0 }, { letter: "6", min_percent: 75, max_percent: 88, gpa_points: 3.7 },
  { letter: "5", min_percent: 63, max_percent: 75, gpa_points: 3.3 }, { letter: "4", min_percent: 50, max_percent: 63, gpa_points: 3.0 },
  { letter: "3", min_percent: 38, max_percent: 50, gpa_points: 2.0 }, { letter: "2", min_percent: 25, max_percent: 38, gpa_points: 1.0 },
  { letter: "1", min_percent: 0, max_percent: 25, gpa_points: 0.0 },
];
const AF: GradeScaleBand[] = [
  { letter: "A", min_percent: 85, max_percent: 100, gpa_points: 4.0 }, { letter: "B", min_percent: 70, max_percent: 85, gpa_points: 3.0 },
  { letter: "C", min_percent: 55, max_percent: 70, gpa_points: 2.0 }, { letter: "D", min_percent: 50, max_percent: 55, gpa_points: 1.0 },
  { letter: "F", min_percent: 0, max_percent: 50, gpa_points: 0.0 },
];

describe("Percent", () => {
  it("85/100 → 85%", () => expect(normalizePercent({ score: 85, maxScore: 100 }).overallPercent).toBe(85));
  it("preserves native", () => { const r = normalizePercent({ score: 42, maxScore: 50 }); expect(r.native).toEqual({ kind: "percent", score: 42, maxScore: 50 }); });
  it("A for 90%", () => expect(toReportingResult(normalizePercent({ score: 90, maxScore: 100 }), AF).displayGrade).toBe("A"));
  it("B for 84%", () => expect(toReportingResult(normalizePercent({ score: 84, maxScore: 100 }), AF).displayGrade).toBe("B"));
});

describe("Criterion (IB MYP)", () => {
  const c = { criteria: [{ criterionId: "A", criterionName: "K", level: 6, maxLevel: 8 }, { criterionId: "B", criterionName: "I", level: 5, maxLevel: 8 }] };
  it("→ 68.75%", () => expect(normalizeCriterion(c).overallPercent).toBe(68.75));
  it("2 outcome percents", () => expect(normalizeCriterion(c).outcomePercents.length).toBe(2));
  it("grade 5 on IB scale", () => expect(toReportingResult(normalizeCriterion(c), IB).displayGrade).toBe("5"));
  it("all 8s → grade 7", () => { const p = { criteria: c.criteria.map((x) => ({ ...x, level: x.maxLevel })) }; expect(toReportingResult(normalizeCriterion(p), IB).displayGrade).toBe("7"); });
});

describe("Band Grade (IGCSE)", () => {
  it("65/80 → 81.25%", () => expect(normalizeBandGrade({ rawMark: 65, maxMark: 80 }).overallPercent).toBe(81.25));
  it("50% weight halves", () => expect(normalizeBandGrade({ rawMark: 65, maxMark: 80, weightingPercent: 50 }).overallPercent).toBe(40.63));
});

describe("Component (AO-Weighted)", () => {
  const c = { components: [{ componentId: "A1", componentName: "K", objectiveCode: "AO1", score: 45, maxScore: 50, weightPercent: 60 }, { componentId: "A2", componentName: "A", objectiveCode: "AO2", score: 30, maxScore: 50, weightPercent: 40 }] };
  it("→ 78%", () => expect(normalizeComponent(c).overallPercent).toBe(78));
  it("2 outcome percents", () => expect(normalizeComponent(c).outcomePercents.length).toBe(2));
});

describe("Cross-strategy: different results", () => {
  it("percent vs criterion different native", () => {
    const p = normalizePercent({ score: 42, maxScore: 50 });
    const c = normalizeCriterion({ criteria: [{ criterionId: "A", criterionName: "A", level: 4, maxLevel: 5 }] });
    expect(p.native.kind).not.toBe(c.native.kind);
  });
  it("same 75% → different grades", () => {
    const r = normalizePercent({ score: 75, maxScore: 100 });
    expect(toReportingResult(r, AF).displayGrade).toBe("B");
    expect(toReportingResult(r, IB).displayGrade).toBe("6");
  });
});

describe("normalizeAssessment routes correctly", () => {
  it("percent", () => expect(normalizeAssessment("percent", { score: 50, maxScore: 100 }).overallPercent).toBe(50));
  it("criterion", () => expect(normalizeAssessment("criterion", { criteria: [{ criterionId: "A", criterionName: "A", level: 4, maxLevel: 8 }] }).overallPercent).toBe(50));
  it("band_grade", () => expect(normalizeAssessment("band_grade", { rawMark: 30, maxMark: 60 }).overallPercent).toBe(50));
  it("throws unknown", () => expect(() => normalizeAssessment("unknown" as never, {})).toThrow());
});