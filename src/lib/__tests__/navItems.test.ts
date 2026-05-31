// Task 22.1 (R20.1, R20.2): every student navigation item carries a valid
// `group` and satisfies its required placement.
import { describe, it, expect } from "vitest";
import { navItems } from "../navItems";
import {
  assertNavGroup,
  isValidNavGroupAssignment,
  isNavGroup,
  REQUIRED_NAV_GROUPS,
  type NavGroup,
} from "../navGroups";

describe("navItems — student navigation grouping (R20.1, R20.2)", () => {
  const studentItems = navItems.student;

  it("assigns a defined group to every student nav item (R20.2)", () => {
    for (const item of studentItems) {
      expect(isNavGroup(item.group)).toBe(true);
    }
  });

  it("passes assertNavGroup for every student nav item (R20.6)", () => {
    for (const item of studentItems) {
      expect(() => assertNavGroup(item)).not.toThrow();
      expect(isValidNavGroupAssignment(item)).toBe(true);
    }
  });

  it("honors every required placement, including AI Tutor ∈ Learn (R20.1, R20.6)", () => {
    for (const [to, expectedGroup] of Object.entries(REQUIRED_NAV_GROUPS)) {
      const item = studentItems.find((i) => i.to === to);
      expect(item, `missing student nav item for route ${to}`).toBeDefined();
      expect(item?.group).toBe(expectedGroup as NavGroup);
    }
    expect(studentItems.find((i) => i.to === "/student/tutor")?.group).toBe(
      "learn"
    );
  });

  it("covers all four labeled sections across the student navigation (R20.1)", () => {
    const usedGroups = new Set(studentItems.map((i) => i.group));
    for (const group of ["learn", "growth", "community", "tools"] as const) {
      expect(usedGroups.has(group)).toBe(true);
    }
  });
});
