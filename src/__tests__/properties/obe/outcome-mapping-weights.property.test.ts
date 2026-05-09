// Feature: pre-deployment-e2e-audit, Property 1: Outcome-mapping weights sum to 100
// **Validates: Requirements 7.1**
//
// For every child outcome, the sum of its mapping weights to parent
// outcomes MUST equal exactly 100. Coordinators cannot save mappings that
// violate this invariant, and downstream attainment cascade math depends
// on it. See .kiro/steering/domain-knowledge.md.

import { describe, it, expect } from "vitest";
import fc from "fast-check";

import {
  arbitraryChildOutcomeMappings,
  arbitraryOutcomeTree,
  arbitraryWeightPartition,
} from "../_generators/outcomes";

describe("Property 1 — outcome mapping weights sum to 100", () => {
  it("every generated weight partition sums to exactly 100", () => {
    fc.assert(
      fc.property(arbitraryWeightPartition(), (weights) => {
        const sum = weights.reduce((acc, w) => acc + w, 0);
        expect(sum).toBe(100);
      }),
      { numRuns: 200 }
    );
  });

  it("every generated child mapping set sums to exactly 100", () => {
    fc.assert(
      fc.property(arbitraryChildOutcomeMappings(), (mappings) => {
        const sum = mappings.reduce((acc, m) => acc + m.weight, 0);
        expect(sum).toBe(100);
      }),
      { numRuns: 200 }
    );
  });

  it("every child in a generated outcome tree preserves the sum-to-100 invariant", () => {
    fc.assert(
      fc.property(arbitraryOutcomeTree(), (tree) => {
        for (const { mappings } of tree) {
          const sum = mappings.reduce((acc, m) => acc + m.weight, 0);
          expect(sum).toBe(100);
        }
      }),
      { numRuns: 100 }
    );
  });
});
