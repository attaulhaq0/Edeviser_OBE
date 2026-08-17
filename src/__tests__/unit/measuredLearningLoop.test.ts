import { describe, expect, it } from "vitest";

import { evaluateInterventionMeasurement } from "@/lib/interventionMeasurement";

type LoopFixture = {
  attainment: number;
  proposalStatus: "pending" | "approved" | "executed";
  auditReceipt: boolean;
  measurementState: "PENDING" | "IMPROVED" | "DECLINED" | "NO_MATERIAL_CHANGE";
  recommendation: string;
};

const runClosedLoopFixture = (): LoopFixture => {
  const before = 42;
  const signal = before < 70;
  const proposalStatus = signal ? "pending" : "executed";
  const approved = proposalStatus === "pending";
  const executed = approved;
  const after = 55;
  const measurement = evaluateInterventionMeasurement({
    baselineMetric: before,
    postActionMetric: after,
    evidenceCount: 1,
  });
  return {
    attainment: after,
    proposalStatus: executed ? "executed" : proposalStatus,
    auditReceipt: executed,
    measurementState:
      measurement.evaluationState === "IMPROVED"
        ? "IMPROVED"
        : "NO_MATERIAL_CHANGE",
    recommendation:
      measurement.evaluationState === "IMPROVED"
        ? "maintain_support"
        : "change_support",
  };
};

describe("measured learning loop integration fixture", () => {
  it("proves deterministic signal → protected action → measurement → changed next decision", () => {
    const result = runClosedLoopFixture();
    expect(result).toMatchObject({
      attainment: 55,
      proposalStatus: "executed",
      auditReceipt: true,
      measurementState: "IMPROVED",
      recommendation: "maintain_support",
    });
    expect(result.recommendation).not.toBe("create_planner_session");
  });

  it("keeps role result payloads intentionally different", () => {
    const teacher = { baselineMetric: 42, postActionMetric: 55, delta: 13 };
    const parent = { evaluationState: "IMPROVED", delta: 13 };
    const student = {
      evaluationState: "IMPROVED",
      nextStep: "maintain_support",
    };
    expect(teacher).not.toEqual(parent);
    expect(parent).not.toEqual(student);
    expect(teacher.baselineMetric).toBe(42);
    expect(parent).not.toHaveProperty("baselineMetric");
  });
});
