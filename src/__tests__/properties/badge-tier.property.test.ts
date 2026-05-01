// =============================================================================
// Property 111: Badge tier progression monotonicity
// Feature: edeviser-platform
// **Validates: Requirements 133.3, 133.5**
// =============================================================================

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

// ─── Pure functions mirroring check-badges tier logic ────────────────────────

type BadgeTier = "bronze" | "silver" | "gold";

interface TierThresholds {
  bronze: number;
  silver: number;
  gold: number;
}

const BADGE_TIER_THRESHOLDS: Record<string, TierThresholds> = {
  academic: { bronze: 5, silver: 15, gold: 30 },
  engagement: { bronze: 10, silver: 25, gold: 50 },
  streak: { bronze: 7, silver: 30, gold: 100 },
};

const TIER_ORDER: (BadgeTier | null)[] = [null, "bronze", "silver", "gold"];

function tierRank(tier: BadgeTier | null): number {
  return TIER_ORDER.indexOf(tier);
}

function checkBadgeTierProgression(
  currentTier: BadgeTier | null,
  category: string,
  metricValue: number
): { shouldUpgrade: boolean; newTier: BadgeTier } | null {
  const thresholds = BADGE_TIER_THRESHOLDS[category];
  if (!thresholds) return null;
  if (currentTier === "gold") return null;
  if (currentTier === "silver" && metricValue >= thresholds.gold) {
    return { shouldUpgrade: true, newTier: "gold" };
  }
  if (currentTier === "bronze" && metricValue >= thresholds.silver) {
    return { shouldUpgrade: true, newTier: "silver" };
  }
  if (currentTier === null && metricValue >= thresholds.bronze) {
    return { shouldUpgrade: true, newTier: "bronze" };
  }
  return null;
}

// ─── Generators ──────────────────────────────────────────────────────────────

const tierArb = fc.constantFrom(
  null,
  "bronze",
  "silver",
  "gold"
) as fc.Arbitrary<BadgeTier | null>;
const categoryArb = fc.constantFrom("academic", "engagement", "streak");

// ─── Properties ──────────────────────────────────────────────────────────────

describe("Property 111: Badge tier progression monotonicity", () => {
  it("tier only progresses upward: null → bronze → silver → gold", () => {
    fc.assert(
      fc.property(
        tierArb,
        categoryArb,
        fc.integer({ min: 0, max: 200 }),
        (currentTier, category, metric) => {
          const result = checkBadgeTierProgression(
            currentTier,
            category,
            metric
          );
          if (result && result.shouldUpgrade) {
            expect(tierRank(result.newTier)).toBeGreaterThan(
              tierRank(currentTier)
            );
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("student at gold tier is never upgraded further", () => {
    fc.assert(
      fc.property(
        categoryArb,
        fc.integer({ min: 0, max: 1000 }),
        (category, metric) => {
          const result = checkBadgeTierProgression("gold", category, metric);
          expect(result).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  it("upgrade is idempotent — same metric yields same result", () => {
    fc.assert(
      fc.property(
        tierArb,
        categoryArb,
        fc.integer({ min: 0, max: 200 }),
        (currentTier, category, metric) => {
          const result1 = checkBadgeTierProgression(
            currentTier,
            category,
            metric
          );
          const result2 = checkBadgeTierProgression(
            currentTier,
            category,
            metric
          );
          expect(result1).toEqual(result2);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("higher metric never results in lower tier", () => {
    fc.assert(
      fc.property(
        categoryArb,
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 0, max: 100 }),
        (category, metric1, delta) => {
          const metric2 = metric1 + delta;
          const result1 = checkBadgeTierProgression(null, category, metric1);
          const result2 = checkBadgeTierProgression(null, category, metric2);

          const tier1 = result1?.newTier ?? null;
          const tier2 = result2?.newTier ?? null;
          expect(tierRank(tier2)).toBeGreaterThanOrEqual(tierRank(tier1));
        }
      ),
      { numRuns: 100 }
    );
  });

  it("only highest tier is stored per category", () => {
    fc.assert(
      fc.property(
        categoryArb,
        fc.integer({ min: 0, max: 200 }),
        (category, metric) => {
          // Simulate progression from null through all tiers
          let currentTier: BadgeTier | null = null;
          for (let m = 0; m <= metric; m++) {
            const result = checkBadgeTierProgression(currentTier, category, m);
            if (result && result.shouldUpgrade) {
              currentTier = result.newTier;
            }
          }
          // Final tier should be the highest achievable for this metric
          const finalResult = checkBadgeTierProgression(null, category, metric);
          if (finalResult) {
            expect(tierRank(currentTier)).toBeGreaterThanOrEqual(
              tierRank(finalResult.newTier)
            );
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
