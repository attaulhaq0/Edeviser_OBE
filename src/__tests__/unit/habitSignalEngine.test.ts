// habitSignalEngine.test.ts — Phase 17: Structured signal computation verification
import { describe, it, expect } from "vitest";
import {
  computeConsistency, computeCompletionRate, computeDelayPattern,
  computeRecovery, computeGoalFollowThrough, computeEngagementFrequency,
  computeSessionRegularization, computeSignal, fuseSignals,
} from "@/lib/habitSignalEngine";

describe("Habit Signal: computeConsistency", () => {
  it("7/7 days → 1.0, high confidence", () => {
    const days = new Set(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]);
    const r = computeConsistency(days, 7);
    expect(r.value).toBe(1);
    expect(r.confidence).toBe(0.9);
  });
  it("0/7 days → 0", () => {
    expect(computeConsistency(new Set(), 7).value).toBe(0);
  });
  it("3/7 days → 0.43", () => {
    const r = computeConsistency(new Set(["a", "b", "c"]), 7);
    expect(r.value).toBeCloseTo(3 / 7, 2);
  });
  it("windowDays=0 → 0 value, 0 confidence", () => {
    const r = computeConsistency(new Set(["a"]), 0);
    expect(r.value).toBe(0);
    expect(r.confidence).toBe(0);
  });
  it("windowDays < 7 → lower confidence", () => {
    expect(computeConsistency(new Set(["a", "b"]), 3).confidence).toBe(0.6);
  });
});

describe("Habit Signal: computeCompletionRate", () => {
  it("5/5 → 1.0", () => expect(computeCompletionRate(5, 5).value).toBe(1));
  it("0/5 → 0", () => expect(computeCompletionRate(0, 5).value).toBe(0));
  it("totalAssigned=0 → 0, 0 confidence", () => {
    const r = computeCompletionRate(0, 0);
    expect(r.value).toBe(0);
    expect(r.confidence).toBe(0);
  });
  it("≥3 assigned → high confidence", () => {
    expect(computeCompletionRate(2, 3).confidence).toBe(0.9);
  });
  it("<3 assigned → low confidence", () => {
    expect(computeCompletionRate(1, 1).confidence).toBe(0.5);
  });
});

describe("Habit Signal: computeDelayPattern", () => {
  it("0 days delay → 1.0", () => expect(computeDelayPattern(0).value).toBe(1));
  it("7 days delay → 0", () => expect(computeDelayPattern(7).value).toBe(0));
  it("3.5 days → 0.5", () => expect(computeDelayPattern(3.5).value).toBe(0.5));
});

describe("Habit Signal: computeRecovery", () => {
  it("resumed after 0 days → 1.0", () => expect(computeRecovery(0, true).value).toBe(1));
  it("not resumed → 0", () => expect(computeRecovery(10, false).value).toBe(0));
  it("resumed after 7 days → 0.5", () => expect(computeRecovery(7, true).value).toBe(0.5));
});

describe("Habit Signal: computeGoalFollowThrough", () => {
  it("3/3 goals → 1.0", () => expect(computeGoalFollowThrough(3, 3).value).toBe(1));
  it("goalsSet=0 → 0", () => expect(computeGoalFollowThrough(0, 0).value).toBe(0));
  it("≥2 goals set → higher confidence", () => {
    expect(computeGoalFollowThrough(2, 1).confidence).toBe(0.8);
  });
});

describe("Habit Signal: computeEngagementFrequency", () => {
  it("5 sessions/week → 1.0", () => expect(computeEngagementFrequency(5).value).toBe(1));
  it("2.5 sessions/week → 0.5", () => expect(computeEngagementFrequency(2.5).value).toBe(0.5));
});

describe("Habit Signal: computeSessionRegularization", () => {
  it("≤30 min std dev → 1.0, high confidence", () => {
    const r = computeSessionRegularization(20);
    expect(r.value).toBe(1);
    expect(r.confidence).toBe(0.8);
  });
  it("60 min → 0.7", () => {
    expect(computeSessionRegularization(60).value).toBe(0.7);
  });
  it("240 min → 0", () => {
    expect(computeSessionRegularization(240).value).toBe(0);
  });
});

describe("Habit Signal: computeSignal entry point", () => {
  it("routes consistency (empty set → value 0)", () => {
    const r = computeSignal("consistency", { windowDays: 7 });
    expect(r.value).toBe(0); // Empty set means no habit days
  });
  it("routes completion_rate", () => {
    expect(computeSignal("completion_rate", { completed: 4, totalAssigned: 5 }).value).toBe(0.8);
  });
  it("returns 0 for unknown signal name", () => {
    expect(computeSignal("unknown" as never, {}).value).toBe(0);
  });
});

describe("OBE + Habit Fusion: fuseSignals", () => {
  it("weak attainment + weak habits → high risk, combined", () => {
    const r = fuseSignals(30, 0.3, 0.2);
    expect(r.riskLevel).toBe("high");
    expect(r.primaryDriver).toBe("combined");
  });
  it("weak attainment + strong habits → moderate, academic", () => {
    const r = fuseSignals(30, 0.8, 0.9);
    expect(r.riskLevel).toBe("moderate");
    expect(r.primaryDriver).toBe("academic");
    expect(r.description).toContain("academic support");
  });
  it("adequate attainment + weak habits → moderate, behavioral", () => {
    const r = fuseSignals(80, 0.3, 0.2);
    expect(r.riskLevel).toBe("moderate");
    expect(r.primaryDriver).toBe("behavioral");
    expect(r.description).toContain("re-engage");
  });
  it("strong attainment + strong habits → low risk", () => {
    const r = fuseSignals(90, 0.9, 0.9);
    expect(r.riskLevel).toBe("low");
  });
  it("never uses 'lazy', 'unmotivated', or 'disengaged'", () => {
    const r = fuseSignals(10, 0.1, 0.1);
    expect(r.description).not.toMatch(/lazy|unmotivated|disengaged/i);
  });
});