// Feature: ai-tutor-rag, Property 47: Big Five mapping — Openness ≥70th → Socratic Guide, Conscientiousness ≥70th → Step-by-Step Coach
// Feature: ai-tutor-rag, Property 48: Fallback to null when no profile
// **Validates: Requirements 26.1, 26.2, 26.4**

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  autoSelectPersona,
  type BigFiveProfile,
} from "@/lib/tutorPersonaAutoSelect";

// ─── Generators ─────────────────────────────────────────────────────────────

const percentileArb = fc.integer({ min: 0, max: 100 });

// bigFiveProfileArb intentionally omitted — tests construct profiles inline for precise trait control

// ─── Property 47: Big Five mapping correctness ──────────────────────────────

describe("Property 47 — Big Five mapping to persona", () => {
  it("P47a: Openness ≥70 and highest → Socratic Guide", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 70, max: 100 }),
        fc.integer({ min: 0, max: 69 }),
        percentileArb,
        percentileArb,
        percentileArb,
        (
          openness,
          conscientiousness,
          extraversion,
          agreeableness,
          neuroticism
        ) => {
          // Ensure openness is strictly the highest mappable trait
          const profile: BigFiveProfile = {
            openness,
            conscientiousness: Math.min(conscientiousness, openness - 1),
            extraversion,
            agreeableness,
            neuroticism,
          };
          const result = autoSelectPersona(profile);
          expect(result).not.toBeNull();
          expect(result!.persona).toBe("socratic_guide");
        }
      ),
      { numRuns: 100 }
    );
  });

  it("P47b: Conscientiousness ≥70 and highest → Step-by-Step Coach", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 70, max: 100 }),
        fc.integer({ min: 0, max: 69 }),
        percentileArb,
        percentileArb,
        percentileArb,
        (
          conscientiousness,
          openness,
          extraversion,
          agreeableness,
          neuroticism
        ) => {
          // Ensure conscientiousness is strictly the highest mappable trait
          const profile: BigFiveProfile = {
            openness: Math.min(openness, conscientiousness - 1),
            conscientiousness,
            extraversion,
            agreeableness,
            neuroticism,
          };
          const result = autoSelectPersona(profile);
          expect(result).not.toBeNull();
          expect(result!.persona).toBe("step_by_step_coach");
        }
      ),
      { numRuns: 100 }
    );
  });

  it("P47c: when multiple traits are high, highest percentile wins", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 70, max: 100 }),
        fc.integer({ min: 70, max: 100 }),
        percentileArb,
        percentileArb,
        percentileArb,
        (
          openness,
          conscientiousness,
          extraversion,
          agreeableness,
          neuroticism
        ) => {
          // Ensure they are not equal so there's a clear winner
          const adjustedOpenness = openness;
          const adjustedConscientiousness =
            conscientiousness === openness
              ? conscientiousness - 1
              : conscientiousness;

          const profile: BigFiveProfile = {
            openness: adjustedOpenness,
            conscientiousness: Math.max(0, adjustedConscientiousness),
            extraversion,
            agreeableness,
            neuroticism,
          };
          const result = autoSelectPersona(profile);
          expect(result).not.toBeNull();

          if (adjustedOpenness > Math.max(0, adjustedConscientiousness)) {
            expect(result!.persona).toBe("socratic_guide");
          } else {
            expect(result!.persona).toBe("step_by_step_coach");
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("P47d: high neuroticism adds tone modifier regardless of persona", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 70, max: 100 }),
        fc.integer({ min: 70, max: 100 }),
        percentileArb,
        percentileArb,
        (openness, neuroticism, extraversion, agreeableness) => {
          const profile: BigFiveProfile = {
            openness,
            conscientiousness: 0,
            extraversion,
            agreeableness,
            neuroticism,
          };
          const result = autoSelectPersona(profile);
          expect(result).not.toBeNull();
          expect(result!.toneModifier).toBeDefined();
          expect(result!.toneModifier!.length).toBeGreaterThan(0);
          expect(result!.toneModifier).toContain("warm");
        }
      ),
      { numRuns: 100 }
    );
  });

  it("P47e: low neuroticism does NOT add tone modifier", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 70, max: 100 }),
        fc.integer({ min: 0, max: 69 }),
        percentileArb,
        percentileArb,
        (openness, neuroticism, extraversion, agreeableness) => {
          const profile: BigFiveProfile = {
            openness,
            conscientiousness: 0,
            extraversion,
            agreeableness,
            neuroticism,
          };
          const result = autoSelectPersona(profile);
          expect(result).not.toBeNull();
          expect(result!.toneModifier).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it("P47f: no trait ≥70 defaults to quick_explainer", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 69 }),
        fc.integer({ min: 0, max: 69 }),
        percentileArb,
        percentileArb,
        fc.integer({ min: 0, max: 69 }),
        (
          openness,
          conscientiousness,
          extraversion,
          agreeableness,
          neuroticism
        ) => {
          const profile: BigFiveProfile = {
            openness,
            conscientiousness,
            extraversion,
            agreeableness,
            neuroticism,
          };
          const result = autoSelectPersona(profile);
          expect(result).not.toBeNull();
          expect(result!.persona).toBe("quick_explainer");
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property 48: Fallback to null when no profile ──────────────────────────

describe("Property 48 — Fallback to null when no profile", () => {
  it("P48a: null profile returns null", () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const result = autoSelectPersona(null);
        expect(result).toBeNull();
      }),
      { numRuns: 100 }
    );
  });

  it("P48b: undefined profile returns null", () => {
    fc.assert(
      fc.property(fc.constant(undefined), () => {
        const result = autoSelectPersona(undefined);
        expect(result).toBeNull();
      }),
      { numRuns: 100 }
    );
  });
});
