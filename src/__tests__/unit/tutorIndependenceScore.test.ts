// Feature: ai-tutor-rag — Independence score calculation edge cases
// **Validates: Requirements 28.1**

import { describe, it, expect } from "vitest";
import { calculateIndependenceScore } from "@/lib/independenceCalculator";

describe("independenceCalculator — calculateIndependenceScore", () => {
  // ─── Zero submissions ─────────────────────────────────────────────────

  it("returns 1.0 for zero total submissions", () => {
    expect(calculateIndependenceScore(0, 0)).toBe(1.0);
  });

  it("returns 1.0 for zero total submissions even with positive AI-assisted count", () => {
    expect(calculateIndependenceScore(0, 5)).toBe(1.0);
  });

  it("returns 1.0 for negative total submissions", () => {
    expect(calculateIndependenceScore(-1, 0)).toBe(1.0);
  });

  // ─── All AI-assisted ──────────────────────────────────────────────────

  it("returns 0.0 when all submissions are AI-assisted", () => {
    expect(calculateIndependenceScore(10, 10)).toBe(0.0);
  });

  it("returns 0.0 when all submissions are AI-assisted (1 submission)", () => {
    expect(calculateIndependenceScore(1, 1)).toBe(0.0);
  });

  // ─── No AI-assisted ───────────────────────────────────────────────────

  it("returns 1.0 when no submissions are AI-assisted", () => {
    expect(calculateIndependenceScore(10, 0)).toBe(1.0);
  });

  // ─── Mixed submissions ────────────────────────────────────────────────

  it("returns 0.5 when half are AI-assisted", () => {
    expect(calculateIndependenceScore(10, 5)).toBe(0.5);
  });

  it("returns 0.75 when 25% are AI-assisted", () => {
    expect(calculateIndependenceScore(4, 1)).toBe(0.75);
  });

  it("returns 0.8 when 2 of 10 are AI-assisted", () => {
    expect(calculateIndependenceScore(10, 2)).toBeCloseTo(0.8);
  });

  // ─── Clamping — negative AI-assisted values ───────────────────────────

  it("clamps negative AI-assisted count to 0 (returns 1.0)", () => {
    expect(calculateIndependenceScore(10, -5)).toBe(1.0);
  });

  // ─── Clamping — AI-assisted exceeds total ─────────────────────────────

  it("clamps AI-assisted count to total when it exceeds total (returns 0.0)", () => {
    expect(calculateIndependenceScore(5, 10)).toBe(0.0);
  });

  // ─── Large numbers ────────────────────────────────────────────────────

  it("handles large submission counts correctly", () => {
    const total = 100000;
    const aiAssisted = 25000;
    expect(calculateIndependenceScore(total, aiAssisted)).toBeCloseTo(0.75);
  });

  // ─── Single submission ────────────────────────────────────────────────

  it("returns 0.0 for single AI-assisted submission", () => {
    expect(calculateIndependenceScore(1, 1)).toBe(0.0);
  });

  it("returns 1.0 for single independent submission", () => {
    expect(calculateIndependenceScore(1, 0)).toBe(1.0);
  });
});
