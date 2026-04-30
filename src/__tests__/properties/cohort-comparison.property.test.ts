// Property 94: Cohort comparison average attainment and gap detection
// Property 95: Cohen's d effect size calculation
// Feature: edeviser-platform, Properties 94-95

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  calculateCohensD,
  hasSignificantGap,
  interpretCohensD,
} from "@/lib/cohortStats";

describe("Cohort Comparison Properties", () => {
  // Property 94: Significant gap detected when ≥15pp difference
  it("detects significant gap at ≥15pp difference", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 100, noNaN: true }),
        fc.double({ min: 0, max: 100, noNaN: true }),
        (mean1, mean2) => {
          const result = hasSignificantGap(mean1, mean2);
          if (Math.abs(mean1 - mean2) >= 15) {
            expect(result).toBe(true);
          } else {
            expect(result).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property 95: Cohen's d returns null when n < 20
  it("returns null for small sample sizes", () => {
    fc.assert(
      fc.property(
        fc.record({
          label: fc.string(),
          mean: fc.double({ min: 0, max: 100, noNaN: true }),
          stdDev: fc.double({ min: 0.1, max: 30, noNaN: true }),
          n: fc.integer({ min: 1, max: 19 }),
        }),
        fc.record({
          label: fc.string(),
          mean: fc.double({ min: 0, max: 100, noNaN: true }),
          stdDev: fc.double({ min: 0.1, max: 30, noNaN: true }),
          n: fc.integer({ min: 20, max: 500 }),
        }),
        (small, large) => {
          const result = calculateCohensD(small, large);
          expect(result).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  it("Cohen d interpretation covers all ranges", () => {
    fc.assert(
      fc.property(fc.double({ min: -3, max: 3, noNaN: true }), (d) => {
        const label = interpretCohensD(d);
        expect(["Negligible", "Small", "Medium", "Large"]).toContain(label);
      }),
      { numRuns: 100 }
    );
  });
});
