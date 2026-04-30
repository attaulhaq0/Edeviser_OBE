// =============================================================================
// Property 112: Badge Spotlight XP bonus application
// Feature: edeviser-platform
// **Validates: Requirements 134.1, 134.5**
// =============================================================================

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

// ─── Pure functions mirroring award-xp spotlight logic ───────────────────────

function calculateSpotlightMultiplier(
  badgeCategory: string | null,
  spotlightCategory: string | null
): number {
  if (!badgeCategory || !spotlightCategory) return 1.0;
  return badgeCategory === spotlightCategory ? 2.0 : 1.0;
}

function calculateBadgeXPWithSpotlight(
  baseXP: number,
  badgeCategory: string | null,
  spotlightCategory: string | null
): number {
  const multiplier = calculateSpotlightMultiplier(
    badgeCategory,
    spotlightCategory
  );
  return Math.floor(baseXP * multiplier);
}

// ─── Generators ──────────────────────────────────────────────────────────────

const categoryArb = fc.constantFrom(
  "academic",
  "engagement",
  "streak",
  "wellness",
  "social"
);

// ─── Properties ──────────────────────────────────────────────────────────────

describe("Property 112: Badge Spotlight XP bonus application", () => {
  it("spotlight category badge gets exactly 2x XP", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 500 }),
        categoryArb,
        (baseXP, category) => {
          const xp = calculateBadgeXPWithSpotlight(baseXP, category, category);
          expect(xp).toBe(Math.floor(baseXP * 2));
        }
      ),
      { numRuns: 100 }
    );
  });

  it("non-spotlight category badge gets standard 1x XP", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 500 }),
        categoryArb,
        categoryArb,
        (baseXP, badgeCategory, spotlightCategory) => {
          if (badgeCategory === spotlightCategory) return; // skip matching
          const xp = calculateBadgeXPWithSpotlight(
            baseXP,
            badgeCategory,
            spotlightCategory
          );
          expect(xp).toBe(Math.floor(baseXP * 1));
        }
      ),
      { numRuns: 100 }
    );
  });

  it("no spotlight active means standard XP", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 500 }),
        categoryArb,
        (baseXP, badgeCategory) => {
          const xp = calculateBadgeXPWithSpotlight(baseXP, badgeCategory, null);
          expect(xp).toBe(baseXP);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("spotlight multiplier is always 1.0 or 2.0", () => {
    fc.assert(
      fc.property(
        fc.oneof(categoryArb, fc.constant(null)),
        fc.oneof(categoryArb, fc.constant(null)),
        (badgeCat, spotlightCat) => {
          const mult = calculateSpotlightMultiplier(badgeCat, spotlightCat);
          expect([1.0, 2.0]).toContain(mult);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("spotlight XP is always >= standard XP", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 500 }),
        categoryArb,
        fc.oneof(categoryArb, fc.constant(null)),
        (baseXP, badgeCategory, spotlightCategory) => {
          const spotlightXP = calculateBadgeXPWithSpotlight(
            baseXP,
            badgeCategory,
            spotlightCategory
          );
          const standardXP = calculateBadgeXPWithSpotlight(
            baseXP,
            badgeCategory,
            null
          );
          expect(spotlightXP).toBeGreaterThanOrEqual(standardXP);
        }
      ),
      { numRuns: 100 }
    );
  });
});
