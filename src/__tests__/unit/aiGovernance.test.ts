import { describe, expect, it } from "vitest";

import { aggregateGovernanceUsage } from "@/hooks/useAIGovernance";
import {
  AI_GOVERNANCE_ACTION_POLICIES,
  autonomyBadgeClass,
} from "@/lib/aiGovernancePolicy";

describe("AI governance presentation", () => {
  it("aggregates real tutor model usage by status and model", () => {
    const result = aggregateGovernanceUsage([
      {
        model_used: "model-a",
        total_tokens: 120,
        latency_ms: 300,
        status: "success",
      },
      {
        model_used: "model-a",
        total_tokens: 80,
        latency_ms: 500,
        status: "error",
      },
      {
        model_used: "model-b",
        total_tokens: 200,
        latency_ms: 400,
        status: "success",
      },
    ]);

    expect(result).toEqual({
      totalRequests: 3,
      successfulRequests: 2,
      successRate: 67,
      totalTokens: 400,
      averageLatencyMs: 400,
      models: [
        { model: "model-a", requests: 2, tokens: 200 },
        { model: "model-b", requests: 1, tokens: 200 },
      ],
    });
  });

  it("keeps grading, publishing, and parent communication capped at A2", () => {
    const sensitiveActions = AI_GOVERNANCE_ACTION_POLICIES.filter((policy) =>
      /grade|publish|parent/i.test(policy.actionKey)
    );

    expect(sensitiveActions).toHaveLength(3);
    expect(
      sensitiveActions.every(
        (policy) => policy.sensitive && policy.hardCap === "A2"
      )
    ).toBe(true);
  });

  it("uses semantic visual classes for each autonomy level", () => {
    expect(autonomyBadgeClass("A1")).toContain("blue");
    expect(autonomyBadgeClass("A2")).toContain("amber");
    expect(autonomyBadgeClass("A3")).toContain("emerald");
  });
});
