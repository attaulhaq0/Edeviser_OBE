// Feature: ai-tutor-rag — Acceptance rate calculation and frequency adaptation
// **Validates: Requirements 25.1, 25.3**

import { describe, it, expect } from "vitest";

// ─── Pure logic helpers (extracted from Edge Function behavior) ──────────────

interface PlanUpdateRecord {
  response: "accepted" | "modified" | "dismissed";
}

/**
 * Calculates the acceptance rate from a list of plan update responses.
 * "accepted" and "modified" count as accepted; "dismissed" does not.
 */
function calculateAcceptanceRate(records: PlanUpdateRecord[]): number {
  if (records.length === 0) return 1.0; // No data → assume good
  const accepted = records.filter(
    (r) => r.response === "accepted" || r.response === "modified"
  ).length;
  return accepted / records.length;
}

/**
 * Determines the interaction threshold for triggering the next plan update.
 * Default is 5; increases to 10 when acceptance rate < 30% over 10+ suggestions.
 */
function getAdaptiveThreshold(
  acceptanceRate: number,
  previousSuggestionCount: number
): number {
  if (previousSuggestionCount >= 10 && acceptanceRate < 0.3) {
    return 10;
  }
  return 5;
}

/**
 * Determines whether a plan update should be triggered.
 */
function shouldTriggerPlanUpdate(
  interactionCount: number,
  acceptanceRate: number,
  previousSuggestionCount: number
): boolean {
  const threshold = getAdaptiveThreshold(
    acceptanceRate,
    previousSuggestionCount
  );
  return interactionCount >= threshold;
}

// ─── Acceptance rate calculation ────────────────────────────────────────────

describe("tutorPlanUpdateAcceptance — calculateAcceptanceRate", () => {
  it("returns 1.0 for empty records", () => {
    expect(calculateAcceptanceRate([])).toBe(1.0);
  });

  it("returns 1.0 when all are accepted", () => {
    const records: PlanUpdateRecord[] = [
      { response: "accepted" },
      { response: "accepted" },
      { response: "accepted" },
    ];
    expect(calculateAcceptanceRate(records)).toBe(1.0);
  });

  it("returns 0.0 when all are dismissed", () => {
    const records: PlanUpdateRecord[] = [
      { response: "dismissed" },
      { response: "dismissed" },
      { response: "dismissed" },
    ];
    expect(calculateAcceptanceRate(records)).toBe(0.0);
  });

  it("counts modified as accepted", () => {
    const records: PlanUpdateRecord[] = [
      { response: "modified" },
      { response: "dismissed" },
    ];
    expect(calculateAcceptanceRate(records)).toBe(0.5);
  });

  it("calculates correct rate for mixed responses", () => {
    const records: PlanUpdateRecord[] = [
      { response: "accepted" },
      { response: "modified" },
      { response: "dismissed" },
      { response: "dismissed" },
      { response: "accepted" },
    ];
    // 3 accepted/modified out of 5
    expect(calculateAcceptanceRate(records)).toBeCloseTo(0.6);
  });

  it("returns correct rate for 10 records with 2 accepted", () => {
    const records: PlanUpdateRecord[] = [
      { response: "accepted" },
      { response: "accepted" },
      ...Array.from({ length: 8 }, () => ({ response: "dismissed" as const })),
    ];
    expect(calculateAcceptanceRate(records)).toBeCloseTo(0.2);
  });
});

// ─── Adaptive threshold ─────────────────────────────────────────────────────

describe("tutorPlanUpdateAcceptance — getAdaptiveThreshold", () => {
  it("returns 5 by default", () => {
    expect(getAdaptiveThreshold(0.5, 5)).toBe(5);
  });

  it("returns 5 when acceptance rate is good (>= 30%)", () => {
    expect(getAdaptiveThreshold(0.5, 15)).toBe(5);
  });

  it("returns 10 when acceptance rate < 30% and >= 10 previous suggestions", () => {
    expect(getAdaptiveThreshold(0.2, 10)).toBe(10);
  });

  it("returns 5 when acceptance rate < 30% but fewer than 10 previous suggestions", () => {
    expect(getAdaptiveThreshold(0.1, 9)).toBe(5);
  });

  it("returns 5 at exactly 30% acceptance rate", () => {
    expect(getAdaptiveThreshold(0.3, 15)).toBe(5);
  });

  it("returns 10 at 29% acceptance rate with 10 suggestions", () => {
    expect(getAdaptiveThreshold(0.29, 10)).toBe(10);
  });

  it("returns 10 at 0% acceptance rate with many suggestions", () => {
    expect(getAdaptiveThreshold(0, 20)).toBe(10);
  });
});

// ─── Trigger decision ───────────────────────────────────────────────────────

describe("tutorPlanUpdateAcceptance — shouldTriggerPlanUpdate", () => {
  it("triggers at 5 interactions with default threshold", () => {
    expect(shouldTriggerPlanUpdate(5, 0.5, 3)).toBe(true);
  });

  it("does not trigger at 4 interactions with default threshold", () => {
    expect(shouldTriggerPlanUpdate(4, 0.5, 3)).toBe(false);
  });

  it("does not trigger at 5 interactions when threshold is elevated to 10", () => {
    expect(shouldTriggerPlanUpdate(5, 0.1, 15)).toBe(false);
  });

  it("triggers at 10 interactions when threshold is elevated", () => {
    expect(shouldTriggerPlanUpdate(10, 0.1, 15)).toBe(true);
  });

  it("triggers at 7 interactions with default threshold (above 5)", () => {
    expect(shouldTriggerPlanUpdate(7, 0.8, 5)).toBe(true);
  });

  it("does not trigger at 9 interactions when threshold is elevated to 10", () => {
    expect(shouldTriggerPlanUpdate(9, 0.2, 12)).toBe(false);
  });
});
