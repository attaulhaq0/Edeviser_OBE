// Feature: ai-tutor-rag — Autonomy level resolution edge cases
// **Validates: Requirements 21.2, 21.3, 21.4, 22.3, 23.3**

import { describe, it, expect } from "vitest";
import { resolveAutonomyLevel } from "@/lib/tutorAutonomy";

describe("tutorAutonomy — resolveAutonomyLevel edge cases", () => {
  // ─── Base level resolution ──────────────────────────────────────────────

  it("uses assignment autonomy when both assignment and CLO are set", () => {
    expect(
      resolveAutonomyLevel({
        assignmentAutonomy: "L1",
        cloAutonomy: "L3",
        studentOverride: null,
      }),
    ).toBe("L1");
  });

  it("falls back to CLO autonomy when assignment is null", () => {
    expect(
      resolveAutonomyLevel({
        assignmentAutonomy: null,
        cloAutonomy: "L3",
        studentOverride: null,
      }),
    ).toBe("L3");
  });

  it("defaults to L2 when both assignment and CLO are null", () => {
    expect(
      resolveAutonomyLevel({
        assignmentAutonomy: null,
        cloAutonomy: null,
        studentOverride: null,
      }),
    ).toBe("L2");
  });

  // ─── Student override L1 ───────────────────────────────────────────────

  it("student L1 override always results in L1 even when base is L3", () => {
    expect(
      resolveAutonomyLevel({
        assignmentAutonomy: "L3",
        cloAutonomy: "L3",
        studentOverride: "L1",
      }),
    ).toBe("L1");
  });

  it("student L1 override results in L1 when base is L1", () => {
    expect(
      resolveAutonomyLevel({
        assignmentAutonomy: "L1",
        cloAutonomy: null,
        studentOverride: "L1",
      }),
    ).toBe("L1");
  });

  it("student L1 override results in L1 when no config exists", () => {
    expect(
      resolveAutonomyLevel({
        assignmentAutonomy: null,
        cloAutonomy: null,
        studentOverride: "L1",
      }),
    ).toBe("L1");
  });

  // ─── Student override L3 (capped by teacher ceiling) ──────────────────

  it("student L3 override is capped to L1 when teacher ceiling is L1", () => {
    expect(
      resolveAutonomyLevel({
        assignmentAutonomy: "L1",
        cloAutonomy: null,
        studentOverride: "L3",
      }),
    ).toBe("L1");
  });

  it("student L3 override is capped to L2 when teacher ceiling is L2", () => {
    expect(
      resolveAutonomyLevel({
        assignmentAutonomy: "L2",
        cloAutonomy: null,
        studentOverride: "L3",
      }),
    ).toBe("L2");
  });

  it("student L3 override passes through when teacher ceiling is L3", () => {
    expect(
      resolveAutonomyLevel({
        assignmentAutonomy: "L3",
        cloAutonomy: null,
        studentOverride: "L3",
      }),
    ).toBe("L3");
  });

  it("student L3 override uses CLO ceiling when assignment is null", () => {
    expect(
      resolveAutonomyLevel({
        assignmentAutonomy: null,
        cloAutonomy: "L1",
        studentOverride: "L3",
      }),
    ).toBe("L1");
  });

  it("student L3 override uses default L2 ceiling when no config exists", () => {
    expect(
      resolveAutonomyLevel({
        assignmentAutonomy: null,
        cloAutonomy: null,
        studentOverride: "L3",
      }),
    ).toBe("L2");
  });

  // ─── All combinations produce valid levels ────────────────────────────

  it("all valid input combinations produce L1, L2, or L3", () => {
    const levels = ["L1", "L2", "L3"] as const;
    const overrides = [null, "L1", "L3"] as const;

    for (const assignment of [null, ...levels]) {
      for (const clo of [null, ...levels]) {
        for (const override of overrides) {
          const result = resolveAutonomyLevel({
            assignmentAutonomy: assignment,
            cloAutonomy: clo,
            studentOverride: override,
          });
          expect(["L1", "L2", "L3"]).toContain(result);
        }
      }
    }
  });
});
