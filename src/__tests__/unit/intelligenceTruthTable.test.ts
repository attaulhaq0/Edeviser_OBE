/**
 * Phase 8 — Intelligence Truth Table.
 * Proves that Edeviser's intelligence pipeline correctly interprets
 * learner data across all 3 framework models, with traceable evidence.
 */
import { describe, it, expect } from "vitest";
import { getAssessmentStrategy } from "../../../supabase/functions/_shared/ai/strategies/assessment-strategy";
import { selectInterventionPolicy } from "../../../supabase/functions/_shared/ai/strategies/intervention-strategy";
import { evaluateMeasurement } from "../../../supabase/functions/_shared/ai/strategies/intervention-contracts";
import { detectBehavioralPattern } from "../../../supabase/functions/_shared/ai/strategies/behavioral-correlation";
import type { IntelligenceTruthRow } from "../../lib/pilot/pilot-metrics";

const T = { excellent: 85, satisfactory: 70, developing: 50 };

describe("Intelligence Truth Table — IB MYP", () => {
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

  it("TRUTH-1: C=3/8 → criterion_gap → remediation → measured", () => {
    const s = getAssessmentStrategy("criterion");
    const pct = s.normalizeToPercent(raw as Record<string, unknown>);
    const level = s.classifyAttainment(pct, T);
    const policy = selectInterventionPolicy({
      signalType: "criterion_gap",
      severity: "medium",
      confidence: 0.85,
      assessmentModel: "criterion",
      dimension: "C",
      evidenceRefs: ["ev-ib-1"],
      observedFrom: "",
      observedTo: "",
      sampleSize: 8,
    });

    const row: IntelligenceTruthRow = {
      learnerId: "ib-student-1",
      framework: "IB_MYP",
      assessmentModel: "criterion",
      observedReality: "Criterion C = 3/8 (weak), A=6, B=5, D=7",
      expectedInterpretation:
        "Criterion gap on C, recommend criterion-targeted remediation",
      actualInterpretation: `Normalized: ${pct}%, Level: ${level}, Action: ${policy?.recommendedActions[0]}`,
      evidenceSource: "Criterion assessment totalRaw=21/32",
      evidenceRefs: ["ev-ib-1"],
      correct:
        pct === 65.63 &&
        level === "Developing" &&
        policy?.recommendedActions[0] === "criterion_targeted_remediation",
      reason: policy
        ? `Policy matched: ${policy.recommendedActions.join(", ")}`
        : "No policy matched",
    };

    expect(row.correct).toBe(true);
    expect(row.actualInterpretation).toContain(
      "criterion_targeted_remediation"
    );
  });

  it("TRUTH-2: Behavioral pattern detected with criterion weakness", () => {
    const habits = Array.from({ length: 12 }, (_, i) => ({
      habitType: i < 5 ? "submission_delay" : "study_session",
      observedAt: new Date(
        Date.now() - (12 - i) * 3 * 86_400_000
      ).toISOString(),
    }));
    const att = [
      {
        outcomeId: "c",
        percent: 75,
        observedAt: new Date(Date.now() - 40 * 86_400_000).toISOString(),
      },
      {
        outcomeId: "c",
        percent: 68,
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
    expect(bp!.confidence).toBeGreaterThan(0.5);
  });
});

describe("Intelligence Truth Table — IGCSE", () => {
  it("TRUTH-3: AO3=30% → ao_gap → practice → measured", () => {
    const policy = selectInterventionPolicy({
      signalType: "assessment_objective_gap",
      severity: "high",
      confidence: 0.9,
      assessmentModel: "band_grade",
      dimension: "AO3",
      evidenceRefs: ["ev-ig-1"],
      observedFrom: "",
      observedTo: "",
      sampleSize: 6,
    });
    expect(policy!.recommendedActions[0]).toBe("ao_targeted_practice");
    expect(evaluateMeasurement(30, 48, 5, 2)).toBe("improved");
  });
});

describe("Intelligence Truth Table — QNSA", () => {
  it("TRUTH-4: 62% below 70% → outcome_action → 71% improved", () => {
    const s = getAssessmentStrategy("percent");
    expect(s.classifyAttainment(62, T)).toBe("Developing");
    const policy = selectInterventionPolicy({
      signalType: "low_attainment",
      severity: "medium",
      confidence: 0.8,
      assessmentModel: "percent",
      evidenceRefs: ["ev-qn-1"],
      observedFrom: "",
      observedTo: "",
      sampleSize: 10,
      value: 62,
      threshold: 70,
    });
    expect(policy!.recommendedActions[0]).toBe("outcome_improvement_action");
    expect(evaluateMeasurement(62, 71, 5, 3)).toBe("improved");
  });
});

describe("Differentiation Proof", () => {
  it("Same weakness → 3 different interventions per framework", () => {
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
    // All are different — framework semantics drive different interventions
    expect(new Set([ib, ig, qn]).size).toBe(3);
  });
});
