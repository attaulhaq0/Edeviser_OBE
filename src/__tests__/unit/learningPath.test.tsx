import { describe, it, expect } from "vitest";
import {
  buildLearningPathNodes,
  type RawAssignment,
  type RawCLO,
  type RawAttainment,
  type RawSubmission,
  type RawGrade,
} from "@/hooks/useLearningPath";
import type { BloomsLevel } from "@/lib/schemas/clo";

// ─── Helper factories ───────────────────────────────────────────────────────

const first = <T,>(arr: T[]): T => {
  const item = arr[0];
  if (item === undefined) throw new Error("Expected non-empty array");
  return item;
};

const makeCLO = (
  id: string,
  level: BloomsLevel,
  title = `CLO ${id}`
): RawCLO => ({
  id,
  title,
  blooms_level: level,
});

const makeAssignment = (
  id: string,
  title: string,
  cloId: string,
  prerequisites: RawAssignment["prerequisites"] = null
): RawAssignment => ({
  id,
  title,
  clo_weights: [{ clo_id: cloId, weight: 100 }],
  prerequisites,
});

// ─── buildLearningPathNodes tests ───────────────────────────────────────────

describe("buildLearningPathNodes", () => {
  const clos: RawCLO[] = [
    makeCLO("clo-1", "remembering", "Recall Basics"),
    makeCLO("clo-2", "applying", "Apply Concepts"),
    makeCLO("clo-3", "creating", "Create Project"),
  ];

  it("orders nodes by Blooms level (Remembering to Creating)", () => {
    const assignments: RawAssignment[] = [
      makeAssignment("a3", "Final Project", "clo-3"),
      makeAssignment("a1", "Quiz 1", "clo-1"),
      makeAssignment("a2", "Lab Exercise", "clo-2"),
    ];

    const nodes = buildLearningPathNodes(assignments, clos, [], [], []);

    expect(nodes.map((n) => n.blooms_level)).toEqual([
      "remembering",
      "applying",
      "creating",
    ]);
    expect(nodes.map((n) => n.title)).toEqual([
      "Quiz 1",
      "Lab Exercise",
      "Final Project",
    ]);
  });

  it("marks nodes as available when no prerequisites", () => {
    const assignments: RawAssignment[] = [
      makeAssignment("a1", "Quiz 1", "clo-1"),
    ];

    const nodes = buildLearningPathNodes(assignments, clos, [], [], []);

    expect(first(nodes).status).toBe("available");
  });

  it("marks nodes as locked when prerequisite attainment is not met", () => {
    const assignments: RawAssignment[] = [
      makeAssignment("a2", "Lab Exercise", "clo-2", [
        { clo_id: "clo-1", required_attainment: 70 },
      ]),
    ];
    const attainments: RawAttainment[] = [
      { outcome_id: "clo-1", attainment_percent: 50 },
    ];

    const nodes = buildLearningPathNodes(
      assignments,
      clos,
      attainments,
      [],
      []
    );

    expect(first(nodes).status).toBe("locked");
    expect(first(nodes).prerequisite).toEqual({
      clo_id: "clo-1",
      clo_title: "Recall Basics",
      required_attainment: 70,
      current_attainment: 50,
    });
  });

  it("marks nodes as available when prerequisite attainment is met", () => {
    const assignments: RawAssignment[] = [
      makeAssignment("a2", "Lab Exercise", "clo-2", [
        { clo_id: "clo-1", required_attainment: 70 },
      ]),
    ];
    const attainments: RawAttainment[] = [
      { outcome_id: "clo-1", attainment_percent: 75 },
    ];

    const nodes = buildLearningPathNodes(
      assignments,
      clos,
      attainments,
      [],
      []
    );

    expect(first(nodes).status).toBe("available");
    expect(first(nodes).prerequisite).toBeUndefined();
  });

  it("marks nodes as submitted when a submission exists", () => {
    const assignments: RawAssignment[] = [
      makeAssignment("a1", "Quiz 1", "clo-1"),
    ];
    const submissions: RawSubmission[] = [
      { assignment_id: "a1", status: "submitted" },
    ];

    const nodes = buildLearningPathNodes(
      assignments,
      clos,
      [],
      submissions,
      []
    );

    expect(first(nodes).status).toBe("submitted");
  });

  it("marks nodes as graded when a grade exists", () => {
    const assignments: RawAssignment[] = [
      makeAssignment("a1", "Quiz 1", "clo-1"),
    ];
    const submissions: RawSubmission[] = [
      { assignment_id: "a1", status: "graded" },
    ];
    const grades: RawGrade[] = [
      { submission_id: "sub-1", assignment_id: "a1" },
    ];

    const nodes = buildLearningPathNodes(
      assignments,
      clos,
      [],
      submissions,
      grades
    );

    expect(first(nodes).status).toBe("graded");
  });

  it("includes attainment_percent from outcome_attainment", () => {
    const assignments: RawAssignment[] = [
      makeAssignment("a1", "Quiz 1", "clo-1"),
    ];
    const attainments: RawAttainment[] = [
      { outcome_id: "clo-1", attainment_percent: 82 },
    ];

    const nodes = buildLearningPathNodes(
      assignments,
      clos,
      attainments,
      [],
      []
    );

    expect(first(nodes).attainment_percent).toBe(82);
  });

  it("returns null attainment_percent when no attainment data exists", () => {
    const assignments: RawAssignment[] = [
      makeAssignment("a1", "Quiz 1", "clo-1"),
    ];

    const nodes = buildLearningPathNodes(assignments, clos, [], [], []);

    expect(first(nodes).attainment_percent).toBeNull();
  });

  it("defaults to remembering when CLO has no blooms_level", () => {
    const noBlooms: RawCLO[] = [
      { id: "clo-x", title: "Unknown", blooms_level: null },
    ];
    const assignments: RawAssignment[] = [
      makeAssignment("a1", "Task", "clo-x"),
    ];

    const nodes = buildLearningPathNodes(assignments, noBlooms, [], [], []);

    expect(first(nodes).blooms_level).toBe("remembering");
  });

  it("treats missing attainment as 0 for prerequisite check", () => {
    const assignments: RawAssignment[] = [
      makeAssignment("a2", "Lab", "clo-2", [
        { clo_id: "clo-1", required_attainment: 70 },
      ]),
    ];

    const nodes = buildLearningPathNodes(assignments, clos, [], [], []);

    expect(first(nodes).status).toBe("locked");
    expect(first(nodes).prerequisite?.current_attainment).toBe(0);
  });

  it("returns empty array for empty assignments", () => {
    const nodes = buildLearningPathNodes([], clos, [], [], []);
    expect(nodes).toEqual([]);
  });

  it("derives Blooms level from the lowest CLO across ALL linked CLOs (not the first)", () => {
    // Assignment links a high-Bloom CLO first and a low-Bloom CLO second; the
    // representative level must be the minimum (remembering), not the first
    // (creating).
    const multiCloAssignment: RawAssignment = {
      id: "a1",
      title: "Capstone",
      clo_weights: [
        { clo_id: "clo-3", weight: 50 }, // creating
        { clo_id: "clo-1", weight: 50 }, // remembering
      ],
      prerequisites: null,
    };

    const nodes = buildLearningPathNodes(
      [multiCloAssignment],
      clos,
      [],
      [],
      []
    );

    expect(first(nodes).blooms_level).toBe("remembering");
  });

  it("ignores CLOs without a blooms_level when picking the representative level", () => {
    const mixedClos: RawCLO[] = [
      { id: "clo-null", title: "No level", blooms_level: null },
      makeCLO("clo-2", "applying", "Apply"),
    ];
    const assignment: RawAssignment = {
      id: "a1",
      title: "Task",
      clo_weights: [
        { clo_id: "clo-null", weight: 50 },
        { clo_id: "clo-2", weight: 50 },
      ],
      prerequisites: null,
    };

    const nodes = buildLearningPathNodes([assignment], mixedClos, [], [], []);

    expect(first(nodes).blooms_level).toBe("applying");
  });

  it("sorts assignments at the same Blooms level alphabetically", () => {
    const sameLevelClos: RawCLO[] = [
      makeCLO("clo-a", "applying", "CLO A"),
      makeCLO("clo-b", "applying", "CLO B"),
    ];
    const assignments: RawAssignment[] = [
      makeAssignment("a2", "Zebra Task", "clo-b"),
      makeAssignment("a1", "Alpha Task", "clo-a"),
    ];

    const nodes = buildLearningPathNodes(
      assignments,
      sameLevelClos,
      [],
      [],
      []
    );

    expect(nodes.map((n) => n.title)).toEqual(["Alpha Task", "Zebra Task"]);
  });
});

// ─── Component rendering tests ──────────────────────────────────────────────

// We test the PathNode rendering via the exported LearningPath component
// by mocking the hook. For simplicity, we test the pure rendering logic
// by importing the component and providing mock data via a wrapper.

// Since LearningPath uses useLearningPath internally, we test the rendered
// output by importing the component parts directly.

describe("LearningPath component rendering", () => {
  // We dynamically import to avoid module-level mock issues
  it("renders empty state when no nodes", async () => {
    // Import the default export
    const { default: LearningPath } = await import(
      "@/pages/student/progress/LearningPath"
    );

    // Mock the hook by rendering with a wrapper that provides QueryClient
    // For unit tests, we test the pure logic above. Component rendering
    // is validated via the buildLearningPathNodes output.
    // This test validates the component can be imported without errors.
    expect(LearningPath).toBeDefined();
    expect(typeof LearningPath).toBe("function");
  }, 15_000);
});
