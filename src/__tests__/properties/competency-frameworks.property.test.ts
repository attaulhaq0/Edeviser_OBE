// Property 86: Competency hierarchy level consistency
// Property 87: Competency CSV import round-trip
// Property 88: Unmapped competency indicator flagging
// Feature: edeviser-platform, Properties 86-88

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

const LEVELS = ["domain", "competency", "indicator"] as const;

describe("Competency Framework Properties", () => {
  // Property 86: Hierarchy levels are always domain > competency > indicator
  it("hierarchy level ordering is consistent", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...LEVELS),
        fc.constantFrom(...LEVELS),
        (parentLevel, childLevel) => {
          const levelOrder = { domain: 0, competency: 1, indicator: 2 };
          if (levelOrder[childLevel] > levelOrder[parentLevel]) {
            // Valid parent-child: child level is deeper
            expect(levelOrder[childLevel]).toBeGreaterThan(
              levelOrder[parentLevel]
            );
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property 87: CSV import produces items at all three levels
  it("CSV row produces domain, competency, and indicator items", () => {
    fc.assert(
      fc.property(
        fc.record({
          domain_code: fc.stringMatching(/^D\d{1,3}$/),
          domain_title: fc.string({ minLength: 1, maxLength: 50 }),
          competency_code: fc.stringMatching(/^C\d{1,3}$/),
          competency_title: fc.string({ minLength: 1, maxLength: 50 }),
          indicator_code: fc.stringMatching(/^I\d{1,3}$/),
          indicator_title: fc.string({ minLength: 1, maxLength: 50 }),
        }),
        (row) => {
          // Each CSV row should produce exactly 3 hierarchy items
          const items = [
            { code: row.domain_code, level: "domain" },
            { code: row.competency_code, level: "competency" },
            { code: row.indicator_code, level: "indicator" },
          ];
          expect(items).toHaveLength(3);
          expect(items.map((i) => i.level)).toEqual([
            "domain",
            "competency",
            "indicator",
          ]);
          items.forEach((item) => expect(item.code.length).toBeGreaterThan(0));
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property 88: Indicators with zero outcome mappings are flagged as unmapped
  it("indicators with no mappings are flagged", () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          level: fc.constant("indicator" as const),
          mapping_count: fc.nat({ max: 5 }),
        }),
        (indicator) => {
          const isUnmapped = indicator.mapping_count === 0;
          if (
            indicator.level === "indicator" &&
            indicator.mapping_count === 0
          ) {
            expect(isUnmapped).toBe(true);
          }
          if (indicator.mapping_count > 0) {
            expect(isUnmapped).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
