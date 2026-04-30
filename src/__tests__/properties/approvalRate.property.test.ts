// Feature: adaptive-quiz-generation, Property 18: Approval rate calculation
// **Validates: Requirements 3.7**

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { computeApprovalRate } from "@/lib/questionAnalytics";

describe("computeApprovalRate — property-based tests", () => {
  it("P18a: approval rate equals approved / total when total > 0", () => {
    fc.assert(
      fc.property(
        fc
          .integer({ min: 1, max: 500 })
          .chain((total) =>
            fc.tuple(fc.constant(total), fc.integer({ min: 0, max: total }))
          ),
        ([total, approved]) => {
          const result = computeApprovalRate(approved, total);
          expect(result).toBeCloseTo(approved / total, 10);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("P18b: result is always in [0, 1] when approved <= total", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 500 }),
        fc.integer({ min: 1, max: 500 }),
        (approved, total) => {
          const clamped = Math.min(approved, total);
          const result = computeApprovalRate(clamped, total);
          expect(result).toBeGreaterThanOrEqual(0);
          expect(result).toBeLessThanOrEqual(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("P18c: returns 0 when total is 0", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 100 }), (approved) => {
        expect(computeApprovalRate(approved, 0)).toBe(0);
      }),
      { numRuns: 100 }
    );
  });

  it("P18d: all approved equals rate of 1.0", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 500 }), (total) => {
        expect(computeApprovalRate(total, total)).toBeCloseTo(1.0, 10);
      }),
      { numRuns: 100 }
    );
  });

  it("P18e: none approved equals rate of 0", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 500 }), (total) => {
        expect(computeApprovalRate(0, total)).toBe(0);
      }),
      { numRuns: 100 }
    );
  });
});
