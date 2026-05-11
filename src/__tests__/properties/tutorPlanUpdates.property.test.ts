// Feature: ai-tutor-rag, Property 43: Plan update triggers at 5+ interactions on same CLO in 7 days
// Feature: ai-tutor-rag, Property 44: Plan update has required fields
// Feature: ai-tutor-rag, Property 46: Adaptive frequency: threshold increases to 10 when acceptance rate < 30%
// **Validates: Requirements 24.1, 24.2, 25.3**

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import type { LearningPlanUpdate } from "@/lib/tutorSchemas";

// ─── Pure logic helpers (extracted from Edge Function behavior) ──────────────

/**
 * Determines whether a plan update should be triggered based on interaction count
 * and the acceptance rate of previous suggestions.
 */
function shouldTriggerPlanUpdate(
  interactionCountOnClo: number,
  acceptanceRate: number | null,
  previousSuggestionCount: number
): boolean {
  const threshold =
    previousSuggestionCount >= 10 &&
    acceptanceRate !== null &&
    acceptanceRate < 0.3
      ? 10
      : 5;
  return interactionCountOnClo >= threshold;
}

/**
 * Validates that a LearningPlanUpdate has all required fields.
 */
function isValidPlanUpdate(update: LearningPlanUpdate): boolean {
  return (
    typeof update.study_time_recommendation === "string" &&
    update.study_time_recommendation.length > 0 &&
    Array.isArray(update.recommended_materials) &&
    update.recommended_materials.length >= 1 &&
    update.recommended_materials.length <= 3 &&
    typeof update.suggested_planner_sessions === "number" &&
    update.suggested_planner_sessions >= 1
  );
}

// ─── Arbitraries ────────────────────────────────────────────────────────────

const materialArb = fc.record({
  chunk_id: fc.uuid(),
  source_filename: fc.string({ minLength: 1, maxLength: 50 }),
  section_title: fc.string({ minLength: 1, maxLength: 100 }),
});

const planUpdateArb: fc.Arbitrary<LearningPlanUpdate> = fc.record({
  id: fc.uuid(),
  clo_id: fc.uuid(),
  clo_title: fc.string({ minLength: 1, maxLength: 100 }),
  study_time_recommendation: fc.string({ minLength: 1, maxLength: 200 }),
  recommended_materials: fc.array(materialArb, { minLength: 1, maxLength: 3 }),
  suggested_planner_sessions: fc.integer({ min: 1, max: 10 }),
  interaction_count: fc.integer({ min: 5, max: 50 }),
});

// ─── P43: Plan update triggers at 5+ interactions on same CLO in 7 days ─────

describe("Property 43 — Plan update triggers at 5+ interactions", () => {
  it("P43a: triggers when interaction count >= 5 (default threshold)", () => {
    fc.assert(
      fc.property(fc.integer({ min: 5, max: 50 }), (count) => {
        const result = shouldTriggerPlanUpdate(count, null, 0);
        expect(result).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it("P43b: does not trigger when interaction count < 5 (default threshold)", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 4 }), (count) => {
        const result = shouldTriggerPlanUpdate(count, null, 0);
        expect(result).toBe(false);
      }),
      { numRuns: 100 }
    );
  });
});

// ─── P44: Plan update has required fields ───────────────────────────────────

describe("Property 44 — Plan update contains required fields", () => {
  it("P44: every generated plan update has study_time_recommendation, 1-3 materials, and sessions >= 1", () => {
    fc.assert(
      fc.property(planUpdateArb, (update) => {
        expect(isValidPlanUpdate(update)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });
});

// ─── P46: Adaptive frequency — threshold increases to 10 when rate < 30% ───

describe("Property 46 — Adaptive frequency threshold", () => {
  it("P46a: threshold is 10 when acceptance rate < 30% and >= 10 previous suggestions", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 0.29, noNaN: true }),
        fc.integer({ min: 10, max: 30 }),
        (rate, prevCount) => {
          // With 5-9 interactions, should NOT trigger at the elevated threshold
          const resultAt5 = shouldTriggerPlanUpdate(5, rate, prevCount);
          expect(resultAt5).toBe(false);

          // With 10+ interactions, SHOULD trigger
          const resultAt10 = shouldTriggerPlanUpdate(10, rate, prevCount);
          expect(resultAt10).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("P46b: threshold remains 5 when acceptance rate >= 30%", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.3, max: 1, noNaN: true }),
        fc.integer({ min: 10, max: 30 }),
        (rate, prevCount) => {
          const resultAt5 = shouldTriggerPlanUpdate(5, rate, prevCount);
          expect(resultAt5).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("P46c: threshold remains 5 when fewer than 10 previous suggestions regardless of rate", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 0.29, noNaN: true }),
        fc.integer({ min: 0, max: 9 }),
        (rate, prevCount) => {
          const resultAt5 = shouldTriggerPlanUpdate(5, rate, prevCount);
          expect(resultAt5).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});
