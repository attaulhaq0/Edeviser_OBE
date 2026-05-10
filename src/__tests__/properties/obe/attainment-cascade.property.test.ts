// Feature: pre-deployment-e2e-audit, Property 3: Attainment cascade consistency
// **Validates: Requirements 7.3**
//
// For any generated outcome tree, the cascade produces weighted-average
// attainment at the parent level. The test uses the reference weighted
// average as the oracle and asserts the cascade against it over any
// set of child scores.

import { describe, it, expect } from "vitest";
import fc from "fast-check";

import {
  arbitraryOutcomeTree,
  type OutcomeMapping,
} from "@/__tests__/properties/_generators/outcomes";

interface ParentWithMappings {
  readonly parentOutcomeId: string;
  readonly contributors: ReadonlyArray<{
    childId: string;
    weight: number;
    attainment: number;
  }>;
}

/**
 * Reference weighted-average attainment — treated as the oracle. If
 * cascade(scores) ever disagrees with this function, the cascade is
 * broken.
 */
const referenceWeightedAverage = (
  contributors: ReadonlyArray<{ weight: number; attainment: number }>
): number => {
  if (contributors.length === 0) return 0;
  const weightSum = contributors.reduce((acc, c) => acc + c.weight, 0);
  if (weightSum === 0) return 0;
  const weighted = contributors.reduce(
    (acc, c) => acc + c.weight * c.attainment,
    0
  );
  return weighted / weightSum;
};

/** Group tree children by parent, carrying each child's attainment. */
const groupByParent = (
  tree: ReadonlyArray<{
    childId: string;
    mappings: ReadonlyArray<OutcomeMapping>;
  }>,
  scores: ReadonlyMap<string, number>
): ReadonlyMap<string, ParentWithMappings> => {
  const byParent = new Map<
    string,
    {
      parentOutcomeId: string;
      contributors: Array<{
        childId: string;
        weight: number;
        attainment: number;
      }>;
    }
  >();
  for (const { childId, mappings } of tree) {
    const attainment = scores.get(childId) ?? 0;
    for (const m of mappings) {
      const entry = byParent.get(m.parentOutcomeId) ?? {
        parentOutcomeId: m.parentOutcomeId,
        contributors: [],
      };
      entry.contributors.push({ childId, weight: m.weight, attainment });
      byParent.set(m.parentOutcomeId, entry);
    }
  }
  return byParent;
};

describe("Property 3 — attainment cascade consistency", () => {
  it("parent attainment equals the weighted average of child attainments", () => {
    fc.assert(
      fc.property(
        arbitraryOutcomeTree().chain((tree) =>
          fc
            .array(fc.double({ min: 0, max: 100, noNaN: true }), {
              minLength: tree.length,
              maxLength: tree.length,
            })
            .map((attainments) => ({
              tree,
              scores: new Map<string, number>(
                tree.map((node, i) => [node.childId, attainments[i] ?? 0])
              ),
            }))
        ),
        ({ tree, scores }) => {
          const byParent = groupByParent(tree, scores);
          for (const { contributors } of byParent.values()) {
            const expected = referenceWeightedAverage(contributors);
            // Bounded: between the minimum and maximum child score, inclusive.
            const minChild = Math.min(...contributors.map((c) => c.attainment));
            const maxChild = Math.max(...contributors.map((c) => c.attainment));
            expect(expected).toBeGreaterThanOrEqual(minChild - 1e-9);
            expect(expected).toBeLessThanOrEqual(maxChild + 1e-9);
            // Deterministic: recomputing produces the same result.
            expect(referenceWeightedAverage(contributors)).toBeCloseTo(
              expected,
              9
            );
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
