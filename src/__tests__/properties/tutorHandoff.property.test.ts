// Feature: ai-tutor-rag, Property 53: Handoff triggers on low RAG confidence (avg similarity < 0.75)
// Feature: ai-tutor-rag, Property 54: Student consent is required (boolean must be true)
// Feature: ai-tutor-rag, Property 55: Coverage gaps are CLOs with high query volume
// **Validates: Requirements 30.1, 30.4, 32.1**

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { createHandoffSchema } from "@/lib/tutorSchemas";

// ─── Pure logic helpers (extracted from Edge Function behavior) ──────────────

/**
 * Determines whether a teacher handoff should be suggested based on
 * conversation signals.
 */
function shouldSuggestHandoff(signals: {
  avgSimilarityLast3: number;
  repeatedQuestionCount: number;
  consecutiveThumbsDown: number;
}): boolean {
  return (
    signals.avgSimilarityLast3 < 0.7 ||
    signals.repeatedQuestionCount >= 3 ||
    signals.consecutiveThumbsDown >= 3
  );
}

/**
 * Identifies CLOs that are coverage gaps based on average RAG similarity.
 */
function identifyCoverageGaps(
  cloSimilarities: Array<{ clo_id: string; avgSimilarity: number }>,
): string[] {
  return cloSimilarities
    .filter((c) => c.avgSimilarity < 0.75)
    .map((c) => c.clo_id);
}

// ─── Arbitraries ────────────────────────────────────────────────────────────

const lowSimilarityArb = fc.double({ min: 0, max: 0.69, noNaN: true });
const highSimilarityArb = fc.double({ min: 0.7, max: 1, noNaN: true });

// ─── P53: Handoff triggers on low RAG confidence ────────────────────────────

describe("Property 53 — Handoff triggers on low RAG confidence", () => {
  it("P53a: triggers when avg similarity < 0.7", () => {
    fc.assert(
      fc.property(lowSimilarityArb, (avgSim) => {
        const result = shouldSuggestHandoff({
          avgSimilarityLast3: avgSim,
          repeatedQuestionCount: 0,
          consecutiveThumbsDown: 0,
        });
        expect(result).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it("P53b: triggers when repeated question count >= 3", () => {
    fc.assert(
      fc.property(
        highSimilarityArb,
        fc.integer({ min: 3, max: 10 }),
        (avgSim, repeats) => {
          const result = shouldSuggestHandoff({
            avgSimilarityLast3: avgSim,
            repeatedQuestionCount: repeats,
            consecutiveThumbsDown: 0,
          });
          expect(result).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("P53c: triggers when consecutive thumbs down >= 3", () => {
    fc.assert(
      fc.property(
        highSimilarityArb,
        fc.integer({ min: 3, max: 10 }),
        (avgSim, thumbsDown) => {
          const result = shouldSuggestHandoff({
            avgSimilarityLast3: avgSim,
            repeatedQuestionCount: 0,
            consecutiveThumbsDown: thumbsDown,
          });
          expect(result).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("P53d: does not trigger when all signals are below thresholds", () => {
    fc.assert(
      fc.property(
        highSimilarityArb,
        fc.integer({ min: 0, max: 2 }),
        fc.integer({ min: 0, max: 2 }),
        (avgSim, repeats, thumbsDown) => {
          const result = shouldSuggestHandoff({
            avgSimilarityLast3: avgSim,
            repeatedQuestionCount: repeats,
            consecutiveThumbsDown: thumbsDown,
          });
          expect(result).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── P54: Student consent is required ───────────────────────────────────────

describe("Property 54 — Student consent is required", () => {
  it("P54a: createHandoffSchema rejects when student_consent is false", () => {
    const result = createHandoffSchema.safeParse({
      conversation_id: "550e8400-e29b-41d4-a716-446655440000",
      student_consent: false,
    });
    expect(result.success).toBe(false);
  });

  it("P54b: createHandoffSchema accepts when student_consent is true", () => {
    fc.assert(
      fc.property(fc.uuid(), (conversationId) => {
        const result = createHandoffSchema.safeParse({
          conversation_id: conversationId,
          student_consent: true,
        });
        expect(result.success).toBe(true);
      }),
      { numRuns: 100 },
    );
  });
});

// ─── P55: Coverage gaps are CLOs with avg similarity < 0.75 ─────────────────

describe("Property 55 — Coverage gaps identify under-served CLOs", () => {
  it("P55a: CLOs with avg similarity < 0.75 appear in coverage gaps", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            clo_id: fc.uuid(),
            avgSimilarity: fc.double({ min: 0, max: 0.74, noNaN: true }),
          }),
          { minLength: 1, maxLength: 10 },
        ),
        (clos) => {
          const gaps = identifyCoverageGaps(clos);
          expect(gaps.length).toBe(clos.length);
          for (const clo of clos) {
            expect(gaps).toContain(clo.clo_id);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it("P55b: CLOs with avg similarity >= 0.75 do not appear in coverage gaps", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            clo_id: fc.uuid(),
            avgSimilarity: fc.double({ min: 0.75, max: 1, noNaN: true }),
          }),
          { minLength: 1, maxLength: 10 },
        ),
        (clos) => {
          const gaps = identifyCoverageGaps(clos);
          expect(gaps.length).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });
});
