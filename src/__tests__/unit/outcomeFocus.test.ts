// Feature: Alignment summary ranking (frontend-plan.md; Wave D4 review fix).
// Direct unit coverage of the pure focus-area selector moved out of
// OutcomeAlignmentSummary into src/lib/outcomeFocus.ts per repo convention
// ("business logic lives in src/lib/"). Properties under test:
//
// Property 1 (flatten+rank): weakest-rated outcomes lead, ascending by percent.
// Property 2 (no-invented-scores / Digital Twin guardrail): unrated outcomes
//            (attainment_percent === null) NEVER surface — null never becomes
//            0%, matching the display/hint-only rule (.clinerules/08).
// Property 3 (stable ties): equal attainment preserves evidence order between
//            renders (ES2019+ stable sort) so UI focus lists don't shuffle.
// Property 4 (bounded output): result length ≤ limit; default limit is 3.
import { describe, expect, it } from "vitest";
import {
  selectWeakestOutcomes,
  type OutcomeFocusCourseLike,
} from "@/lib/outcomeFocus";

const entry = (
  cloId: string,
  title: string,
  percent: number | null,
  courseName?: string
) => ({
  clo_id: cloId,
  clo_title: title,
  attainment_percent: percent,
  course_name: courseName,
});

const course = (
  ...entries: OutcomeFocusCourseLike["entries"]
): OutcomeFocusCourseLike => ({
  entries,
});

describe("outcomeFocus / selectWeakestOutcomes", () => {
  it("returns an empty list for empty input (Property 4 vacuous)", () => {
    expect(selectWeakestOutcomes([])).toEqual([]);
  });

  it("flattens across multiple courses and ranks weakest-first (Property 1)", () => {
    const result = selectWeakestOutcomes([
      course(entry("c1", "Loops", 82), entry("c2", "Recursion", 40)),
      course(entry("c3", "Big-O", 61)),
    ]);
    expect(result.map((r) => r.cloId)).toEqual(["c2", "c3", "c1"]);
    expect(result[0]).toMatchObject({ title: "Recursion", percent: 40 });
  });

  it("excludes unrated outcomes outright — null never becomes 0% (Property 2)", () => {
    const result = selectWeakestOutcomes([
      course(entry("u1", "Unrated", null), entry("r1", "Rated", 55)),
    ]);
    expect(result).toHaveLength(1);
    expect(result.map((r) => r.cloId)).toEqual(["r1"]);
  });

  it("preserves evidence order on ties (Property 3, stable sort)", () => {
    const result = selectWeakestOutcomes([
      course(
        entry("first", "First seen", 50),
        entry("second", "Second seen", 50)
      ),
      course(entry("third", "Third seen", 50)),
    ]);
    expect(result.map((r) => r.cloId)).toEqual(["first", "second", "third"]);
  });

  it("caps at the default limit of 3 and honours a custom limit (Property 4)", () => {
    const many = [90, 20, 70, 10, 45].map((percent, i) =>
      course(entry(`k${i}`, `Outcome ${i}`, percent))
    );
    expect(selectWeakestOutcomes(many)).toHaveLength(3);
    const custom = selectWeakestOutcomes(many, 2);
    expect(custom.map((r) => r.percent)).toEqual([10, 20]);
  });

  it("defaults courseName to an empty string when the bundle omits it", () => {
    const result = selectWeakestOutcomes([
      course({ clo_id: "x", clo_title: "No course", attainment_percent: 33 }),
    ]);
    expect(result.map((r) => r.courseName)).toEqual([""]);
  });
});
