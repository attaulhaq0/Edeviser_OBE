import { describe, it, expect } from "vitest";
import { getAssessmentStrategy } from "../../../supabase/functions/_shared/ai/strategies/assessment-strategy";
import { selectInterventionPolicy } from "../../../supabase/functions/_shared/ai/strategies/intervention-strategy";
import { evaluateMeasurement } from "../../../supabase/functions/_shared/ai/strategies/intervention-contracts";
import { detectBehavioralPattern } from "../../../supabase/functions/_shared/ai/strategies/behavioral-correlation";

const T = { excellent: 85, satisfactory: 70, developing: 50 };

describe("IB MYP — Full Operational Chain", () => {
  const raw = {
    model: "criterion",
    totalRaw: 21,
    totalMax: 32,
    criteria: [
      { criterion: "A", level: 6, maxLevel: 8 },
      { criterion: "B", level: 5, maxLevel: 8 },
      { criterion: "C", level: 3, maxLevel: 8 },
      { criterion: "D", level: 7, maxLevel: 8 },
    ],
  };
  const s = getAssessmentStrategy("criterion");
  it("Assessment→Evidence: validates, 21/32=65.63%", () => {
    expect(s.validateRawScore(raw)).toEqual({ valid: true });
    expect(s.normalizeToPercent(raw as Record<string, unknown>)).toBe(65.63);
    expect(s.classifyAttainment(65.63, T)).toBe("Developing");
  });
  it("Signal→Intervention: criterion_targeted_remediation", () => {
    const p = selectInterventionPolicy({
      signalType: "criterion_gap",
      severity: "medium",
      confidence: 0.85,
      assessmentModel: "criterion",
      dimension: "C",
      evidenceRefs: ["ev-1"],
      observedFrom: "",
      observedTo: "",
      sampleSize: 8,
    });
    expect(p!.recommendedActions[0]).toBe("criterion_targeted_remediation");
  });
  it("Intervention→Measurement: C 3→5 = IMPROVED", () => {
    expect(evaluateMeasurement(3, 5, 1, 2)).toBe("improved");
  });
  it("Behavioral: submission+declining detected", () => {
    const habits = Array.from({ length: 12 }, (_, i) => ({
      habitType: i < 5 ? "submission_delay" : "study_session",
      observedAt: new Date(
        Date.now() - (12 - i) * 3 * 86_400_000
      ).toISOString(),
    }));
    const att = [
      {
        outcomeId: "c",
        percent: 78,
        observedAt: new Date(Date.now() - 40 * 86_400_000).toISOString(),
      },
      {
        outcomeId: "c",
        percent: 72,
        observedAt: new Date(Date.now() - 20 * 86_400_000).toISOString(),
      },
      {
        outcomeId: "c",
        percent: 63,
        observedAt: new Date(Date.now() - 7 * 86_400_000).toISOString(),
      },
    ];
    const bp = detectBehavioralPattern({
      habits,
      attainment: att,
      windowDays: 42,
      minObservations: 3,
      frameworkDimension: "IB_ATL_self_management",
    });
    expect(bp).not.toBeNull();
  });
});

describe("IGCSE — Full Operational Chain", () => {
  const raw = {
    model: "band_grade",
    objectives: [
      { objective: "AO1", marks: 42, maxMarks: 60, weight: 0.5 },
      { objective: "AO2", marks: 38, maxMarks: 60, weight: 0.3 },
      { objective: "AO3", marks: 18, maxMarks: 60, weight: 0.2 },
    ],
  };
  it("Assessment→Evidence: AO-weighted=60%", () => {
    const s = getAssessmentStrategy("band_grade");
    expect(s.validateRawScore(raw)).toEqual({ valid: true });
    expect(s.normalizeToPercent(raw as Record<string, unknown>)).toBe(60);
  });
  it("Signal→Intervention: ao_targeted_practice", () => {
    const p = selectInterventionPolicy({
      signalType: "assessment_objective_gap",
      severity: "high",
      confidence: 0.9,
      assessmentModel: "band_grade",
      dimension: "AO3",
      evidenceRefs: ["ev-2"],
      observedFrom: "",
      observedTo: "",
      sampleSize: 6,
    });
    expect(p!.recommendedActions[0]).toBe("ao_targeted_practice");
  });
  it("Measurement: AO3 30→48 = IMPROVED", () => {
    expect(evaluateMeasurement(30, 48, 5, 2)).toBe("improved");
  });
});

describe("QNSA — Full Operational Chain", () => {
  it("Assessment: 62%→Developing", () => {
    const s = getAssessmentStrategy("percent");
    expect(
      s.normalizeToPercent({ percentage: 62 } as Record<string, unknown>)
    ).toBe(62);
    expect(s.classifyAttainment(62, T)).toBe("Developing");
  });
  it("Signal→Intervention: outcome_improvement_action", () => {
    const p = selectInterventionPolicy({
      signalType: "low_attainment",
      severity: "medium",
      confidence: 0.8,
      assessmentModel: "percent",
      evidenceRefs: ["ev-3"],
      observedFrom: "",
      observedTo: "",
      sampleSize: 10,
      value: 62,
      threshold: 70,
    });
    expect(p!.recommendedActions[0]).toBe("outcome_improvement_action");
  });
  it("Measurement: 62→71 = IMPROVED", () => {
    expect(evaluateMeasurement(62, 71, 5, 3)).toBe("improved");
  });
});

describe("DIFFERENTIATION + Edge Cases", () => {
  it("IB→remediation, IGCSE→practice, QNSA→outcome_action", () => {
    const ib = selectInterventionPolicy({
      signalType: "criterion_gap",
      severity: "medium",
      confidence: 0.8,
      assessmentModel: "criterion",
      dimension: "C",
      evidenceRefs: ["e1"],
      observedFrom: "",
      observedTo: "",
      sampleSize: 5,
    })!.recommendedActions[0];
    const ig = selectInterventionPolicy({
      signalType: "assessment_objective_gap",
      severity: "high",
      confidence: 0.9,
      assessmentModel: "band_grade",
      dimension: "AO3",
      evidenceRefs: ["e2"],
      observedFrom: "",
      observedTo: "",
      sampleSize: 5,
    })!.recommendedActions[0];
    const qn = selectInterventionPolicy({
      signalType: "low_attainment",
      severity: "medium",
      confidence: 0.8,
      assessmentModel: "percent",
      evidenceRefs: ["e3"],
      observedFrom: "",
      observedTo: "",
      sampleSize: 5,
      value: 62,
      threshold: 70,
    })!.recommendedActions[0];
    expect(ib).toBe("criterion_targeted_remediation");
    expect(ig).toBe("ao_targeted_practice");
    expect(qn).toBe("outcome_improvement_action");
  });
  it("edge: declined, no_change, insufficient", () => {
    expect(evaluateMeasurement(5, 3, 1, 2)).toBe("declined");
    expect(evaluateMeasurement(62, 63, 5, 3)).toBe("no_material_change");
    expect(evaluateMeasurement(0, 0, 1, 0)).toBe("insufficient_evidence");
  });
});
