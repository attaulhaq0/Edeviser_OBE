// =============================================================================
// Property 108: Percentile band assignment correctness
// Feature: edeviser-platform
// **Validates: Requirements 131.1, 131.2, 131.3**
// =============================================================================

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { calculatePercentileBand } from "@/lib/percentileBand";

// ─── Properties ──────────────────────────────────────────────────────────────

describe("Property 108: Percentile band assignment correctness", () => {
  it("top 10 students always see exact rank", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        fc.integer({ min: 10, max: 10000 }),
        (rank, totalStudents) => {
          const result = calculatePercentileBand(rank, totalStudents);
          expect(result.type).toBe("exact");
          if (result.type === "exact") {
            expect(result.rank).toBe(rank);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("students ranked > 10 see a percentile band", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 11, max: 10000 }),
        fc.integer({ min: 100, max: 10000 }),
        (rank, totalStudents) => {
          // Ensure rank <= totalStudents
          const effectiveTotal = Math.max(rank, totalStudents);
          const result = calculatePercentileBand(rank, effectiveTotal);
          expect(result.type).toBe("band");
        }
      ),
      { numRuns: 100 }
    );
  });

  it("band assignment is mutually exclusive", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 11, max: 10000 }),
        fc.integer({ min: 100, max: 10000 }),
        (rank, totalStudents) => {
          const effectiveTotal = Math.max(rank, totalStudents);
          const result = calculatePercentileBand(rank, effectiveTotal);
          if (result.type === "band") {
            const validBands = ["Top 10%", "Top 25%", "Top 50%", "Bottom 50%"];
            expect(validBands).toContain(result.band);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("percentile = rank/total * 100 determines band correctly", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 11, max: 10000 }),
        fc.integer({ min: 100, max: 10000 }),
        (rank, totalStudents) => {
          const effectiveTotal = Math.max(rank, totalStudents);
          const result = calculatePercentileBand(rank, effectiveTotal);
          const percentile = (rank / effectiveTotal) * 100;

          if (result.type === "band") {
            if (percentile <= 10) expect(result.band).toBe("Top 10%");
            else if (percentile <= 25) expect(result.band).toBe("Top 25%");
            else if (percentile <= 50) expect(result.band).toBe("Top 50%");
            else expect(result.band).toBe("Bottom 50%");
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("result is always one of exact or band type", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10000 }),
        fc.integer({ min: 1, max: 10000 }),
        (rank, totalStudents) => {
          const result = calculatePercentileBand(rank, totalStudents);
          expect(["exact", "band"]).toContain(result.type);
        }
      ),
      { numRuns: 100 }
    );
  });
});
