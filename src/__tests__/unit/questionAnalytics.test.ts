// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import {
  computePerCLOScore,
  detectCLODiscrepancy,
  computeApprovalRate,
  computeBonusXP,
} from "@/lib/questionAnalytics";

// ── computePerCLOScore ──────────────────────────────────────────────

describe("computePerCLOScore", () => {
  it("returns 100 for a single CLO with all correct answers", () => {
    const answers = [
      { clo_id: "clo-1", is_correct: true },
      { clo_id: "clo-1", is_correct: true },
      { clo_id: "clo-1", is_correct: true },
    ];
    expect(computePerCLOScore(answers)).toEqual({ "clo-1": 100 });
  });

  it("returns 0 for a single CLO with all incorrect answers", () => {
    const answers = [
      { clo_id: "clo-1", is_correct: false },
      { clo_id: "clo-1", is_correct: false },
    ];
    expect(computePerCLOScore(answers)).toEqual({ "clo-1": 0 });
  });

  it("computes mixed results across multiple CLOs", () => {
    const answers = [
      { clo_id: "clo-1", is_correct: true },
      { clo_id: "clo-1", is_correct: false },
      { clo_id: "clo-2", is_correct: true },
      { clo_id: "clo-2", is_correct: true },
      { clo_id: "clo-2", is_correct: false },
    ];
    const result = computePerCLOScore(answers);
    expect(result["clo-1"]).toBe(50);
    expect(result["clo-2"]).toBeCloseTo(66.6667, 3);
  });

  it("handles a single answer per CLO", () => {
    const answers = [
      { clo_id: "clo-1", is_correct: true },
      { clo_id: "clo-2", is_correct: false },
    ];
    expect(computePerCLOScore(answers)).toEqual({ "clo-1": 100, "clo-2": 0 });
  });

  it("returns an empty object for an empty array", () => {
    expect(computePerCLOScore([])).toEqual({});
  });
});

// ── detectCLODiscrepancy ────────────────────────────────────────────

describe("detectCLODiscrepancy", () => {
  it("returns false for a difference of exactly 15", () => {
    expect(detectCLODiscrepancy(50, 65)).toBe(false);
  });

  it("returns true for a difference of 15.01", () => {
    expect(detectCLODiscrepancy(50, 65.01)).toBe(true);
  });

  it("returns false for a difference of 0", () => {
    expect(detectCLODiscrepancy(70, 70)).toBe(false);
  });

  it("returns true for a large difference (80 vs 20)", () => {
    expect(detectCLODiscrepancy(80, 20)).toBe(true);
  });
});

// ── computeApprovalRate ─────────────────────────────────────────────

describe("computeApprovalRate", () => {
  it("returns 0 when total is 0", () => {
    expect(computeApprovalRate(0, 0)).toBe(0);
  });

  it("returns 1 when all are approved", () => {
    expect(computeApprovalRate(10, 10)).toBe(1);
  });

  it("returns 0 when none are approved", () => {
    expect(computeApprovalRate(0, 10)).toBe(0);
  });

  it("returns 0.3 for partial approval (3 of 10)", () => {
    expect(computeApprovalRate(3, 10)).toBeCloseTo(0.3);
  });
});

// ── computeBonusXP ──────────────────────────────────────────────────

describe("computeBonusXP", () => {
  it("returns 0 for an empty array", () => {
    expect(computeBonusXP([])).toBe(0);
  });

  it("returns 0 when no questions are hard (all below 4.0)", () => {
    const questions = [
      { difficulty_rating: 2.0 },
      { difficulty_rating: 3.5 },
      { difficulty_rating: 3.99 },
    ];
    expect(computeBonusXP(questions)).toBe(0);
  });

  it("returns 10 for 1 hard question", () => {
    const questions = [{ difficulty_rating: 4.5 }];
    expect(computeBonusXP(questions)).toBe(10);
  });

  it("returns 50 for 5 hard questions", () => {
    const questions = Array.from({ length: 5 }, () => ({
      difficulty_rating: 4.0,
    }));
    expect(computeBonusXP(questions)).toBe(50);
  });

  it("returns 50 (capped) for 10 hard questions", () => {
    const questions = Array.from({ length: 10 }, () => ({
      difficulty_rating: 5.0,
    }));
    expect(computeBonusXP(questions)).toBe(50);
  });

  it("counts exactly 4.0 difficulty as hard", () => {
    const questions = [{ difficulty_rating: 4.0 }];
    expect(computeBonusXP(questions)).toBe(10);
  });

  it("does not count 3.99 difficulty as hard", () => {
    const questions = [{ difficulty_rating: 3.99 }];
    expect(computeBonusXP(questions)).toBe(0);
  });
});
