// Feature: ai-tutor-rag, Property 47: High Openness (≥70) maps to socratic_guide
// Feature: ai-tutor-rag, Property 48: Null/undefined profile returns null (fallback to manual selection)
// **Validates: Requirements 26.1, 26.2, 26.4**

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { autoSelectPersona } from "@/lib/tutorPersonaAutoSelect";
import type { BigFiveTraits } from "@/lib/scoreCalculator";

// ─── Arbitraries ────────────────────────────────────────────────────────────

/** Score in the 0-100 range */
const scoreArb = fc.integer({ min: 0, max: 100 });

/** High score (≥70) */
const highScoreArb = fc.integer({ min: 70, max: 100 });

/** Low score (<70) */
const lowScoreArb = fc.integer({ min: 0, max: 69 });

// ─── P47: High Openness (≥70) maps to socratic_guide ────────────────────────

describe("Property 47 — High Openness maps to socratic_guide", () => {
  it("P47: when openness is highest trait at ≥70, persona is socratic_guide", () => {
    fc.assert(
      fc.property(
        highScoreArb,
        lowScoreArb,
        scoreArb,
        scoreArb,
        scoreArb,
        (openness, conscientiousness, extraversion, agreeableness, neuroticism) => {
          // Ensure openness is strictly higher than conscientiousness
          const profile: BigFiveTraits = {
            openness,
            conscientiousness: Math.min(conscientiousness, openness - 1),
            extraversion,
            agreeableness,
            neuroticism,
          };
          const result = autoSelectPersona(profile);
          expect(result).not.toBeNull();
          expect(result!.persona).toBe("socratic_guide");
        },
      ),
      { numRuns: 100 },
    );
  });

  it("P47b: when conscientiousness is highest trait at ≥70, persona is step_by_step_coach", () => {
    fc.assert(
      fc.property(
        highScoreArb,
        lowScoreArb,
        scoreArb,
        scoreArb,
        scoreArb,
        (conscientiousness, openness, extraversion, agreeableness, neuroticism) => {
          const profile: BigFiveTraits = {
            openness: Math.min(openness, conscientiousness - 1),
            conscientiousness,
            extraversion,
            agreeableness,
            neuroticism,
          };
          const result = autoSelectPersona(profile);
          expect(result).not.toBeNull();
          expect(result!.persona).toBe("step_by_step_coach");
        },
      ),
      { numRuns: 100 },
    );
  });

  it("P47c: when neither openness nor conscientiousness is ≥70, persona is quick_explainer", () => {
    fc.assert(
      fc.property(
        lowScoreArb,
        lowScoreArb,
        scoreArb,
        scoreArb,
        scoreArb,
        (openness, conscientiousness, extraversion, agreeableness, neuroticism) => {
          const profile: BigFiveTraits = {
            openness,
            conscientiousness,
            extraversion,
            agreeableness,
            neuroticism,
          };
          const result = autoSelectPersona(profile);
          expect(result).not.toBeNull();
          expect(result!.persona).toBe("quick_explainer");
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── P48: Null/undefined profile returns null ───────────────────────────────

describe("Property 48 — Null/undefined profile returns null", () => {
  it("P48a: null profile returns null", () => {
    const result = autoSelectPersona(null);
    expect(result).toBeNull();
  });

  it("P48b: undefined profile returns null", () => {
    const result = autoSelectPersona(undefined);
    expect(result).toBeNull();
  });
});
