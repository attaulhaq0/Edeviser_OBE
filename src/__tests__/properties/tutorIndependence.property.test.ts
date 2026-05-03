// Feature: ai-tutor-rag, Property 49: Independence score is between 0 and 1
// Feature: ai-tutor-rag, Property 50: 0 submissions → score 1.0
// Feature: ai-tutor-rag, Property 51: All AI-assisted → score 0.0
// Feature: ai-tutor-rag, Property 52: Score = 1 - (aiAssisted / total)
// **Validates: Requirements 28.1**

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { calculateIndependenceScore } from "@/lib/independenceCalculator";

// ─── Arbitraries ────────────────────────────────────────────────────────────

const totalSubmissionsArb = fc.integer({ min: 0, max: 1000 });
const positiveSubmissionsArb = fc.integer({ min: 1, max: 1000 });

// ─── P49: Independence score is between 0 and 1 ────────────────────────────

describe("Property 49 — Independence score is between 0 and 1", () => {
  it("P49: for any valid inputs, score is in [0, 1]", () => {
    fc.assert(
      fc.property(
        totalSubmissionsArb,
        fc.integer({ min: -10, max: 1010 }),
        (total, aiAssisted) => {
          const score = calculateIndependenceScore(total, aiAssisted);
          expect(score).toBeGreaterThanOrEqual(0);
          expect(score).toBeLessThanOrEqual(1);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── P50: 0 submissions → score 1.0 ────────────────────────────────────────

describe("Property 50 — 0 submissions yields score 1.0", () => {
  it("P50: when total submissions is 0, score is 1.0", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        (aiAssisted) => {
          const score = calculateIndependenceScore(0, aiAssisted);
          expect(score).toBe(1.0);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── P51: All AI-assisted → score 0.0 ──────────────────────────────────────

describe("Property 51 — All AI-assisted yields score 0.0", () => {
  it("P51: when all submissions are AI-assisted, score is 0.0", () => {
    fc.assert(
      fc.property(positiveSubmissionsArb, (total) => {
        const score = calculateIndependenceScore(total, total);
        expect(score).toBe(0.0);
      }),
      { numRuns: 100 },
    );
  });
});

// ─── P52: Score = 1 - (aiAssisted / total) ─────────────────────────────────

describe("Property 52 — Score equals 1 - (aiAssisted / total)", () => {
  it("P52: score matches the formula for valid inputs", () => {
    fc.assert(
      fc.property(
        positiveSubmissionsArb,
        positiveSubmissionsArb,
        (total, aiAssisted) => {
          const clampedAi = Math.max(0, Math.min(aiAssisted, total));
          const expected = 1 - clampedAi / total;
          const score = calculateIndependenceScore(total, clampedAi);
          expect(score).toBeCloseTo(expected, 10);
        },
      ),
      { numRuns: 100 },
    );
  });
});
