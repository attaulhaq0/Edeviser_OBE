import { describe, it, expect } from "vitest";
import {
  canonicalPairs,
  gradeSummary,
  attainmentSummary,
  assignmentSummary,
  parseInput,
} from "../../../supabase/functions/generate-course-file/contracts";
const clos = [{ id: "child", title: "Child", blooms_level: null }];
const plos = [{ id: "parent", title: "Parent", blooms_level: null }];
const assignments = [
  {
    id: "a",
    title: "Assignment",
    total_marks: 10,
    clo_weights: [{ clo_id: "child", weight: 1 }],
  },
];

describe("production course file pure contracts", () => {
  it("accepts UUID identities and rejects arrays, blank IDs and malformed IDs", () => {
    const input = {
      course_id: "11111111-1111-1111-1111-111111111111",
      semester_id: "22222222-2222-2222-2222-222222222222",
    };
    expect(parseInput(input)).toEqual(input);
    for (const invalid of [
      null,
      [],
      {},
      { ...input, course_id: "" },
      { ...input, semester_id: "other" },
    ])
      expect(() => parseInput(invalid)).toThrow("INVALID_REQUEST");
  });
  it("maps parent to child only, not reverse or foreign program parents", () => {
    expect(
      canonicalPairs(clos, plos, [
        {
          source_outcome_id: "parent",
          target_outcome_id: "child",
          weight: 0.4,
        },
        { source_outcome_id: "child", target_outcome_id: "parent", weight: 1 },
        { source_outcome_id: "foreign", target_outcome_id: "child", weight: 1 },
      ])
    ).toEqual([{ clo_title: "Child", plo_title: "Parent", weight: 0.4 }]);
  });
  it("uses clo_weights safely without displaying foreign outcome IDs", () => {
    expect(
      assignmentSummary(
        [
          {
            ...assignments[0]!,
            clo_weights: [{ clo_id: "foreign" }, null, {}, { clo_id: "child" }],
          },
        ],
        clos
      )[0]?.clo_titles
    ).toBe("Child");
  });
  it("does not turn missing attainment into zero or grade bands", () => {
    expect(
      attainmentSummary(clos, [
        {
          outcome_id: "child",
          student_id: "s",
          attainment_percent: 0,
          sample_count: 0,
        },
      ])
    ).toEqual([{ clo_title: "Child", avg_percent: null, count: 0 }]);
    expect(
      attainmentSummary(clos, [
        {
          outcome_id: "child",
          student_id: "s",
          attainment_percent: 0,
          sample_count: 1,
        },
      ])[0]?.avg_percent
    ).toBe(0);
  });
  it("rejects duplicate grades/learner attainment and out-of-range source scores", () => {
    const grade = { submission_id: "s", score_percent: 10 };
    expect(() =>
      gradeSummary(
        assignments,
        [{ id: "s", assignment_id: "a" }],
        [grade, grade]
      )
    ).toThrow("INVALID_SOURCE_DATA");
    for (const value of [-1, 101, NaN, Infinity]) {
      expect(() =>
        gradeSummary(
          assignments,
          [{ id: "s", assignment_id: "a" }],
          [{ ...grade, score_percent: value }]
        )
      ).toThrow("INVALID_SOURCE_DATA");
    }
    const row = {
      outcome_id: "child",
      student_id: "s",
      attainment_percent: 10,
      sample_count: 1,
    };
    expect(() => attainmentSummary(clos, [row, row])).toThrow(
      "INVALID_SOURCE_DATA"
    );
  });
});
