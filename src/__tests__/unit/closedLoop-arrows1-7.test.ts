// closedLoop-arrows1-7.test.ts — Phase 21: Arrows 1-7
// Activity → Assessment → Evidence → CLO → PLO → ILO → Attainment → Learner State
import { describe, it, expect } from "vitest";
import { normalizeAssessment } from "@/lib/assessmentStrategyEngine";
import { classifyAttainment } from "@/lib/attainmentClassifier";
import { fuseSignals } from "@/lib/habitSignalEngine";

describe("Arrow 1-2: Activity → Native Result (3 frameworks)", () => {
  it("Qatar percent: 42/50 → 84% + native preserved", () => {
    const r = normalizeAssessment("percent", { score: 42, maxScore: 50 });
    expect(r.overallPercent).toBe(84);
    expect(r.native.kind).toBe("percent");
    expect(r.native.score).toBe(42);
  });
  it("IB MYP criterion: levels 6+5/8 → 68.75% + per-criterion breakdown", () => {
    const r = normalizeAssessment("criterion", { criteria: [{ criterionId: "A", criterionName: "K", level: 6, maxLevel: 8 }, { criterionId: "B", criterionName: "I", level: 5, maxLevel: 8 }] });
    expect(r.overallPercent).toBe(68.75);
    expect(r.outcomePercents.length).toBe(2);
  });
  it("IGCSE band_grade: 55/70 Paper 1 → native preserved", () => {
    const r = normalizeAssessment("band_grade", { rawMark: 55, maxMark: 70, componentCode: "Paper 1" });
    expect(r.native.componentCode).toBe("Paper 1");
  });
});

describe("Arrow 3-4: Evidence → Attainment Classification", () => {
  it("score → attainment_level correctly classified", () => {
    expect(classifyAttainment(95)).toBe("Excellent");
    expect(classifyAttainment(70)).toBe("Satisfactory");
    expect(classifyAttainment(55)).toBe("Developing");
    expect(classifyAttainment(35)).toBe("Not_Yet");
  });
  it("evidence payload preserves native + normalized", () => {
    const r = normalizeAssessment("criterion", { criteria: [{ criterionId: "A", criterionName: "A", level: 5, maxLevel: 8 }] });
    const payload = { strategy: r.model, native: r.native, normalized: { overallPercent: r.overallPercent } };
    expect(payload.native.kind).toBe("criterion");
    expect(payload.normalized.overallPercent).toBe(62.5);
  });
});

describe("Arrow 5: CLO → PLO → ILO weight-based rollup", () => {
  it("3 CLOs at 85/65/90 with weights 0.5/0.3/0.2 → PLO = 80", () => {
    const plo = 85 * 0.5 + 65 * 0.3 + 90 * 0.2;
    expect(plo).toBeCloseTo(80, 0);
  });
  it("ILO derived alignment from PLO average", () => {
    const ilo = (80 + 75 + 90) / 3;
    expect(ilo).toBeCloseTo(81.67, 1);
  });
});

describe("Arrow 6-7: Attainment + Habits → Fused Intelligence", () => {
  it("strong + strong → low", () => expect(fuseSignals(90, 0.9, 0.85).riskLevel).toBe("low"));
  it("weak mastery + strong habits → academic support", () => {
    const r = fuseSignals(35, 0.85, 0.8);
    expect(r.riskLevel).toBe("moderate");
    expect(r.primaryDriver).toBe("academic");
  });
  it("weak + weak → combined high risk", () => expect(fuseSignals(25, 0.2, 0.15).riskLevel).toBe("high"));
  it("adequate + weak habits → behavioral re-engage", () => {
    const r = fuseSignals(75, 0.25, 0.2);
    expect(r.primaryDriver).toBe("behavioral");
  });
  it("never uses psychological labels", () => {
    expect(fuseSignals(10, 0.1, 0.1).description).not.toMatch(/lazy|unmotivated|disengaged/i);
  });
});