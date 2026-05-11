// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import {
  computePerCLOScore,
  detectCLODiscrepancy,
} from "@/lib/questionAnalytics";

// ── computePerCLOScore — various CLO configurations ─────────────────

describe("computePerCLOScore", () => {
  it("single CLO with 5 questions (3 correct, 2 incorrect) → 60%", () => {
    const answers = [
      { clo_id: "clo-1", is_correct: true },
      { clo_id: "clo-1", is_correct: true },
      { clo_id: "clo-1", is_correct: true },
      { clo_id: "clo-1", is_correct: false },
      { clo_id: "clo-1", is_correct: false },
    ];
    expect(computePerCLOScore(answers)).toEqual({ "clo-1": 60 });
  });

  it("two CLOs: CLO-A 2/2 correct = 100%, CLO-B 1/3 correct ≈ 33.33%", () => {
    const answers = [
      { clo_id: "CLO-A", is_correct: true },
      { clo_id: "CLO-A", is_correct: true },
      { clo_id: "CLO-B", is_correct: true },
      { clo_id: "CLO-B", is_correct: false },
      { clo_id: "CLO-B", is_correct: false },
    ];
    const result = computePerCLOScore(answers);
    expect(result["CLO-A"]).toBe(100);
    expect(result["CLO-B"]).toBeCloseTo(33.3333, 3);
  });

  it("three CLOs with varying question counts", () => {
    const answers = [
      { clo_id: "clo-x", is_correct: true },
      { clo_id: "clo-x", is_correct: false },
      { clo_id: "clo-x", is_correct: true },
      { clo_id: "clo-x", is_correct: true },
      { clo_id: "clo-y", is_correct: false },
      { clo_id: "clo-y", is_correct: true },
      { clo_id: "clo-z", is_correct: true },
    ];
    const result = computePerCLOScore(answers);
    expect(result["clo-x"]).toBe(75);
    expect(result["clo-y"]).toBe(50);
    expect(result["clo-z"]).toBe(100);
  });

  it("all questions for all CLOs correct → all 100%", () => {
    const answers = [
      { clo_id: "a", is_correct: true },
      { clo_id: "a", is_correct: true },
      { clo_id: "b", is_correct: true },
      { clo_id: "b", is_correct: true },
      { clo_id: "c", is_correct: true },
    ];
    const result = computePerCLOScore(answers);
    expect(result["a"]).toBe(100);
    expect(result["b"]).toBe(100);
    expect(result["c"]).toBe(100);
  });

  it("all questions for all CLOs incorrect → all 0%", () => {
    const answers = [
      { clo_id: "a", is_correct: false },
      { clo_id: "a", is_correct: false },
      { clo_id: "b", is_correct: false },
      { clo_id: "c", is_correct: false },
      { clo_id: "c", is_correct: false },
    ];
    const result = computePerCLOScore(answers);
    expect(result["a"]).toBe(0);
    expect(result["b"]).toBe(0);
    expect(result["c"]).toBe(0);
  });

  it("one CLO with 1 question correct → 100%", () => {
    const answers = [{ clo_id: "solo", is_correct: true }];
    expect(computePerCLOScore(answers)).toEqual({ solo: 100 });
  });

  it("one CLO with 1 question incorrect → 0%", () => {
    const answers = [{ clo_id: "solo", is_correct: false }];
    expect(computePerCLOScore(answers)).toEqual({ solo: 0 });
  });
});

// ── detectCLODiscrepancy — integration scenarios ────────────────────

describe("detectCLODiscrepancy", () => {
  it("quiz 80%, CLO attainment 60% → discrepancy (20 > 15)", () => {
    expect(detectCLODiscrepancy(80, 60)).toBe(true);
  });

  it("quiz 70%, CLO attainment 75% → no discrepancy (5 ≤ 15)", () => {
    expect(detectCLODiscrepancy(70, 75)).toBe(false);
  });

  it("quiz 90%, CLO attainment 50% → discrepancy (40 > 15)", () => {
    expect(detectCLODiscrepancy(90, 50)).toBe(true);
  });

  it("quiz 65%, CLO attainment 80% → no discrepancy (|−15| is not > 15)", () => {
    expect(detectCLODiscrepancy(65, 80)).toBe(false);
  });
});

// ── Combined scenario: per-CLO scores + discrepancy check ───────────

describe("combined per-CLO score and discrepancy check", () => {
  it("computes per-CLO scores then checks discrepancy against mock attainment", () => {
    const answers = [
      { clo_id: "clo-1", is_correct: true },
      { clo_id: "clo-1", is_correct: true },
      { clo_id: "clo-1", is_correct: false },
      { clo_id: "clo-1", is_correct: false },
      { clo_id: "clo-2", is_correct: true },
      { clo_id: "clo-2", is_correct: true },
      { clo_id: "clo-2", is_correct: true },
    ];

    const scores = computePerCLOScore(answers);
    expect(scores["clo-1"]).toBe(50);
    expect(scores["clo-2"]).toBeCloseTo(100, 0);

    // Mock attainment data from outcome_attainment table
    const attainment: Record<string, number> = {
      "clo-1": 80,
      "clo-2": 90,
    };

    // clo-1: |50 − 80| = 30 > 15 → discrepancy
    expect(detectCLODiscrepancy(scores["clo-1"]!, attainment["clo-1"]!)).toBe(
      true
    );
    // clo-2: |100 − 90| = 10 ≤ 15 → no discrepancy
    expect(detectCLODiscrepancy(scores["clo-2"]!, attainment["clo-2"]!)).toBe(
      false
    );
  });
});
