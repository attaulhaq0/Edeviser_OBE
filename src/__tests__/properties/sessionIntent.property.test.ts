// =============================================================================
// Property Tests — Session Intent (P21) & Quick Thought (P29)
// Feature: weekly-planner-today-view, Properties 21, 29
// =============================================================================

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { sessionIntentSchema, quickThoughtSchema } from "@/lib/schemas/planner";

describe("Property 21: Session intent validation", () => {
  it("accepts valid intents with concept 5-200 chars and criterion 5-200 chars", () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.string({ minLength: 5, maxLength: 200 }),
        fc.string({ minLength: 5, maxLength: 200 }),
        (sessionId, concept, criterion) => {
          const result = sessionIntentSchema.safeParse({
            sessionId,
            concept,
            successCriterion: criterion,
          });
          expect(result.success).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("rejects intents with concept shorter than 5 chars", () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.string({ minLength: 0, maxLength: 4 }),
        fc.string({ minLength: 5, maxLength: 200 }),
        (sessionId, concept, criterion) => {
          const result = sessionIntentSchema.safeParse({
            sessionId,
            concept,
            successCriterion: criterion,
          });
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("rejects intents with criterion shorter than 5 chars", () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.string({ minLength: 5, maxLength: 200 }),
        fc.string({ minLength: 0, maxLength: 4 }),
        (sessionId, concept, criterion) => {
          const result = sessionIntentSchema.safeParse({
            sessionId,
            concept,
            successCriterion: criterion,
          });
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe("Property 29: Quick thought length constraint", () => {
  it("accepts quick thoughts 1-280 chars", () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.string({ minLength: 1, maxLength: 280 }),
        (sessionId, text) => {
          const result = quickThoughtSchema.safeParse({ sessionId, text });
          expect(result.success).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("rejects empty quick thoughts", () => {
    fc.assert(
      fc.property(fc.uuid(), (sessionId) => {
        const result = quickThoughtSchema.safeParse({ sessionId, text: "" });
        expect(result.success).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it("rejects quick thoughts over 280 chars", () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.string({ minLength: 281, maxLength: 500 }),
        (sessionId, text) => {
          const result = quickThoughtSchema.safeParse({ sessionId, text });
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});
