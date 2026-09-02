import {
  describe,
  expect,
  it,
} from "vitest";
import {
  buildScoreExplanation,
  computeRubricCoverage,
  type RubricCriterionLike,
} from "@/lib/gradingInsights";

const criteria: RubricCriterionLike[] = [
  {
    id: "c2",
    criterion_name: "Analysis",
    sort_order: 2,
    levels: [{ label: "Weak" }, { label: "Good" }],
    max_points: 10,
  },
  {
    id: "c1",
    criterion_name: "Thesis",
    sort_order: 1,
    levels: [{ label: "Missing" }, { label: "Clear" }],
    max_points: 5,
  },
  {
    id: "c3",
    criterion_name: "Evidence",
    sort_order: 3,
    levels: [{ label: "None" }, { label: "Strong" }],
    max_points: 8,
  },
];

describe("computeRubricCoverage (E2.A)", () => {
  it("returns 0% for an empty rubric", () => {
    const coverage = computeRubricCoverage([], new Map());
    expect(coverage).toEqual({ covered: 0, total: 0, percent: 0 });
  });

  it("counts only criteria with a selected level", () => {
    const selections = new Map([
      ["c1", { levelIndex: 1, points: 5 }],
      ["c3", { levelIndex: 0, points: 0 }],
    ]);
    const coverage = computeRubricCoverage(criteria, selections);
    expect(coverage.covered).toBe(2);
    expect(coverage.total).toBe(3);
    expect(coverage.percent).toBe(67);
  });

  it("returns 100% when every criterion is assessed", () => {
    const selections = new Map([
      ["c1", { levelIndex: 0, points: 2 }],
      ["c2", { levelIndex: 1, points: 8 }],
      ["c3", { levelIndex: 1, points: 7 }],
    ]);
    expect(computeRubricCoverage(criteria, selections).percent).toBe(100);
  });
});

describe("buildScoreExplanation (E2.A why-explains-score)", () => {
  it("returns rows in rubric sort_order, omitting unassessed criteria", () => {
    const selections = new Map([
      ["c2", { levelIndex: 1, points: 8 }],
      ["c1", { levelIndex: 1, points: 5 }],
    ]);
    const rows = buildScoreExplanation(criteria, selections);
    expect(rows.map((r) => r.criterionName)).toEqual(["Thesis", "Analysis"]);
    expect(rows[0]).toMatchObject({
      levelLabel: "Clear",
      points: 5,
      maxPoints: 5,
    });
    expect(rows[1]).toMatchObject({
      levelLabel: "Good",
      points: 8,
      maxPoints: 10,
    });
  });

  it("falls back to an em-dash label for an out-of-range level index", () => {
    const rows = buildScoreExplanation(
      criteria,
      new Map([["c3", { levelIndex: 9, points: 4 }]])
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.levelLabel).toBe("—");
  });

  it("returns no rows when nothing is assessed", () => {
    expect(buildScoreExplanation(criteria, new Map())).toEqual([]);
  });
});
