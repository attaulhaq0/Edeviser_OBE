import { it, expect } from "vitest";
import * as fc from "fast-check";
import { gradeSummary } from "../../../supabase/functions/generate-course-file/contracts";

// Feature: course-file-snapshot, Property 1: stored normalized values are summarized without fabricating evidence.
it("summarizes all and only scoped grades (100 generated populations)", () => {
  const assignments = [
    { id: "a", title: "Assignment", total_marks: 10, clo_weights: [] },
  ];
  fc.assert(
    fc.property(
      fc.array(fc.integer({ min: 0, max: 100 }), {
        minLength: 1,
        maxLength: 100,
      }),
      (scores) => {
        const submissions = scores.map((_, i) => ({
          id: String(i),
          assignment_id: "a",
        }));
        const grades = scores.map((score_percent, i) => ({
          submission_id: String(i),
          score_percent,
        }));
        const summary = gradeSummary(assignments, submissions, [
          ...grades,
          { submission_id: "foreign", score_percent: 999 },
        ])[0]!;
        expect(summary.count).toBe(scores.length);
        expect(summary.avg).toBeCloseTo(
          scores.reduce((sum, s) => sum + s, 0) / scores.length
        );
        expect(summary.best).toBe(Math.max(...scores));
        expect(summary.worst).toBe(Math.min(...scores));
      }
    ),
    { numRuns: 100 }
  );
});
