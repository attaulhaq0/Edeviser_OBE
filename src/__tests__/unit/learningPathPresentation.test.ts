import { describe, expect, it } from "vitest";

import {
  averagePercentage,
  buildBloomStageSummaries,
} from "@/lib/learningPathPresentation";
import type { LearningPathNode } from "@/hooks/useLearningPath";

const node = (overrides: Partial<LearningPathNode> = {}): LearningPathNode => ({
  assignment_id: "assignment-1",
  title: "Practice task",
  blooms_level: "remembering",
  status: "available",
  attainment_percent: 60,
  ...overrides,
});

describe("learningPathPresentation", () => {
  it("always builds the complete six-stage Bloom journey", () => {
    const stages = buildBloomStageSummaries([]);

    expect(stages.map((stage) => stage.key)).toEqual([
      "remembering",
      "understanding",
      "applying",
      "analyzing",
      "evaluating",
      "creating",
    ]);
    expect(stages.every((stage) => stage.status === "locked")).toBe(true);
  });

  it("derives completed, current, locked, and average mastery states", () => {
    const stages = buildBloomStageSummaries([
      node({ status: "graded", attainment_percent: 80 }),
      node({
        assignment_id: "assignment-2",
        status: "graded",
        attainment_percent: 90,
      }),
      node({
        assignment_id: "assignment-3",
        blooms_level: "understanding",
        status: "submitted",
        attainment_percent: 65,
      }),
    ]);

    expect(stages[0]).toMatchObject({ status: "done", attainment: 85 });
    expect(stages[1]).toMatchObject({ status: "current", attainment: 65 });
    expect(stages[2]).toMatchObject({ status: "locked", attainment: 0 });
  });

  it("handles empty percentage sets without NaN", () => {
    expect(averagePercentage([])).toBe(0);
  });
});
