// =============================================================================
// Schema Integrity Test — Verifies all Zod schema modules export correctly.
// =============================================================================
import { describe, it, expect } from "vitest";

describe("Build integrity: schema modules export correctly", () => {
  const schemaModules = [
    () => import("@/lib/schemas/badgeTier"),
    () => import("@/lib/schemas/badgeSpotlight"),
    () => import("@/lib/schemas/adaptiveXP"),
    () => import("@/lib/schemas/improvementBonus"),
    () => import("@/lib/schemas/challenge"),
    () => import("@/lib/schemas/institutionSettings"),
    () => import("@/lib/schemas/team"),
    () => import("@/lib/schemas/subCLO"),
    () => import("@/lib/schemas/competencyFramework"),
    () => import("@/lib/schemas/graduateAttribute"),
    () => import("@/lib/schemas/habitDifficulty"),
    () => import("@/lib/schemas/comebackChallenge"),
    () => import("@/lib/schemas/coverageHeatmap"),
    () => import("@/lib/schemas/gapAnalysis"),
    () => import("@/lib/schemas/sankeyFilter"),
  ];

  it.each(schemaModules.map((fn, i) => [i, fn]))(
    "schema module %i imports without error",
    async (_idx, importFn) => {
      const mod = await (importFn as () => Promise<unknown>)();
      expect(mod).toBeDefined();
      // Every schema module should export at least one Zod schema
      const exports = Object.keys(mod as Record<string, unknown>);
      expect(exports.length).toBeGreaterThan(0);
    }
  );
});
