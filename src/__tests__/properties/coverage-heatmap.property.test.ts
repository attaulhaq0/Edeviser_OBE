// Property 91: Coverage heatmap data integrity
// Feature: edeviser-platform, Property 91

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  buildHeatmapMatrix,
  getEvidenceCountColor,
  getAttainmentColor,
} from "@/lib/coverageHeatmap";

describe("Coverage Heatmap Properties", () => {
  it("matrix dimensions match input CLOs and courses", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({ id: fc.uuid(), title: fc.string({ minLength: 1 }) }),
          { minLength: 1, maxLength: 10 }
        ),
        fc.array(
          fc.record({ id: fc.uuid(), name: fc.string({ minLength: 1 }) }),
          { minLength: 1, maxLength: 10 }
        ),
        (clos, courses) => {
          const matrix = buildHeatmapMatrix(clos, courses, []);
          expect(matrix.clo_ids).toHaveLength(clos.length);
          expect(matrix.course_ids).toHaveLength(courses.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("evidence count color scale is monotonically darker", () => {
    fc.assert(
      fc.property(fc.nat({ max: 20 }), (count) => {
        const color = getEvidenceCountColor(count);
        expect(color).toBeTruthy();
        if (count === 0) expect(color).toBe("#ffffff");
      }),
      { numRuns: 100 }
    );
  });

  it("attainment color follows threshold rules", () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 100, noNaN: true }), (score) => {
        const color = getAttainmentColor(score);
        if (score >= 85) expect(color).toBe("#dcfce7");
        else if (score >= 70) expect(color).toBe("#dbeafe");
        else if (score >= 50) expect(color).toBe("#fef9c3");
        else expect(color).toBe("#fee2e2");
      }),
      { numRuns: 100 }
    );
  });
});
