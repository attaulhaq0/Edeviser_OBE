import { describe, expect, it } from "vitest";
import { transformToSankey } from "@/lib/sankeyTransform";

describe("transformToSankey", () => {
  it("preserves canonical parent-to-child flow direction", () => {
    const result = transformToSankey(
      [
        { id: "ilo", type: "ILO", title: "Institutional" },
        { id: "plo", type: "PLO", title: "Program" },
        { id: "clo", type: "CLO", title: "Course" },
      ],
      [
        { parent_id: "ilo", child_id: "plo", weight: 1 },
        { parent_id: "plo", child_id: "clo", weight: 1 },
      ],
      []
    );

    expect(result.links).toEqual([
      { source: 0, target: 1, value: 1, weight: 1 },
      { source: 1, target: 2, value: 1, weight: 1 },
    ]);
  });
});
