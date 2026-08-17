import { describe, expect, it } from "vitest";

import { evaluateInterventionMeasurement } from "@/lib/interventionMeasurement";

describe("deterministic intervention measurement", () => {
  it("classifies improvement from fixture metrics, independent of an LLM", () => {
    expect(
      evaluateInterventionMeasurement({
        baselineMetric: 42,
        postActionMetric: 55,
        evidenceCount: 2,
      })
    ).toEqual({
      delta: 13,
      evidenceSufficiency: "sufficient",
      evaluationState: "IMPROVED",
    });
  });

  it("does not measure without post-action evidence", () => {
    expect(
      evaluateInterventionMeasurement({
        baselineMetric: 42,
        postActionMetric: null,
        evidenceCount: 0,
      }).evaluationState
    ).toBe("INSUFFICIENT_EVIDENCE");
  });

  it("distinguishes decline and no material change", () => {
    expect(
      evaluateInterventionMeasurement({
        baselineMetric: 70,
        postActionMetric: 60,
        evidenceCount: 1,
      }).evaluationState
    ).toBe("DECLINED");
    expect(
      evaluateInterventionMeasurement({
        baselineMetric: 70,
        postActionMetric: 73,
        evidenceCount: 1,
      }).evaluationState
    ).toBe("NO_MATERIAL_CHANGE");
  });
});
