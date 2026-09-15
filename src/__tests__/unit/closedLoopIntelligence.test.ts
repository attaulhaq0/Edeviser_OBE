import { describe, it, expect } from "vitest";
import { getAssessmentStrategy } from "../../../supabase/functions/_shared/ai/strategies/assessment-strategy";
import { detectBehavioralPattern } from "../../../supabase/functions/_shared/ai/strategies/behavioral-correlation";
import {
  selectInterventionPolicy,
  evaluateMeasurement,
} from "../../../supabase/functions/_shared/ai/strategies/intervention-strategy";
import type { LearnerSignal } from "../../../supabase/functions/_shared/ai/strategies/learner-signals";

const T = { excellent: 85, satisfactory: 70, developing: 50 };
const WINDOW = 42;

describe("Closed Loop — IB MYP Criterion C = 3/8", () => {
  const IB_RAW = {
    model: "criterion",
    criteria: [
      { criterion: "A", level: 6, maxLevel: 8 },
      { criterion: "B", level: 5, maxLevel: 8 },
      { criterion: "C", level: 3, maxLevel: 8 },
      { criterion: "D", level: 7, maxLevel: 8 },
    ],
    totalRaw: 21,
    totalMax: 32,
  };
  const s = getAssessmentStrategy("criterion");
  const pct = s.normalizeToPercent(IB_RAW as Record<string, unknown>);

  it("Step 1 — Assessment: C=3/8, 65.63%, Developing", () => {
    expect(s.validateRawScore(IB_RAW)).toEqual({ valid: true });
    expect(pct).toBe(65.63);
    expect(s.classifyAttainment(pct, T)).toBe("Developing");
    expect(IB_RAW.criteria.find((c) => c.criterion === "C")!.level).toBe(3);
  });

  it("Step 2 — Learner signal: criterion_gap on C", () => {
    const signal: LearnerSignal = {
      signalType: "criterion_gap",
      severity: "medium",
      confidence: 0.85,
      assessmentModel: "criterion",
      dimension: "C",
      evidenceRefs: ["ev-1"],
      observedFrom: "2026-01-01",
      observedTo: "2026-02-12",
      sampleSize: 8,
      value: 3,
      threshold: 5,
      trend: "declining",
    };
    expect(signal.dimension).toBe("C");
    expect(signal.signalType).toBe("criterion_gap");
  });

  it("Step 3 — Behavioral: submission delay + declining attainment detected", () => {
    const habits = Array.from({ length: 12 }, (_, i) => ({
      habitType: i < 5 ? "submission_delay" : "study_session",
      observedAt: new Date(
        Date.now() - (12 - i) * 3 * 86_400_000
      ).toISOString(),
    }));
    const attainment = [
      {
        outcomeId: "clo-c",
        percent: 78,
        observedAt: new Date(Date.now() - 40 * 86_400_000).toISOString(),
      },
      {
        outcomeId: "clo-c",
        percent: 72,
        observedAt: new Date(Date.now() - 28 * 86_400_000).toISOString(),
      },
      {
        outcomeId: "clo-c",
        percent: 68,
        observedAt: new Date(Date.now() - 14 * 86_400_000).toISOString(),
      },
      {
        outcomeId: "clo-c",
        percent: 65,
        observedAt: new Date(Date.now() - 7 * 86_400_000).toISOString(),
      },
    ];
    const pattern = detectBehavioralPattern({
      habits,
      attainment,
      windowDays: WINDOW,
      minObservations: 3,
      frameworkDimension: "IB_ATL_self_management",
    });
    expect(pattern).not.toBeNull();
    expect(pattern!.patternType).toContain("submission");
  });

  it("Step 4 — Intervention: criterion_targeted_remediation", () => {
    const policy = selectInterventionPolicy({
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
    expect(policy!.recommendedActions).toContain(
      "criterion_targeted_remediation"
    );
    expect(policy!.reassessmentRequired).toBe(true);
  });

  it("Step 5 — Measurement: C improved 3→5", () => {
    expect(
      evaluateMeasurement({
        beforeValue: 3,
        afterValue: 5,
        sampleSize: 2,
        minImprovement: 1,
      })
    ).toBe("improved");
  });
});
describe("Closed Loop — IGCSE AO3 weak", () => {
  const IGCSE_RAW = {
    model: "band_grade",
    objectives: [
      { objective: "AO1", marks: 42, maxMarks: 60, weight: 0.5 },
      { objective: "AO2", marks: 38, maxMarks: 60, weight: 0.3 },
      { objective: "AO3", marks: 18, maxMarks: 60, weight: 0.2 },
    ],
  };
  it("AO3 30%→ao_targeted_practice→improved to 48%", () => {
    const pct = getAssessmentStrategy("band_grade").normalizeToPercent(
      IGCSE_RAW as Record<string, unknown>
    );
    expect(pct).toBe(60);
    const policy = selectInterventionPolicy({
      signalType: "assessment_objective_gap",
      severity: "high",
      confidence: 0.9,
      assessmentModel: "band_grade",
      dimension: "AO3",
      evidenceRefs: ["ev-2"],
      observedFrom: "",
      observedTo: "",
      sampleSize: 6,
      trend: "declining",
    });
    expect(policy!.recommendedActions).toContain("ao_targeted_practice");
    expect(
      evaluateMeasurement({
        beforeValue: 30,
        afterValue: 48,
        sampleSize: 2,
        minImprovement: 5,
      })
    ).toBe("improved");
  });
});

describe("Closed Loop — QNSA outcome below threshold", () => {
  it("62% below 70%→outcome_improvement_action→71% improved", () => {
    const pct = getAssessmentStrategy("percent").normalizeToPercent({
      percentage: 62,
    } as Record<string, unknown>);
    expect(pct).toBe(62);
    const policy = selectInterventionPolicy({
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
    expect(policy!.recommendedActions).toContain("outcome_improvement_action");
    expect(
      evaluateMeasurement({
        beforeValue: 62,
        afterValue: 71,
        sampleSize: 3,
        minImprovement: 5,
      })
    ).toBe("improved");
  });
});

describe("DIFFERENTIATION — same pattern, different frameworks", () => {
  it("IB→criterion_targeted, IGCSE→ao_targeted, QNSA→outcome_action", () => {
    expect(
      selectInterventionPolicy({
        signalType: "criterion_gap",
        severity: "medium",
        confidence: 0.8,
        assessmentModel: "criterion",
        dimension: "C",
        evidenceRefs: ["e1"],
        observedFrom: "",
        observedTo: "",
        sampleSize: 5,
      })!.recommendedActions[0]
    ).toBe("criterion_targeted_remediation");

    expect(
      selectInterventionPolicy({
        signalType: "assessment_objective_gap",
        severity: "high",
        confidence: 0.9,
        assessmentModel: "band_grade",
        dimension: "AO3",
        evidenceRefs: ["e2"],
        observedFrom: "",
        observedTo: "",
        sampleSize: 5,
        trend: "declining",
      })!.recommendedActions[0]
    ).toBe("ao_targeted_practice");

    expect(
      selectInterventionPolicy({
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
      })!.recommendedActions[0]
    ).toBe("outcome_improvement_action");
  });
});
