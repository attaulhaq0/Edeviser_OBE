// aiCostTracker.test.ts — Phase 18: AI cost tracking verification
import { describe, it, expect, beforeEach } from "vitest";
import { trackAIRequest, getSessionCostSummary, isBudgetAtRisk, resetSessionCosts } from "@/lib/aiCostTracker";

describe("AI Cost Tracker", () => {
  beforeEach(() => resetSessionCosts());

  it("tracks a successful AI request", () => {
    const event = trackAIRequest({
      capability: "student_tutor", tokensUsed: 500, latencyMs: 1200,
      success: true, institutionId: "inst-1", studentId: "stu-1", workflow: "tutor_chat",
    });
    expect(event.capability).toBe("student_tutor");
    expect(event.success).toBe(true);
    expect(event.tokensUsed).toBe(500);
    expect(event.latencyMs).toBe(1200);
    expect(event.estimatedCost).toBe(0.1); // 500 * 0.0002 = 0.1
  });

  it("tracks a failed request", () => {
    const event = trackAIRequest({
      capability: "quiz_generation", tokensUsed: 0, latencyMs: 3000,
      success: false, errorType: "timeout", workflow: "quiz_gen",
    });
    expect(event.success).toBe(false);
    expect(event.errorType).toBe("timeout");
  });

  it("accumulates session costs", () => {
    trackAIRequest({ capability: "student_tutor", tokensUsed: 1000, latencyMs: 800, success: true, workflow: "tutor" });
    trackAIRequest({ capability: "student_tutor", tokensUsed: 500, latencyMs: 600, success: true, workflow: "tutor" });
    trackAIRequest({ capability: "feedback_drafting", tokensUsed: 200, latencyMs: 400, success: true, workflow: "feedback" });
    const summary = getSessionCostSummary();
    expect(summary.totalRequests).toBe(3);
    expect(summary.totalTokens).toBe(1700);
    expect(summary.failedRequests).toBe(0);
    expect(summary.totalCost).toBeCloseTo(0.34, 2); // 1700 * 0.0002 = 0.34
  });

  it("tracks by capability", () => {
    trackAIRequest({ capability: "student_tutor", tokensUsed: 100, latencyMs: 100, success: true, workflow: "a" });
    trackAIRequest({ capability: "student_tutor", tokensUsed: 200, latencyMs: 100, success: true, workflow: "a" });
    trackAIRequest({ capability: "quiz_generation", tokensUsed: 300, latencyMs: 100, success: true, workflow: "b" });
    const s = getSessionCostSummary();
    expect(s.byCapability["student_tutor"]!.count).toBe(2);
    expect(s.byCapability["student_tutor"]!.tokens).toBe(300);
    expect(s.byCapability["quiz_generation"]!.count).toBe(1);
    expect(s.byCapability["quiz_generation"]!.tokens).toBe(300);
  });

  it("tracks failed requests separately", () => {
    trackAIRequest({ capability: "student_tutor", tokensUsed: 100, latencyMs: 100, success: true, workflow: "a" });
    trackAIRequest({ capability: "student_tutor", tokensUsed: 0, latencyMs: 5000, success: false, errorType: "timeout", workflow: "a" });
    expect(getSessionCostSummary().failedRequests).toBe(1);
    expect(getSessionCostSummary().totalRequests).toBe(2);
  });
});

describe("isBudgetAtRisk", () => {
  it("not at risk when under threshold", () => {
    const r = isBudgetAtRisk({ monthlyBudget: 100, currentMonthCost: 50, warningThreshold: 0.8 });
    expect(r.atRisk).toBe(false);
  });
  it("at risk when over 80% threshold", () => {
    const r = isBudgetAtRisk({ monthlyBudget: 100, currentMonthCost: 85, warningThreshold: 0.8 });
    expect(r.atRisk).toBe(true);
    expect(r.percentUsed).toBe(85);
  });
  it("at risk when monthly budget exceeded", () => {
    const r = isBudgetAtRisk({ monthlyBudget: 100, currentMonthCost: 120 });
    expect(r.atRisk).toBe(true);
    expect(r.percentUsed).toBe(120);
  });
  it("zero budget → no risk when cost is 0", () => {
    const r = isBudgetAtRisk({ monthlyBudget: 0, currentMonthCost: 0 });
    expect(r.atRisk).toBe(false);
    expect(r.percentUsed).toBe(0);
  });
});