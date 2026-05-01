// Property 89: Sankey data transformation correctness
// Feature: edeviser-platform, Property 89

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { transformToSankey } from "@/lib/sankeyTransform";

describe("Sankey Diagram Properties", () => {
  it("node count equals input outcome count", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            type: fc.constantFrom(
              "ILO" as const,
              "PLO" as const,
              "CLO" as const
            ),
            title: fc.string({ minLength: 1, maxLength: 50 }),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        (outcomes) => {
          const { nodes } = transformToSankey(outcomes, [], []);
          expect(nodes).toHaveLength(outcomes.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("attainment colors follow threshold rules", () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 100, noNaN: true }), (score) => {
        const outcomes = [{ id: "test", type: "CLO" as const, title: "Test" }];
        const attainments = [{ outcome_id: "test", score_percent: score }];
        const { nodes } = transformToSankey(outcomes, [], attainments);
        const node = nodes[0]!;

        if (score >= 85) expect(node.color).toBe("#22c55e");
        else if (score >= 70) expect(node.color).toBe("#3b82f6");
        else if (score >= 50) expect(node.color).toBe("#f59e0b");
        else if (score > 0) expect(node.color).toBe("#ef4444");
        else expect(node.color).toBe("#94a3b8");
      }),
      { numRuns: 100 }
    );
  });
});
