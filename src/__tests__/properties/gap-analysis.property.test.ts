// Property 90: Gap status classification correctness
// Feature: edeviser-platform, Property 90

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { classifyGapStatus, classifyGapFlag } from "@/lib/gapAnalysis";

describe("Gap Analysis Properties", () => {
  it("unmapped outcomes have zero mapped children (non-CLO)", () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          title: fc.string({ minLength: 1 }),
          type: fc.constantFrom("ILO" as const, "PLO" as const),
          mapped_children_count: fc.constant(0),
          evidence_count: fc.nat({ max: 10 }),
          has_assessments: fc.boolean(),
        }),
        (outcome) => {
          const status = classifyGapStatus(outcome);
          expect(status).toBe("unmapped");
        }
      ),
      { numRuns: 100 }
    );
  });

  it("PLOs with < 2 mapped CLOs are flagged as under_mapped", () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          title: fc.string({ minLength: 1 }),
          type: fc.constant("PLO" as const),
          mapped_children_count: fc.constant(1),
          evidence_count: fc.integer({ min: 1, max: 50 }),
          has_assessments: fc.boolean(),
        }),
        (outcome) => {
          const flag = classifyGapFlag(outcome);
          expect(flag).toBe("under_mapped");
        }
      ),
      { numRuns: 100 }
    );
  });

  it("CLOs without assessments are flagged as unassessed", () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          title: fc.string({ minLength: 1 }),
          type: fc.constant("CLO" as const),
          mapped_children_count: fc.nat({ max: 5 }),
          evidence_count: fc.nat({ max: 10 }),
          has_assessments: fc.constant(false),
        }),
        (outcome) => {
          const flag = classifyGapFlag(outcome);
          expect(flag).toBe("unassessed");
        }
      ),
      { numRuns: 100 }
    );
  });
});
