import { describe, it, expect } from "vitest";
import { resolveAutonomyLevel, type AutonomyLevel } from "@/lib/tutorAutonomy";

describe("resolveAutonomyLevel", () => {
  // ─── Base level resolution (no student override) ─────────────────────

  it("uses assignment autonomy when set", () => {
    const result = resolveAutonomyLevel({
      assignmentAutonomy: "L1",
      cloAutonomy: "L3",
      studentOverride: null,
    });
    expect(result).toBe("L1");
  });

  it("falls back to CLO autonomy when assignment is null", () => {
    const result = resolveAutonomyLevel({
      assignmentAutonomy: null,
      cloAutonomy: "L3",
      studentOverride: null,
    });
    expect(result).toBe("L3");
  });

  it("defaults to L2 when both assignment and CLO are null", () => {
    const result = resolveAutonomyLevel({
      assignmentAutonomy: null,
      cloAutonomy: null,
      studentOverride: null,
    });
    expect(result).toBe("L2");
  });

  it("prefers assignment over CLO when both are set", () => {
    const result = resolveAutonomyLevel({
      assignmentAutonomy: "L3",
      cloAutonomy: "L1",
      studentOverride: null,
    });
    expect(result).toBe("L3");
  });

  // ─── Student override L1 ("Figure it out") ──────────────────────────

  it("student L1 override always returns L1 regardless of base", () => {
    const levels: AutonomyLevel[] = ["L1", "L2", "L3"];
    for (const base of levels) {
      const result = resolveAutonomyLevel({
        assignmentAutonomy: base,
        cloAutonomy: null,
        studentOverride: "L1",
      });
      expect(result).toBe("L1");
    }
  });

  it("student L1 override returns L1 even with no teacher config", () => {
    const result = resolveAutonomyLevel({
      assignmentAutonomy: null,
      cloAutonomy: null,
      studentOverride: "L1",
    });
    expect(result).toBe("L1");
  });

  // ─── Student override L3 ("Just explain it") — capped by ceiling ────

  it("student L3 override is capped by assignment ceiling L1", () => {
    const result = resolveAutonomyLevel({
      assignmentAutonomy: "L1",
      cloAutonomy: null,
      studentOverride: "L3",
    });
    expect(result).toBe("L1");
  });

  it("student L3 override is capped by assignment ceiling L2", () => {
    const result = resolveAutonomyLevel({
      assignmentAutonomy: "L2",
      cloAutonomy: null,
      studentOverride: "L3",
    });
    expect(result).toBe("L2");
  });

  it("student L3 override passes through when ceiling is L3", () => {
    const result = resolveAutonomyLevel({
      assignmentAutonomy: "L3",
      cloAutonomy: null,
      studentOverride: "L3",
    });
    expect(result).toBe("L3");
  });

  it("student L3 override uses CLO ceiling when assignment is null", () => {
    const result = resolveAutonomyLevel({
      assignmentAutonomy: null,
      cloAutonomy: "L1",
      studentOverride: "L3",
    });
    expect(result).toBe("L1");
  });

  it("student L3 override uses default L2 ceiling when no teacher config", () => {
    const result = resolveAutonomyLevel({
      assignmentAutonomy: null,
      cloAutonomy: null,
      studentOverride: "L3",
    });
    expect(result).toBe("L2");
  });

  // ─── Edge cases ──────────────────────────────────────────────────────

  it("assignment L2 with CLO L3 and no override returns L2", () => {
    const result = resolveAutonomyLevel({
      assignmentAutonomy: "L2",
      cloAutonomy: "L3",
      studentOverride: null,
    });
    expect(result).toBe("L2");
  });

  it("CLO L1 with student L1 override returns L1", () => {
    const result = resolveAutonomyLevel({
      assignmentAutonomy: null,
      cloAutonomy: "L1",
      studentOverride: "L1",
    });
    expect(result).toBe("L1");
  });
});
